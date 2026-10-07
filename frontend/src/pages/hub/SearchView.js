import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, SearchX, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { get } from "@/lib/api";
import { EXAM_TYPES } from "@/lib/campus";
import { DeptSelect, SemSelect } from "@/components/DeptSemPicker";
import { PaperCard } from "@/components/PaperCard";
import { Empty } from "@/components/PageHeader";

const PAGE = 24;

const Pick = ({ value, onChange, items, placeholder, testid }) => (
  <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
    <SelectTrigger className="h-10 rounded-xl min-w-[130px]" data-testid={testid}><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent><SelectItem value="all">{placeholder}</SelectItem>{items.map(([v, l]) => <SelectItem key={v} value={String(v)}>{l}</SelectItem>)}</SelectContent>
  </Select>
);

export const SearchView = ({ P, setP, meta }) => {
  const [q, setQ] = useState(P.q || "");
  useEffect(() => setQ(P.q || ""), [P.q]);
  const params = { q: P.q, dept: P.dept, semester: P.sem, exam_type: P.type, exam_year: P.ey, sort: P.sort || "year" };
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["search", params],
    queryFn: ({ pageParam }) => get("/papers", { ...params, skip: pageParam, limit: PAGE }),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (all.length * PAGE < last.total ? all.length * PAGE : undefined),
  });
  const items = data?.pages.flatMap((p) => p.items) || [];
  const total = data?.pages[0]?.total;
  const years = meta?.year_max ? Array.from({ length: meta.year_max - meta.year_min + 1 }, (_, i) => meta.year_max - i) : [];

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); setP({ q: q.trim(), view: "all" }); }} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject, code, exam type, year…" autoFocus
          className="w-full h-14 pl-12 pr-4 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/50" data-testid="search-page-input" />
      </form>
      <div className="flex gap-2 flex-wrap mt-4" data-testid="search-filters">
        <DeptSelect value={P.dept} onChange={(v) => setP({ dept: v })} allowAll testid="filter-dept" />
        <SemSelect value={P.sem} onChange={(v) => setP({ sem: v })} allowAll testid="filter-sem" />
        <Pick value={P.type} onChange={(v) => setP({ type: v })} placeholder="All exam types" items={EXAM_TYPES.map((t) => [t, t])} testid="filter-exam-type" />
        <Pick value={P.ey} onChange={(v) => setP({ ey: v })} placeholder="All years" items={years.map((y) => [y, y])} testid="filter-exam-year" />
        <Pick value={P.sort} onChange={(v) => setP({ sort: v })} placeholder="Newest year" items={[["popular", "Most downloaded"], ["recent", "Recently added"]]} testid="filter-sort" />
      </div>
      <div className="mt-6 mb-4 text-sm text-muted-foreground" data-testid="search-result-count">
        {total != null && <><span className="font-mono font-bold text-foreground">{total.toLocaleString()}</span> papers found</>}
      </div>
      {isLoading && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>}
      {total === 0 && <Empty icon={SearchX} title="Nothing matched" sub="Try fewer words, e.g. just the subject code or year." />}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {items.map((p, i) => <PaperCard key={p.id} paper={p} index={i % PAGE} />)}
      </div>
      {hasNextPage && (
        <div className="flex justify-center mt-8">
          <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="h-11 px-6 rounded-xl border border-border font-semibold hover:bg-accent inline-flex items-center gap-2" data-testid="load-more-button">
            {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}Load more
          </button>
        </div>
      )}
    </div>
  );
};
