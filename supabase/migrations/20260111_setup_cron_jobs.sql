-- Enable pg_net extension for HTTP calls from cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily-billing to run at midnight every day (UTC)
SELECT cron.schedule(
  'daily-billing',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://oprbuadsmgdoinvfmeix.supabase.co/functions/v1/daily-billing',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcmJ1YWRzbWdkb2ludmZtZWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3Mzc1NjMsImV4cCI6MjA4MzMxMzU2M30.1SHnuKitX-4Gik9mgUEJcXVAazJKBmagk6MuC3zNWgY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Schedule late-fees to run at 1 AM every day (UTC)
SELECT cron.schedule(
  'late-fees',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://oprbuadsmgdoinvfmeix.supabase.co/functions/v1/late-fees',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcmJ1YWRzbWdkb2ludmZtZWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3Mzc1NjMsImV4cCI6MjA4MzMxMzU2M30.1SHnuKitX-4Gik9mgUEJcXVAazJKBmagk6MuC3zNWgY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Schedule rent-reminders to run at 9 AM every day (UTC)
SELECT cron.schedule(
  'rent-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://oprbuadsmgdoinvfmeix.supabase.co/functions/v1/rent-reminders',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcmJ1YWRzbWdkb2ludmZtZWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3Mzc1NjMsImV4cCI6MjA4MzMxMzU2M30.1SHnuKitX-4Gik9mgUEJcXVAazJKBmagk6MuC3zNWgY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
