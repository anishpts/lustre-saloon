import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({ password: z.string().min(8).max(72) });

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPage,
  head: () => ({ meta: [{ title: "Set new password — Lustre" }] }),
});

function ResetPage() {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  });
  const onSubmit = form.handleSubmit(async ({ password }) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/" });
  });
  return (
    <div className="hero-gradient min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        <div className="w-full rounded-3xl border border-border bg-background/90 p-6 shadow-sm backdrop-blur">
          <h1 className="font-serif text-2xl">Set a new password</h1>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input type="password" autoComplete="new-password" {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}