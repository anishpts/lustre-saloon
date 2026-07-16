import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MapPin, Phone, Clock, Heart, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format, addMinutes, startOfDay, addDays, isBefore } from "date-fns";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  salonDetailQuery, salonServicesQuery, salonReviewsQuery, favoriteIdsQuery, formatPrice,
} from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/salons/$id")({
  ssr: false,
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(salonDetailQuery(params.id));
    context.queryClient.ensureQueryData(salonServicesQuery(params.id));
    context.queryClient.ensureQueryData(salonReviewsQuery(params.id));
  },
  component: SalonDetail,
  head: ({ loaderData: _ }) => ({ meta: [{ title: "Salon — Lustre" }] }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-5xl p-8"><p className="text-destructive">{error.message}</p></main></div>
  ),
  notFoundComponent: () => <div className="p-12">Salon not found.</div>,
});

type Service = { id: string; name: string; description: string | null; price_cents: number; duration_min: number };

function SalonDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: salon } = useSuspenseQuery(salonDetailQuery(id));
  const { data: services } = useSuspenseQuery(salonServicesQuery(id));
  const { data: reviews } = useSuspenseQuery(salonReviewsQuery(id));
  const { data: favIds } = useQuery({ ...favoriteIdsQuery(user?.id ?? ""), enabled: !!user });
  const isFav = !!user && favIds?.has(id);

  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in first");
      if (isFav) {
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("salon_id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favorites").insert({ user_id: user.id, salon_id: id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorite-ids", user?.id] });
      qc.invalidateQueries({ queryKey: ["favorites", user?.id] });
      toast.success(isFav ? "Removed from favorites" : "Added to favorites");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const images = [salon.cover_url, ...(salon.salon_images ?? []).sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url)].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        {/* Gallery */}
        <div className="grid grid-cols-1 gap-2 overflow-hidden rounded-2xl sm:grid-cols-4 sm:grid-rows-2">
          {images[0] && <img src={images[0]} alt={salon.name} className="aspect-[4/3] h-full w-full object-cover sm:col-span-2 sm:row-span-2" />}
          {images.slice(1, 5).map((u, i) => (
            <img key={i} src={u} alt="" className="hidden aspect-[4/3] h-full w-full object-cover sm:block" />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-serif text-3xl sm:text-4xl">{salon.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-current text-primary" />{salon.rating_avg.toFixed(1)} ({salon.rating_count})</span>
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{salon.city}{salon.address ? `, ${salon.address}` : ""}</span>
                  {salon.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{salon.phone}</span>}
                </div>
              </div>
              <Button
                variant={isFav ? "default" : "outline"}
                onClick={() => (user ? toggleFav.mutate() : navigate({ to: "/auth" }))}
                className="gap-2"
              >
                <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
                {isFav ? "Saved" : "Save"}
              </Button>
            </div>
            {salon.description && <p className="mt-4 text-muted-foreground">{salon.description}</p>}

            <Tabs defaultValue="services" className="mt-8">
              <TabsList>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
                <TabsTrigger value="hours">Hours</TabsTrigger>
              </TabsList>
              <TabsContent value="services" className="mt-4 space-y-3">
                {services.length === 0 && <p className="text-sm text-muted-foreground">No services listed yet.</p>}
                {services.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-medium">{s.name}</p>
                        {s.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{s.description}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">{s.duration_min} min · {formatPrice(s.price_cents)}</p>
                      </div>
                      <Button size="sm" onClick={() => (user ? setBookingService(s) : navigate({ to: "/auth" }))}>Book</Button>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="reviews" className="mt-4 space-y-3">
                {user && (
                  <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>Write a review</Button>
                )}
                {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
                {reviews.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("h-3.5 w-3.5", i < r.rating ? "fill-current text-primary" : "text-muted")} />
                        ))}
                        <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "PP")}</span>
                      </div>
                      {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="hours" className="mt-4">
                <Card><CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />Typical hours 9:00 — 19:00</div>
                </CardContent></Card>
              </TabsContent>
            </Tabs>
          </div>

          <aside className="lg:w-80">
            <Card>
              <CardContent className="p-5">
                <p className="font-serif text-lg">Ready to book?</p>
                <p className="mt-1 text-sm text-muted-foreground">Pick a service and time that fits.</p>
                <Button className="mt-4 w-full gap-2" onClick={() => (user ? setBookingService(services[0] ?? null) : navigate({ to: "/auth" }))} disabled={services.length === 0}>
                  <CalendarIcon className="h-4 w-4" /> Book now
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      {bookingService && user && (
        <BookingDialog service={bookingService} salonId={id} userId={user.id} onClose={() => setBookingService(null)} />
      )}
      {reviewOpen && user && (
        <ReviewDialog salonId={id} userId={user.id} onClose={() => setReviewOpen(false)} />
      )}
    </div>
  );
}

function BookingDialog({ service, salonId, userId, onClose }: { service: Service; salonId: string; userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [time, setTime] = useState<string>("10:00");
  const [notes, setNotes] = useState("");

  const slots: string[] = [];
  for (let h = 9; h < 19; h++) for (const m of [0, 30]) slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

  const book = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error("Pick a date");
      const [h, m] = time.split(":").map(Number);
      const start = new Date(date); start.setHours(h, m, 0, 0);
      if (isBefore(start, new Date())) throw new Error("Pick a future time");
      const end = addMinutes(start, service.duration_min);
      const { data: conflicts, error: cErr } = await supabase
        .from("bookings")
        .select("id")
        .eq("salon_id", salonId)
        .in("status", ["pending", "confirmed"])
        .lt("start_at", end.toISOString())
        .gt("end_at", start.toISOString());
      if (cErr) throw cErr;
      if ((conflicts ?? []).length > 0) throw new Error("That time is already booked. Try another slot.");
      const { error } = await supabase.from("bookings").insert({
        user_id: userId, salon_id: salonId, service_id: service.id,
        start_at: start.toISOString(), end_at: end.toISOString(), notes: notes || null, status: "pending",
      });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: userId, type: "booking_created", title: "Booking requested",
        body: `${service.name} on ${format(start, "PPpp")}`, data: { salon_id: salonId },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings", userId] });
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
      toast.success("Booking requested!");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Book {service.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Date</Label>
            <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => isBefore(d, startOfDay(new Date()))} className="pointer-events-auto rounded-md border p-3" />
          </div>
          <div>
            <Label className="mb-2 block">Time</Label>
            <div className="grid grid-cols-4 gap-2">
              {slots.map((s) => (
                <Button key={s} type="button" size="sm" variant={time === s ? "default" : "outline"} onClick={() => setTime(s)}>{s}</Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the salon should know?" rows={2} />
          </div>
          <p className="text-sm text-muted-foreground">{service.duration_min} min · {formatPrice(service.price_cents)}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => book.mutate()} disabled={book.isPending}>{book.isPending ? "Booking…" : "Confirm booking"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({ salonId, userId, onClose }: { salonId: string; userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reviews").insert({ salon_id: salonId, user_id: userId, rating, comment: comment || null });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salon-reviews", salonId] });
      qc.invalidateQueries({ queryKey: ["salon", salonId] });
      toast.success("Thanks for your review!");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Write a review</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)}>
                <Star className={cn("h-7 w-7", n <= rating ? "fill-current text-primary" : "text-muted")} />
              </button>
            ))}
          </div>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience…" rows={4} maxLength={1000} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}