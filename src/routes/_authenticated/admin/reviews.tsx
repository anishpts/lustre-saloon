import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, X, Trash2, Star } from "lucide-react";
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
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { deleteRow } from "@/lib/admin-mutations";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  ssr: false,
  component: ReviewsAdmin,
});

function ReviewsAdmin() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("pending");
  const [toDelete, setToDelete] = useState<any | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "reviews", status],
    queryFn: async () => {
      let q = supabase.from("reviews").select("id,rating,comment,status,created_at,user:profiles(full_name),salon:salons(name)").order("created_at", { ascending: false }).limit(200);
      if (status !== "all") q = q.eq("status", status as any);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatusMut = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: "approved" | "rejected" | "pending" }) => {
      const { error } = await supabase.from("reviews").update({ status: s }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Review updated"); qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["salons"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (r: any) => deleteRow("reviews", r.id),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin"] }); setToDelete(null); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Reviews" description="Approve, reject, or delete customer reviews." actions={
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      } />
      <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
        <TableHeader><TableRow>
          <TableHead>Salon</TableHead><TableHead>User</TableHead><TableHead>Rating</TableHead>
          <TableHead>Comment</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
          {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No reviews</TableCell></TableRow>}
          {(data as any[]).map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.salon?.name ?? "—"}</TableCell>
              <TableCell>{r.user?.full_name ?? "—"}</TableCell>
              <TableCell><div className="flex items-center gap-1">{r.rating} <Star className="h-3 w-3 fill-current" /></div></TableCell>
              <TableCell className="max-w-xs truncate" title={r.comment ?? ""}>{r.comment ?? "—"}</TableCell>
              <TableCell><Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>{r.status}</Badge></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {r.status !== "approved" && <Button size="icon" variant="ghost" onClick={() => setStatusMut.mutate({ id: r.id, s: "approved" })}><Check className="h-4 w-4" /></Button>}
                  {r.status !== "rejected" && <Button size="icon" variant="ghost" onClick={() => setStatusMut.mutate({ id: r.id, s: "rejected" })}><X className="h-4 w-4" /></Button>}
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setToDelete(r)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></div></CardContent></Card>
      <ConfirmDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)} title="Delete review?" confirmLabel="Delete" destructive onConfirm={() => toDelete && del.mutate(toDelete)} />
    </div>
  );
}