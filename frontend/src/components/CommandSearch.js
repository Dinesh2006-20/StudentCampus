import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { FileText, Home, Library, CalendarDays, ClipboardList, LineChart, Clock } from "lucide-react";
import { get } from "@/lib/api";
import { usePapers } from "@/context/PaperContext";

const PAGES = [
  ["Home", "/", Home], ["Question Paper Hub", "/papers", Library], ["Smart Timetable", "/timetable", Clock],
  ["Exam Schedule", "/exams", CalendarDays], ["Study Planner", "/planner", ClipboardList], ["Student Progress", "/progress", LineChart],
];

export const CommandSearch = ({ open, setOpen }) => {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const nav = useNavigate();
  const { preview } = usePapers();

  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setOpen]);

  useEffect(() => {
    if (q.trim().length < 2) { setItems([]); return; }
    const t = setTimeout(() => get("/papers", { q, limit: 8 }).then((r) => setItems(r.items)).catch(() => {}), 220);
    return () => clearTimeout(t);
  }, [q]);

  const go = (fn) => { setOpen(false); setQ(""); fn(); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 max-w-xl" data-testid="command-search-dialog">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder="Try “DBMS internal 1 2025” or “CSE sem 4”" data-testid="command-search-input" />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>No papers match. Try a subject code or year.</CommandEmpty>
            {items.length > 0 && (
              <CommandGroup heading="Question papers">
                {items.map((p) => (
                  <CommandItem key={p.id} value={p.id} onSelect={() => go(() => preview(p))} data-testid={`command-result-${p.id}`}>
                    <FileText className="mr-2 text-muted-foreground" />
                    <div className="flex-1 min-w-0"><div className="truncate font-medium">{p.subject_name}</div>
                      <div className="text-xs text-muted-foreground">{p.dept} · {p.exam_type} · Sem {p.semester}</div></div>
                    <span className="font-mono font-bold stamp">{p.exam_year}</span>
                  </CommandItem>
                ))}
                <CommandItem value="all-results" onSelect={() => go(() => nav(`/papers?q=${encodeURIComponent(q)}`))} data-testid="command-see-all">
                  See all results for “{q}”
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Jump to">
              {PAGES.map(([label, to, Icon]) => (
                <CommandItem key={to} value={label} onSelect={() => go(() => nav(to))}><Icon className="mr-2" />{label}</CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
