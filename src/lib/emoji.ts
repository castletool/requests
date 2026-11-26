import idx from "./emoji-index.json";

// Mutant Standard emoji (https://mutant.tech, CC BY-NC-SA 4.0). Files live in public/emoji/<code>.svg; build them with scripts/build-emoji.mjs.
export type Cat = { id: string; label: string; icon: string; codes: string[] };
export const CATS: Cat[] = (idx as any).cats;
export const CODES: string[] = CATS.flatMap((c) => c.codes);
export const CODE_SET = new Set(CODES);
export const emojiUrl = (code: string) => `/emoji/${code}.svg`;
export const MAX_REACTIONS = 20;

const U: Record<string, string> = (idx as any).unicode;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MODS = "\\uFE0F\\u{1F3FB}-\\u{1F3FF}";
// longest first so sequences win over their first character; the lookahead keeps ZWJ sequences we don't know intact
const UNI_RE = Object.keys(U).length ? new RegExp(`(?:${Object.keys(U).sort((a, b) => b.length - a.length).map(esc).join("|")})[${MODS}]*(?!\\u200D)`, "gu") : null;
const key = (s: string) => s.replace(new RegExp(`[${MODS}]`, "gu"), "");
/** Unicode emoji that have a Mutant equivalent become :shortcode: (skin tones dropped). Others are left alone. */
export const toShortcodes = (t: string) => (UNI_RE ? t.replace(UNI_RE, (m) => (U[key(m)] ? `:${U[key(m)]}:` : m)) : t);

export const SC_RE = /:([a-z0-9_]{1,40}):/g;
/** Shortcode matches for the ":" picker: names that start with the query first, then ones that contain it. */
export const lookup = (q: string, max = 80) => {
  if (!q) return CODES.slice(0, max);
  const a: string[] = [], b: string[] = [];
  for (const c of CODES) { if (c.startsWith(q)) a.push(c); else if (c.includes(q)) b.push(c); }
  return [...a, ...b].slice(0, max);
};
/** Active picker query at the caret, or null. The ":" must be the first character, follow whitespace, or follow another :emoji:. */
export const pickerQuery = (left: string): string | null => {
  const m = left.match(/(?:^|\s|:[a-z0-9_]{1,40}:):([a-z0-9_]*)$/);
  return m ? m[1] : null;
};
