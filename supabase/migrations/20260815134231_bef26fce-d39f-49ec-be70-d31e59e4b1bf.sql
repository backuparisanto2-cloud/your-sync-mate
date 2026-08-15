GRANT SELECT, INSERT, UPDATE, DELETE ON public.smtp_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminder_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminder_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.send_logs TO authenticated;
GRANT ALL ON public.smtp_profiles TO service_role;
GRANT ALL ON public.reminders TO service_role;
GRANT ALL ON public.reminder_schedules TO service_role;
GRANT ALL ON public.reminder_attachments TO service_role;
GRANT ALL ON public.send_logs TO service_role;

CREATE POLICY "authenticated manage smtp_profiles" ON public.smtp_profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated manage reminders" ON public.reminders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated manage reminder_schedules" ON public.reminder_schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated manage reminder_attachments" ON public.reminder_attachments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated read send_logs" ON public.send_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated read attachments bucket" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'attachments');
CREATE POLICY "authenticated upload attachments bucket" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');
CREATE POLICY "authenticated update attachments bucket" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'attachments') WITH CHECK (bucket_id = 'attachments');
CREATE POLICY "authenticated delete attachments bucket" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'attachments');