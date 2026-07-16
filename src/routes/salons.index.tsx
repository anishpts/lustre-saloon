import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Star, MapPin, SlidersHorizontal, Loader2, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { salonsListQuery, categoriesQuery, favoriteIdsQuery, PAGE_SIZE } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type SearchParams = { q?: string; city?: string; category?: string; minRating?: number; page?: number };

export const Route = createFileRoute("/salons/")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : undefined,
    city: typeof s.city === "string" ? s.city : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    minRating: typeof s.minRating === "number" ? s.minRating : Number(s.minRating) || undefined,
    page: typeof s.page === "number" ? s.page : Number(s.page) || undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.ensureQueryData(categoriesQuery());
    context.queryClient.ensureQueryData(
      salonsListQuery({
        q: deps.q,
        city: deps.city,
        category: deps.category,
        minRating: deps.minRating,
        page: deps.page ?? 1,
      }),
    );
  },
  component: SalonsPage,
  head: () => ({
    meta: [
      { title: "Explore salons — Lustre" },
      { name: "description", content: "Discover premium salons near you and book in seconds." },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-6xl px-4 py-12"><p className="text-destructive">{error.message}</p></main></div>
  ),
  notFoundComponent: () => <div className="p-12">No salons.</div>,
});

function SalonsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/salons" });
  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => setQ(search.q ?? ""), [search.q]);

  const page = search.page ?? 1;
  const { data: categories } = useSuspenseQuery(categoriesQuery());
  const { data, isFetching } = useQuery(
    salonsListQuery({ q: search.q, city: search.city, category: search.category, minRating: search.minRating, page }),
  );
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: favIds } = useQuery({ ...favoriteIdsQuery(user?.id ?? ""), enabled: !!user });
  const toggleFav = useMutation({
    mutationFn: async (salonId: string) => {
      if (!user) throw new Error("Sign in to save favorites");
      if (favIds?.has(salonId)) {
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("salon_id", salonId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favorites").insert({ user_id: user.id, salon_id: salonId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorite-ids", user?.id] });
      qc.invalidateQueries({ queryKey: ["favorites", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));

  const setParam = (patch: Partial<SearchParams>) =>
    navigate({ search: (prev: SearchParams) => ({ ...prev, ...patch, page: 1 }) });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="mb-6">
          <h1 className="font-serif text-3xl sm:text-4xl">Explore salons</h1>
          <p className="mt-2 text-sm text-muted-foreground">Find and book your next appointment.</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); setParam({ q: q || undefined }); }}
          className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search salons, services or city…" className="h-11 pl-9" />
          </div>
          <div className="flex gap-2">
            <Input placeholder="City" defaultValue={search.city ?? ""} onBlur={(e) => setParam({ city: e.target.value || undefined })} className="h-11 sm:w-40" />
            <Select value={search.category ?? "all"} onValueChange={(v) => setParam({ category: v === "all" ? undefined : v })}>
              <SelectTrigger className="h-11 sm:w-44"><SlidersHorizontal className="mr-2 h-4 w-4" /><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(search.minRating ?? 0)} onValueChange={(v) => setParam({ minRating: Number(v) || undefined })}>
              <SelectTrigger className="h-11 sm:w-36"><SelectValue placeholder="Rating" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any rating</SelectItem>
                <SelectItem value="3">3★ & up</SelectItem>
                <SelectItem value="4">4★ & up</SelectItem>
                <SelectItem value="4.5">4.5★ & up</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" className="h-11">Search</Button>
          </div>
        </form>

        {isFetching && !data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        )}

        {data && data.rows.length === 0 && (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <p className="text-muted-foreground">No salons match your filters.</p>
            <Button variant="link" onClick={() => navigate({ search: {} })}>Clear filters</Button>
          </div>
        )}

        {data && data.rows.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.rows.map((s) => (
              <div key={s.id} className="group relative">
                <button
                  type="button"
                  aria-label={favIds?.has(s.id) ? "Remove favorite" : "Add favorite"}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!user) { navigate({ to: "/auth" }); return; } toggleFav.mutate(s.id); }}
                  className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/90 shadow-sm backdrop-blur transition hover:bg-background"
                >
                  <Heart className={cn("h-4 w-4", favIds?.has(s.id) ? "fill-primary text-primary" : "text-foreground")} />
                </button>
                <Link to="/salons/$id" params={{ id: s.id }}>
                  <Card className="overflow-hidden transition-all hover:shadow-lg">
                    <div className="aspect-[4/3] overflow-hidden bg-muted">
                      {s.cover_url && <img src={s.cover_url} alt={s.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif text-lg leading-tight">{s.name}</h3>
                        <Badge variant="secondary" className="shrink-0"><Star className="mr-1 h-3 w-3 fill-current" />{Number(s.rating_avg).toFixed(1)}</Badge>
                      </div>
                      <p className="mt-1 flex items-center text-xs text-muted-foreground"><MapPin className="mr-1 h-3 w-3" />{s.city}</p>
                      {s.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => navigate({ search: (p: SearchParams) => ({ ...p, page: page - 1 }) })}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => navigate({ search: (p: SearchParams) => ({ ...p, page: page + 1 }) })}>Next</Button>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        )}
      </main>
    </div>
  );
}