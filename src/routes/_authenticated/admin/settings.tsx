import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/page-header";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  ssr: false,
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data ?? { id: 1, business_name: "", business_email: "", business_phone: "", address: "", social: {}, logo_url: null, banner_url: null };
    },
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, id: 1 };
      const { error } = await (supabase as any).from("site_settings").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin", "settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !form) return <div className="p-4 text-muted-foreground">Loading…</div>;

  const social = form.social ?? {};

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Business info shown across the site." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Business</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Name</Label><Input value={form.business_name ?? ""} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.business_email ?? ""} onChange={(e) => setForm({ ...form, business_email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.business_phone ?? ""} onChange={(e) => setForm({ ...form, business_phone: e.target.value })} /></div>
            <div><Label>Address</Label><Textarea rows={2} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Brand</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <ImageUploader bucket="salons" value={form.logo_url} onChange={(url) => setForm({ ...form, logo_url: url })} label="Logo" aspect="aspect-square max-w-[140px]" />
            <ImageUploader bucket="salons" value={form.banner_url} onChange={(url) => setForm({ ...form, banner_url: url })} label="Banner" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Social</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {["facebook", "instagram", "twitter", "tiktok", "youtube"].map((k) => (
              <div key={k}><Label className="capitalize">{k}</Label><Input value={social[k] ?? ""} onChange={(e) => setForm({ ...form, social: { ...social, [k]: e.target.value } })} /></div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end"><Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save settings"}</Button></div>
    </div>
  );
}