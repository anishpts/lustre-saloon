import { supabase } from "@/integrations/supabase/client";

export type SalonRow = {
  id?: string;
  name: string;
  description?: string | null;
  city: string;
  address?: string | null;
  phone?: string | null;
  cover_url?: string | null;
  is_featured?: boolean;
  is_active?: boolean;
  category_ids?: string[];
};

export async function upsertSalon(input: SalonRow) {
  const { category_ids = [], id, ...rest } = input;
  const payload = { ...rest };
  let salonId = id;
  if (id) {
    const { error } = await supabase.from("salons").update(payload).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("salons").insert(payload).select("id").single();
    if (error) throw error;
    salonId = data!.id;
  }
  if (salonId) {
    await supabase.from("salon_categories").delete().eq("salon_id", salonId);
    if (category_ids.length) {
      const rows = category_ids.map((cid) => ({ salon_id: salonId!, category_id: cid }));
      const { error } = await supabase.from("salon_categories").insert(rows);
      if (error) throw error;
    }
  }
  return salonId!;
}

export async function deleteRow(table: "salons" | "services" | "categories" | "reviews" | "enquiries", id: string) {
  const { error } = await supabase.from(table as any).delete().eq("id", id);
  if (error) throw error;
}