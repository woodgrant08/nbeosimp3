import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, BarChart3, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const isSim = location.startsWith('/case/');

  if (isSim) {
    // Return bare layout for simulation to maximize screen real estate
    return <div className="min-h-screen bg-background flex flex-col">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-primary p-2.5 rounded-xl group-hover:scale-105 transition-transform">
              <Stethoscope className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl tracking-tight text-foreground leading-none">NBEO</h1>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Part 3 Simulator</span>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Link 
              href="/" 
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                location === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Cases</span>
            </Link>
            <Link 
              href="/metrics" 
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                location === "/metrics" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Metrics</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
