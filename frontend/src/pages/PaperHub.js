import { useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { get } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DEPTS, ordinal } from "@/lib/campus";
import { HubLanding } from "@/pages/hub/HubLanding";
import { DeptView } from "@/pages/hub/DeptView";
import { SubjectView } from "@/pages/hub/SubjectView";
import { SearchView } from "@/pages/hub/SearchView";

const Crumbs = ({ items }) => (
  <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 overflow-x-auto no-scrollbar whitespace-nowrap" data-testid="hub-breadcrumbs">
    {items.map((c, i) => (
      <span key={i} className="flex items-center gap-1">
        {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
        {c.onClick ? <button onClick={c.onClick} className="hover:text-foreground transition-colors" data-testid={`crumb-${i}`}>{c.label}</button>
          : <span className="text-foreground font-medium">{c.label}</span>}
      </span>
    ))}
  </nav>
);

export default function PaperHub() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const P = Object.fromEntries(sp);
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => get("/meta") });

  const setP = (patch, replace = false) => {
    const next = replace ? {} : { ...P };
    Object.entries(patch).forEach(([k, v]) => (v === "" || v == null ? delete next[k] : (next[k] = String(v))));
    setSp(next);
  };

  const searchMode = P.q != null || P.view === "all";
  const deptName = DEPTS.find((d) => d.code === P.dept)?.name;

  const crumbs = useMemo(() => {
    const c = [{ label: "Paper Hub", onClick: () => nav("/papers") }];
    if (searchMode) c.push({ label: P.q ? `Search “${P.q}”` : "All papers" });
    else if (P.dept) {
      c.push({ label: P.dept, onClick: () => setP({ dept: P.dept }, true) });
      if (P.year) c.push({ label: `${ordinal(+P.year)} Year`, onClick: () => setP({ dept: P.dept, year: P.year }, true) });
      if (P.sem) c.push({ label: `${ordinal(+P.sem)} Sem`, onClick: () => setP({ dept: P.dept, year: P.year, sem: P.sem }, true) });
      if (P.subject) c.push({ label: P.sname || P.subject, onClick: P.type || P.ey ? () => setP({ type: "", ey: "" }) : undefined });
      if (P.type) c.push({ label: P.type });
      if (P.ey) c.push({ label: P.ey });
    }
    return c.map((x, i, a) => (i === a.length - 1 ? { label: x.label } : x));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  return (
    <div data-testid="paper-hub-page">
      <Crumbs items={crumbs} />
      {searchMode ? <SearchView P={P} setP={setP} meta={meta} />
        : !P.dept ? <HubLanding meta={meta} setP={setP} user={user} />
          : !P.subject ? <DeptView P={P} setP={setP} deptName={deptName} user={user} />
            : <SubjectView P={P} setP={setP} />}
    </div>
  );
}
