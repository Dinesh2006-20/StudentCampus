import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Sparkles, Send, Trash2, Flame, Loader2, KeyRound } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API, TOKEN_KEY, api, get, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DeptSemPicker } from "@/components/DeptSemPicker";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

const PROMPTS = ["What are the top 10 most asked questions?", "Which questions should I study for Internal 1?", "Predict likely questions for the Semester Exam", "Make a 3-day study plan from the repeated questions"];

async function streamChat(body, onDelta) {
  const res = await fetch(`${API}/ai/chat`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }, body: JSON.stringify(body) });
  if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(typeof j.detail === "string" ? j.detail : "AI request failed"); }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    for (const p of parts) {
      if (!p.startsWith("data: ")) continue;
      const ev = JSON.parse(p.slice(6));
      if (ev.error) throw new Error(ev.error);
      if (ev.t) onDelta(ev.t);
    }
  }
}

const Important = ({ dept, code }) => {
  const { data, isLoading } = useQuery({ queryKey: ["important", dept, code], queryFn: () => get("/ai/important", { dept, subject_code: code }), enabled: !!code });
  return (
    <div className="surface p-5" data-testid="important-questions-panel">
      <div className="eyebrow flex items-center gap-2"><Flame className="h-3.5 w-3.5 text-orange-500" />Most repeated questions</div>
      {data && <div className="text-xs text-muted-foreground mt-1 font-mono">{data.papers_analysed} papers analysed · {data.year_from}–{data.year_to}</div>}
      {isLoading && <Loader2 className="h-5 w-5 animate-spin mt-4" />}
      <ol className="mt-4 space-y-3 max-h-[520px] overflow-y-auto pr-1">
        {data?.items.slice(0, 20).map((q, i) => (
          <li key={i} className="flex gap-3 text-sm" data-testid={`important-q-${i}`}>
            <span className="font-mono font-extrabold stamp w-9 shrink-0 text-right">{q.count}×</span>
            <div className="min-w-0">
              <div className="leading-snug">{q.question}</div>
              <div className="text-[11px] text-muted-foreground font-mono mt-1">{q.marks ? `${q.marks}M · ` : ""}{q.years.slice(0, 5).join(", ")}{q.years.length > 5 && "…"}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default function AiTutor() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dept, setDept] = useState(user.dept);
  const [sem, setSem] = useState(user.semester);
  const [code, setCode] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  const { data: status } = useQuery({ queryKey: ["ai-status"], queryFn: () => get("/ai/status") });
  const { data: subs = [] } = useQuery({ queryKey: ["subjects", dept, sem], queryFn: () => get("/subjects", { dept, semester: sem }), enabled: !!dept && !!sem });
  const subject = subs.find((s) => s.code === code);

  useEffect(() => { if (subs.length && !subs.some((s) => s.code === code)) setCode(subs[0].code); }, [subs, code]);
  useEffect(() => { if (code) get("/ai/history", { dept, subject_code: code }).then(setMsgs).catch(() => setMsgs([])); }, [dept, code]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs]);

  const send = async (text) => {
    const t = (text ?? input).trim();
    if (!t || busy) return;
    setInput(""); setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: t }, { role: "assistant", text: "" }]);
    try {
      await streamChat({ dept, subject_code: code, message: t }, (d) => setMsgs((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: c[c.length - 1].text + d }; return c; }));
    } catch (e) {
      toast.error(e.message);
      setMsgs((m) => m.slice(0, -1));
    } finally { setBusy(false); qc.invalidateQueries({ queryKey: ["ai-status"] }); }
  };
  const clear = async () => { try { await api.delete("/ai/history", { params: { dept, subject_code: code } }); setMsgs([]); } catch (e) { toast.error(errMsg(e)); } };

  return (
    <div data-testid="ai-tutor-page">
      <PageHeader eyebrow="Exam AI · Powered by Gemini" title="Study what actually gets asked" sub="Exam AI reads every previous paper of a subject, ranks the most repeated questions and helps you prepare."
        right={<div className="flex gap-2 flex-wrap"><DeptSemPicker dept={dept} sem={sem} onDept={setDept} onSem={setSem} />
          <Select value={code || undefined} onValueChange={setCode}>
            <SelectTrigger className="h-10 rounded-xl w-[220px]" data-testid="ai-subject-select"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>{subs.map((s) => <SelectItem key={s.id} value={s.code}>{s.code} · {s.name}</SelectItem>)}</SelectContent>
          </Select></div>} />
      {status && !status.configured && (
        <div className="surface border-amber-500/40 bg-amber-500/5 p-4 mb-4 flex gap-3 items-start text-sm" data-testid="ai-not-configured">
          <KeyRound className="h-5 w-5 text-amber-500 shrink-0" />
          <div>The AI chat is waiting for a Gemini API key (GEMINI_API_KEY). The most-repeated questions list still works.</div>
        </div>
      )}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="surface flex flex-col h-[70vh] min-h-[480px] overflow-hidden" data-testid="ai-chat-panel">
          <div className="px-5 py-3 border-b border-border flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/15 grid place-items-center"><Sparkles className="h-4 w-4 text-primary" /></div>
            <div className="min-w-0 flex-1"><div className="font-display font-bold truncate">{subject?.name || "Pick a subject"}</div><div className="text-xs text-muted-foreground font-mono">{code}</div></div>
            {msgs.length > 0 && <button onClick={clear} className="text-muted-foreground hover:text-destructive" data-testid="ai-clear-button" aria-label="Clear chat"><Trash2 className="h-4 w-4" /></button>}
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4" data-testid="ai-messages">
            {msgs.length === 0 && (
              <div className="h-full flex flex-col justify-center">
                <div className="font-display text-2xl font-bold">Ask about {subject?.name || "your subject"}</div>
                <div className="grid sm:grid-cols-2 gap-2 mt-5">
                  {PROMPTS.map((p, i) => <button key={p} onClick={() => send(p)} disabled={!code} className="text-left surface p-3 text-sm hover:border-primary/40 transition-colors" data-testid={`ai-prompt-${i}`}>{p}</button>)}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")} data-testid={`ai-msg-${m.role}-${i}`}>
                <div className={cn("max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                  {m.role === "user" ? m.text : m.text ? <div className="prose-sm [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_h1,&_h2,&_h3]:font-bold [&_h1,&_h2,&_h3]:mt-3 [&_ol]:list-decimal [&_ul]:list-disc [&_ol,&_ul]:pl-5 [&_li]:my-1 [&_p]:my-2"><ReactMarkdown>{m.text}</ReactMarkdown></div> : <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </motion.div>
            ))}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-border flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask for important questions, answers or a study plan…" disabled={!code}
              className="flex-1 h-11 px-4 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" data-testid="ai-chat-input" />
            <button disabled={busy || !input.trim()} className="h-11 w-11 grid place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50" data-testid="ai-send-button" aria-label="Send">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
        {code && <Important dept={dept} code={code} />}
      </div>
    </div>
  );
}
