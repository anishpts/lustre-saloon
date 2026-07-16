import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Scissors, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const authSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});
const signUpSchema = authSchema.extend({
  fullName: z.string().trim().min(2, "Enter your name").max(80),
});

type SearchParams = { redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Lustre" },
      { name: "description", content: "Sign in or create your Lustre account." },
    ],
  }),
});

function AuthPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  return (
    <div className="hero-gradient min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <Scissors className="h-4 w-4" />
          </span>
          <span className="font-serif text-2xl font-semibold">Lustre</span>
        </Link>
        <div className="w-full rounded-3xl border border-border bg-background/90 p-6 shadow-sm backdrop-blur">
          <h1 className="font-serif text-2xl">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to book, save favorites, and manage appointments.
          </p>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-4">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <SignUpForm onDone={() => setTab("signin")} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function SignInForm() {
  const search = useSearch({ from: "/auth" });
  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });
  const onSubmit = form.handleSubmit(async (values) => {
    const { data, error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      toast.error(error.message);
      return;
    }
    let dest = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/";
    if (data.user) {
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (role) dest = "/admin";
    }
    toast.success("Welcome back!");
    // Hard navigation so the protected /admin route re-reads the fresh session
    // and route context on load. `navigate()` can race the auth listener.
    window.location.assign(dest);
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field label="Password" error={form.formState.errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...form.register("password")} />
      </Field>
      <div className="flex justify-end">
        <Link to="/auth/forgot" className="text-xs text-muted-foreground hover:text-foreground">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", fullName: "" },
  });
  const onSubmit = form.handleSubmit(async (values) => {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. You can sign in now.");
    onDone();
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Full name" error={form.formState.errors.fullName?.message}>
        <Input autoComplete="name" {...form.register("fullName")} />
      </Field>
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field label="Password" error={form.formState.errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...form.register("password")} />
      </Field>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}