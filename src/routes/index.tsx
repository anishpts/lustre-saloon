import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, Star, MapPin, ArrowRight, Sparkles } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  categoriesQuery,
  featuredSalonsQuery,
  popularServicesQuery,
  formatPrice,
} from "@/lib/queries";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(categoriesQuery());
    context.queryClient.ensureQueryData(featuredSalonsQuery());
    context.queryClient.ensureQueryData(popularServicesQuery());
  },
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <Categories />
      <FeaturedSalons />
      <PopularServices />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="hero-gradient border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:pb-24 sm:pt-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Curated salons, real availability
          </span>
          <h1 className="mt-6 font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            Book your <em className="text-primary not-italic">salon</em>
            <br className="hidden sm:block" /> in seconds.
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
            Discover premium hair, nails, spa and barber studios near you — and confirm
            an appointment without a single phone call.
          </p>

          <form
            className="mx-auto mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-border bg-background/80 p-2 shadow-sm backdrop-blur sm:flex-row"
            action="/salons"
            method="get"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                placeholder="Search salons, services or city…"
                className="h-11 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
              />
            </div>
            <Button type="submit" size="lg" className="h-11">
              Search
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>Popular:</span>
            {["Balayage", "Manicure", "Facial", "Beard trim"].map((k) => (
              <Link
                key={k}
                to="/salons"
                search={{ q: k }}
                className="rounded-full border border-border bg-background/50 px-2.5 py-1 hover:bg-accent"
              >
                {k}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Categories() {
  const { data } = useSuspenseQuery(categoriesQuery());
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <SectionHeader
        eyebrow="Browse"
        title="Every look, one place."
        subtitle="From a quiet blow-out to a full spa afternoon."
      />
      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {data.map((c) => (
          <Link
            key={c.id}
            to="/salons"
            search={{ category: c.slug }}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeaturedSalons() {
  const { data } = useSuspenseQuery(featuredSalonsQuery());
  return (
    <section className="border-y border-border/60 bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="flex items-end justify-between gap-4">
          <SectionHeader eyebrow="Featured" title="Studios we love." />
          <Button asChild variant="ghost" size="sm">
            <Link to="/salons">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <Link key={s.id} to="/salons/$id" params={{ id: s.id }}>
              <Card className="group h-full overflow-hidden border-border/60 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                  {s.cover_url ? (
                    <img
                      src={s.cover_url}
                      alt={s.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-lg font-semibold">{s.name}</h3>
                    <div className="flex shrink-0 items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="font-medium">{Number(s.rating_avg).toFixed(1)}</span>
                      <span className="text-muted-foreground">({s.rating_count})</span>
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {s.city}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PopularServices() {
  const { data } = useSuspenseQuery(popularServicesQuery());
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <SectionHeader eyebrow="Popular" title="Book a treatment tonight." />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((svc: any) => (
          <Link
            key={svc.id}
            to="/salons/$id"
            params={{ id: svc.salon?.id ?? "" }}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
          >
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
              {svc.salon?.cover_url ? (
                <img src={svc.salon.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-semibold">{svc.name}</h4>
              <p className="truncate text-xs text-muted-foreground">
                {svc.salon?.name} · {svc.salon?.city}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-primary">{formatPrice(svc.price_cents)}</div>
              <div className="text-xs text-muted-foreground">{svc.duration_min} min</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</div>
      <h2 className="mt-2 font-serif text-2xl sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-1 max-w-lg text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} Lustre. Booked with care.</p>
        <div className="flex gap-4">
          <Link to="/salons" className="hover:text-foreground">Explore</Link>
          <Link to="/auth" className="hover:text-foreground">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
