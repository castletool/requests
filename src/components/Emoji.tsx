import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { CATS, CODES, CODE_SET, SC_RE, emojiUrl, lookup, pickerQuery, toShortcodes } from "@/lib/emoji";
import { Ic } from "@/components/Ic";
import { Textarea } from "@/components/ui/textarea";

export function Emo({ code, s = 22 }: { code: string; s?: number }) {
  return <img src={emojiUrl(code)} alt={`:${code}:`} title={`:${code}:`} width={s} height={s} loading="lazy" draggable={false} className="emoji inline-block align-text-bottom" style={{ width: s, height: s }} />;
}


const safeTop = () => { const d = document.createElement("div"); d.style.cssText = "position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top)"; document.body.appendChild(d); const v = parseFloat(getComputedStyle(d).paddingTop) || 0; d.remove(); return v; };

/** Where a popup anchored to `box` fits: above or below it, with a height that stays on screen and clear of the bottom nav. Re-measured on scroll, resize and keyboard changes. */
function useFit(box: RefObject<HTMLElement>, on: boolean, max: number, dep: unknown) {
  const [fit, setFit] = useState({ up: true, h: max });
  useLayoutEffect(() => {
    if (!on) return;
    const run = () => {
      const el = box.current; if (!el) return;
      const r = el.getBoundingClientRect(), vv = window.visualViewport, off = vv?.offsetTop ?? 0, vh = vv?.height ?? innerHeight;
      const nav = el.closest("[data-overlay]") ? Infinity : document.querySelector("nav")?.getBoundingClientRect().top ?? Infinity;
      const above = r.top - (off + safeTop() + 8) - 4, below = Math.min(off + vh - 8, nav - 4) - r.bottom - 4;
      const up = above >= max || above >= below;
      setFit((f) => { const h = Math.round(Math.max(100, Math.min(max, up ? above : below))); return f.up === up && f.h === h ? f : { up, h }; });
    };
    run();
    addEventListener("scroll", run, true); addEventListener("resize", run); vpt()?.addEventListener("resize", run); vpt()?.addEventListener("scroll", run);
    return () => { removeEventListener("scroll", run, true); removeEventListener("resize", run); vpt()?.removeEventListener("resize", run); vpt()?.removeEventListener("scroll", run); };
  }, [on, max, dep]);
  return fit;
}
const vpt = () => window.visualViewport;

/** Scrollable grid, one section per category; the tab row jumps between sections. */
export function EmojiGrid({ onPick, className = "", style }: { onPick: (code: string) => void; className?: string; style?: React.CSSProperties }) {
  const box = useRef<HTMLDivElement>(null);
  if (!CODES.length) return <p className="p-3 text-sm text-muted-foreground">No emoji installed.</p>;
  return (
    <div style={style} className={"flex flex-col overflow-hidden rounded-xl border border-border bg-black " + className}>
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-1">
        {CATS.map((c) => <button key={c.id} type="button" title={c.label} onMouseDown={(e) => e.preventDefault()} onClick={() => box.current?.querySelector<HTMLElement>(`[data-cat="${c.id}"]`)?.scrollIntoView({ block: "start" })} className="shrink-0 rounded-md p-1.5 hover:bg-accent"><Emo code={c.icon} s={22} /></button>)}
      </div>
      <div ref={box} className="min-h-0 flex-1 overflow-y-auto p-1">
        {CATS.map((c) => (
          <div key={c.id} data-cat={c.id}>
            <div className="sticky top-0 bg-black px-1 py-1 text-xs text-muted-foreground">{c.label}</div>
            <div className="grid grid-cols-8 gap-0.5">
              {c.codes.map((x) => <button key={x} type="button" title={`:${x}:`} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(x)} className="flex items-center justify-center rounded-md p-1 hover:bg-accent"><Emo code={x} s={26} /></button>)}
            </div>
          </div>))}
      </div>
    </div>
  );
}

/** Textarea with Mutant emoji: unicode emoji turn into :shortcodes:, typing ":" opens a shortcode list, and the face button opens the grid. */
/** `grow`: auto-height up to that many px, then scrolls. `fill`: stretch to fill a flex-column parent. No resize handle either way. */
export function EmojiTextarea({ value, onChange, maxLength, placeholder, className, autoFocus, grow, fill }: { value: string; onChange: (v: string) => void; maxLength?: number; placeholder?: string; className?: string; autoFocus?: boolean; grow?: number; fill?: boolean }) {
  const ta = useRef<HTMLTextAreaElement>(null), caret = useRef<number | null>(null);
  const [q, setQ] = useState<string | null>(null), [grid, setGrid] = useState(false), [sel, setSel] = useState(0);
  useEffect(() => { if (caret.current != null && ta.current) { ta.current.setSelectionRange(caret.current, caret.current); caret.current = null; } });
  const list = q === null ? [] : lookup(q);
  const box = useRef<HTMLDivElement>(null), showList = q !== null && list.length > 0;
  const lf = useFit(box, showList, 224, value), gf = useFit(box, grid, 256, value);
  useLayoutEffect(() => {
    const t = ta.current; if (!t || !grow) return;
    t.style.height = "auto";
    const full = t.scrollHeight + t.offsetHeight - t.clientHeight;
    t.style.height = Math.min(full, grow) + "px"; t.style.overflowY = full > grow ? "auto" : "hidden";
  }, [value, grow]);
  const at = () => ta.current?.selectionStart ?? value.length;
  const set = (v: string, c: number) => { if (maxLength && v.length > maxLength) return; caret.current = c; onChange(v); };
  const change = (raw: string, c: number) => {
    const l = toShortcodes(raw.slice(0, c)), r = toShortcodes(raw.slice(c)), v = l + r;
    if (maxLength && v.length > maxLength) return;
    caret.current = l.length; onChange(v); setQ(pickerQuery(l)); setSel(0);
  };
  const insert = (code: string, replaceQuery: boolean) => {
    const c = at(), left = value.slice(0, c), right = value.slice(c);
    const start = replaceQuery ? left.length - (q?.length ?? 0) - 1 : left.length, ins = `:${code}: `;
    set(left.slice(0, start) + ins + right, start + ins.length); setQ(null); setGrid(false); ta.current?.focus();
  };
  return (
    <div ref={box} className={"relative " + (fill ? "flex min-h-[180px] flex-1 flex-col" : "")}>
      <Textarea ref={ta} autoFocus={autoFocus} value={value} maxLength={maxLength} placeholder={placeholder} className={(fill ? "min-h-0 flex-1 " : "") + (className || "")}
        onChange={(e) => change(e.target.value, e.target.selectionStart)}
        onClick={() => setQ(pickerQuery(value.slice(0, at())))} onBlur={() => setTimeout(() => setQ(null), 120)}
        onKeyDown={(e) => {
          if (q === null || !list.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, list.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insert(list[sel], true); }
          else if (e.key === "Escape") setQ(null);
        }} />
      <button type="button" title="Emoji" onMouseDown={(e) => e.preventDefault()} onClick={() => { if (!grid && matchMedia("(pointer: coarse)").matches) ta.current?.blur(); setGrid((g) => !g); setQ(null); }} className="absolute bottom-1.5 right-1.5 rounded-md p-1 text-muted-foreground hover:text-foreground"><Ic n="mood" s={22} /></button>
      {showList && (
        <div style={{ maxHeight: lf.h }} className={"absolute inset-x-0 z-20 overflow-y-auto rounded-xl border border-border bg-black p-1 " + (lf.up ? "bottom-full mb-1" : "top-full mt-1")}>
          {list.map((c, i) => <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(c, true)} className={"flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm " + (i === sel ? "bg-accent" : "")}><Emo code={c} s={22} />:{c}:</button>)}
        </div>)}
      {grid && <EmojiGrid onPick={(c) => insert(c, false)} style={{ height: gf.h }} className={"absolute inset-x-0 z-20 " + (gf.up ? "bottom-full mb-1" : "top-full mt-1")} />}
    </div>
  );
}

/** Plain text with emoji drawn as Mutant images (for previews). */
export function InlineEmoji({ text }: { text: string }) {
  const parts = toShortcodes(text).split(SC_RE);
  return <>{parts.map((p, i) => (i % 2 && CODE_SET.has(p) ? <Emo key={i} code={p} s={16} /> : i % 2 ? `:${p}:` : p))}</>;
}
