import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { myNotificationsQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
  head: () => ({ meta: [{ title: "Notifications — Lustre" }] }),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ ...myNotificationsQuery(user?.id ?? ""), enabled: !!user });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
          const n = payload.new as { title: string };
          toast(n.title);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="font-serif text-3xl">Notifications</h1>
        <div className="mt-6 space-y-3">
          {isLoading && <Skeleton className="h-20 rounded-xl" />}
          {!isLoading && (data ?? []).length === 0 && (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              <Bell className="mx-auto mb-2 h-6 w-6" />You're all caught up.
            </div>
          )}
          {(data ?? []).map((n) => (
            <Card key={n.id} className={n.read_at ? "opacity-70" : ""}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className={`mt-1 h-2 w-2 rounded-full ${n.read_at ? "bg-muted" : "bg-primary"}`} />
                <div className="flex-1">
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
                {!n.read_at && (
                  <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)}>
                    <Check className="mr-1 h-4 w-4" />Read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}