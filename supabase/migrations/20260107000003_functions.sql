-- Function to get current balance for a lease
CREATE OR REPLACE FUNCTION get_lease_balance(lease_uuid UUID)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
    total_charges DECIMAL(12, 2);
    total_payments DECIMAL(12, 2);
    opening_bal DECIMAL(12, 2);
BEGIN
    -- Get opening balance
    SELECT opening_balance INTO opening_bal
    FROM leases
    WHERE id = lease_uuid;

    -- Sum all charges (rent, prorated_rent, late_fee, adjustments with positive amounts)
    SELECT COALESCE(SUM(amount), 0) INTO total_charges
    FROM transactions
    WHERE lease_id = lease_uuid
    AND type IN ('rent', 'prorated_rent', 'late_fee', 'adjustment')
    AND amount > 0;

    -- Sum all payments (payments and negative adjustments)
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO total_payments
    FROM transactions
    WHERE lease_id = lease_uuid
    AND (type = 'payment' OR (type = 'adjustment' AND amount < 0));

    -- Return total balance (opening + charges - payments)
    RETURN COALESCE(opening_bal, 0) + total_charges - total_payments;
END;
$$ LANGUAGE plpgsql;

-- Function to generate access code
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS VARCHAR(10) AS $$
DECLARE
    new_code VARCHAR(10);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 6-character alphanumeric code
        new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM access_codes WHERE code = new_code) INTO code_exists;

        EXIT WHEN NOT code_exists;
    END LOOP;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate prorated rent
CREATE OR REPLACE FUNCTION calculate_prorated_rent(
    p_lease_id UUID,
    p_signup_date DATE
)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
    v_monthly_rent DECIMAL(12, 2);
    v_due_date INTEGER;
    v_days_in_month INTEGER;
    v_first_due_date DATE;
    v_days_to_charge INTEGER;
    v_prorated_amount DECIMAL(12, 2);
BEGIN
    -- Get lease details
    SELECT monthly_rent, rent_due_date
    INTO v_monthly_rent, v_due_date
    FROM leases
    WHERE id = p_lease_id;

    -- Get days in signup month
    v_days_in_month := EXTRACT(DAY FROM DATE_TRUNC('month', p_signup_date) + INTERVAL '1 month' - INTERVAL '1 day');

    -- Calculate first rent due date
    -- If signup date's day is >= due date, first due date is in next month
    IF EXTRACT(DAY FROM p_signup_date) >= v_due_date THEN
        v_first_due_date := (DATE_TRUNC('month', p_signup_date) + INTERVAL '1 month' + (v_due_date - 1 || ' days')::INTERVAL)::DATE;
    ELSE
        v_first_due_date := (DATE_TRUNC('month', p_signup_date) + (v_due_date - 1 || ' days')::INTERVAL)::DATE;
    END IF;

    -- Calculate days between signup (inclusive) and day before first due date
    v_days_to_charge := v_first_due_date - p_signup_date;

    -- If no days to charge (signed up on due date), return 0
    IF v_days_to_charge <= 0 THEN
        RETURN 0;
    END IF;

    -- Calculate prorated rent: (monthly_rent / days_in_month) * days_to_charge
    v_prorated_amount := ROUND((v_monthly_rent / v_days_in_month) * v_days_to_charge, 2);

    RETURN v_prorated_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to charge rent for a lease
CREATE OR REPLACE FUNCTION charge_rent(p_lease_id UUID)
RETURNS VOID AS $$
DECLARE
    v_monthly_rent DECIMAL(12, 2);
    v_billing_date DATE;
BEGIN
    -- Get monthly rent
    SELECT monthly_rent INTO v_monthly_rent
    FROM leases
    WHERE id = p_lease_id AND status = 'active';

    IF v_monthly_rent IS NULL THEN
        RETURN;
    END IF;

    -- Current date is the billing date
    v_billing_date := CURRENT_DATE;

    -- Insert rent charge transaction
    INSERT INTO transactions (lease_id, type, amount, description, transaction_date)
    VALUES (
        p_lease_id,
        'rent',
        v_monthly_rent,
        'Monthly rent charge',
        v_billing_date
    );
END;
$$ LANGUAGE plpgsql;

-- Function to charge late fee
CREATE OR REPLACE FUNCTION charge_late_fee(p_lease_id UUID)
RETURNS VOID AS $$
DECLARE
    v_late_fee DECIMAL(12, 2);
BEGIN
    -- Get late fee amount
    SELECT late_fee_amount INTO v_late_fee
    FROM leases
    WHERE id = p_lease_id AND status = 'active';

    IF v_late_fee IS NULL OR v_late_fee <= 0 THEN
        RETURN;
    END IF;

    -- Insert late fee transaction
    INSERT INTO transactions (lease_id, type, amount, description, transaction_date)
    VALUES (
        p_lease_id,
        'late_fee',
        v_late_fee,
        'Late payment fee',
        CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to process daily billing (to be called by cron or edge function)
CREATE OR REPLACE FUNCTION process_daily_billing()
RETURNS VOID AS $$
DECLARE
    lease_record RECORD;
    billing_day INTEGER;
BEGIN
    -- Get current day of month
    billing_day := EXTRACT(DAY FROM CURRENT_DATE);

    -- Find all active leases where today is their billing day (day before due date)
    FOR lease_record IN
        SELECT id, rent_due_date
        FROM leases
        WHERE status = 'active'
        AND prorated_rent_charged = TRUE
        AND (
            -- If due date is 1, billing day is last day of previous month
            (rent_due_date = 1 AND billing_day = EXTRACT(DAY FROM CURRENT_DATE - INTERVAL '1 day'))
            OR
            -- Otherwise billing day is due date - 1
            (rent_due_date > 1 AND billing_day = rent_due_date - 1)
        )
    LOOP
        PERFORM charge_rent(lease_record.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to process daily late fees
CREATE OR REPLACE FUNCTION process_late_fees()
RETURNS VOID AS $$
DECLARE
    lease_record RECORD;
    days_late INTEGER;
    v_due_date DATE;
    v_unpaid_rent DECIMAL(12, 2);
BEGIN
    -- Find all active leases
    FOR lease_record IN
        SELECT id, rent_due_date, start_date
        FROM leases
        WHERE status = 'active'
    LOOP
        -- Calculate the most recent rent due date
        IF EXTRACT(DAY FROM CURRENT_DATE) >= lease_record.rent_due_date THEN
            v_due_date := DATE_TRUNC('month', CURRENT_DATE) + (lease_record.rent_due_date - 1 || ' days')::INTERVAL;
        ELSE
            v_due_date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') + (lease_record.rent_due_date - 1 || ' days')::INTERVAL;
        END IF;

        -- Calculate days late (due date is day 1 of being late)
        days_late := CURRENT_DATE - v_due_date;

        -- If exactly 5 days late, charge late fee
        IF days_late = 5 THEN
            -- Check if there's unpaid rent
            v_unpaid_rent := get_lease_balance(lease_record.id);

            IF v_unpaid_rent > 0 THEN
                PERFORM charge_late_fee(lease_record.id);
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update unit status when lease status changes
CREATE OR REPLACE FUNCTION update_unit_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
        UPDATE units SET status = 'occupied' WHERE id = NEW.unit_id;
    ELSIF NEW.status = 'terminated' AND OLD.status = 'active' THEN
        UPDATE units SET status = 'vacant' WHERE id = NEW.unit_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lease_status_change
AFTER UPDATE ON leases
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_unit_status();
