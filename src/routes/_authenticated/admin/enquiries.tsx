import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { deleteRow } from "@/lib/admin-mutations";

export const Route = createFileRoute("/_authenticated/admin/enquiries")({
  ssr: false,
  component: EnquiriesAdmin,
});

const STATUSES = ["new", "in_progress", "resolved", "archived"] as const;

function EnquiriesAdmin() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [viewing, setViewing] = useState<any | null>(null);
  const [toDelete, setToDelete] = useState<any | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "enquiries", status],
    queryFn: async () => {
      let q: any = (supabase as any).from("enquiries").select("*").order("created_at", { ascending: false }).limit(200);
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: string }) => {
      const { error } = await (supabase as any).from("enquiries").update({ status: s }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (r: any) => deleteRow("enquiries", r.id),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin"] }); setToDelete(null); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Enquiries" description="Messages from your contact form." actions={
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      } />
      <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
        <TableHeader><TableRow>
          <TableHead>From</TableHead><TableHead>Subject</TableHead><TableHead>When</TableHead>
          <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
          {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No enquiries</TableCell></TableRow>}
          {(data as any[]).map((e) => (
            <TableRow key={e.id}>
              <TableCell><div className="font-medium">{e.name}</div><div className="text-xs text-muted-foreground">{e.email}</div></TableCell>
              <TableCell className="max-w-xs truncate">{e.subject}</TableCell>
              <TableCell>{new Date(e.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <Select value={e.status} onValueChange={(v) => update.mutate({ id: e.id, s: v })}>
                  <SelectTrigger className="h-8 w-32"><SelectValue asChild><Badge variant="outline">{e.status}</Badge></SelectValue></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => setViewing(e)}><Eye className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setToDelete(e)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></div></CardContent></Card>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{viewing?.subject}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p><b>From:</b> {viewing?.name} &lt;{viewing?.email}&gt;</p>
            {viewing?.phone && <p><b>Phone:</b> {viewing.phone}</p>}
            <p className="whitespace-pre-wrap rounded border bg-muted/30 p-3">{viewing?.message}</p>
            <p className="text-xs text-muted-foreground">{viewing && new Date(viewing.created_at).toLocaleString()}</p>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)} title="Delete enquiry?" confirmLabel="Delete" destructive onConfirm={() => toDelete && del.mutate(toDelete)} />
    </div>
  );
}