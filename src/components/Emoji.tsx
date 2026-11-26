import { useEffect, useRef, useState } from "react";
import { CATS, CODES, CODE_SET, SC_RE, emojiUrl, lookup, pickerQuery, toShortcodes } from "@/lib/emoji";
import { Ic } from "@/components/Ic";
import { Textarea } from "@/components/ui/textarea";

export function Emo({ code, s = 22 }: { code: string; s?: number }) {
  return <img src={emojiUrl(code)} alt={`:${code}:`} title={`:${code}:`} width={s} height={s} loading="lazy" draggable={false} className="emoji inline-block align-text-bottom" style={{ width: s, height: s }} />;
}

/** Scrollable grid, one section per category; the tab row jumps between sections. */
export function EmojiGrid({ onPick, className = "" }: { onPick: (code: string) => void; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  if (!CODES.length) return <p className="p-3 text-sm text-muted-foreground">No emoji installed.</p>;
  return (
    <div className={"flex flex-col overflow-hidden rounded-xl border border-border bg-black " + className}>
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
export function EmojiTextarea({ value, onChange, maxLength, placeholder, className, autoFocus }: { value: string; onChange: (v: string) => void; maxLength?: number; placeholder?: string; className?: string; autoFocus?: boolean }) {
  const ta = useRef<HTMLTextAreaElement>(null), caret = useRef<number | null>(null);
  const [q, setQ] = useState<string | null>(null), [grid, setGrid] = useState(false), [sel, setSel] = useState(0);
  useEffect(() => { if (caret.current != null && ta.current) { ta.current.setSelectionRange(caret.current, caret.current); caret.current = null; } });
  const list = q === null ? [] : lookup(q);
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
    <div className="relative">
      <Textarea ref={ta} autoFocus={autoFocus} value={value} maxLength={maxLength} placeholder={placeholder} className={className}
        onChange={(e) => change(e.target.value, e.target.selectionStart)}
        onClick={() => setQ(pickerQuery(value.slice(0, at())))} onBlur={() => setTimeout(() => setQ(null), 120)}
        onKeyDown={(e) => {
          if (q === null || !list.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, list.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insert(list[sel], true); }
          else if (e.key === "Escape") setQ(null);
        }} />
      <button type="button" title="Emoji" onMouseDown={(e) => e.preventDefault()} onClick={() => { setGrid((g) => !g); setQ(null); }} className="absolute bottom-1.5 right-1.5 rounded-md p-1 text-muted-foreground hover:text-foreground"><Ic n="mood" s={22} /></button>
      {q !== null && list.length > 0 && (
        <div className="absolute inset-x-0 bottom-full z-20 mb-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-black p-1">
          {list.map((c, i) => <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(c, true)} className={"flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm " + (i === sel ? "bg-accent" : "")}><Emo code={c} s={22} />:{c}:</button>)}
        </div>)}
      {grid && <EmojiGrid onPick={(c) => insert(c, false)} className="absolute inset-x-0 bottom-full z-20 mb-1 h-64" />}
    </div>
  );
}

/** Plain text with emoji drawn as Mutant images (for previews). */
export function InlineEmoji({ text }: { text: string }) {
  const parts = toShortcodes(text).split(SC_RE);
  return <>{parts.map((p, i) => (i % 2 && CODE_SET.has(p) ? <Emo key={i} code={p} s={16} /> : i % 2 ? `:${p}:` : p))}</>;
}
