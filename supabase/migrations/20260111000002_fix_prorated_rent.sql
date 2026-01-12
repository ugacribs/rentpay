-- Prorated Rent Calculation Function
-- Business Logic: 
-- - Prorated rent covers from signup date (inclusive) to the day BEFORE the first rent due date (inclusive)
-- - Uses standard 30-day month for calculation simplicity
-- Example: If signup Jan 11 and due date is 7th:
--   - Prorated period = Jan 11 to Feb 6 (27 days)
--   - Prorated rent = (monthly_rent / 30) * 27

CREATE OR REPLACE FUNCTION calculate_prorated_rent(
    p_lease_id UUID,
    p_signup_date DATE
)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
    v_monthly_rent DECIMAL(12, 2);
    v_due_date INTEGER;
    v_first_due_date DATE;
    v_days_to_charge INTEGER;
    v_prorated_amount DECIMAL(12, 2);
BEGIN
    -- Get lease details
    SELECT monthly_rent, rent_due_date
    INTO v_monthly_rent, v_due_date
    FROM leases
    WHERE id = p_lease_id;

    IF v_monthly_rent IS NULL THEN
        RETURN 0;
    END IF;

    -- Calculate first rent due date
    -- If signup date's day is >= due date, first due date is in next month
    IF EXTRACT(DAY FROM p_signup_date) >= v_due_date THEN
        -- First due date is in next month
        v_first_due_date := (DATE_TRUNC('month', p_signup_date) + INTERVAL '1 month' + (v_due_date - 1 || ' days')::INTERVAL)::DATE;
    ELSE
        -- First due date is in current month
        v_first_due_date := (DATE_TRUNC('month', p_signup_date) + (v_due_date - 1 || ' days')::INTERVAL)::DATE;
    END IF;

    -- Days to charge = first due date - signup date
    -- Example: Feb 7 - Jan 11 = 27 days (covers Jan 11 to Feb 6)
    v_days_to_charge := v_first_due_date - p_signup_date;

    -- If no days to charge (signed up on due date), return 0
    IF v_days_to_charge <= 0 THEN
        RETURN 0;
    END IF;

    -- Calculate prorated rent using standard 30-day month
    v_prorated_amount := ROUND((v_monthly_rent / 30) * v_days_to_charge, 2);

    RETURN v_prorated_amount;
END;
$$ LANGUAGE plpgsql;
