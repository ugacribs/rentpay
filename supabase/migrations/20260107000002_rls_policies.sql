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
