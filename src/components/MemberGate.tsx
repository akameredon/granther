import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

export function useIsMember() {
  return useQuery({
    queryKey: ["am_i_member"],
    queryFn: async () => !!(await supabase.rpc("am_i_member")).data,
  });
}

/** Shows children only to approved members (or admins); everyone else sees the waitlist notice. */
export function MemberGate({ children }: { children: ReactNode }) {
  const m = useIsMember();
  if (m.isLoading) return <div className="min-h-screen"><SiteHeader /></div>;
  if (m.data) return <>{children}</>;
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">Invite only</p>
        <h1 className="mt-3 text-4xl font-semibold">You're on the list</h1>
        <p className="mt-4 text-muted-foreground">
          GrantHer opens in waves. Make sure you've joined the waitlist with this same email. We'll let you in as soon as you're approved.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild><Link to="/" hash="waitlist">Join the waitlist</Link></Button>
          <Button asChild variant="outline"><Link to="/profile">Complete my profile</Link></Button>
        </div>
      </div>
    </div>
  );
}

export const verificationStyle: Record<string, { label: string; cls: string }> = {
  verified: { label: "Verified", cls: "bg-success text-primary-foreground" },
  unverified: { label: "Not yet verified", cls: "bg-secondary text-secondary-foreground" },
  warning: { label: "Warning", cls: "bg-destructive text-destructive-foreground" },
};
