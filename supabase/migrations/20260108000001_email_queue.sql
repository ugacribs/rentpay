-- Create email queue table for sending emails
CREATE TABLE IF NOT EXISTS email_queue (
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

-- Create index for faster queries
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_created_at ON email_queue(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies (service role only for now, since this is internal)
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can manage email queue
CREATE POLICY "Service role full access"
  ON email_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
