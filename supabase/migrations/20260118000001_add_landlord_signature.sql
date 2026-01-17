-- Add landlord signature to leases table
-- Landlord signs when creating the lease, tenant signs during onboarding

-- Add landlord signature columns to leases table
ALTER TABLE leases ADD COLUMN IF NOT EXISTS landlord_signature_data TEXT;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS landlord_signed_at TIMESTAMPTZ;

-- Add agreement_date column to lease_signatures to store when tenant signed
ALTER TABLE lease_signatures ADD COLUMN IF NOT EXISTS agreement_date DATE DEFAULT CURRENT_DATE;

-- Rename signed_at to tenant_signed_at for clarity (if it exists as signed_at)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lease_signatures' AND column_name = 'signed_at') THEN
        ALTER TABLE lease_signatures RENAME COLUMN signed_at TO tenant_signed_at;
    END IF;
END $$;

-- Comments
COMMENT ON COLUMN leases.landlord_signature_data IS 'Landlord signature data (base64 image) - signed when creating lease';
COMMENT ON COLUMN leases.landlord_signed_at IS 'Timestamp when landlord signed the lease';
COMMENT ON COLUMN lease_signatures.signature_data IS 'Tenant signature data (base64 image)';
