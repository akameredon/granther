import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { Filter, BookOpen, PenLine } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GrantHer — Win the grants made for women" },
      { name: "description", content: "GrantHer finds the grants you qualify for, explains each funder, and writes your application answers for you." },
      { property: "og:title", content: "GrantHer — Win the grants made for women" },
      { property: "og:description", content: "Find grants you qualify for, understand the funders, and get ready-to-paste application answers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const steps = [
  { icon: Filter, title: "The filter", text: "Tell us about you once. We show which grants fit you, and explain why others don't." },
  { icon: BookOpen, title: "Know the funder", text: "Each grant explained in plain words: what they want, who usually wins, what to prepare." },
  { icon: PenLine, title: "Done-for-you writing", text: "Personal statements and 500-word answers written in your voice, ready to copy and paste." },
];

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
          <p className="mb-5 text-sm uppercase tracking-[0.2em] text-accent">For women who build</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] sm:text-7xl">
            Billions in grants are meant for you. <em className="text-accent">Stop leaving them.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg opacity-85">
            GrantHer filters out the grants you can't win, explains the ones you can, and writes the hard parts for you.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/auth">Find my grants</Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-20 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-2xl border bg-card p-7 shadow-soft">
            <div className="mb-5 flex items-center justify-between">
              <s.icon className="h-6 w-6 text-primary" />
              <span className="font-display text-3xl text-accent">0{i + 1}</span>
            </div>
            <h3 className="text-2xl font-semibold">{s.title}</h3>
            <p className="mt-2 text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
