import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function count(table: string, filter?: (q: any) => any) {
  let q: any = supabase.from(table as any).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: c, error } = await q;
  if (error) throw error;
  return c ?? 0;
}

export const adminStatsQuery = () =>
  queryOptions({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const [
        users,
        salons,
        services,
        categories,
        bookings,
        todayBookings,
        pending,
        confirmed,
        cancelled,
        completed,
        reviews,
        enquiries,
      ] = await Promise.all([
        count("profiles"),
        count("salons"),
        count("services"),
        count("categories"),
        count("bookings"),
        count("bookings", (q) => q.gte("start_at", startOfDay.toISOString())),
        count("bookings", (q) => q.eq("status", "pending")),
        count("bookings", (q) => q.eq("status", "confirmed")),
        count("bookings", (q) => q.eq("status", "cancelled")),
        count("bookings", (q) => q.eq("status", "completed")),
        count("reviews"),
        count("enquiries"),
      ]);

      // Revenue: sum(service.price_cents) for completed bookings
      const { data: completedRows, error: revErr } = await supabase
        .from("bookings")
        .select("service:services(price_cents)")
        .eq("status", "completed");
      if (revErr) throw revErr;
      const revenueCents = (completedRows ?? []).reduce(
        (sum: number, r: any) => sum + (r.service?.price_cents ?? 0),
        0,
      );

      return {
        users,
        salons,
        services,
        categories,
        bookings,
        todayBookings,
        pending,
        confirmed,
        cancelled,
        completed,
        reviews,
        enquiries,
        revenueCents,
      };
    },
  });

export const recentBookingsQuery = () =>
  queryOptions({
    queryKey: ["admin", "recent-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id,status,start_at,created_at,salon:salons(name),service:services(name,price_cents)",
        )
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

export const recentUsersQuery = () =>
  queryOptions({
    queryKey: ["admin", "recent-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,city,avatar_url,created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

export const recentEnquiriesQuery = () =>
  queryOptions({
    queryKey: ["admin", "recent-enquiries"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("enquiries")
        .select("id,name,email,subject,status,created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        email: string;
        subject: string;
        status: string;
        created_at: string;
      }>;
    },
  });

export const monthlyBookingsQuery = () =>
  queryOptions({
    queryKey: ["admin", "monthly-bookings"],
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 5);
      since.setDate(1);
      since.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("bookings")
        .select("created_at,status")
        .gte("created_at", since.toISOString());
      if (error) throw error;
      const buckets = new Map<string, { month: string; count: number; revenue: number }>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets.set(key, {
          month: d.toLocaleString("en", { month: "short" }),
          count: 0,
          revenue: 0,
        });
      }
      for (const row of data ?? []) {
        const d = new Date(row.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const bucket = buckets.get(key);
        if (bucket) bucket.count += 1;
      }
      return Array.from(buckets.values());
    },
  });

export const popularSalonsQuery = () =>
  queryOptions({
    queryKey: ["admin", "popular-salons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("salon:salons(id,name)")
        .limit(500);
      if (error) throw error;
      const map = new Map<string, { name: string; count: number }>();
      for (const row of (data ?? []) as any[]) {
        const s = row.salon;
        if (!s) continue;
        const existing = map.get(s.id) ?? { name: s.name, count: 0 };
        existing.count += 1;
        map.set(s.id, existing);
      }
      return Array.from(map.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
  });

export const popularServicesQueryAdmin = () =>
  queryOptions({
    queryKey: ["admin", "popular-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("service:services(id,name)")
        .limit(500);
      if (error) throw error;
      const map = new Map<string, { name: string; count: number }>();
      for (const row of (data ?? []) as any[]) {
        const s = row.service;
        if (!s) continue;
        const existing = map.get(s.id) ?? { name: s.name, count: 0 };
        existing.count += 1;
        map.set(s.id, existing);
      }
      return Array.from(map.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
  });