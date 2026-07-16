import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  ssr: false,
  component: NotificationsAdmin,
});

function NotificationsAdmin() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("id,type,title,body,created_at,read_at,user_id,user:profiles(full_name)").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const broadcast = useMutation({
    mutationFn: async () => {
      const { data: users, error: uerr } = await supabase.from("profiles").select("id").eq("is_active", true);
      if (uerr) throw uerr;
      const rows = (users ?? []).map((u) => ({ user_id: u.id, type: "broadcast", title, body }));
      if (!rows.length) return;
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Broadcast sent"); setTitle(""); setBody(""); qc.invalidateQueries({ queryKey: ["admin", "notifications"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Notifications" description="Send broadcast messages and see recent activity." />
      <Card>
        <CardHeader><CardTitle className="text-base">Broadcast to all active users</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Body</Label><Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <Button onClick={() => broadcast.mutate()} disabled={!title || broadcast.isPending}>
            <Send className="mr-1 h-4 w-4" /> {broadcast.isPending ? "Sending…" : "Send"}
          </Button>
        </CardContent>
      </Card>

      <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
        <TableHeader><TableRow>
          <TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Title</TableHead><TableHead>When</TableHead><TableHead>Read</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
          {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No notifications</TableCell></TableRow>}
          {(data as any[]).map((n) => (
            <TableRow key={n.id}>
              <TableCell>{n.user?.full_name ?? n.user_id.slice(0, 8)}</TableCell>
              <TableCell><code className="text-xs">{n.type}</code></TableCell>
              <TableCell>{n.title}</TableCell>
              <TableCell>{new Date(n.created_at).toLocaleString()}</TableCell>
              <TableCell>{n.read_at ? "Yes" : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></div></CardContent></Card>
    </div>
  );
}