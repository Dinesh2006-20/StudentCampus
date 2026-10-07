import { useState } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Home, Library, Clock, CalendarDays, ClipboardList, LineChart, ShieldCheck, Search, Sun, Moon, Bookmark, LogOut, UserCog, LayoutGrid, Sparkles } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { CommandSearch } from "@/components/CommandSearch";
import { ProfileDialog } from "@/components/ProfileDialog";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/papers", label: "Papers", icon: Library },
  { to: "/ai", label: "Exam AI", icon: Sparkles },
  { to: "/timetable", label: "Timetable", icon: Clock },
  { to: "/exams", label: "Exams", icon: CalendarDays },
  { to: "/planner", label: "Planner", icon: ClipboardList },
  { to: "/progress", label: "Progress", icon: LineChart },
];

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <button onClick={() => setTheme(dark ? "light" : "dark")} data-testid="theme-toggle-button" aria-label="Toggle theme"
      className="h-10 w-10 grid place-items-center rounded-xl border border-border hover:bg-accent transition-colors">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={dark ? "m" : "s"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
};

export const Logo = () => (
  <Link to="/" className="flex items-center gap-2.5" data-testid="app-logo">
    <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-mono font-extrabold text-sm">SC</div>
    <div className="leading-none hidden sm:block">
      <div className="font-display font-extrabold tracking-tight">SmartCampus</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">Student Portal</div>
    </div>
  </Link>
);

const UserMenu = ({ onProfile }) => {
  const { user, logout } = useAuth();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-10 w-10 rounded-xl bg-secondary font-display font-bold grid place-items-center hover:ring-2 ring-primary/40 transition-shadow" data-testid="user-menu-button">
          {user.name?.[0]?.toUpperCase()}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-semibold">{user.name}</div>
          <div className="text-xs text-muted-foreground font-normal">{user.dept} · Semester {user.semester} {user.role === "admin" && "· Admin"}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onProfile} data-testid="menu-profile"><UserCog className="mr-2 h-4 w-4" />Academic profile</DropdownMenuItem>
        <DropdownMenuItem asChild data-testid="menu-saved"><Link to="/saved"><Bookmark className="mr-2 h-4 w-4" />Saved papers</Link></DropdownMenuItem>
        {user.role === "admin" && <DropdownMenuItem asChild data-testid="menu-admin"><Link to="/admin"><ShieldCheck className="mr-2 h-4 w-4" />Admin studio</Link></DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} data-testid="logout-button"><LogOut className="mr-2 h-4 w-4" />Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const BottomNav = ({ onMore }) => (
  <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 glass border border-border rounded-2xl shadow-2xl shadow-black/20" data-testid="mobile-bottom-nav">
    <div className="grid grid-cols-5">
      {NAV.slice(0, 4).map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === "/"} data-testid={`mobile-nav-${label.toLowerCase().replace(/\s/g, "-")}`}
          className={({ isActive }) => cn("relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
          {({ isActive }) => (<>
            {isActive && <motion.span layoutId="bnav" className="absolute inset-1 rounded-xl bg-primary/10" />}
            <Icon className="h-5 w-5 relative" /><span className="relative">{label}</span>
          </>)}
        </NavLink>
      ))}
      <button onClick={onMore} className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground" data-testid="mobile-nav-more">
        <LayoutGrid className="h-5 w-5" />More
      </button>
    </div>
  </nav>
);

const MoreSheet = ({ open, setOpen }) => {
  const { user } = useAuth();
  const items = [...NAV.slice(4), { to: "/saved", label: "Saved", icon: Bookmark }, ...(user.role === "admin" ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }] : [])];
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetTitle className="font-display">More</SheetTitle>
        <SheetDescription className="sr-only">More navigation</SheetDescription>
        <div className="grid grid-cols-3 gap-3 mt-4 pb-4">
          {items.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} data-testid={`more-nav-${label.toLowerCase()}`} className="surface p-4 flex flex-col items-center gap-2 text-sm font-medium hover:border-primary/40">
              <Icon className="h-5 w-5 text-primary" />{label}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default function Layout() {
  const { user } = useAuth();
  const loc = useLocation();
  const [search, setSearch] = useState(false);
  const [profile, setProfile] = useState(false);
  const [more, setMore] = useState(false);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass border-b border-border" data-testid="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Logo />
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {[...NAV, ...(user.role === "admin" ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }] : [])].map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === "/"} data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
                className={({ isActive }) => cn("relative px-3 py-2 text-sm font-medium rounded-lg transition-colors", isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {({ isActive }) => (<>{isActive && <motion.span layoutId="tnav" className="absolute inset-0 rounded-lg bg-secondary" />}<span className="relative">{label}</span></>)}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setSearch(true)} data-testid="global-search-trigger"
              className="h-10 px-3 rounded-xl border border-border flex items-center gap-2 text-sm text-muted-foreground hover:bg-accent transition-colors">
              <Search className="h-4 w-4" /><span className="hidden lg:inline">Search papers</span>
              <kbd className="hidden lg:inline font-mono text-[10px] border border-border rounded px-1.5 py-0.5">Ctrl K</kbd>
            </button>
            <ThemeToggle />
            <UserMenu onProfile={() => setProfile(true)} />
          </div>
        </div>
      </header>
      <motion.main key={loc.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 md:pb-16">
        <Outlet />
      </motion.main>
      <BottomNav onMore={() => setMore(true)} />
      <MoreSheet open={more} setOpen={setMore} />
      <CommandSearch open={search} setOpen={setSearch} />
      <ProfileDialog open={profile} setOpen={setProfile} />
    </div>
  );
}
