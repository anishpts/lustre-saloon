import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Pencil, Plus, Shield, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { adminCreateUser, adminUpdateUser, adminDeleteUser } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  ssr: false,
  component: UsersAdmin,
});

function UsersAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<any | null>(null);
  const createFn = useServerFn(adminCreateUser);
  const updateFn = useServerFn(adminUpdateUser);
  const deleteFn = useServerFn(adminDeleteUser);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "users", search],
    queryFn: async () => {
      let q = supabase.from("profiles").select("id,full_name,phone,city,avatar_url,is_active,created_at,user_roles(role)").order("created_at", { ascending: false }).limit(200);
      if (search) q = q.ilike("full_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleActive = useMutation({
    mutationFn: (u: any) => updateFn({ data: { id: u.id, is_active: !u.is_active } }),
    onSuccess: () => { toast.success("User updated"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAdmin = useMutation({
    mutationFn: (u: any) => {
      const isAdmin = u.user_roles?.some((r: any) => r.role === "admin");
      return updateFn({ data: { id: u.id, is_admin: !isAdmin } });
    },
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const createUser = useMutation({
    mutationFn: (v: any) => createFn({ data: v }),
    onSuccess: () => { toast.success("User created"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); setCreating(false); },
    onError: (e: any) => toast.error(e.message ?? "Failed to create"),
  });

  const updateUser = useMutation({
    mutationFn: (v: any) => updateFn({ data: v }),
    onSuccess: () => { toast.success("User updated"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });

  const deleteUser = useMutation({
    mutationFn: (u: any) => deleteFn({ data: { id: u.id } }),
    onSuccess: () => { toast.success("User deleted"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); setDeleting(null); },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Users" description="Suspend accounts and manage admin access." actions={
        <div className="flex w-full gap-2 sm:w-auto">
          <Input placeholder="Search name…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-56" />
          <Button onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" /> Add user</Button>
        </div>
      } />
      <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
        <TableHeader><TableRow>
          <TableHead>User</TableHead><TableHead>City</TableHead><TableHead>Role</TableHead>
          <TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>}
          {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No users</TableCell></TableRow>}
          {(data as any[]).map((u) => {
            const isAdmin = u.user_roles?.some((r: any) => r.role === "admin");
            return (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 overflow-hidden rounded-full bg-muted">
                      {u.avatar_url && <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div>
                      <div className="font-medium">{u.full_name || "Unnamed"}</div>
                      <div className="text-xs text-muted-foreground">{u.phone ?? ""}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{u.city ?? "—"}</TableCell>
                <TableCell>{isAdmin ? <Badge>Admin</Badge> : <Badge variant="outline">User</Badge>}</TableCell>
                <TableCell><Switch checked={u.is_active} onCheckedChange={() => toggleActive.mutate(u)} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(u)}>
                      <Pencil className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleAdmin.mutate(u)}>
                      {isAdmin ? <><ShieldOff className="mr-1 h-3 w-3" /> Revoke</> : <><Shield className="mr-1 h-3 w-3" /> Admin</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleting(u)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table></div></CardContent></Card>

      <UserFormDialog
        open={creating}
        onOpenChange={(o) => !o && setCreating(false)}
        title="Add user"
        submitLabel="Create"
        submitting={createUser.isPending}
        onSubmit={(v) => createUser.mutate(v)}
        mode="create"
      />
      <UserFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit user"
        submitLabel="Save"
        submitting={updateUser.isPending}
        initial={editing}
        onSubmit={(v) => updateUser.mutate({ id: editing.id, ...v })}
        mode="edit"
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete user?"
        description={`This permanently deletes ${deleting?.full_name || "this user"}'s account.`}
        confirmLabel="Delete"
        onConfirm={() => deleting && deleteUser.mutate(deleting)}
      />
    </div>
  );
}

type FormMode = "create" | "edit";
function UserFormDialog({
  open, onOpenChange, title, submitLabel, submitting, onSubmit, initial, mode,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (v: any) => void;
  initial?: any;
  mode: FormMode;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [isAdmin, setIsAdmin] = useState<boolean>(initial?.user_roles?.some((r: any) => r.role === "admin") ?? false);
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true);

  // Reset form when dialog opens with new data
  const openKey = `${open}-${initial?.id ?? "new"}`;
  const [seededKey, setSeededKey] = useState("");
  if (open && openKey !== seededKey) {
    setEmail("");
    setPassword("");
    setFullName(initial?.full_name ?? "");
    setPhone(initial?.phone ?? "");
    setCity(initial?.city ?? "");
    setIsAdmin(initial?.user_roles?.some((r: any) => r.role === "admin") ?? false);
    setIsActive(initial?.is_active ?? true);
    setSeededKey(openKey);
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") {
      if (!email.trim() || password.length < 8 || !fullName.trim()) {
        toast.error("Email, password (8+ chars), and full name are required");
        return;
      }
      onSubmit({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        city: city.trim() || null,
        is_admin: isAdmin,
      });
    } else {
      onSubmit({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        city: city.trim() || null,
        is_admin: isAdmin,
        is_active: isActive,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Create a new user account." : "Update this user's profile and role."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {mode === "create" && (
            <>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} />
            </div>
          </div>
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={isAdmin} onCheckedChange={setIsAdmin} /> Admin
            </label>
            {mode === "edit" && (
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={isActive} onCheckedChange={setIsActive} /> Active
              </label>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}