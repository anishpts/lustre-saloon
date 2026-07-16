## Admin Panel — Phased Build Plan

The request covers ~10 major modules. Building all at once would take many turns and risk breaking the existing salon booking app. I'll ship it in verifiable phases so you can test each before moving on.

### Phase 1 — Foundation (this turn)
- **DB migration**: add `enquiries` table (name, email, phone, subject, message, status) with RLS + GRANTs. Add `is_active` to `profiles` for user suspension. Add indexes on hot columns (bookings.status, bookings.start_at, services.salon_id, reviews.salon_id).
- **Admin shell**: `src/routes/_authenticated/admin/route.tsx` with `has_role('admin')` gate + sidebar layout (shadcn sidebar) + dark/light toggle already exists.
- **Dashboard**: all count widgets (users, salons, services, categories, bookings by status, reviews, enquiries) + recent bookings/users/enquiries lists + 2 charts (monthly bookings, status distribution) via recharts.
- **Seed one admin role** for the currently-signed-in user (you'll confirm your user id / email).

### Phase 2 — Content CRUD
- Salon Management (CRUD, activate/deactivate, image upload to `salons` bucket, hours editor)
- Service Management (CRUD + image)
- Category Management (CRUD + icon/image)

### Phase 3 — Operations
- Booking Management (list, filters, status updates, notes, pagination)
- User Management (list, suspend/activate via `profiles.is_active`, booking history drawer)
- Review Management (list, delete; approval flow needs a `status` column — will add)
- Enquiry Management (list, mark read/replied, delete)

### Phase 4 — Polish
- Settings (site-wide, stored in a `site_settings` singleton table)
- Admin profile page (reuse existing profile + password change)
- Real-time subscriptions on bookings + enquiries for live dashboard
- Notification triggers (DB triggers → `notifications` table on booking/enquiry events)

### Technical details
- All admin routes under `src/routes/_authenticated/admin/*` — gated by `has_role` check in `beforeLoad`.
- Reusable `<DataTable>`, `<ConfirmDialog>`, `<StatCard>`, `<ImageUploader>` in `src/components/admin/`.
- TanStack Query for all reads with `queryOptions` + invalidation on mutations.
- Zod validation on every form.
- Storage: existing `salons` and `avatars` buckets reused; add public read policy for `salons` bucket if needed.
- No changes to customer-facing routes.

### Questions before I start Phase 1
1. **Who's the admin?** Give me the email of the account that should get the `admin` role, or say "current user" and I'll grant it to whoever is signed in now.
2. **Revenue calculation**: use `sum(services.price_cents)` for completed bookings? (No payment table exists yet.)
3. **Reviews approval**: do you want a moderation flow (`status: pending|approved|rejected`), or just admin delete? Adding status is a schema change.

Reply with answers (or "your call on all three") and I'll ship Phase 1.
