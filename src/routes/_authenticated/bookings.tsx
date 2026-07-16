import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { myBookingsQuery, formatPrice } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/bookings")({
  component: BookingsPage,
  head: () => ({ meta: [{ title: "My bookings — Lustre" }] }),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function BookingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ ...myBookingsQuery(user?.id ?? ""), enabled: !!user });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings", user?.id] }); toast.success("Booking cancelled"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const now = new Date();
  const upcoming = (data ?? []).filter((b) => new Date(b.start_at) >= now && b.status !== "cancelled");
  const past = (data ?? []).filter((b) => new Date(b.start_at) < now || b.status === "cancelled");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <h1 className="font-serif text-3xl">My bookings</h1>
        <Tabs defaultValue="upcoming" className="mt-6">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past & cancelled ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {isLoading && <Skeleton className="h-24 rounded-2xl" />}
            {!isLoading && upcoming.length === 0 && <EmptyState />}
            {upcoming.map((b) => <BookingCard key={b.id} b={b} onCancel={() => cancel.mutate(b.id)} canCancel />)}
          </TabsContent>
          <TabsContent value="past" className="mt-4 space-y-3">
            {!isLoading && past.length === 0 && <p className="text-sm text-muted-foreground">No past bookings.</p>}
            {past.map((b) => <BookingCard key={b.id} b={b} />)}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed p-10 text-center">
      <p className="text-muted-foreground">No upcoming bookings.</p>
      <Button asChild className="mt-3"><Link to="/salons">Explore salons</Link></Button>
    </div>
  );
}

type Booking = {
  id: string; start_at: string; end_at: string; status: string; notes: string | null;
  salon: { id: string; name: string; city: string; cover_url: string | null } | null;
  service: { id: string; name: string; price_cents: number; duration_min: number } | null;
};

function BookingCard({ b, onCancel, canCancel }: { b: Booking; onCancel?: () => void; canCancel?: boolean }) {
  const statusColor = { pending: "secondary", confirmed: "default", completed: "outline", cancelled: "destructive" } as const;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        {b.salon?.cover_url && <img src={b.salon.cover_url} alt="" className="h-20 w-full rounded-lg object-cover sm:w-28" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{b.salon?.name ?? "Salon"}</p>
            <Badge variant={statusColor[b.status as keyof typeof statusColor] ?? "secondary"}>{b.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{b.service?.name} · {format(new Date(b.start_at), "PPp")}</p>
          {b.service && <p className="text-xs text-muted-foreground">{b.service.duration_min} min · {formatPrice(b.service.price_cents)}</p>}
        </div>
        {canCancel && onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        )}
      </CardContent>
    </Card>
  );
}