import { motion } from "framer-motion";

export const PageHeader = ({ eyebrow, title, sub, right }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
    <div>
      {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
      <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">{title}</h1>
      {sub && <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl">{sub}</p>}
    </div>
    {right}
  </motion.div>
);

export const Empty = ({ icon: Icon, title, sub, testid = "empty-state" }) => (
  <div className="surface border-dashed p-10 text-center" data-testid={testid}>
    {Icon && <Icon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />}
    <div className="font-display font-semibold">{title}</div>
    {sub && <div className="text-sm text-muted-foreground mt-1">{sub}</div>}
  </div>
);
