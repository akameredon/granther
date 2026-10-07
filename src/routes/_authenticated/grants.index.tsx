import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkMatches, type Match } from "@/lib/grants.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { MemberGate, verificationStyle } from "@/components/MemberGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Bookmark, BookmarkCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/grants/")({
  head: () => ({
    meta: [
      { title: "Your grant matches — GrantHer" },
      { name: "description", content: "See which grants and scholarships you qualify for and why." },
      { property: "og:title", content: "Your grant matches — GrantHer" },
      { property: "og:description", content: "Grants filtered for you." },
    ],
  }),
  component: () => <MemberGate><GrantsPage /></MemberGate>,
});

const statusStyle: Record<Match["status"], { label: string; cls: string }> = {
  eligible: { label: "Eligible", cls: "bg-success text-primary-foreground" },
  maybe: { label: "Maybe", cls: "bg-warning text-accent-foreground" },
  not: { label: "Not for you", cls: "bg-muted text-muted-foreground" },
};

const types = [["all", "All"], ["business", "Business grants"], ["scholarship", "Scholarships"]] as const;

function GrantsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [type, setType] = useState<string>("all");
  const runMatches = useServerFn(checkMatches);
  const grants = useQuery({
    queryKey: ["grants"],
    queryFn: async () => (await supabase.from("grants").select("*").order("deadline")).data ?? [],
  });
  const tracked = useQuery({
    queryKey: ["applications"],
    queryFn: async () => (await supabase.from("applications").select("grant_id,status")).data ?? [],
  });
  const trackedIds = new Set((tracked.data ?? []).map((t) => t.grant_id));
  const matches = useQuery({ queryKey: ["matches"], queryFn: () => runMatches(), staleTime: Infinity, retry: false });
  const byId = new Map((matches.data ?? []).map((m) => [m.grant_id, m]));
  const order = { eligible: 0, maybe: 1, not: 2 };
  const list = [...(grants.data ?? [])]
    .filter((g) => type === "all" || g.grant_type === type)
    .sort((a, b) => order[byId.get(a.id)?.status ?? "maybe"] - order[byId.get(b.id)?.status ?? "maybe"]);

  const save = async (e: React.MouseEvent, grantId: string) => {
    e.preventDefault();
    if (trackedIds.has(grantId)) return;
    const { error } = await supabase.from("applications").insert({ user_id: user.id, grant_id: grantId });
    if (error) { toast.error(error.message); return; }
    toast.success("Added to your tracker");
    qc.invalidateQueries({ queryKey: ["applications"] });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold">Your matches</h1>
            <p className="mt-2 text-muted-foreground">Filtered for your profile. <Link to="/profile" className="underline">Update profile</Link></p>
          </div>
          <Button variant="outline" size="sm" onClick={() => matches.refetch()} disabled={matches.isFetching}>Re-check</Button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {types.map(([k, label]) => (
            <Button key={k} size="sm" variant={type === k ? "default" : "outline"} onClick={() => setType(k)}>{label}</Button>
          ))}
        </div>
        {matches.isFetching && (
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking your eligibility…</p>
        )}
        {matches.error && <p className="mt-6 text-sm text-destructive">{(matches.error as Error).message}</p>}
        <div className="mt-8 space-y-4">
          {list.map((g) => {
            const m = byId.get(g.id);
            const v = verificationStyle[g.verification] ?? verificationStyle["unverified"]!;
            const isTracked = trackedIds.has(g.id);
            return (
              <Link key={g.id} to="/grants/$id" params={{ id: g.id }} className="block rounded-2xl border bg-card p-6 shadow-soft transition hover:-translate-y-0.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-accent">{g.grant_type === "scholarship" ? "Scholarship" : "Business grant"}</p>
                    <h2 className="text-2xl font-semibold">{g.title}</h2>
                    <p className="text-sm text-muted-foreground">{g.funder} · {g.amount} {g.deadline && `· Due ${g.deadline}`}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={v.cls}>{v.label}</Badge>
                    {m && <Badge className={statusStyle[m.status].cls}>{statusStyle[m.status].label}</Badge>}
                  </div>
                </div>
                {m && <p className="mt-3 text-sm">{m.reason}</p>}
                <Button size="sm" variant={isTracked ? "secondary" : "outline"} className="mt-4" onClick={(e) => save(e, g.id)}>
                  {isTracked ? <><BookmarkCheck className="h-4 w-4" /> In tracker</> : <><Bookmark className="h-4 w-4" /> Save to tracker</>}
                </Button>
              </Link>
            );
          })}
          {list.length === 0 && grants.data && <p className="text-muted-foreground">No grants here yet.</p>}
        </div>
      </div>
    </div>
  );
}
