import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { MemberGate } from "@/components/MemberGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/tracker")({
  head: () => ({
    meta: [
      { title: "My application tracker — GrantHer" },
      { name: "description", content: "Track every grant you save, apply to, and win." },
      { property: "og:title", content: "My application tracker — GrantHer" },
      { property: "og:description", content: "Your grant application tracker." },
    ],
  }),
  component: () => <MemberGate><TrackerPage /></MemberGate>,
});

const statuses = [
  ["saved", "Saved"], ["applied", "Applied"], ["won", "Won"], ["rejected", "Not selected"],
] as const;

function TrackerPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const apps = useQuery({
    queryKey: ["applications", "full"],
    queryFn: async () =>
      (await supabase.from("applications").select("id,status,applied_at,grant_id,grants(title,funder,deadline)").order("created_at", { ascending: false })).data ?? [],
  });
  const profile = useQuery({
    queryKey: ["profile-goal", user.id],
    queryFn: async () => (await supabase.from("profiles").select("daily_goal").eq("id", user.id).maybeSingle()).data,
  });
  const goal = profile.data?.daily_goal ?? 10;
  const list = apps.data ?? [];
  const today = new Date().toDateString();
  const appliedToday = list.filter((a) => a.applied_at && new Date(a.applied_at).toDateString() === today).length;
  const count = (s: string) => list.filter((a) => a.status === s).length;
  const applied = count("applied") + count("won") + count("rejected");
  const winRate = applied ? Math.round((count("won") / applied) * 100) : 0;

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("applications").update({
      status, updated_at: new Date().toISOString(),
      ...(status === "applied" ? { applied_at: new Date().toISOString() } : {}),
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (status === "won") toast.success("Congratulations! Share your story to inspire others.");
    qc.invalidateQueries({ queryKey: ["applications"] });
  };

  const remove = async (id: string) => {
    await supabase.from("applications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["applications"] });
  };

  const saveGoal = async (n: number) => {
    await supabase.from("profiles").update({ daily_goal: n }).eq("id", user.id);
    qc.invalidateQueries({ queryKey: ["profile-goal"] });
  };

  const stats = [
    ["Saved", count("saved")], ["Applied", applied], ["Won", count("won")], ["Win rate", `${winRate}%`],
  ] as const;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="text-4xl font-semibold">My tracker</h1>
        <p className="mt-2 text-muted-foreground">Apply to more, win more. The goal: 50 applications, at least 5 wins.</p>

        <div className="mt-8 rounded-2xl bg-hero p-6 text-primary-foreground shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm opacity-80">Applied today</p>
              <p className="font-display text-5xl">{appliedToday}<span className="text-2xl opacity-70"> / {goal}</span></p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              Daily goal
              <Input type="number" min={1} max={100} defaultValue={goal} key={goal} className="w-20 bg-background text-foreground"
                onBlur={(e) => saveGoal(Math.max(1, Math.min(100, Number(e.target.value) || 10)))} />
            </label>
          </div>
          <Progress value={Math.min(100, (appliedToday / goal) * 100)} className="mt-4" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(([label, val]) => (
            <div key={label} className="rounded-xl border bg-card p-4 text-center">
              <p className="font-display text-3xl text-primary">{val}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          {list.map((a) => {
            const g = a.grants as { title: string; funder: string; deadline: string | null } | null;
            return (
              <div key={a.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link to="/grants/$id" params={{ id: a.grant_id }} className="hover:underline">
                    <p className="font-medium">{g?.title}</p>
                    <p className="text-sm text-muted-foreground">{g?.funder} {g?.deadline && `· Due ${g.deadline}`}</p>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>Remove</Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {statuses.map(([k, label]) => (
                    <Button key={k} size="sm" variant={a.status === k ? "default" : "outline"} onClick={() => setStatus(a.id, k)}>{label}</Button>
                  ))}
                </div>
              </div>
            );
          })}
          {list.length === 0 && apps.data && (
            <p className="text-muted-foreground">Nothing yet. <Link to="/grants" className="underline">Save grants from your matches</Link>.</p>
          )}
        </div>
        {count("won") > 0 && (
          <div className="mt-8 rounded-2xl border-l-4 border-accent bg-muted p-5">
            <p className="font-medium">You won! Inspire other women.</p>
            <Button asChild size="sm" className="mt-3"><Link to="/stories">Share my story</Link></Button>
          </div>
        )}
      </div>
    </div>
  );
}
