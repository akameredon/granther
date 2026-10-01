import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Manage grants — GrantHer" },
      { name: "description", content: "Add and edit grants on GrantHer." },
      { property: "og:title", content: "Manage grants — GrantHer" },
      { property: "og:description", content: "GrantHer admin." },
    ],
  }),
  component: AdminPage,
});

type Form = { id?: string; title: string; funder: string; amount: string; deadline: string; link: string; summary: string; eligibility: string; funder_background: string; questions: string };
const empty: Form = { title: "", funder: "", amount: "", deadline: "", link: "", summary: "", eligibility: "", funder_background: "", questions: "" };

function AdminPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(empty);
  const isAdmin = useQuery({
    queryKey: ["isAdmin", user.id],
    queryFn: async () => !!(await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin")).data?.length,
  });
  const grants = useQuery({ queryKey: ["grants"], queryFn: async () => (await supabase.from("grants").select("*").order("created_at", { ascending: false })).data ?? [] });

  if (isAdmin.data === false) return <div className="min-h-screen"><SiteHeader /><p className="p-10 text-center">Admins only.</p></div>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const row = {
      title: f.title, funder: f.funder, amount: f.amount || null, deadline: f.deadline || null, link: f.link || null,
      summary: f.summary, eligibility: f.eligibility, funder_background: f.funder_background,
      questions: f.questions.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    const { error } = f.id ? await supabase.from("grants").update(row).eq("id", f.id) : await supabase.from("grants").insert(row);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setF(empty);
    qc.invalidateQueries({ queryKey: ["grants"] });
    qc.removeQueries({ queryKey: ["matches"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this grant?")) return;
    await supabase.from("grants").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["grants"] });
  };

  const field = (k: keyof Form, label: string, type = "text") => (
    <div className="space-y-1.5"><Label>{label}</Label><Input type={type} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} required={k === "title" || k === "funder"} /></div>
  );
  const area = (k: keyof Form, label: string, ph?: string) => (
    <div className="space-y-1.5 sm:col-span-2"><Label>{label}</Label><Textarea rows={3} placeholder={ph} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="text-4xl font-semibold">Manage grants</h1>
        <form onSubmit={save} className="mt-8 grid gap-4 rounded-2xl border bg-card p-6 shadow-soft sm:grid-cols-2">
          {field("title", "Title")}{field("funder", "Funder")}{field("amount", "Amount")}{field("deadline", "Deadline", "date")}
          <div className="sm:col-span-2">{field("link", "Official link")}</div>
          {area("summary", "Summary")}
          {area("eligibility", "Eligibility rules", "Who qualifies: gender, age, country, stage, revenue…")}
          {area("funder_background", "Funder background", "What they value, past winners, patterns you've noticed")}
          {area("questions", "Application questions (one per line)", "Personal statement (max 500 words)")}
          <div className="flex gap-2 sm:col-span-2">
            <Button>{f.id ? "Update grant" : "Add grant"}</Button>
            {f.id && <Button type="button" variant="ghost" onClick={() => setF(empty)}>Cancel</Button>}
          </div>
        </form>
        <div className="mt-8 space-y-3">
          {grants.data?.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <div><p className="font-medium">{g.title}</p><p className="text-sm text-muted-foreground">{g.funder}</p></div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setF({
                  id: g.id, title: g.title, funder: g.funder, amount: g.amount ?? "", deadline: g.deadline ?? "", link: g.link ?? "",
                  summary: g.summary ?? "", eligibility: g.eligibility ?? "", funder_background: g.funder_background ?? "",
                  questions: ((g.questions as string[]) ?? []).join("\n"),
                })}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(g.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
