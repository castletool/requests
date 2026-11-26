import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MENTION_RE } from "@/lib/fb";
import { CODE_SET, SC_RE, toShortcodes } from "@/lib/emoji";
import { Emo } from "@/components/Emoji";

type Splitter = (v: string) => any[] | null;
const span = (cls: string[], children: any[]) => ({ type: "emphasis", data: { hName: "span", hProperties: { className: cls } }, children });
/** :shortcode: becomes an emoji span (unknown or banned codes stay text). */
const splitEmoji: Splitter = (v) => {
  const out: any[] = []; let last = 0;
  for (const m of v.matchAll(SC_RE)) {
    if (!CODE_SET.has(m[1])) continue;
    if ((m.index || 0) > last) out.push({ type: "text", value: v.slice(last, m.index) });
    out.push(span(["emoji", "emo-" + m[1]], [])); last = (m.index || 0) + m[0].length;
  }
  if (!out.length) return null;
  if (last < v.length) out.push({ type: "text", value: v.slice(last) });
  return out;
};
/** @mention becomes a highlighted span. */
const splitMentions: Splitter = (v) => {
  const out: any[] = []; let last = 0;
  for (const m of v.matchAll(MENTION_RE)) {
    const at = (m.index || 0) + m[1].length;
    if (at > last) out.push({ type: "text", value: v.slice(last, at) });
    out.push(span(["mention"], [{ type: "text", value: "@" + m[2] }])); last = at + 1 + m[2].length;
  }
  if (!out.length) return null;
  if (last < v.length) out.push({ type: "text", value: v.slice(last) });
  return out;
};
/** Applies the splitters to every text node, skipping code and links. */
const plugin = (fns: Splitter[]) => () => {
  const walk = (n: any) => {
    if (!n.children || n.type === "link" || n.type === "linkReference") return;
    n.children = n.children.flatMap((c: any) => {
      if (c.type !== "text") { walk(c); return [c]; }
      let parts = [c];
      for (const f of fns) parts = parts.flatMap((x) => (x.type === "text" ? f(x.value) || [x] : [x]));
      return parts;
    });
  };
  return (tree: any) => walk(tree);
};
const SIMPLE = [splitEmoji], FULL = [splitEmoji, splitMentions];

/** Markdown for posts/comments. Raw HTML is never rendered, images are dropped, links open in a new tab and bare URLs become links.
 *  :shortcodes: (and unicode emoji that have a Mutant version) show as Mutant emoji; @mentions are highlighted when `mentions` is on. */
export function Md({ text, mentions = true }: { text: string; mentions?: boolean }) {
  return (
    <div className="md break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm, plugin(mentions ? FULL : SIMPLE)]} components={{
        a: ({ node, ...p }: any) => <a {...p} target="_blank" rel="noopener noreferrer nofollow ugc" className="underline" onClick={(e) => e.stopPropagation()} />,
        img: () => null,
        span: ({ node, className, children, ...p }: any) => { const m = /(?:^|\s)emo-([a-z0-9_]+)/.exec(className || ""); return m ? <Emo code={m[1]} s={22} /> : <span className={className} {...p}>{children}</span>; },
      }}>{toShortcodes(text)}</ReactMarkdown>
    </div>
  );
}
