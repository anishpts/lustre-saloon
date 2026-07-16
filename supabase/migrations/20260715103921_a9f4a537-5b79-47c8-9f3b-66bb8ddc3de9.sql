
REVOKE ALL ON FUNCTION public.notify_booking_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_review_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_review_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_salon_rating(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_admin_for_bootstrap_email() FROM PUBLIC, anon, authenticated;
