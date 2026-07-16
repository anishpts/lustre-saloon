
-- Storage policies for salons + avatars buckets
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins manage salons bucket') THEN
    DROP POLICY "Admins manage salons bucket" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins manage avatars bucket') THEN
    DROP POLICY "Admins manage avatars bucket" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Authenticated read media buckets') THEN
    DROP POLICY "Authenticated read media buckets" ON storage.objects;
  END IF;
END $$;

CREATE POLICY "Admins manage salons bucket"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'salons' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'salons' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage avatars bucket"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Authenticated read media buckets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('salons','avatars'));

-- Notification triggers
CREATE OR REPLACE FUNCTION public.notify_booking_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s_name text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT name INTO s_name FROM public.salons WHERE id = NEW.salon_id;
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'booking_' || NEW.status::text,
      'Booking ' || NEW.status::text,
      'Your booking at ' || COALESCE(s_name,'the salon') || ' is now ' || NEW.status::text || '.',
      jsonb_build_object('booking_id', NEW.id, 'salon_id', NEW.salon_id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_booking_status ON public.bookings;
CREATE TRIGGER trg_notify_booking_status
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status();

CREATE OR REPLACE FUNCTION public.notify_review_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s_name text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT name INTO s_name FROM public.salons WHERE id = NEW.salon_id;
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'review_' || NEW.status::text,
      'Review ' || NEW.status::text,
      'Your review for ' || COALESCE(s_name,'a salon') || ' was ' || NEW.status::text || '.',
      jsonb_build_object('review_id', NEW.id, 'salon_id', NEW.salon_id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_review_status ON public.reviews;
CREATE TRIGGER trg_notify_review_status
AFTER UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.notify_review_status();

-- Also ensure the salon rating recompute trigger exists (it references on_review_change)
DROP TRIGGER IF EXISTS trg_review_recompute_rating ON public.reviews;
CREATE TRIGGER trg_review_recompute_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.on_review_change();
