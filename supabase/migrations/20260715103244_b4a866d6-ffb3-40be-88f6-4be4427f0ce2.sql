
-- 1. Enquiries
DO $$ BEGIN
  CREATE TYPE public.enquiry_status AS ENUM ('new', 'read', 'replied', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status public.enquiry_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquiries TO authenticated;
GRANT INSERT ON public.enquiries TO anon;
GRANT ALL ON public.enquiries TO service_role;

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create an enquiry" ON public.enquiries;
CREATE POLICY "Anyone can create an enquiry" ON public.enquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view enquiries" ON public.enquiries;
CREATE POLICY "Admins can view enquiries" ON public.enquiries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can update enquiries" ON public.enquiries;
CREATE POLICY "Admins can update enquiries" ON public.enquiries
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can delete enquiries" ON public.enquiries;
CREATE POLICY "Admins can delete enquiries" ON public.enquiries
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_enquiries_set_updated_at ON public.enquiries;
CREATE TRIGGER trg_enquiries_set_updated_at
  BEFORE UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS enquiries_status_created_idx ON public.enquiries (status, created_at DESC);

-- 2. profiles.is_active + admin policies
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. reviews.status
DO $$ BEGIN
  CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status public.review_status NOT NULL DEFAULT 'approved';

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.reviews', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Approved reviews are public" ON public.reviews
  FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Users can view own reviews" ON public.reviews
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reviews" ON public.reviews
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;
CREATE POLICY "Admins can update reviews" ON public.reviews
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
CREATE POLICY "Admins can delete reviews" ON public.reviews
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.recompute_salon_rating(_salon_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.salons s SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE salon_id = _salon_id AND status = 'approved'), 0),
    rating_count = COALESCE((SELECT COUNT(*) FROM public.reviews WHERE salon_id = _salon_id AND status = 'approved'), 0)
  WHERE s.id = _salon_id;
END;
$$;

-- 4. Admin management policies (idempotent)
DROP POLICY IF EXISTS "Admins manage bookings" ON public.bookings;
CREATE POLICY "Admins manage bookings" ON public.bookings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage salons" ON public.salons;
CREATE POLICY "Admins manage salons" ON public.salons
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage services" ON public.services;
CREATE POLICY "Admins manage services" ON public.services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories" ON public.categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
CREATE POLICY "Public can read categories" ON public.categories
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage salon_categories" ON public.salon_categories;
CREATE POLICY "Admins manage salon_categories" ON public.salon_categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage salon_images" ON public.salon_images;
CREATE POLICY "Admins manage salon_images" ON public.salon_images
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage user_roles" ON public.user_roles;
CREATE POLICY "Admins manage user_roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. site_settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name text,
  business_email text,
  business_phone text,
  address text,
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  social jsonb NOT NULL DEFAULT '{}'::jsonb,
  logo_url text,
  banner_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read settings" ON public.site_settings;
CREATE POLICY "Public can read settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins can insert settings" ON public.site_settings;
CREATE POLICY "Admins can insert settings" ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;
CREATE POLICY "Admins can update settings" ON public.site_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_site_settings_set_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_set_updated_at
  BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings (status);
CREATE INDEX IF NOT EXISTS bookings_start_at_idx ON public.bookings (start_at DESC);
CREATE INDEX IF NOT EXISTS bookings_user_idx ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS bookings_salon_idx ON public.bookings (salon_id);
CREATE INDEX IF NOT EXISTS services_salon_idx ON public.services (salon_id);
CREATE INDEX IF NOT EXISTS reviews_salon_status_idx ON public.reviews (salon_id, status);
CREATE INDEX IF NOT EXISTS reviews_status_created_idx ON public.reviews (status, created_at DESC);
CREATE INDEX IF NOT EXISTS salons_city_idx ON public.salons (city);
CREATE INDEX IF NOT EXISTS salons_is_active_idx ON public.salons (is_active);

-- 7. Bootstrap admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'admin_lustre@yopmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.grant_admin_for_bootstrap_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'admin_lustre@yopmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_bootstrap_admin ON auth.users;
CREATE TRIGGER on_auth_user_bootstrap_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_bootstrap_email();
