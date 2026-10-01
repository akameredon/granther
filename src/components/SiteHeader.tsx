import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      setSignedIn(!!uid);
      if (uid) {
        const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin");
        setIsAdmin(!!r?.length);
      } else setIsAdmin(false);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  const link = "text-sm text-muted-foreground hover:text-foreground transition-colors";
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="font-display text-2xl font-semibold text-primary">
          Grant<span className="text-accent">Her</span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          {signedIn ? (
            <>
              <Link to="/grants" className={link} activeProps={{ className: "text-foreground font-medium" }}>Grants</Link>
              <Link to="/profile" className={link} activeProps={{ className: "text-foreground font-medium" }}>Profile</Link>
              {isAdmin && <Link to="/admin" className={link} activeProps={{ className: "text-foreground font-medium" }}>Admin</Link>}
              <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
            </>
          ) : (
            <Button asChild size="sm"><Link to="/auth">Get started</Link></Button>
          )}
        </nav>
      </div>
    </header>
  );
}
