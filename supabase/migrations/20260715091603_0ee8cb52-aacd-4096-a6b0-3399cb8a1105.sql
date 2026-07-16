
-- Public read for both buckets (files are still accessed via signed/public URL; policy permits SELECT)
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Public read salons" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'salons');

-- Users manage own avatar (folder = user id)
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins manage salon media
CREATE POLICY "Admins manage salon media" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'salons' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'salons' AND public.has_role(auth.uid(),'admin'));
