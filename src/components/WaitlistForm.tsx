import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(30).optional(),
  state: z.string().trim().max(60).optional(),
  reason: z.string().trim().max(500).optional(),
});

export function WaitlistForm() {
  const [f, setF] = useState({ full_name: "", email: "", phone: "", state: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = schema.safeParse(f);
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? "Check the form"); return; }
    setBusy(true);
    const { error } = await supabase.from("waitlist").insert({ full_name: p.data.full_name, email: p.data.email.toLowerCase(), phone: p.data.phone || null, state: p.data.state || null, reason: p.data.reason || null, status: "pending" });
    setBusy(false);
    if (error) { toast.error("Couldn't join right now. Please try again."); return; }
    setDone(true);
  };

  if (done) return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
      <h3 className="text-2xl font-semibold">You're on the list.</h3>
      <p className="mt-2 text-muted-foreground">We let women in by waves. Create your account with this same email so you're ready the moment you're approved.</p>
    </div>
  );

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-card p-6 shadow-soft sm:grid-cols-2">
      <div className="space-y-1.5"><Label>Full name</Label><Input value={f.full_name} onChange={set("full_name")} required /></div>
      <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={f.email} onChange={set("email")} required /></div>
      <div className="space-y-1.5"><Label>Phone (optional)</Label><Input value={f.phone} onChange={set("phone")} /></div>
      <div className="space-y-1.5"><Label>State</Label><Input value={f.state} onChange={set("state")} placeholder="e.g. Lagos" /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label>What do you want funding for?</Label><Textarea rows={3} value={f.reason} onChange={set("reason")} /></div>
      <Button disabled={busy} className="sm:col-span-2">{busy ? "Joining…" : "Request my invite"}</Button>
    </form>
  );
}
