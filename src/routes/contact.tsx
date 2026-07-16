import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Lustre" },
      { name: "description", content: "Get in touch with our salon booking team." },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().min(1).max(150),
  message: z.string().trim().min(1).max(2000),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  const submit = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse(form);
      const { error } = await (supabase as any).from("enquiries").insert(parsed);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Message sent — we'll be in touch."); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); },
    onError: (e: any) => toast.error(e.issues?.[0]?.message ?? e.message),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <Card>
        <CardHeader><CardTitle className="font-serif text-2xl">Contact us</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone (optional)</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><Label>Message</Label><Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="w-full">
            {submit.isPending ? "Sending…" : "Send message"}
          </Button>
        </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}