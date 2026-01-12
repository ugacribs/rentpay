-- Fix billing logic:
-- 1. Prorated rent calculation now splits across months for accuracy
-- 2. Monthly rent skips first billing cycle (prorated rent covers that period)

-- Updated function to calculate prorated rent with split-month logic
CREATE OR REPLACE FUNCTION calculate_prorated_rent(
    p_lease_id UUID,
    p_signup_date DATE
)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
    v_monthly_rent DECIMAL(12, 2);
    v_due_date INTEGER;
    v_first_due_date DATE;
    v_signup_day INTEGER;
    v_signup_month_end DATE;
    v_days_in_signup_month INTEGER;
    v_days_in_due_month INTEGER;
    v_days_part1 INTEGER;
    v_days_part2 INTEGER;
    v_prorated_part1 DECIMAL(12, 2);
    v_prorated_part2 DECIMAL(12, 2);
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

    v_signup_day := EXTRACT(DAY FROM p_signup_date);

    -- Calculate first rent due date
    IF v_signup_day >= v_due_date THEN
        -- Due date is in next month
        v_first_due_date := (DATE_TRUNC('month', p_signup_date) + INTERVAL '1 month' + (v_due_date - 1 || ' days')::INTERVAL)::DATE;
    ELSE
        -- Due date is in same month
        v_first_due_date := (DATE_TRUNC('month', p_signup_date) + (v_due_date - 1 || ' days')::INTERVAL)::DATE;
    END IF;

    -- If signup is on or after due date in same month, no prorated rent needed for same month
    IF p_signup_date >= v_first_due_date THEN
        RETURN 0;
    END IF;

    -- Get days in signup month
    v_signup_month_end := (DATE_TRUNC('month', p_signup_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_days_in_signup_month := EXTRACT(DAY FROM v_signup_month_end);

    -- Check if due date is in same month or next month
    IF EXTRACT(MONTH FROM v_first_due_date) = EXTRACT(MONTH FROM p_signup_date)
       AND EXTRACT(YEAR FROM v_first_due_date) = EXTRACT(YEAR FROM p_signup_date) THEN
        -- Scenario A: Due date is in the same month
        -- Simple calculation: (rent / days_in_month) * days_to_charge
        v_days_part1 := v_first_due_date - p_signup_date;
        v_prorated_amount := ROUND((v_monthly_rent / v_days_in_signup_month) * v_days_part1, 2);
    ELSE
        -- Scenario B: Due date is in the next month - split calculation

        -- Part 1: Days remaining in signup month (signup_date to end of month)
        v_days_part1 := v_signup_month_end - p_signup_date + 1; -- +1 to include end of month day
        v_prorated_part1 := (v_monthly_rent / v_days_in_signup_month) * v_days_part1;

        -- Part 2: Days in next month until day before due date (1st to due_date - 1)
        v_days_in_due_month := EXTRACT(DAY FROM (DATE_TRUNC('month', v_first_due_date) + INTERVAL '1 month' - INTERVAL '1 day'));
        v_days_part2 := v_due_date - 1; -- Days from 1st to day before due date

        IF v_days_part2 > 0 THEN
            v_prorated_part2 := (v_monthly_rent / v_days_in_due_month) * v_days_part2;
        ELSE
            v_prorated_part2 := 0;
        END IF;

        v_prorated_amount := ROUND(v_prorated_part1 + v_prorated_part2, 2);
    END IF;

    RETURN v_prorated_amount;
END;
$$ LANGUAGE plpgsql;

-- Add column to track the first billing date (when monthly rent should start)
-- This helps the daily billing function know to skip the first cycle
ALTER TABLE leases ADD COLUMN IF NOT EXISTS first_billing_date DATE;

-- Function to set the first billing date when prorated rent is charged
-- First billing should be the month AFTER the first due date
CREATE OR REPLACE FUNCTION set_first_billing_date(
    p_lease_id UUID,
    p_signup_date DATE
)
RETURNS DATE AS $$
DECLARE
    v_due_date INTEGER;
    v_first_due_date DATE;
    v_first_billing_date DATE;
    v_signup_day INTEGER;
BEGIN
    -- Get rent due date
    SELECT rent_due_date INTO v_due_date
    FROM leases
    WHERE id = p_lease_id;

    IF v_due_date IS NULL THEN
        RETURN NULL;
    END IF;

    v_signup_day := EXTRACT(DAY FROM p_signup_date);

    -- Calculate first rent due date
    IF v_signup_day >= v_due_date THEN
        -- Due date is in next month
        v_first_due_date := (DATE_TRUNC('month', p_signup_date) + INTERVAL '1 month' + (v_due_date - 1 || ' days')::INTERVAL)::DATE;
    ELSE
        -- Due date is in same month
        v_first_due_date := (DATE_TRUNC('month', p_signup_date) + (v_due_date - 1 || ' days')::INTERVAL)::DATE;
    END IF;

    -- First billing date is one month after the first due date
    -- (billing happens day before due date, so we add 1 month to first_due_date then subtract 1 day)
    v_first_billing_date := (v_first_due_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    -- Update the lease with the first billing date
    UPDATE leases
    SET first_billing_date = v_first_billing_date
    WHERE id = p_lease_id;

    RETURN v_first_billing_date;
END;
$$ LANGUAGE plpgsql;
