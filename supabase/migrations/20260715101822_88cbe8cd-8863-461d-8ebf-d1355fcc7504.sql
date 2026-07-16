
-- 1) Reviews: prevent exposing user_id to anon/authenticated
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (id, salon_id, rating, comment, created_at, updated_at) ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

-- 2) Split salons/services SELECT so anon path doesn't require has_role
DROP POLICY IF EXISTS "Salons public read active" ON public.salons;
CREATE POLICY "Salons public read active" ON public.salons
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Admins read all salons" ON public.salons
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Services public read" ON public.services;
CREATE POLICY "Services public read" ON public.services
  FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Admins read all services" ON public.services
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_review_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_salon_rating(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- has_role must remain callable by authenticated (used in RLS policies) but revoke from anon
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
