import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  is_admin: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  avatar_url: z.string().trim().max(2000).nullable().optional(),
  is_active: z.boolean().optional(),
  is_admin: z.boolean().optional(),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden: admin only");
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const uid = created.user.id;
    await supabaseAdmin.from("profiles").upsert({
      id: uid,
      full_name: data.full_name,
      phone: data.phone ?? null,
      city: data.city ?? null,
    });
    if (data.is_admin) {
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "admin" });
    }
    return { id: uid };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      full_name?: string;
      phone?: string | null;
      city?: string | null;
      avatar_url?: string | null;
      is_active?: boolean;
    } = {};
    if (data.full_name !== undefined) patch.full_name = data.full_name;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.city !== undefined) patch.city = data.city;
    if (data.avatar_url !== undefined) patch.avatar_url = data.avatar_url;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    if (Object.keys(patch).length) {
      const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    if (data.is_admin !== undefined) {
      if (data.is_admin) {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: data.id, role: "admin" }, { onConflict: "user_id,role" });
      } else {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id).eq("role", "admin");
      }
    }
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("You cannot delete your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });