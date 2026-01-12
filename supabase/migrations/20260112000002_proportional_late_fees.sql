-- Proportional Late Fee Calculation
-- Late fees are calculated as a proportion of outstanding balance to monthly rent
-- Formula: (outstanding_balance / monthly_rent) × late_fee_amount
-- This means:
--   - If balance < monthly_rent: late fee is reduced proportionally
--   - If balance = monthly_rent: late fee is the full amount
--   - If balance > monthly_rent: late fee is increased proportionally

-- Updated function to charge proportional late fee
CREATE OR REPLACE FUNCTION charge_late_fee(p_lease_id UUID)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
    v_late_fee DECIMAL(12, 2);
    v_monthly_rent DECIMAL(12, 2);
    v_balance DECIMAL(12, 2);
    v_proportional_late_fee DECIMAL(12, 2);
BEGIN
    -- Get late fee amount and monthly rent
    SELECT late_fee_amount, monthly_rent
    INTO v_late_fee, v_monthly_rent
    FROM leases
    WHERE id = p_lease_id AND status = 'active';

    IF v_late_fee IS NULL OR v_late_fee <= 0 OR v_monthly_rent IS NULL OR v_monthly_rent <= 0 THEN
        RETURN 0;
    END IF;

    -- Get current balance
    v_balance := get_lease_balance(p_lease_id);

    -- If no outstanding balance, no late fee
    IF v_balance IS NULL OR v_balance <= 0 THEN
        RETURN 0;
    END IF;

    -- Calculate proportional late fee: (balance / monthly_rent) × late_fee
    v_proportional_late_fee := ROUND((v_balance / v_monthly_rent) * v_late_fee, 2);

    -- Insert late fee transaction with proportional amount
    INSERT INTO transactions (lease_id, type, amount, description, transaction_date)
    VALUES (
        p_lease_id,
        'late_fee',
        v_proportional_late_fee,
        CASE
            WHEN v_balance < v_monthly_rent THEN
                'Late payment fee (proportional: ' || ROUND((v_balance / v_monthly_rent) * 100, 0) || '% of balance)'
            WHEN v_balance = v_monthly_rent THEN
                'Late payment fee'
            ELSE
                'Late payment fee (proportional: ' || ROUND((v_balance / v_monthly_rent) * 100, 0) || '% of balance)'
        END,
        CURRENT_DATE
    );

    RETURN v_proportional_late_fee;
END;
$$ LANGUAGE plpgsql;
