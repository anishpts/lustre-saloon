import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,icon,image_url,sort_order")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

export const featuredSalonsQuery = () =>
  queryOptions({
    queryKey: ["salons", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select("id,name,description,city,cover_url,rating_avg,rating_count")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("rating_avg", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

export const popularServicesQuery = () =>
  queryOptions({
    queryKey: ["services", "popular"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,price_cents,duration_min,salon:salons(id,name,city,cover_url)")
        .eq("is_active", true)
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

export function formatPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export const PAGE_SIZE = 9;

export type SalonListParams = {
  q?: string;
  city?: string;
  category?: string;
  minRating?: number;
  page: number;
};

export const salonsListQuery = (p: SalonListParams) =>
  queryOptions({
    queryKey: ["salons", "list", p],
    queryFn: async () => {
      const from = (p.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let categorySalonIds: string[] | undefined;

      if (p.category) {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        let categoryId = p.category;

        if (!uuidPattern.test(p.category)) {
          const { data: category, error: categoryError } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", p.category)
            .maybeSingle();

          if (categoryError) throw categoryError;
          if (!category) return { rows: [], count: 0 };
          categoryId = category.id;
        }

        const { data: matches, error: matchesError } = await supabase
          .from("salon_categories")
          .select("salon_id")
          .eq("category_id", categoryId);

        if (matchesError) throw matchesError;
        categorySalonIds = [...new Set((matches ?? []).map((row) => row.salon_id))];
        if (categorySalonIds.length === 0) return { rows: [], count: 0 };
      }

      let query = supabase
        .from("salons")
        .select(
          "id,name,description,city,cover_url,rating_avg,rating_count",
          { count: "exact" },
        )
        .eq("is_active", true);
      if (p.q) query = query.or(`name.ilike.%${p.q}%,description.ilike.%${p.q}%,city.ilike.%${p.q}%`);
      if (p.city) query = query.ilike("city", `%${p.city}%`);
      if (p.minRating && p.minRating > 0) query = query.gte("rating_avg", p.minRating);
      if (categorySalonIds) query = query.in("id", categorySalonIds);
      query = query.order("rating_avg", { ascending: false }).range(from, to);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

export const salonDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["salon", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select(
          "id,name,description,city,address,phone,cover_url,rating_avg,rating_count,hours,is_active,salon_images(id,url,sort_order)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Salon not found");
      return data;
    },
  });

export const salonServicesQuery = (salonId: string) =>
  queryOptions({
    queryKey: ["salon-services", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,description,price_cents,duration_min,category_id")
        .eq("salon_id", salonId)
        .eq("is_active", true)
        .order("price_cents");
      if (error) throw error;
      return data ?? [];
    },
  });

export const salonReviewsQuery = (salonId: string) =>
  queryOptions({
    queryKey: ["salon-reviews", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id,rating,comment,created_at")
        .eq("salon_id", salonId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

export const myBookingsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["bookings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id,start_at,end_at,status,notes,created_at,salon:salons(id,name,city,cover_url),service:services(id,name,price_cents,duration_min)",
        )
        .eq("user_id", userId)
        .order("start_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const myFavoritesQuery = (userId: string) =>
  queryOptions({
    queryKey: ["favorites", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("salon:salons(id,name,city,cover_url,rating_avg,rating_count)")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.salon).filter(Boolean) as Array<{
        id: string; name: string; city: string; cover_url: string | null; rating_avg: number; rating_count: number;
      }>;
    },
  });

export const favoriteIdsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["favorite-ids", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("salon_id").eq("user_id", userId);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.salon_id));
    },
  });

export const myNotificationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,type,title,body,data,read_at,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

export const myProfileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,phone,city,avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });