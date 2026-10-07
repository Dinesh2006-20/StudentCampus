import { motion } from "framer-motion";
import { DEPT_META } from "@/lib/campus";

export const DeptCard = ({ d, index, onClick }) => {
  const m = DEPT_META[d.code];
  const Icon = m.icon;
  return (
    <motion.button onClick={onClick} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} data-testid={`dept-card-${d.code.toLowerCase()}`}
      className="group relative text-left surface p-5 overflow-hidden hover:border-primary/40 transition-colors min-h-[180px] flex flex-col">
      <span className={`absolute -right-3 -bottom-8 font-display font-extrabold text-[110px] leading-none opacity-[0.07] ${m.text} group-hover:opacity-[0.14] transition-opacity`}>{d.code}</span>
      <div className={`h-11 w-11 rounded-xl border grid place-items-center ${m.soft}`}><Icon className={`h-5 w-5 ${m.text}`} /></div>
      <div className="mt-auto pt-6">
        <div className="font-display font-bold text-lg">{d.code}</div>
        <div className="text-sm text-muted-foreground line-clamp-1">{d.name}</div>
        <div className="flex items-center gap-3 mt-3 font-mono text-xs">
          <span><b className="text-foreground">{d.papers?.toLocaleString() ?? "–"}</b> papers</span>
          <span className="text-muted-foreground">{d.subjects ?? "–"} subjects</span>
        </div>
      </div>
    </motion.button>
  );
};
