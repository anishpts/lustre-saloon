import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Scissors } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({ email: z.string().trim().email().max(255) });

export const Route = createFileRoute("/auth/forgot")({
  component: ForgotPage,
  head: () => ({ meta: [{ title: "Forgot password — Lustre" }] }),
});

function ForgotPage() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });
  const onSubmit = form.handleSubmit(async ({ email }) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your inbox for a reset link.");
  });
  return (
    <div className="hero-gradient min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <Scissors className="h-4 w-4" />
          </span>
          <span className="font-serif text-2xl font-semibold">Lustre</span>
        </Link>
        <div className="w-full rounded-3xl border border-border bg-background/90 p-6 shadow-sm backdrop-blur">
          <h1 className="font-serif text-2xl">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">We'll send a reset link to your email.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send reset link
            </Button>
          </form>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/auth" className="hover:text-foreground">← Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}