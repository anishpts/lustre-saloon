import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { myFavoritesQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/favorites")({
  component: FavoritesPage,
  head: () => ({ meta: [{ title: "Favorites — Lustre" }] }),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function FavoritesPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ ...myFavoritesQuery(user?.id ?? ""), enabled: !!user });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <h1 className="font-serif text-3xl">Favorites</h1>
        {isLoading && <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-60 rounded-2xl" />)}</div>}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground">No favorites yet.</p>
            <Button asChild className="mt-3"><Link to="/salons">Discover salons</Link></Button>
          </div>
        )}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((s) => (
            <Link key={s.id} to="/salons/$id" params={{ id: s.id }}>
              <Card className="overflow-hidden transition-all hover:shadow-lg">
                {s.cover_url && <div className="aspect-[4/3] overflow-hidden"><img src={s.cover_url} alt={s.name} className="h-full w-full object-cover" /></div>}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-lg">{s.name}</h3>
                    <Badge variant="secondary"><Star className="mr-1 h-3 w-3 fill-current" />{s.rating_avg.toFixed(1)}</Badge>
                  </div>
                  <p className="mt-1 flex items-center text-xs text-muted-foreground"><MapPin className="mr-1 h-3 w-3" />{s.city}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}