import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  ssr: false,
  component: BookingsAdmin,
});

const STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;
type Status = typeof STATUSES[number];

const badgeVariant: Record<Status, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline", confirmed: "default", completed: "secondary", cancelled: "destructive",
};

function BookingsAdmin() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "bookings", status],
    queryFn: async () => {
      let q = supabase.from("bookings").select("id,status,start_at,end_at,notes,created_at,salon:salons(name),service:services(name,price_cents),user:profiles(full_name,phone)").order("start_at", { ascending: false }).limit(200);
      if (status !== "all") q = q.eq("status", status as Status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: Status }) => {
      const { error } = await supabase.from("bookings").update({ status: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Booking updated"); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Bookings" description="View and manage all bookings." actions={
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
          <TableHead>Customer</TableHead><TableHead>Salon</TableHead><TableHead>Service</TableHead>
          <TableHead>When</TableHead><TableHead>Status</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
          {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No bookings</TableCell></TableRow>}
          {(data as any[]).map((b) => (
            <TableRow key={b.id}>
              <TableCell><div className="font-medium">{b.user?.full_name ?? "—"}</div><div className="text-xs text-muted-foreground">{b.user?.phone ?? ""}</div></TableCell>
              <TableCell>{b.salon?.name ?? "—"}</TableCell>
              <TableCell><div>{b.service?.name}</div><div className="text-xs text-muted-foreground">${((b.service?.price_cents ?? 0) / 100).toFixed(2)}</div></TableCell>
              <TableCell>{new Date(b.start_at).toLocaleString()}</TableCell>
              <TableCell>
                <Select value={b.status} onValueChange={(v) => update.mutate({ id: b.id, next: v as Status })}>
                  <SelectTrigger className="h-8 w-32"><SelectValue asChild><Badge variant={badgeVariant[b.status as Status]}>{b.status}</Badge></SelectValue></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></div></CardContent></Card>
    </div>
  );
}