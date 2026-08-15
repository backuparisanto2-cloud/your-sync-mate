CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.smtp_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 465,
  tls boolean NOT NULL DEFAULT true,
  from_email text NOT NULL,
  from_name text,
  username text NOT NULL,
  password text NOT NULL DEFAULT '',
  verify_cert boolean NOT NULL DEFAULT false,
  last_status text,
  last_tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.smtp_profiles TO service_role;
ALTER TABLE public.smtp_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER smtp_profiles_updated_at BEFORE UPDATE ON public.smtp_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  to_emails text[] NOT NULL DEFAULT '{}',
  cc_emails text[] NOT NULL DEFAULT '{}',
  bcc_emails text[] NOT NULL DEFAULT '{}',
  subject text NOT NULL,
  body text NOT NULL DEFAULT '',
  smtp_profile_id uuid REFERENCES public.smtp_profiles(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  timezone text NOT NULL DEFAULT 'Asia/Jakarta',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER reminders_updated_at BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reminder_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'single',
  start_date date,
  end_date date,
  send_time time NOT NULL DEFAULT '09:00',
  weekdays smallint[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.reminder_schedules TO service_role;
ALTER TABLE public.reminder_schedules ENABLE ROW LEVEL SECURITY;
CREATE INDEX reminder_schedules_reminder_idx ON public.reminder_schedules(reminder_id);

CREATE TABLE public.reminder_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  path text NOT NULL,
  filename text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.reminder_attachments TO service_role;
ALTER TABLE public.reminder_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX reminder_attachments_reminder_idx ON public.reminder_attachments(reminder_id);

CREATE TABLE public.send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid REFERENCES public.reminders(id) ON DELETE CASCADE,
  reminder_title text,
  occurrence_at timestamptz,
  recipients text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  trigger_source text NOT NULL DEFAULT 'auto',
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.send_logs TO service_role;
ALTER TABLE public.send_logs ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX send_logs_unique_occurrence ON public.send_logs(reminder_id, occurrence_at) WHERE occurrence_at IS NOT NULL;
CREATE INDEX send_logs_sent_at_idx ON public.send_logs(sent_at DESC);