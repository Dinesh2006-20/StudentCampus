import { Monitor, Cpu, Radio, Zap, Cog, Building2 } from "lucide-react";

export const DEPT_META = {
  IT: { icon: Monitor, text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500", soft: "bg-blue-500/10 border-blue-500/20", tagline: "Software, data & networks" },
  CSE: { icon: Cpu, text: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500", soft: "bg-indigo-500/10 border-indigo-500/20", tagline: "Algorithms, systems & AI" },
  ECE: { icon: Radio, text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500", soft: "bg-violet-500/10 border-violet-500/20", tagline: "Signals, VLSI & comms" },
  EEE: { icon: Zap, text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500", soft: "bg-amber-500/10 border-amber-500/20", tagline: "Power, machines & control" },
  MECH: { icon: Cog, text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500", soft: "bg-emerald-500/10 border-emerald-500/20", tagline: "Thermal, design & robotics" },
  CIVIL: { icon: Building2, text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500", soft: "bg-orange-500/10 border-orange-500/20", tagline: "Structures & infrastructure" },
};

export const DEPTS = [
  { code: "IT", name: "Information Technology" },
  { code: "CSE", name: "Computer Science & Engineering" },
  { code: "ECE", name: "Electronics & Communication" },
  { code: "EEE", name: "Electrical & Electronics" },
  { code: "MECH", name: "Mechanical Engineering" },
  { code: "CIVIL", name: "Civil Engineering" },
];

export const EXAM_TYPES = ["Internal 1", "Internal 2", "Internal 3", "Model Exam", "Practical Exam", "Semester Exam"];

export const EXAM_STYLE = {
  "Internal 1": "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  "Internal 2": "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  "Internal 3": "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
  "Model Exam": "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  "Practical Exam": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "Semester Exam": "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export const ordinal = (n) => `${n}${({ 1: "st", 2: "nd", 3: "rd" })[n] || "th"}`;
export const yearOfSem = (s) => Math.ceil(s / 2);
export const semsOfYear = (y) => [y * 2 - 1, y * 2];
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-");
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const todayName = () => ["Sunday", ...DAYS][new Date().getDay()];
export const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const isoToday = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const academicYearOf = (sem, y) => (sem % 2 ? `${y}-${y + 1}` : `${y - 1}-${y}`);
