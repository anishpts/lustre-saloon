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
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteRow } from "@/lib/admin-mutations";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  ssr: false,
  component: CategoriesAdmin,
});

type Cat = { id: string; name: string; slug: string; icon: string | null; sort_order: number };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function CategoriesAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [toDelete, setToDelete] = useState<Cat | null>(null);
  const [form, setForm] = useState<{ id?: string; name: string; slug: string; icon: string; sort_order: number }>({ name: "", slug: "", icon: "", sort_order: 0 });

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name,slug,icon,sort_order").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Cat[];
    },
  });

  const openNew = () => { setEditing(null); setForm({ name: "", slug: "", icon: "", sort_order: (data.at(-1)?.sort_order ?? 0) + 1 }); setOpen(true); };
  const openEdit = (c: Cat) => { setEditing(c); setForm({ id: c.id, name: c.name, slug: c.slug, icon: c.icon ?? "", sort_order: c.sort_order }); setOpen(true); };

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, slug: form.slug || slugify(form.name), icon: form.icon || null, sort_order: form.sort_order };
      if (form.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["categories"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (c: Cat) => deleteRow("categories", c.id),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin"] }); setToDelete(null); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Categories" description="Group services by category." actions={
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> New category</Button>
      } />
      <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Icon</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
          {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No categories</TableCell></TableRow>}
          {data.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.sort_order}</TableCell>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="text-muted-foreground">{c.slug}</TableCell>
              <TableCell>{c.icon ?? "—"}</TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setToDelete(c)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></div></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div><Label>Icon (lucide name)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="scissors" /></div>
            <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)} title="Delete category?" description={toDelete?.name} confirmLabel="Delete" destructive onConfirm={() => toDelete && del.mutate(toDelete)} />
    </div>
  );
}