import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Scissors, User as UserIcon, LogOut, Calendar, Heart, Bell, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { to: string; label: string; auth?: boolean };
const NAV: readonly NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/salons", label: "Explore" },
  { to: "/bookings", label: "My Bookings", auth: true },
  { to: "/favorites", label: "Favorites", auth: true },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  const items = NAV.filter((n) => !n.auth || user);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Scissors className="h-4 w-4" />
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight">Lustre</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to as string}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "text-foreground bg-accent" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {!loading && !user && (
            <Button asChild size="sm" className="hidden md:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu" className="hidden md:inline-flex">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/bookings"><Calendar className="mr-2 h-4 w-4" />My bookings</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/favorites"><Heart className="mr-2 h-4 w-4" />Favorites</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/notifications"><Bell className="mr-2 h-4 w-4" />Notifications</Link></DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to="/admin"><LayoutDashboard className="mr-2 h-4 w-4" />Admin</Link></DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-serif text-xl">Lustre</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to as string}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                    activeProps={{ className: "text-foreground bg-accent" }}
                    activeOptions={{ exact: item.to === "/" }}
                  >
                    {item.label}
                  </Link>
                ))}
                {user && (
                  <>
                    <Link to="/profile" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">Profile</Link>
                    <Link to="/notifications" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">Notifications</Link>
                    {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">Admin</Link>}
                  </>
                )}
                <div className="mt-4 border-t pt-4">
                  {user ? (
                    <Button variant="outline" className="w-full" onClick={() => { setOpen(false); handleSignOut(); }}>
                      Sign out
                    </Button>
                  ) : (
                    <Button asChild className="w-full" onClick={() => setOpen(false)}>
                      <Link to="/auth">Sign in</Link>
                    </Button>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}