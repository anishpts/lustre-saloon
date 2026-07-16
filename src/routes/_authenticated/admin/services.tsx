import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteRow } from "@/lib/admin-mutations";

export const Route = createFileRoute("/_authenticated/admin/services")({
  ssr: false,
  component: ServicesAdmin,
});

type Svc = {
  id: string; name: string; description: string | null;
  price_cents: number; duration_min: number; is_active: boolean;
  salon_id: string; category_id: string | null;
  salon: { name: string } | null; category: { name: string } | null;
};

function ServicesAdmin() {
  const qc = useQueryClient();
  const [salonFilter, setSalonFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Svc | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Svc | null>(null);
  const [form, setForm] = useState<any>({
    name: "", description: "", price_cents: 0, duration_min: 30, is_active: true, salon_id: "", category_id: null,
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["admin", "services", salonFilter],
    queryFn: async () => {
      let q = supabase.from("services").select("id,name,description,price_cents,duration_min,is_active,salon_id,category_id,salon:salons(name),category:categories(name)").order("created_at", { ascending: false });
      if (salonFilter !== "all") q = q.eq("salon_id", salonFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Svc[];
    },
  });

  const { data: salons = [] } = useQuery({
    queryKey: ["salons", "picker"],
    queryFn: async () => (await supabase.from("salons").select("id,name").order("name")).data ?? [],
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "picker"],
    queryFn: async () => (await supabase.from("categories").select("id,name").order("sort_order")).data ?? [],
  });

  const openNew = () => { setEditing(null); setForm({ name: "", description: "", price_cents: 0, duration_min: 30, is_active: true, salon_id: salons[0]?.id ?? "", category_id: null }); setOpen(true); };
  const openEdit = (s: Svc) => { setEditing(s); setForm({ id: s.id, name: s.name, description: s.description ?? "", price_cents: s.price_cents, duration_min: s.duration_min, is_active: s.is_active, salon_id: s.salon_id, category_id: s.category_id }); setOpen(true); };

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, description: form.description || null, price_cents: Math.round(Number(form.price_cents)), duration_min: Number(form.duration_min), is_active: form.is_active, salon_id: form.salon_id, category_id: form.category_id || null };
      if (form.id) {
        const { error } = await supabase.from("services").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["services"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (s: Svc) => deleteRow("services", s.id),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin"] }); setToDelete(null); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Services" description="Prices, durations and availability." actions={
        <>
          <Select value={salonFilter} onValueChange={setSalonFilter}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Filter salon" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All salons</SelectItem>
              {(salons as any[]).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openNew} disabled={!salons.length}><Plus className="mr-1 h-4 w-4" /> New service</Button>
        </>
      } />

      <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
        <TableHeader><TableRow>
          <TableHead>Name</TableHead><TableHead>Salon</TableHead><TableHead>Category</TableHead>
          <TableHead>Price</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
          {!isLoading && services.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No services</TableCell></TableRow>}
          {services.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>{s.salon?.name ?? "—"}</TableCell>
              <TableCell>{s.category?.name ?? "—"}</TableCell>
              <TableCell>${(s.price_cents / 100).toFixed(2)}</TableCell>
              <TableCell>{s.duration_min} min</TableCell>
              <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Hidden"}</Badge></TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setToDelete(s)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></div></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit service" : "New service"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Salon</Label>
              <Select value={form.salon_id} onValueChange={(v) => setForm({ ...form, salon_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(salons as any[]).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Price (cents)</Label><Input type="number" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: e.target.value })} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} /></div>
            </div>
            <div><Label>Category</Label>
              <Select value={form.category_id ?? "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {(categories as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded border p-2">
              <Label htmlFor="svc-active">Active</Label>
              <Switch id="svc-active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || !form.salon_id || save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)} title="Delete service?" description={toDelete?.name} confirmLabel="Delete" destructive onConfirm={() => toDelete && del.mutate(toDelete)} />
    </div>
  );
}