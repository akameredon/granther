import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — GrantHer" },
      { name: "description", content: "Tell GrantHer about you and your business to get accurate grant matches." },
      { property: "og:title", content: "Your profile — GrantHer" },
      { property: "og:description", content: "Your GrantHer profile." },
    ],
  }),
  component: ProfilePage,
});

const fields = [
  ["full_name", "Full name"], ["country", "Country"], ["age", "Age"], ["business_name", "Business name"],
  ["business_stage", "Business stage (idea, early, growing…)"], ["industry", "Industry"], ["annual_revenue", "Annual revenue (approx.)"],
] as const;

type P = Record<string, string>;

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [p, setP] = useState<P>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setP(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v == null ? "" : String(v)])));
    });
  }, [user.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, full_name: p.full_name, country: p.country, age: p.age ? Number(p.age) : null,
      business_name: p.business_name, business_stage: p.business_stage, industry: p.industry,
      annual_revenue: p.annual_revenue, story: p.story, updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    navigate({ to: "/grants" });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <form onSubmit={save} className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-4xl font-semibold">About you</h1>
        <p className="mt-2 text-muted-foreground">Fill this once. The more you share, the better your matches and answers.</p>
        <div className="mt-8 grid gap-4 rounded-2xl border bg-card p-6 shadow-soft sm:grid-cols-2">
          {fields.map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Label>{label}</Label>
              <Input type={k === "age" ? "number" : "text"} value={p[k] ?? ""} onChange={(e) => setP({ ...p, [k]: e.target.value })} />
            </div>
          ))}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Your story</Label>
            <Textarea rows={6} placeholder="What does your business do, why did you start it, what have you achieved, and what do you need?" value={p.story ?? ""} onChange={(e) => setP({ ...p, story: e.target.value })} />
          </div>
          <Button disabled={busy} className="sm:col-span-2">Save and see my matches</Button>
        </div>
      </form>
    </div>
  );
}
