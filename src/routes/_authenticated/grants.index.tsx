import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkMatches, type Match } from "@/lib/grants.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/grants/")({
  head: () => ({
    meta: [
      { title: "Your grant matches — GrantHer" },
      { name: "description", content: "See which grants you qualify for and why." },
      { property: "og:title", content: "Your grant matches — GrantHer" },
      { property: "og:description", content: "Grants filtered for you." },
    ],
  }),
  component: GrantsPage,
});

const statusStyle: Record<Match["status"], { label: string; cls: string }> = {
  eligible: { label: "Eligible", cls: "bg-success text-primary-foreground" },
  maybe: { label: "Maybe", cls: "bg-warning text-accent-foreground" },
  not: { label: "Not for you", cls: "bg-muted text-muted-foreground" },
};

function GrantsPage() {
  const runMatches = useServerFn(checkMatches);
  const grants = useQuery({
    queryKey: ["grants"],
    queryFn: async () => (await supabase.from("grants").select("*").order("deadline")).data ?? [],
  });
  const matches = useQuery({ queryKey: ["matches"], queryFn: () => runMatches(), staleTime: Infinity, retry: false });
  const byId = new Map((matches.data ?? []).map((m) => [m.grant_id, m]));
  const order = { eligible: 0, maybe: 1, not: 2 };
  const list = [...(grants.data ?? [])].sort(
    (a, b) => order[byId.get(a.id)?.status ?? "maybe"] - order[byId.get(b.id)?.status ?? "maybe"],
  );

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
        {matches.isFetching && (
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking your eligibility…</p>
        )}
        {matches.error && <p className="mt-6 text-sm text-destructive">{(matches.error as Error).message}</p>}
        <div className="mt-8 space-y-4">
          {list.map((g) => {
            const m = byId.get(g.id);
            return (
              <Link key={g.id} to="/grants/$id" params={{ id: g.id }} className="block rounded-2xl border bg-card p-6 shadow-soft transition hover:-translate-y-0.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">{g.title}</h2>
                    <p className="text-sm text-muted-foreground">{g.funder} · {g.amount} {g.deadline && `· Due ${g.deadline}`}</p>
                  </div>
                  {m && <Badge className={statusStyle[m.status].cls}>{statusStyle[m.status].label}</Badge>}
                </div>
                {m && <p className="mt-3 text-sm">{m.reason}</p>}
              </Link>
            );
          })}
          {grants.data?.length === 0 && <p className="text-muted-foreground">No grants yet.</p>}
        </div>
      </div>
    </div>
  );
}
