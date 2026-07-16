import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Star, StarOff } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/page-header";
import { ImageUploader } from "@/components/admin/image-uploader";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { upsertSalon, deleteRow, type SalonRow } from "@/lib/admin-mutations";

export const Route = createFileRoute("/_authenticated/admin/salons")({
  ssr: false,
  component: SalonsAdmin,
});

type Salon = {
  id: string; name: string; city: string; phone: string | null;
  cover_url: string | null; is_active: boolean; is_featured: boolean;
  rating_avg: number; rating_count: number;
  salon_categories: { category_id: string }[];
};

function SalonsAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Salon | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Salon | null>(null);

  const { data: salons = [], isLoading } = useQuery({
    queryKey: ["admin", "salons", search],
    queryFn: async () => {
      let q = supabase.from("salons").select("id,name,city,phone,cover_url,is_active,is_featured,rating_avg,rating_count,salon_categories(category_id)").order("created_at", { ascending: false });
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Salon[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async (s: Salon) => {
      const { error } = await supabase.from("salons").update({ is_featured: !s.is_featured }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "salons"] }),
  });

  const toggleActive = useMutation({
    mutationFn: async (s: Salon) => {
      const { error } = await supabase.from("salons").update({ is_active: !s.is_active }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "salons"] }),
  });

  const del = useMutation({
    mutationFn: (s: Salon) => deleteRow("salons", s.id),
    onSuccess: () => {
      toast.success("Salon deleted");
      qc.invalidateQueries({ queryKey: ["admin"] });
      setToDelete(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Salons"
        description="Add, edit and moderate salons."
        actions={
          <>
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-48" />
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" /> New salon
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salon</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
                {!isLoading && salons.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No salons</TableCell></TableRow>}
                {salons.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
                          {s.cover_url && <img src={s.cover_url} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.phone ?? "—"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{s.city}</TableCell>
                    <TableCell>{Number(s.rating_avg).toFixed(1)} ({s.rating_count})</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Hidden"}</Badge>
                        {s.is_featured && <Badge variant="outline">Featured</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => toggleFeatured.mutate(s)} title="Toggle featured">
                          {s.is_featured ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => toggleActive.mutate(s)} title="Toggle active">
                          <Switch checked={s.is_active} className="pointer-events-none" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setToDelete(s)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SalonDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        categories={categories as { id: string; name: string }[]}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin"] });
          qc.invalidateQueries({ queryKey: ["salons"] });
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete salon?"
        description={`"${toDelete?.name}" and all its services & bookings will be removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => toDelete && del.mutate(toDelete)}
      />
    </div>
  );
}

function SalonDialog({
  open, onOpenChange, editing, categories, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Salon | null;
  categories: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SalonRow>({
    name: "", city: "", description: "", address: "", phone: "", cover_url: null,
    is_featured: false, is_active: true, category_ids: [],
  });

  // reset form when editing changes / opens
  const key = editing?.id ?? "new";
  const [initKey, setInitKey] = useState(key);
  if (open && initKey !== key) {
    setInitKey(key);
    if (editing) {
      setForm({
        id: editing.id,
        name: editing.name,
        city: editing.city,
        phone: editing.phone ?? "",
        cover_url: editing.cover_url,
        is_featured: editing.is_featured,
        is_active: editing.is_active,
        description: "",
        address: "",
        category_ids: editing.salon_categories?.map((c) => c.category_id) ?? [],
      });
      // load full record fields not in list
      supabase.from("salons").select("description,address").eq("id", editing.id).single().then(({ data }) => {
        if (data) setForm((f) => ({ ...f, description: data.description ?? "", address: data.address ?? "" }));
      });
    } else {
      setForm({ name: "", city: "", description: "", address: "", phone: "", cover_url: null, is_featured: false, is_active: true, category_ids: [] });
    }
  }

  const save = useMutation({
    mutationFn: () => upsertSalon(form),
    onSuccess: () => {
      toast.success(editing ? "Salon updated" : "Salon created");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit salon" : "New salon"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <ImageUploader bucket="salons" value={form.cover_url ?? null} onChange={(url) => setForm({ ...form, cover_url: url })} label="Cover image" />
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="Address"><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div>
            <Label>Categories</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {categories.map((c) => {
                const on = form.category_ids?.includes(c.id);
                return (
                  <Badge
                    key={c.id}
                    variant={on ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setForm({
                      ...form,
                      category_ids: on ? form.category_ids!.filter((x) => x !== c.id) : [...(form.category_ids ?? []), c.id],
                    })}
                  >{c.name}</Badge>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between rounded border p-2"><Label htmlFor="active">Active</Label><Switch id="active" checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
          <div className="flex items-center justify-between rounded border p-2"><Label htmlFor="feat">Featured</Label><Switch id="feat" checked={!!form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!form.name || !form.city || save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div><Label>{label}</Label><div className="mt-1">{children}</div></div>
  );
}