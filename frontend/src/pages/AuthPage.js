import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeptSelect, SemSelect } from "@/components/DeptSemPicker";
import { ThemeToggle } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";

const HERO = "https://images.unsplash.com/photo-1696395050055-eb7a315bb1cb?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400";

const Field = ({ label, ...p }) => (
  <div><Label className="text-xs">{label}</Label><Input className="mt-1.5 h-11 rounded-xl" {...p} /></div>
);

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "", roll_no: "", dept: "IT", semester: 1 });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { mode === "login" ? await login(f.email, f.password) : await register(f); }
    catch (x) { setErr(errMsg(x)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden lg:block overflow-hidden grain">
        <img src={HERO} alt="Campus library" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
        <div className="relative h-full flex flex-col justify-end p-12 text-white">
          <div className="font-mono text-xs tracking-[0.3em] uppercase text-blue-300">Question Paper Archive · Since 2018</div>
          <h1 className="font-display text-5xl xl:text-6xl font-extrabold tracking-tight mt-4 leading-[1.05]">Every exam paper.<br />Every year.<br /><span className="text-amber-400">One tap away.</span></h1>
          <p className="mt-5 text-slate-300 max-w-md">Browse by department, semester, subject and exam — from Internal 1 to the Semester Exam. Plus your timetable, planner and progress.</p>
          <div className="flex gap-6 mt-8 font-mono text-sm text-slate-300">
            <div><span className="text-2xl font-bold text-white">6</span><br />Departments</div>
            <div><span className="text-2xl font-bold text-white">6</span><br />Exam types</div>
            <div><span className="text-2xl font-bold text-white">8</span><br />Semesters</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5"><div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-mono font-extrabold text-sm">SC</div><span className="font-display font-extrabold">SmartCampus</span></div>
          <ThemeToggle />
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md m-auto py-10">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">{mode === "login" ? "Welcome back" : "Create your student pass"}</h2>
          <p className="text-muted-foreground text-sm mt-2">{mode === "login" ? "Sign in to your campus portal." : "Takes 30 seconds. Pick your department & semester."}</p>
          <div className="mt-6 grid grid-cols-2 p-1 rounded-xl bg-secondary" data-testid="auth-mode-toggle">
            {["login", "register"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }} data-testid={`auth-tab-${m}`}
                className={`relative h-9 rounded-lg text-sm font-semibold ${mode === m ? "text-foreground" : "text-muted-foreground"}`}>
                {mode === m && <motion.span layoutId="authtab" className="absolute inset-0 rounded-lg bg-background shadow" />}
                <span className="relative">{m === "login" ? "Sign in" : "Register"}</span>
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="mt-6 space-y-4" data-testid="auth-form">
            {mode === "register" && <Field label="Full name" value={f.name} onChange={set("name")} required data-testid="register-name-input" />}
            <Field label="Email" type="email" value={f.email} onChange={set("email")} required data-testid="login-email-input" />
            <Field label="Password" type="password" value={f.password} onChange={set("password")} required minLength={6} data-testid="login-password-input" />
            {mode === "register" && (<>
              <Field label="Roll number (optional)" value={f.roll_no} onChange={set("roll_no")} data-testid="register-roll-input" />
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Department</Label><div className="mt-1.5"><DeptSelect value={f.dept} onChange={(v) => setF({ ...f, dept: v })} testid="register-dept-select" /></div></div>
                <div><Label className="text-xs">Semester</Label><div className="mt-1.5"><SemSelect value={f.semester} onChange={(v) => setF({ ...f, semester: v })} testid="register-sem-select" /></div></div>
              </div>
            </>)}
            {err && <div className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2" data-testid="auth-error">{err}</div>}
            <button disabled={busy} data-testid="login-submit-button"
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-[opacity,transform] disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{mode === "login" ? "Sign in" : "Create account"}<ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
