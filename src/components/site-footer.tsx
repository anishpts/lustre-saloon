import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} Lustre. Booked with care.</p>
        <div className="flex gap-4">
          <Link to="/salons" className="hover:text-foreground">Explore</Link>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
        </div>
      </div>
    </footer>
  );
}