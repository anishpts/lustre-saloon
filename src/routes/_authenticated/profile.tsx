import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { myProfileQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Your profile — Lustre" }] }),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const schema = z.object({
  full_name: z.string().trim().max(100),
  phone: z.string().trim().max(30),
  city: z.string().trim().max(80),
});

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({ ...myProfileQuery(user?.id ?? ""), enabled: !!user });

  const [form, setForm] = useState({ full_name: "", phone: "", city: "" });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "", city: profile.city ?? "" });
    if (profile.avatar_url) {
      supabase.storage.from("avatars").createSignedUrl(profile.avatar_url, 3600)
        .then(({ data }) => data && setAvatarUrl(data.signedUrl));
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse(form);
      if (!user) throw new Error("No user");
      const { error } = await supabase.from("profiles").update(parsed).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile", user?.id] }); toast.success("Profile saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("No user");
      if (file.size > 2 * 1024 * 1024) throw new Error("Max 2MB");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (error) throw error;
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      if (data) setAvatarUrl(data.signedUrl);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile", user?.id] }); toast.success("Avatar updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <h1 className="font-serif text-3xl">Your profile</h1>
        {isLoading ? <Skeleton className="mt-6 h-64 rounded-2xl" /> : (
          <Card className="mt-6">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  {avatarUrl && <AvatarImage src={avatarUrl} />}
                  <AvatarFallback>{(form.full_name || user?.email || "?").slice(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadAvatar.mutate(e.target.files[0])} />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploadAvatar.isPending}>
                    <Upload className="mr-2 h-4 w-4" />{uploadAvatar.isPending ? "Uploading…" : "Change photo"}
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">JPG or PNG · max 2MB</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Full name</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" />
                </div>
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}