import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/stories")({
  head: () => ({
    meta: [
      { title: "Winner stories — GrantHer" },
      { name: "description", content: "Real stories from Nigerian women who won grants and scholarships with GrantHer." },
      { property: "og:title", content: "Winner stories — GrantHer" },
      { property: "og:description", content: "Real stories from Nigerian women who won grants and scholarships." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StoriesPage,
});

function StoriesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ author_name: "", title: "", grant_name: "", body: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
  }, []);
  const stories = useQuery({
    queryKey: ["stories-public"],
    queryFn: async () => (await supabase.from("stories").select("id,author_name,title,body,grant_name,created_at").eq("approved", true).order("created_at", { ascending: false })).data ?? [],
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setBusy(true);
    const { error } = await supabase.from("stories").insert({ ...form, grant_name: form.grant_name || null, user_id: userId });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thank you! Your story will appear once it's approved.");
    setForm({ author_name: "", title: "", grant_name: "", body: "" });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <p className="text-sm uppercase tracking-[0.2em] text-accent">She won</p>
          <h1 className="mt-3 text-5xl font-semibold">Winner stories</h1>
          <p className="mt-3 max-w-xl opacity-85">Real Nigerian women, real grants. Read how they did it, then go win yours.</p>
        </div>
      </section>
      <div className="mx-auto max-w-4xl space-y-6 px-5 py-12">
        {stories.data?.map((s) => (
          <article key={s.id} className="rounded-2xl border bg-card p-6 shadow-soft">
            {s.grant_name && <p className="text-xs uppercase tracking-widest text-accent">Won: {s.grant_name}</p>}
            <h2 className="mt-1 text-2xl font-semibold">{s.title}</h2>
            <p className="mt-3 whitespace-pre-line">{s.body}</p>
            <p className="mt-4 text-sm text-muted-foreground">— {s.author_name}</p>
          </article>
        ))}
        {stories.data?.length === 0 && <p className="text-muted-foreground">The first stories are coming soon.</p>}

        {userId && (
          <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2">
            <h2 className="text-2xl font-semibold sm:col-span-2">Share your story</h2>
            <div className="space-y-1.5"><Label>Your name</Label><Input required value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Grant you won</Label><Input value={form.grant_name} onChange={(e) => setForm({ ...form, grant_name: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Your story</Label><Textarea required rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <Button disabled={busy} className="sm:col-span-2">Submit for approval</Button>
          </form>
        )}
      </div>
    </div>
  );
}
