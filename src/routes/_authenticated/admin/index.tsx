import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Building2,
  Scissors,
  Tag,
  Calendar,
  CalendarClock,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  Mail,
  DollarSign,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

import { StatCard } from "@/components/admin/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  adminStatsQuery,
  monthlyBookingsQuery,
  popularSalonsQuery,
  popularServicesQueryAdmin,
  recentBookingsQuery,
  recentEnquiriesQuery,
  recentUsersQuery,
} from "@/lib/admin-queries";
import { formatPrice } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/")({
  ssr: false,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(adminStatsQuery());
    context.queryClient.ensureQueryData(monthlyBookingsQuery());
    context.queryClient.ensureQueryData(recentBookingsQuery());
    context.queryClient.ensureQueryData(recentUsersQuery());
    context.queryClient.ensureQueryData(recentEnquiriesQuery());
    context.queryClient.ensureQueryData(popularSalonsQuery());
    context.queryClient.ensureQueryData(popularServicesQueryAdmin());
  },
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
      Failed to load dashboard: {error.message}
    </div>
  ),
});

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(var(--chart-4, 45 93% 60%))",
  confirmed: "hsl(var(--chart-2, 210 90% 55%))",
  completed: "hsl(var(--chart-1, 145 60% 45%))",
  cancelled: "hsl(var(--chart-5, 0 75% 60%))",
};

function DashboardPage() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => qc.invalidateQueries({ queryKey: ["admin"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiries" }, () => qc.invalidateQueries({ queryKey: ["admin"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => qc.invalidateQueries({ queryKey: ["admin"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  const { data: stats } = useSuspenseQuery(adminStatsQuery());
  const { data: monthly } = useSuspenseQuery(monthlyBookingsQuery());
  const { data: recent } = useSuspenseQuery(recentBookingsQuery());
  const { data: users } = useSuspenseQuery(recentUsersQuery());
  const { data: enquiries } = useSuspenseQuery(recentEnquiriesQuery());
  const { data: popularSalons } = useSuspenseQuery(popularSalonsQuery());
  const { data: popularServices } = useSuspenseQuery(popularServicesQueryAdmin());

  const statusData = [
    { name: "Pending", value: stats.pending, key: "pending" },
    { name: "Confirmed", value: stats.confirmed, key: "confirmed" },
    { name: "Completed", value: stats.completed, key: "completed" },
    { name: "Cancelled", value: stats.cancelled, key: "cancelled" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your salon booking business.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Users" value={stats.users} icon={Users} />
        <StatCard label="Total Salons" value={stats.salons} icon={Building2} />
        <StatCard label="Total Services" value={stats.services} icon={Scissors} />
        <StatCard label="Categories" value={stats.categories} icon={Tag} />
        <StatCard label="Total Bookings" value={stats.bookings} icon={Calendar} />
        <StatCard label="Today's Bookings" value={stats.todayBookings} icon={CalendarClock} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} tone="warning" />
        <StatCard label="Confirmed" value={stats.confirmed} icon={CheckCircle2} tone="success" />
        <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} tone="danger" />
        <StatCard label="Reviews" value={stats.reviews} icon={Star} />
        <StatCard label="Enquiries" value={stats.enquiries} icon={Mail} />
        <StatCard
          label="Total Revenue"
          value={formatPrice(stats.revenueCents)}
          icon={DollarSign}
          tone="success"
          hint="Completed bookings"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Bookings</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Status</CardTitle>
            <CardDescription>Distribution across all bookings</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {statusData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No bookings yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Popular Salons</CardTitle>
            <CardDescription>By total bookings</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {popularSalons.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={popularSalons} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={100} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Popular Services</CardTitle>
            <CardDescription>By total bookings</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {popularServices.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={popularServices} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={100} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
            {recent.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{b.service?.name ?? "Service"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.salon?.name} · {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge variant={b.status === "cancelled" ? "destructive" : "secondary"} className="capitalize">
                  {b.status}
                </Badge>
              </div>
            ))}
            <Link to="/admin/bookings" className="text-xs text-primary hover:underline">
              View all bookings →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.length === 0 && <p className="text-sm text-muted-foreground">No users yet.</p>}
            {users.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.full_name || "Unnamed user"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.city || "—"} · {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            <Link to="/admin/users" className="text-xs text-primary hover:underline">
              View all users →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Enquiries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {enquiries.length === 0 && <p className="text-sm text-muted-foreground">No enquiries yet.</p>}
            {enquiries.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.subject}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.name} · {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge variant={e.status === "new" ? "default" : "secondary"} className="capitalize">
                  {e.status}
                </Badge>
              </div>
            ))}
            <Link to="/admin/enquiries" className="text-xs text-primary hover:underline">
              View all enquiries →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}