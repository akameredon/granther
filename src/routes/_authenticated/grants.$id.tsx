import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { explainGrant, writeAnswer } from "@/lib/grants.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/grants/$id")({
  head: () => ({
    meta: [
      { title: "Grant details — GrantHer" },
      { name: "description", content: "Understand this grant and its funder, and write your application." },
      { property: "og:title", content: "Grant details — GrantHer" },
      { property: "og:description", content: "Grant explainer and application writer." },
    ],
  }),
  component: GrantPage,
});

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}

function GrantPage() {
  const { id } = Route.useParams();
  const explain = useServerFn(explainGrant);
  const write = useServerFn(writeAnswer);
  const grant = useQuery({
    queryKey: ["grant", id],
    queryFn: async () => (await supabase.from("grants").select("*").eq("id", id).single()).data,
  });
  const ex = useQuery({ queryKey: ["explain", id], queryFn: () => explain({ data: { grantId: id } }), staleTime: Infinity, retry: false });
  const questions = (grant.data?.questions as string[] | undefined) ?? [];
  const [question, setQuestion] = useState("");
  const [notes, setNotes] = useState("");
  const [answer, setAnswer] = useState("");
  const gen = useMutation({
    mutationFn: () => write({ data: { grantId: id, question, notes } }),
    onSuccess: (r) => setAnswer(r.answer),
    onError: (e) => toast.error((e as Error).message),
  });
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  if (!grant.data) return <div className="min-h-screen"><SiteHeader /></div>;
  const g = grant.data;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-5 py-12">
        <p className="text-sm uppercase tracking-widest text-accent">{g.funder}</p>
        <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{g.title}</h1>
        <p className="mt-2 text-muted-foreground">{g.amount} {g.deadline && `· Deadline ${g.deadline}`}</p>
        {g.link && (
          <a href={g.link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm underline">
            Official page <ExternalLink className="h-3 w-3" />
          </a>
        )}

        <section className="mt-10 space-y-6 rounded-2xl border bg-card p-6 shadow-soft">
          <h2 className="text-2xl font-semibold">Explained for you</h2>
          {ex.isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Researching this grant…</p>}
          {ex.error && <p className="text-sm text-destructive">{(ex.error as Error).message}</p>}
          {ex.data && (
            <>
              <p>{ex.data.overview}</p>
              <div className="rounded-xl bg-secondary p-4">
                <h3 className="text-lg font-semibold">About the funder</h3>
                <p className="mt-1 text-sm">{ex.data.funder_insight}</p>
              </div>
              <div className="rounded-xl border-l-4 border-accent bg-muted p-4">
                <h3 className="text-lg font-semibold">Your fit</h3>
                <p className="mt-1 text-sm">{ex.data.fit}</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <List title="Requirements" items={ex.data.requirements} />
                <List title="Prepare before applying" items={ex.data.checklist} />
              </div>
              <List title="How winners stand out" items={ex.data.tips} />
            </>
          )}
        </section>

        <section className="mt-8 space-y-4 rounded-2xl border bg-card p-6 shadow-soft">
          <h2 className="text-2xl font-semibold">Write my application</h2>
          {questions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {questions.map((q) => (
                <Button key={q} type="button" size="sm" variant={q === question ? "default" : "outline"} onClick={() => setQuestion(q)} className="h-auto whitespace-normal text-left">
                  {q}
                </Button>
              ))}
            </div>
          )}
          <Input placeholder="Or paste any question from the form" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Textarea rows={3} placeholder="Anything extra to include? (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button onClick={() => gen.mutate()} disabled={question.length < 3 || gen.isPending}>
            {gen.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Writing…</> : answer ? "Regenerate" : "Write it for me"}
          </Button>
          {answer && (
            <div className="space-y-2">
              <Textarea rows={14} value={answer} onChange={(e) => setAnswer(e.target.value)} />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{words} words · fill in anything in [brackets]</span>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(answer); toast.success("Copied"); }}>
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
