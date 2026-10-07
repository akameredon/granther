import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generate, parseJson } from "./ai.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireMember(supabase: any) {
  const { data } = await supabase.rpc("am_i_member");
  if (!data) throw new Error("Your access is pending approval. You'll get in once you're approved from the waitlist.");
}

export type Match = { grant_id: string; status: "eligible" | "maybe" | "not"; reason: string };
export type Explainer = {
  overview: string;
  funder_insight: string;
  requirements: string[];
  checklist: string[];
  fit: string;
  tips: string[];
};

function profileText(p: { [k: string]: unknown; full_name?: unknown; country?: unknown; age?: unknown; business_name?: unknown; business_stage?: unknown; industry?: unknown; annual_revenue?: unknown; story?: unknown; state?: unknown; education_level?: unknown; field_of_study?: unknown } | null) {
  if (!p) return "No profile provided.";
  return [
    `Name: ${p.full_name ?? "-"}`,
    `Country: Nigeria`,
    `State: ${p.state ?? "-"}`,
    `Education: ${p.education_level ?? "-"}`,
    `Field of study: ${p.field_of_study ?? "-"}`,
    `Age: ${p.age ?? "-"}`,
    `Business: ${p.business_name ?? "-"}`,
    `Stage: ${p.business_stage ?? "-"}`,
    `Industry: ${p.industry ?? "-"}`,
    `Annual revenue: ${p.annual_revenue ?? "-"}`,
    `Story: ${p.story ?? "-"}`,
  ].join("\n");
}

export const checkMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireMember(supabase);
    const [{ data: profile }, { data: grants }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("grants").select("id,title,funder,eligibility,grant_type"),
    ]);
    if (!grants?.length) return [] as Match[];
    const text = await generate(
      "You are an expert grant and scholarship advisor for Nigerian women. Judge eligibility strictly but kindly. Reply with JSON only.",
      `Applicant profile:\n${profileText(profile)}\n\nGrants:\n${grants
        .map((g) => `- id: ${g.id}\n  title: ${g.title}\n  type: ${g.grant_type}\n  eligibility: ${g.eligibility ?? "not stated"}`)
        .join("\n")}\n\nReturn a JSON array: [{"grant_id": string, "status": "eligible"|"maybe"|"not", "reason": "one or two plain sentences addressed to her as 'you'"}]. Use "maybe" when profile info is missing.`,
    );
    return parseJson<Match[]>(text);
  });

export const explainGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ grantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireMember(supabase);
    const [{ data: profile }, { data: g }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("grants").select("*").eq("id", data.grantId).single(),
    ]);
    if (!g) throw new Error("Grant not found");
    const text = await generate(
      "You are a seasoned grant writer who has helped many Nigerian women win grants and scholarships. Explain in simple, warm English. Reply with JSON only.",
      `Grant: ${g.title}\nFunder: ${g.funder}\nAmount: ${g.amount}\nDeadline: ${g.deadline}\nSummary: ${g.summary}\nEligibility: ${g.eligibility}\nFunder background notes: ${g.funder_background}\nQuestions: ${JSON.stringify(g.questions)}\n\nApplicant:\n${profileText(profile)}\n\nReturn JSON: {"overview": string, "funder_insight": "what this funder values and the kind of applicants they usually pick", "requirements": string[], "checklist": "things to prepare before applying"[], "fit": "honest assessment of her fit and why", "tips": "how past winners stand out"[]}`,
    );
    return parseJson<Explainer>(text);
  });

export const writeAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ grantId: z.string().uuid(), question: z.string().min(3).max(500), notes: z.string().max(2000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireMember(supabase);
    const [{ data: profile }, { data: g }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("grants").select("*").eq("id", data.grantId).single(),
    ]);
    if (!g) throw new Error("Grant not found");
    const answer = await generate(
      "You write winning grant applications in the applicant's own first-person voice. Be specific, honest, and concrete; never invent numbers that are not in the profile—use [brackets] for facts she must fill in. Respect any word limit in the question. Output only the answer text, ready to paste.",
      `Grant: ${g.title} by ${g.funder}\nWhat the funder values: ${g.funder_background}\nSummary: ${g.summary}\n\nApplicant:\n${profileText(profile)}\n\nExtra notes from her: ${data.notes || "none"}\n\nQuestion to answer: ${data.question}`,
    );
    const { data: saved } = await supabase
      .from("drafts")
      .insert({ user_id: userId, grant_id: g.id, question: data.question, answer })
      .select("id")
      .single();
    return { answer, id: saved?.id };
  });
