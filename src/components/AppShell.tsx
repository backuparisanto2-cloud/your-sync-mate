import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarClock,
  History,
  KeyRound,
  LogOut,
  Mail,
  Package,
  Server,
  ServerCog,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dasbor", icon: CalendarClock },
  { to: "/smtp", label: "SMTP", icon: Server },
  { to: "/logs", label: "Riwayat", icon: History },
  { to: "/export", label: "Export", icon: Package },
  { to: "/hosting-guide", label: "Hosting", icon: ServerCog },
  { to: "/env-guide", label: "Env", icon: KeyRound },
] as const;



export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { session, ready } = useSession();

  useEffect(() => {
    if (ready && !session) void navigate({ to: "/auth" });
  }, [ready, session, navigate]);

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Memuat…
      </div>
    );
  }


  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:flex sm:justify-between sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-primary-foreground"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <Mail className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-lg leading-tight font-semibold">
                Reminder Mail
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Penjadwal email SMTP
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 rounded-full border border-border/70 bg-card/70 p-1 shadow-[var(--shadow-soft)]">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <Button
            variant="ghost"
            size="sm"
            className="col-span-2 justify-self-end text-muted-foreground sm:col-auto"
            onClick={async () => {
              await signOut();
              void navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>

      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted-foreground sm:px-6">
        Pengingat email terjadwal · zona waktu Asia/Jakarta
      </footer>
    </div>
  );
}
