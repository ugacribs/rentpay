-- Trigger to update unit status when a lease is DELETED
-- This ensures units become vacant when their lease is deleted

CREATE OR REPLACE FUNCTION handle_lease_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only mark unit as vacant if the deleted lease was active or pending
    IF OLD.status IN ('active', 'pending') THEN
        UPDATE units SET status = 'vacant' WHERE id = OLD.unit_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for lease deletions
CREATE TRIGGER lease_delete_update_unit
BEFORE DELETE ON leases
FOR EACH ROW
EXECUTE FUNCTION handle_lease_delete();
