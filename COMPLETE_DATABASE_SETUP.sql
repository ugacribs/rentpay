-- =====================================================
-- RENTPAY COMPLETE DATABASE SETUP
-- =====================================================
-- Copy this ENTIRE file and paste it into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oprbuadsmgdoinvfmeix/sql
-- Then click "Run" to execute all the SQL
-- =====================================================

-- =====================================================
-- PART 1: INITIAL SCHEMA (Tables, Indexes, Triggers)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('landlord', 'tenant');
CREATE TYPE unit_status AS ENUM ('vacant', 'occupied');
CREATE TYPE lease_status AS ENUM ('pending', 'active', 'terminated');
CREATE TYPE transaction_type AS ENUM ('rent', 'prorated_rent', 'late_fee', 'payment', 'adjustment');
CREATE TYPE payment_gateway AS ENUM ('mtn', 'airtel');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE tenant_status AS ENUM ('active', 'archived');

-- Properties table
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Units table
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL,
    status unit_status DEFAULT 'vacant',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, unit_number)
);

-- Tenants table (extends auth.users)
CREATE TABLE tenants (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    status tenant_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Access codes table
CREATE TABLE access_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) NOT NULL UNIQUE,
    lease_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leases table
CREATE TABLE leases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    tenant_email VARCHAR(255) NOT NULL,
    monthly_rent DECIMAL(12, 2) NOT NULL,
    late_fee_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    rent_due_date INTEGER NOT NULL DEFAULT 1 CHECK (rent_due_date >= 1 AND rent_due_date <= 31),
    opening_balance DECIMAL(12, 2) DEFAULT 0,
    start_date DATE,
    status lease_status DEFAULT 'pending',
    prorated_rent_charged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to access_codes after leases table is created
ALTER TABLE access_codes ADD CONSTRAINT fk_lease FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE;

-- Lease signatures table
CREATE TABLE lease_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    signature_data TEXT NOT NULL,
    ip_address VARCHAR(45),
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lease_id)
);

-- Tenant ID documents table
CREATE TABLE tenant_id_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_url TEXT NOT NULL,
    document_type VARCHAR(50),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table (ledger)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    gateway payment_gateway NOT NULL,
    gateway_reference VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status payment_status DEFAULT 'pending',
    webhook_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email queue table
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    email_type TEXT NOT NULL CHECK (email_type IN ('access_code', 'rent_reminder', 'payment_confirmation', 'late_fee_notice')),
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_leases_tenant ON leases(tenant_id);
CREATE INDEX idx_leases_unit ON leases(unit_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_access_codes_code ON access_codes(code);
CREATE INDEX idx_access_codes_email ON access_codes(email);
CREATE INDEX idx_transactions_lease ON transactions(lease_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_payment_transactions_lease ON payment_transactions(lease_id);
CREATE INDEX idx_payment_transactions_gateway_ref ON payment_transactions(gateway_reference);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_created_at ON email_queue(created_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON leases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_queue_updated_at BEFORE UPDATE ON email_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 2: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable Row Level Security on all tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_id_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Properties policies
CREATE POLICY "Landlords can view their own properties"
    ON properties FOR SELECT
    USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can insert their own properties"
    ON properties FOR INSERT
    WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own properties"
    ON properties FOR UPDATE
    USING (auth.uid() = landlord_id);

-- Units policies
CREATE POLICY "Landlords can view units of their properties"
    ON units FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM properties
            WHERE properties.id = units.property_id
            AND properties.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can insert units in their properties"
    ON units FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM properties
            WHERE properties.id = property_id
            AND properties.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can update units in their properties"
    ON units FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM properties
            WHERE properties.id = units.property_id
            AND properties.landlord_id = auth.uid()
        )
    );

-- Tenants policies
CREATE POLICY "Tenants can view their own data"
    ON tenants FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Tenants can insert their own data"
    ON tenants FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Tenants can update their own data"
    ON tenants FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Landlords can view tenants of their properties"
    ON tenants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            JOIN units ON leases.unit_id = units.id
            JOIN properties ON units.property_id = properties.id
            WHERE leases.tenant_id = tenants.id
            AND properties.landlord_id = auth.uid()
        )
    );

-- Access codes policies
CREATE POLICY "Users can view access codes with their email"
    ON access_codes FOR SELECT
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Service role can manage access codes"
    ON access_codes FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Leases policies
CREATE POLICY "Tenants can view their own leases"
    ON leases FOR SELECT
    USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can view leases by email"
    ON leases FOR SELECT
    USING (tenant_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Tenants can update their own pending leases"
    ON leases FOR UPDATE
    USING (auth.uid() = tenant_id AND status = 'pending');

CREATE POLICY "Landlords can view leases in their properties"
    ON leases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM units
            JOIN properties ON units.property_id = properties.id
            WHERE units.id = leases.unit_id
            AND properties.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can insert leases in their properties"
    ON leases FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM units
            JOIN properties ON units.property_id = properties.id
            WHERE units.id = unit_id
            AND properties.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can update leases in their properties"
    ON leases FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM units
            JOIN properties ON units.property_id = properties.id
            WHERE units.id = leases.unit_id
            AND properties.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can delete leases in their properties"
    ON leases FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM units
            JOIN properties ON units.property_id = properties.id
            WHERE units.id = leases.unit_id
            AND properties.landlord_id = auth.uid()
        )
    );

-- Lease signatures policies
CREATE POLICY "Tenants can view their own lease signatures"
    ON lease_signatures FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            WHERE leases.id = lease_signatures.lease_id
            AND leases.tenant_id = auth.uid()
        )
    );

CREATE POLICY "Tenants can insert their own lease signatures"
    ON lease_signatures FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM leases
            WHERE leases.id = lease_id
            AND leases.tenant_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can view lease signatures in their properties"
    ON lease_signatures FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            JOIN units ON leases.unit_id = units.id
            JOIN properties ON units.property_id = properties.id
            WHERE leases.id = lease_signatures.lease_id
            AND properties.landlord_id = auth.uid()
        )
    );

-- Tenant ID documents policies
CREATE POLICY "Tenants can manage their own ID documents"
    ON tenant_id_documents FOR ALL
    USING (auth.uid() = tenant_id);

CREATE POLICY "Landlords can view tenant ID documents in their properties"
    ON tenant_id_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            JOIN units ON leases.unit_id = units.id
            JOIN properties ON units.property_id = properties.id
            WHERE leases.tenant_id = tenant_id_documents.tenant_id
            AND properties.landlord_id = auth.uid()
        )
    );

-- Transactions policies
CREATE POLICY "Tenants can view their own transactions"
    ON transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            WHERE leases.id = transactions.lease_id
            AND leases.tenant_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can view transactions in their properties"
    ON transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            JOIN units ON leases.unit_id = units.id
            JOIN properties ON units.property_id = properties.id
            WHERE leases.id = transactions.lease_id
            AND properties.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can insert transactions in their properties"
    ON transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM leases
            JOIN units ON leases.unit_id = units.id
            JOIN properties ON units.property_id = properties.id
            WHERE leases.id = lease_id
            AND properties.landlord_id = auth.uid()
        )
    );

-- Payment transactions policies
CREATE POLICY "Tenants can view their own payment transactions"
    ON payment_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            WHERE leases.id = payment_transactions.lease_id
            AND leases.tenant_id = auth.uid()
        )
    );

CREATE POLICY "Tenants can insert their own payment transactions"
    ON payment_transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM leases
            WHERE leases.id = lease_id
            AND leases.tenant_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can view payment transactions in their properties"
    ON payment_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leases
            JOIN units ON leases.unit_id = units.id
            JOIN properties ON units.property_id = properties.id
            WHERE leases.id = payment_transactions.lease_id
            AND properties.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Service role can update payment transactions"
    ON payment_transactions FOR UPDATE
    USING (auth.jwt()->>'role' = 'service_role');

-- Notifications policies
CREATE POLICY "Tenants can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = tenant_id);

CREATE POLICY "Service role can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Email queue policies (service role only)
CREATE POLICY "Service role full access to email queue"
    ON email_queue
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- PART 3: DATABASE FUNCTIONS
-- =====================================================

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

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- After running this SQL, you'll have:
-- - 11 database tables
-- - Row Level Security policies
-- - Database functions for billing, late fees, etc.
-- - Automatic triggers for updated_at and unit status
-- =====================================================
