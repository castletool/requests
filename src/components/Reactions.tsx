import { useState } from "react";
import { toast } from "sonner";
import * as F from "@/lib/fb";
import { CODE_SET, MAX_REACTIONS } from "@/lib/emoji";
import { Emo, EmojiGrid } from "@/components/Emoji";
import { Ic } from "@/components/Ic";

/** Emoji reactions for one post or comment. `all` is every reaction doc of the request; ids are target~uid~code. */
export function Reactions({ pid, target, all, me, reload }: { pid: string; target: string; all: any[]; me: any; reload: () => void }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const by = new Map<string, { n: number; mine: boolean; t: number }>();
  for (const r of all) {
    if (r.target !== target || !CODE_SET.has(r.code)) continue;
    const e = by.get(r.code) || { n: 0, mine: false, t: Infinity };
    e.n++; e.mine = e.mine || r.uid === me?.uid; e.t = Math.min(e.t, r.createdAt?.toMillis?.() ?? 0); by.set(r.code, e);
  }
  // only the first 20 different emoji count; anything beyond that stays hidden
  const shown = [...by].sort((a, b) => a[1].t - b[1].t).slice(0, MAX_REACTIONS);
  const toggle = async (code: string) => {
    setOpen(false);
    if (!F.guard(me) || busy) return;
    const ref = F.doc(F.db, "posts", pid, "reactions", `${target}~${me.uid}~${code}`), mine = shown.find(([c]) => c === code)?.[1].mine;
    setBusy(true);
    try {
      if (mine) await F.deleteDoc(ref);
      else {
        if (!shown.some(([c]) => c === code) && shown.length >= MAX_REACTIONS) { toast(`At most ${MAX_REACTIONS} different emoji on one item.`); setBusy(false); return; }
        const w = await F.waitLeft(me.uid, "react"); if (w > 0) { toast(`Slow down. Try again in ${w}s.`); setBusy(false); return; }
        const b = F.writeBatch(F.db);
        b.set(ref, { target, uid: me.uid, code, createdAt: F.serverTimestamp() });
        b.set(F.limitDoc(me.uid, "react"), { t: F.serverTimestamp() });
        await b.commit();
      }
      reload();
    } catch (e) { toast.error(F.err(e)); }
    setBusy(false);
  };
  return (
    <div className="relative mt-2 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {shown.map(([c, v]) => (
        <button key={c} type="button" onClick={() => toggle(c)} title={`:${c}:`} className={"inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-sm " + (v.mine ? "bg-white text-black" : "")}><Emo code={c} s={18} />{v.n}</button>))}
      {me && <button type="button" title="Add reaction" onClick={() => setOpen((o) => !o)} className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-muted-foreground"><Ic n="add_reaction" s={18} /></button>}
      {open && <><div className="fixed inset-0 z-10" onClick={() => setOpen(false)} /><EmojiGrid onPick={toggle} className="absolute left-0 top-full z-20 mt-1 h-64 w-72 max-w-full" /></>}
    </div>
  );
}
