import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Md } from "@/components/Md";
import { GUIDELINES } from "@/lib/guidelines";
import * as F from "@/lib/fb";
import { Ic } from "@/components/Ic";
import { EmojiTextarea, InlineEmoji } from "@/components/Emoji";
import { Reactions } from "@/components/Reactions";

const TYPES = Object.keys(F.TAGS), go = (h: string) => { location.hash = h; };
const sel = "h-9 rounded-full border border-border bg-black px-3 text-sm";
const stop = (e: any) => e.stopPropagation();
const agoMs = (ms: number) => F.ago({ toMillis: () => ms });
const SUSP: [string, number][] = [["1 hour", 36e5], ["1 day", 864e5], ["7 days", 6048e5], ["30 days", 2592e6]];

function Avatar({ u, s = 24 }: any) {
  const [bad, setBad] = useState(false);
  return u.photo && !bad ? <img src={u.photo} alt="" onError={() => setBad(true)} className="shrink-0 rounded-full object-cover" style={{ width: s, height: s }} />
    : <span className="flex shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-medium" style={{ width: s, height: s }}>{(u.username || "?")[0].toUpperCase()}</span>;
}
function Name({ u, big }: { u: any; big?: boolean }) {
  const r = F.ROLES[u.role] || F.ROLES.default;
  return <a href={"#u-" + u.uid} onClick={stop} className={"inline-flex items-center gap-1 font-medium hover:underline " + (big ? "text-lg" : "")} style={{ color: r.c }}>{u.username}{r.i && <Ic n={r.i} f s={big ? 20 : 15} />}</a>;
}
const Chip = ({ status }: { status: string }) => { const [c, i] = F.STATUS[status] || ["#888888", "cancel"]; return <span className="inline-flex items-center gap-1 font-medium" style={{ color: c }}><Ic n={i} s={16} />{status}</span>; };
const Badge = ({ t }: { t: string }) => <span className="rounded-full bg-secondary px-2 py-0.5 text-white">{t}</span>;
const Reason = ({ x }: any) => x.removed && x.removedReason ? <p className="mt-2 rounded-lg border border-border p-2 text-sm text-muted-foreground">Removed: {x.removedReason}</p> : null;
const Empty = ({ icon, text }: { icon: string; text: string }) => <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground"><Ic n={icon} s={36} />{text}</div>;
const Form = ({ title, children }: any) => <div className="space-y-3 p-3"><h2 className="font-title text-2xl">{title}</h2>{children}</div>;
function Pick({ text, value, options, onChange, className }: any) {
  return <DropdownMenu><DropdownMenuTrigger className={"inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-border px-3 text-sm " + (className || "")}>{text}<Ic n="keyboard_arrow_down" s={18} /></DropdownMenuTrigger>
    <DropdownMenuContent align="end"><DropdownMenuRadioGroup value={value} onValueChange={onChange}>{options.map(([v, l]: any) => <DropdownMenuRadioItem key={v} value={v}>{l}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>;
}

// ── dialogs and item actions ───────────────────────────────────────────
type AskOpts = { title: string; placeholder?: string; initial?: string; action: string; danger?: boolean; field?: boolean; suspend?: boolean; max?: number; emoji?: boolean; allowEmpty?: boolean };
let ask: (o: AskOpts) => Promise<{ reason: string; ms: number } | null> = async () => null;
function AskHost() {
  const [s, setS] = useState<any>(null), [v, setV] = useState(""), [ms, setMs] = useState(0);
  useEffect(() => { ask = (o) => new Promise((r) => { setV(o.initial || ""); setMs(0); setS({ o, r }); }); }, []);
  if (!s) return null;
  const o: AskOpts = s.o, f = o.field !== false, done = (x: any) => { s.r(x); setS(null); };
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={() => done(null)}>
      <div className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-black p-4" onClick={stop}>
        <h3 className="text-lg font-medium">{o.title}</h3>
        {f && (o.emoji ? <EmojiTextarea autoFocus value={v} maxLength={o.max || 200} onChange={setV} placeholder={o.placeholder} className="min-h-[90px]" /> : <Textarea autoFocus value={v} maxLength={o.max || 200} onChange={(e) => setV(e.target.value)} placeholder={o.placeholder} className="min-h-[90px]" />)}
        {o.suspend && <label className="flex items-center justify-between gap-2 text-sm">Also suspend the author<select className={sel} value={ms} onChange={(e) => setMs(+e.target.value)}><option value={0}>No suspension</option>{SUSP.map(([l, x]) => <option key={l} value={x}>{l}</option>)}</select></label>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => done(null)}>Cancel</Button><Button variant={o.danger ? "destructive" : undefined} disabled={f && !o.allowEmpty && !v.trim()} onClick={() => done({ reason: v.trim(), ms })}>{o.action}</Button></div>
      </div>
    </div>
  );
}
const canSusp = (me: any, u: any) => F.isMod(me) && u.uid !== me.uid && ["default", "verified"].includes(u.role);
const pid = (x: any) => x.ref.parent.parent.id;
const tid = (x: any, kind: string) => kind === "comment" ? pid(x) + "/" + x.id : x.id;
async function removeIt(x: any, kind: string, me: any, u: any, done: () => void) {
  const can = canSusp(me, u), r = await ask({ title: `Remove this ${kind}?`, placeholder: "Reason (shown to the author)", action: "Remove", danger: true, suspend: can }); if (!r) return;
  const b = F.writeBatch(F.db);
  b.update(x.ref, { removed: true, removedReason: r.reason, removedAt: F.serverTimestamp(), removedBy: me.uid });
  if (kind === "comment") b.set(F.doc(F.db, "removedComments", x.id), { postId: pid(x), authorId: u.uid, text: x.text, reason: r.reason, createdAt: F.serverTimestamp() });
  F.audit(b, me, "removed", tid(x, kind), r.reason);
  if (can && r.ms) { b.update(F.doc(F.db, "users", u.uid), { suspendedUntil: Date.now() + r.ms }); F.audit(b, me, "suspended", F.tag(u), "for " + F.dur(r.ms)); }
  await b.commit(); F.forget(u.uid); done();
}
async function restoreIt(x: any, kind: string, me: any, done: () => void) {
  try {
    const b = F.writeBatch(F.db); b.update(x.ref, { removed: false });
    if (kind === "comment") b.delete(F.doc(F.db, "removedComments", x.id));
    F.audit(b, me, "restored", tid(x, kind)); await b.commit(); done();
  } catch (e) { toast.error(F.err(e)); }
}
function ModBtn({ x, kind, done }: any) {
  const { me } = F.useMe();
  return F.isMod(me) && x.removed ? <Button variant="outline" className="!px-3 !py-1" onClick={() => restoreIt(x, kind, me, done)}>Restore</Button> : null;
}
function ItemMenu({ x, u, kind, done }: any) {
  const { me } = F.useMe();
  if (!me) return null;
  const mod = F.isMod(me), mine = me.uid === u.uid, gone = x.removed || x.deleted, t = tid(x, kind);
  if (gone && !mod) return null;
  const run = (f: () => Promise<void>) => setTimeout(() => f().catch((e) => toast.error(F.err(e))), 60);
  const edit = () => kind === "request" ? go("#e-" + x.id) : run(async () => {
    const r = await ask({ title: "Edit comment", initial: x.text, max: 1000, action: "Save", emoji: true }); if (!r) return;
    const b = F.writeBatch(F.db); b.update(x.ref, { text: r.reason, editedAt: F.serverTimestamp() }); F.audit(b, me, "edited", t); await b.commit(); done();
  });
  const del = () => run(async () => {
    const r = await ask({ title: `Delete this ${kind}?`, field: false, danger: true, action: "Delete" }); if (!r) return;
    const b = F.writeBatch(F.db); b.update(x.ref, { deleted: true, deletedAt: F.serverTimestamp() }); F.audit(b, me, "deleted", t); await b.commit(); done();
  });
  const report = () => run(async () => {
    const r = await ask({ title: `Report this ${kind}`, placeholder: "What's wrong? Moderators will review it.", max: 300, action: "Report" }); if (!r) return;
    const b = F.writeBatch(F.db);
    b.set(F.doc(F.db, "reports", me.uid + "_" + x.id), { reporterId: me.uid, reporterName: me.username, kind: kind === "comment" ? "comment" : "post", postId: kind === "comment" ? pid(x) : x.id, targetId: x.id, targetAuthorId: u.uid, reason: r.reason, status: "open", createdAt: F.serverTimestamp() });
    F.audit(b, me, "reported", t, r.reason);
    try { await b.commit(); toast("Report sent. Thanks."); } catch (e: any) { toast.error(e.code === "permission-denied" ? "You already reported this, or can't report right now." : F.err(e)); }
  });
  const lock = () => run(async () => { const b = F.writeBatch(F.db); b.update(x.ref, { locked: !x.locked }); F.audit(b, me, x.locked ? "unlocked" : "locked", x.id); await b.commit(); done(); });
  return (
    <DropdownMenu><DropdownMenuTrigger className="rounded-full p-1 hover:bg-accent" aria-label="More actions"><Ic n="more_vert" s={22} /></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {mine && !gone && !(x.locked && kind === "request") && <DropdownMenuItem onSelect={edit}>Edit</DropdownMenuItem>}
        {mine && !gone && <DropdownMenuItem className="text-[#F87171]" onSelect={del}>Delete</DropdownMenuItem>}
        {!mine && !gone && <DropdownMenuItem onSelect={report}>Report…</DropdownMenuItem>}
        {mod && kind === "request" && !gone && <DropdownMenuItem onSelect={lock}>{x.locked ? "Unlock comments" : "Lock comments"}</DropdownMenuItem>}
        {mod && !x.deleted && (x.removed ? <DropdownMenuItem onSelect={() => run(() => restoreIt(x, kind, me, done))}>Restore</DropdownMenuItem>
          : <DropdownMenuItem className="text-[#F87171]" onSelect={() => run(() => removeIt(x, kind, me, u, done))}>Remove…</DropdownMenuItem>)}
        {mod && !mine && <DropdownMenuItem onSelect={() => go("#u-" + u.uid)}>Manage account</DropdownMenuItem>}
      </DropdownMenuContent></DropdownMenu>
  );
}

// ── posts ─────────────────────────────────────────────────────────────
async function hydrate(docs: any[], me: any) {
  const ps = docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
  const ext = await Promise.all(ps.map(async (p: any) => ({ ...(await F.stats(p.id)), m: await F.myVote(p.id, me?.uid), u: await F.getUser(p.authorId) })));
  return ps.map((p: any, i) => ({ ...p, ...ext[i] }));
}
function Votes({ id, s, m, done }: any) {
  const { me } = F.useMe();
  const vote = async (d: number) => {
    if (!F.guard(me)) return;
    const r = F.doc(F.db, "posts", id, "votes", me.uid);
    try { Math.sign(m) === d ? await F.deleteDoc(r) : await F.setDoc(r, { score: d * (me.role === "default" ? 1 : 2) }); } catch (e) { toast.error(F.err(e)); }
    done();
  };
  const b = (d: number, n: string) => <button onClick={() => vote(d)} className="rounded-full p-1 hover:bg-accent" style={{ color: Math.sign(m) === d ? "#fff" : "#888" }}><Ic n={n} f={Math.sign(m) === d} s={22} /></button>;
  return <div className="inline-flex items-center rounded-full bg-secondary" onClick={stop}>{b(1, "keyboard_arrow_up")}<b className="min-w-5 text-center text-sm">{s}</b>{b(-1, "keyboard_arrow_down")}</div>;
}
function PostCard({ p, reload, full }: any) {
  const { me } = F.useMe();
  const media = !!p.media?.length;
  return (
    <div className={"border-t border-border px-3 py-3 " + (full ? "" : "cursor-pointer active:bg-secondary/60")} onClick={() => !full && go("#p-" + p.id)} style={{ opacity: p.removed || p.deleted ? 0.55 : 1 }}>
      <div className="flex items-center gap-2 text-sm"><Avatar u={p.u} /><Name u={p.u} /><span className="text-muted-foreground">· {F.ago(p.createdAt)}{p.editedAt ? " · edited" : ""}</span>
        <div className="ml-auto flex items-center gap-1" onClick={stop}>
          {full && me?.role === "owner" && !p.deleted && <Pick text={p.status || "Set status"} value={p.status || ""} options={[["", "No status"], ...Object.keys(F.STATUS).map((k) => [k, k])]}
            onChange={async (v: string) => { try { const b = F.writeBatch(F.db); b.update(p.ref, { status: v || null, statusAt: F.serverTimestamp() }); F.audit(b, me, "set", p.id, "to " + (v || "No status")); await b.commit(); reload(); } catch (e) { toast.error(F.err(e)); } }} />}
          <ItemMenu x={p} u={p.u} kind="request" done={reload} /></div></div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"><Badge t={p.type} />{p.locked && <Badge t="Locked" />}{p.status && <Chip status={p.status} />}</div>
      <div className={"mt-1.5 break-words font-medium leading-snug " + (full ? "text-xl" : "text-lg")}>{p.deleted ? "[deleted]" : (p.removed ? "[removed] " : "") + p.title}</div>
      {p.deleted ? <p className="mt-1 text-sm text-muted-foreground">Deleted by the author.</p> : full ? <Md text={p.description} mentions={false} /> : !media && <p className="mt-1 line-clamp-3 break-words text-sm text-muted-foreground"><InlineEmoji text={p.description} /></p>}
      <Reason x={p} />
      <div className="mt-2 flex items-center gap-3" onClick={stop}><Votes id={p.id} s={p.s} m={p.m} done={reload} />
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Ic n="chat_bubble" s={18} />{p.cn}</span></div>
    </div>
  );
}

function useSentinel(cb: () => void, on: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!on || !ref.current) return; const o = new IntersectionObserver((e) => { if (e[0].isIntersecting) cb(); }, { rootMargin: "500px" }); o.observe(ref.current); return () => o.disconnect(); });
  return ref;
}

// ── search with slash commands ─────────────────────────────────────────
const CMDS: [string, string, string, boolean][] = [
  ["popular", "Most interactions (comments, votes)", "sort", false], ["top", "Most liked", "sort", false], ["bottom", "Most disliked", "sort", false], ["new", "Newest", "sort", false], ["old", "Oldest", "sort", false],
  ["feature", "Features", "filter", false], ["change", "Changes", "filter", false], ["visual", "Visual bugs", "filter", false], ["functional", "Functional bugs", "filter", false],
  ["public", "Not removed", "filter", true], ["removed", "Removed", "filter", true],
  ["nostat", "No status", "filter", false], ["unplanned", "Not planned", "filter", false], ["intended", "Intended features", "filter", false], ["low", "Low priority", "filter", false], ["high", "High priority", "filter", false], ["highest", "Highest priority", "filter", false], ["complete", "Completed", "filter", false]];
const FILTERS: Record<string, (p: any) => boolean> = {
  feature: (p) => p.type === "Feature", change: (p) => p.type === "Change", visual: (p) => p.type === "Visual Bug", functional: (p) => p.type === "Functional Bug",
  public: (p) => !p.removed, removed: (p) => !!p.removed, nostat: (p) => !p.status, unplanned: (p) => p.status === "Not Planned", intended: (p) => p.status === "Intended Feature",
  low: (p) => p.status === "Low Priority", high: (p) => p.status === "High Priority", highest: (p) => p.status === "Highest Priority", complete: (p) => p.status === "Completed" };
const tm = (p: any) => p.createdAt?.toMillis() || 0;
const SORTS: Record<string, (a: any, b: any) => number> = {
  popular: (a, b) => (b.vn + b.cn) - (a.vn + a.cn) || tm(b) - tm(a), top: (a, b) => b.s - a.s || tm(b) - tm(a), bottom: (a, b) => a.s - b.s || tm(b) - tm(a), new: (a, b) => tm(b) - tm(a), old: (a, b) => tm(a) - tm(b) };
function parse(q: string, mod: boolean) {
  const inc: string[] = [], exc: string[] = [], words: string[] = []; let sort = "popular";
  for (const w of q.split(/\s+/).filter(Boolean)) {
    if (!w.startsWith("/")) { words.push(w); continue; }
    const m = w.match(/^\/(!?)(\w+)$/), c = m && CMDS.find((x) => x[0] === m[2].toLowerCase());
    if (m && c && (!c[3] || mod)) { if (c[2] === "sort") { if (!m[1]) sort = c[0]; } else (m[1] ? exc : inc).push(c[0]); }
  }
  return { inc, exc, sort, text: words.join(" ").toLowerCase() };
}
function Search({ q, setQ, mod }: any) {
  const [open, setOpen] = useState(false), [acc, setAcc] = useState<any[]>([]);
  const rec: string[] = JSON.parse(localStorage.getItem("rq.recent") || "[]");
  const save = (s: string) => { s = s.trim(); if (s) localStorage.setItem("rq.recent", JSON.stringify([s, ...rec.filter((x) => x !== s)].slice(0, 8))); };
  const last = q.split(/\s+/).pop() || "", isAt = q.startsWith("@"), isCmd = last.startsWith("/") && !q.endsWith(" ");
  useEffect(() => {
    const t = q.slice(1).trim();
    if (!isAt || !t) return setAcc([]);
    const h = setTimeout(async () => {
      const rs = await Promise.all([...new Set([t, t[0].toUpperCase() + t.slice(1)])].map((n) => F.getDocs(F.query(F.collection(F.db, "users"), F.orderBy("username"), F.where("username", ">=", n), F.where("username", "<=", n + "\uf8ff"), F.limit(6))).catch(() => null)));
      const m = new Map<string, any>(); rs.forEach((r) => r?.docs.forEach((d) => m.set(d.id, { uid: d.id, ...d.data() }))); setAcc([...m.values()].slice(0, 6));
    }, 250);
    return () => clearTimeout(h);
  }, [q]);
  const bang = last.startsWith("/!"), pre = last.slice(bang ? 2 : 1).toLowerCase();
  const cmds = CMDS.filter((c) => (!c[3] || mod) && (!bang || c[2] === "filter") && c[0].startsWith(pre));
  const row = "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent";
  const panel = isAt ? (acc.length ? acc.map((u) => <a key={u.uid} href={"#u-" + u.uid} onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(false); setQ(""); }} className={row}><span className="flex items-center gap-2"><Avatar u={u} /><Name u={u} /></span></a>)
      : <div className="px-3 py-2 text-sm text-muted-foreground">{q.length > 1 ? "No accounts found." : "Type a username."}</div>)
    : isCmd ? cmds.map((c) => <button key={c[0]} onMouseDown={(e) => e.preventDefault()} onClick={() => setQ(q.slice(0, q.length - last.length) + "/" + (bang ? "!" : "") + c[0] + " ")} className={row}><b>/{bang ? "!" : ""}{c[0]}</b><span className="truncate text-muted-foreground">{c[1]}</span></button>)
    : !q && rec.length ? rec.map((r) => <button key={r} onMouseDown={(e) => e.preventDefault()} onClick={() => setQ(r)} className={row}><span className="truncate">{r}</span><Ic n="search" s={16} c="#888" /></button>) : null;
  return (
    <div className="relative">
      <div className="flex h-10 items-center gap-2 rounded-full bg-secondary px-3"><Ic n="search" s={20} c="#888" />
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); save(q); }} onKeyDown={(e) => { if (e.key === "Enter") { save(q); setOpen(false); (e.target as any).blur(); } }}
          placeholder="Search, @account or /command" className="min-w-0 flex-1 bg-transparent outline-none" />
        {q && <button onMouseDown={(e) => e.preventDefault()} onClick={() => setQ("")}><Ic n="close" s={18} c="#888" /></button>}</div>
      {open && panel && <div className="absolute inset-x-0 top-12 z-20 max-h-72 overflow-y-auto rounded-xl border border-border bg-black py-1 shadow-lg">{panel}</div>}
    </div>
  );
}

function Home({ q, setQ }: { q: string; setQ: (s: string) => void }) {
  const { me } = F.useMe();
  const [all, setAll] = useState<any[]>([]), [cur, setCur] = useState<any>(null), [more, setMore] = useState(true), [busy, setBusy] = useState(true), [t, setT] = useState(0);
  const PAGE = 20;
  const load = async (reset: boolean, n = PAGE) => {
    if (busy && !reset) return; setBusy(true);
    try {
      const cs: any[] = [F.orderBy("createdAt", "desc")]; if (!reset && cur) cs.push(F.startAfter(cur)); cs.push(F.limit(n));
      const snap = await F.getDocs((F.query as any)(F.collection(F.db, "posts"), ...cs));
      const items = await hydrate(snap.docs.filter((d) => { const p: any = d.data(); return !(p.removed || p.deleted) || F.isMod(me) || (p.authorId === me?.uid && !p.deleted); }), me);
      setAll((a) => reset ? items : [...a, ...items]); setCur(snap.docs[snap.docs.length - 1] || null); setMore(snap.docs.length === n);
    } catch { setMore(false); }
    setBusy(false);
  };
  useEffect(() => { load(true, Math.max(PAGE, all.length)); }, [t, me?.uid]);
  const sent = useSentinel(() => load(false), more && !busy);
  const f = parse(q.startsWith("@") ? "" : q, F.isMod(me));
  let ps = all;
  if (f.inc.length) ps = ps.filter((p) => f.inc.some((k) => FILTERS[k](p)));
  if (f.exc.length) ps = ps.filter((p) => !f.exc.some((k) => FILTERS[k](p)));
  if (f.text) ps = ps.filter((p) => (p.title + " " + p.description + " " + p.u.username).toLowerCase().includes(f.text));
  ps = [...ps].sort(SORTS[f.sort]);
  return (
    <div>
      <div className="sticky top-0 z-10 bg-black/95 px-3 pb-2 backdrop-blur" style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}><Search q={q} setQ={setQ} mod={F.isMod(me)} /></div>
      <Susp />
      {!ps.length && !busy && !more ? <Empty icon="search" text={q ? "No matches." : "No requests yet."} /> : ps.map((p) => <PostCard key={p.id} p={p} reload={() => setT((x) => x + 1)} />)}
      <div ref={sent} className="p-4 text-center text-sm text-muted-foreground">{busy ? "Loading…" : more ? "" : ps.length ? "You're all caught up." : ""}</div>
    </div>
  );
}

function Post({ id }: { id: string }) {
  const { me } = F.useMe();
  const [p, setP] = useState<any>(undefined), [cs, setCs] = useState<any[]>([]), [t, setT] = useState(0), [text, setText] = useState(""), [busy, setBusy] = useState(false);
  const reload = () => setT((x) => x + 1);
  const [rx, setRx] = useState<any[]>([]);
  const loadRx = () => F.getDocs(F.query(F.collection(F.db, "posts", id, "reactions"), F.limit(2000))).then((r) => setRx(r.docs.map((d) => d.data()))).catch(() => {});
  useEffect(() => { loadRx(); }, [id]);
  useEffect(() => {
    (async () => {
      const s = await F.getDoc(F.doc(F.db, "posts", id));
      if (!s.exists()) return setP(null);
      const c = await F.getDocs(F.query(F.collection(F.db, "posts", id, "comments"), F.orderBy("createdAt", "asc"), F.limit(200)));
      const cl = await Promise.all(c.docs.map(async (x) => ({ ref: x.ref, id: x.id, ...x.data(), u: await F.getUser((x.data() as any).authorId) })));
      setP((await hydrate([s], me))[0]); setCs(cl);
    })().catch(() => setP(null));
  }, [id, t, me?.uid]);
  if (p === undefined) return <Empty icon="search" text="Loading…" />;
  if (!p || ((p.removed || p.deleted) && !F.isMod(me) && (p.deleted || p.authorId !== me?.uid))) return <Empty icon="search" text="Request not found." />;
  const post = async () => {
    if (!F.guard(me) || !text.trim()) return;
    const w = await F.waitLeft(me.uid, "comment"); if (w > 0) return void toast(`Slow down. Try again in ${w}s.`);
    setBusy(true);
    try {
      const pr = await F.resolvePings(text, me);
      if (pr.denied.length) { setBusy(false); return void toast(`Only the owner can ping ${pr.denied.join(", ")}.`); }
      if (pr.tooMany) { setBusy(false); return void toast(`Ping at most ${F.MAX_PINGS} people per comment.`); }
      const cr = F.doc(F.collection(F.db, "posts", id, "comments")), b = F.writeBatch(F.db);
      b.set(cr, { authorId: me.uid, authorName: me.username, text: text.trim(), removed: false, ...(pr.targets.length ? { pings: pr.targets } : {}), createdAt: F.serverTimestamp() });
      pr.targets.forEach((t) => b.set(F.doc(F.db, "pings", t, "items", F.pingId(cr.id)), { postId: id, commentId: cr.id, fromId: me.uid, fromName: me.username, text: text.trim().slice(0, 140), createdAt: F.serverTimestamp() }));
      b.set(F.limitDoc(me.uid, "comment"), { t: F.serverTimestamp() }); F.audit(b, me, "commented", id + "/" + cr.id);
      await b.commit(); setText(""); reload();
    } catch (e) { toast.error(F.err(e)); }
    setBusy(false);
  };
  const locked = p.locked && !F.isMod(me);
  return (
    <div>
      <button onClick={() => history.length > 1 ? history.back() : go("")} className="flex items-center gap-1 px-3 py-3 text-sm text-muted-foreground" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}><Ic n="arrow_back" s={18} />Back</button>
      <PostCard p={p} reload={reload} full />
      {!p.deleted && !p.removed && <div className="px-3 pb-3"><Reactions pid={id} target="post" all={rx} me={me} reload={loadRx} /></div>}
      <div className="border-t border-border px-3 py-2 text-sm text-muted-foreground">{cs.length} comment{cs.length === 1 ? "" : "s"}</div>
      {cs.filter((c) => !c.removed || F.isMod(me) || c.authorId === me?.uid).map((c) => (
        <div key={c.id} className="border-t border-border px-3 py-3" style={{ opacity: c.removed || c.deleted ? 0.55 : 1 }}>
          <div className="flex items-center gap-2 text-sm"><Avatar u={c.u} s={22} /><Name u={c.u} /><span className="text-muted-foreground">· {F.ago(c.createdAt)}{c.editedAt ? " · edited" : ""}</span><div className="ml-auto"><ItemMenu x={c} u={c.u} kind="comment" done={reload} /></div></div>
          <div className="mt-1">{c.deleted ? <p className="text-muted-foreground">[deleted]</p> : c.removed ? <p>[removed]</p> : <Md text={c.text} />}</div><Reason x={c} />
          {!c.deleted && !c.removed && <Reactions pid={id} target={c.id} all={rx} me={me} reload={loadRx} />}
        </div>))}
      <div className="space-y-2 border-t border-border p-3">
        {!me ? <Button variant="outline" onClick={() => go("#login")}>Sign in to vote or comment</Button> : p.deleted ? null : locked ? <p className="text-sm text-muted-foreground">This request is locked. New comments are turned off.</p> :
          <><EmojiTextarea value={text} maxLength={1000} onChange={setText} placeholder="Add a comment (markdown, @pings and :emoji: supported)" className="min-h-[70px]" /><Button disabled={busy} onClick={post}>Comment</Button></>}
      </div>
    </div>
  );
}

function NewPost() {
  const { me } = F.useMe();
  const [type, setType] = useState(TYPES[0]), [title, setTitle] = useState(""), [desc, setDesc] = useState(""), [busy, setBusy] = useState(false);
  if (!me) return <Form title="New request"><Button onClick={() => go("#login")}>Sign in to post</Button></Form>;
  const submit = async () => {
    if (!F.guard(me)) return; if (!title.trim() || !desc.trim()) return void toast("Add a title and description.");
    const w = await F.waitLeft(me.uid, "post"); if (w > 0) return void toast(`Slow down. You can post again in ${w}s.`);
    setBusy(true);
    try {
      const pr = F.doc(F.collection(F.db, "posts")), b = F.writeBatch(F.db);
      b.set(pr, { authorId: me.uid, authorName: me.username, type, title: title.trim(), description: desc.trim(), status: null, removed: false, createdAt: F.serverTimestamp() });
      b.set(F.limitDoc(me.uid, "post"), { t: F.serverTimestamp() }); F.audit(b, me, "posted", pr.id, title.trim());
      await b.commit(); go("#p-" + pr.id);
    } catch (e) { toast.error(F.err(e)); setBusy(false); }
  };
  return <Form title="New request">
    <div className="flex gap-2"><Input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="Title" /><Pick text={type} value={type} options={TYPES.map((k) => [k, k])} onChange={setType} className="h-10" /></div>
    <EmojiTextarea value={desc} maxLength={2000} onChange={setDesc} placeholder="Describe it. Markdown, links and :emoji: are supported." className="min-h-[180px]" />
    <Button disabled={busy} onClick={submit}>Post</Button>
    <p className="text-xs text-muted-foreground">By posting you agree to the <a href="#rules" className="underline">community guidelines</a>.</p>
  </Form>;
}

function EditPost({ id }: { id: string }) {
  const { me } = F.useMe();
  const [p, setP] = useState<any>(undefined), [title, setTitle] = useState(""), [desc, setDesc] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { F.getDoc(F.doc(F.db, "posts", id)).then((s) => { const d: any = s.data(); setP(d ? { ref: s.ref, ...d } : null); if (d) { setTitle(d.title); setDesc(d.description); } }).catch(() => setP(null)); }, [id]);
  if (p === undefined) return <Empty icon="search" text="Loading…" />;
  if (!p || !me || p.authorId !== me.uid) return <Empty icon="search" text="You can't edit this request." />;
  const save = async () => {
    if (!F.guard(me) || !title.trim() || !desc.trim()) return; setBusy(true);
    try { const b = F.writeBatch(F.db); b.update(p.ref, { title: title.trim(), description: desc.trim(), editedAt: F.serverTimestamp() }); F.audit(b, me, "edited", id); await b.commit(); go("#p-" + id); } catch (e) { toast.error(F.err(e)); setBusy(false); }
  };
  return <Form title="Edit request"><Input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} /><EmojiTextarea value={desc} maxLength={2000} onChange={setDesc} className="min-h-[180px]" />
    <div className="flex gap-2"><Button disabled={busy} onClick={save}>Save</Button><Button variant="outline" onClick={() => history.back()}>Cancel</Button></div></Form>;
}

function Rules() {
  return <div className="px-3 pb-6" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
    <button onClick={() => history.length > 1 ? history.back() : go("")} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground"><Ic n="arrow_back" s={18} />Back</button>
    <Md text={GUIDELINES} /></div>;
}

// ── profile + moderator tools ──────────────────────────────────────────
function SuspendPanel({ u, done }: any) {
  const { me } = F.useMe();
  const [n, setN] = useState("1"), [unit, setUnit] = useState(864e5), [why, setWhy] = useState("");
  const left = u.suspendedUntil - Date.now();
  const apply = async () => {
    const ms = Math.round(+n * unit);
    if (!(ms >= 6e4) || ms > 365 * 864e5) return void toast("Pick a length between 1 minute and 365 days.");
    try { const b = F.writeBatch(F.db); b.update(F.doc(F.db, "users", u.uid), { suspendedUntil: Date.now() + ms }); F.audit(b, me, "suspended", F.tag(u), `for ${F.dur(ms)}${why.trim() ? ": " + why.trim() : ""}`); await b.commit(); F.forget(u.uid); toast("Suspended."); setWhy(""); done(); } catch (e) { toast.error(F.err(e)); }
  };
  const lift = async () => { try { const b = F.writeBatch(F.db); b.update(F.doc(F.db, "users", u.uid), { suspendedUntil: 0 }); F.audit(b, me, "lifted suspension of", F.tag(u)); await b.commit(); F.forget(u.uid); toast("Suspension lifted."); done(); } catch (e) { toast.error(F.err(e)); } };
  const preset = ([l, v]: [string, number]) => <button key={l} onClick={() => { setUnit(v >= 864e5 ? 864e5 : 36e5); setN(String(v / (v >= 864e5 ? 864e5 : 36e5))); }} className="rounded-full border border-border px-3 py-1 text-xs">{l}</button>;
  return (
    <div className="space-y-2">
      <div className="text-sm">{left > 0 ? <>Suspended until {new Date(u.suspendedUntil).toLocaleString()} <span className="text-muted-foreground">({F.fmt(left)} left)</span></> : "Not suspended"}</div>
      {canSusp(me, u) && <>
        <div className="flex flex-wrap gap-2">{SUSP.map(preset)}</div>
        <div className="flex items-center gap-2"><Input type="number" min={1} value={n} onChange={(e) => setN(e.target.value)} className="w-20" />
          <select className={sel} value={unit} onChange={(e) => setUnit(+e.target.value)}><option value={6e4}>minutes</option><option value={36e5}>hours</option><option value={864e5}>days</option></select></div>
        <Input value={why} maxLength={150} onChange={(e) => setWhy(e.target.value)} placeholder="Reason (saved in the audit log)" />
        <div className="flex gap-2"><Button variant="destructive" className="!px-4 !py-1.5" onClick={apply}>Suspend</Button>{left > 0 && <Button variant="outline" className="!px-4 !py-1.5" onClick={lift}>Lift suspension</Button>}</div></>}
    </div>
  );
}
function Tools({ u, done }: any) {
  const { me } = F.useMe();
  const [blocked, setBlocked] = useState<boolean | null>(null);
  useEffect(() => { if (me?.role === "owner") F.getDoc(F.doc(F.db, "blocklist", u.uid)).then((s) => setBlocked(s.exists())).catch(() => {}); }, [u.uid, me?.uid]);
  if (!F.isMod(me) || me.uid === u.uid || u.role === "owner") return null;
  const role = async (v: string) => { try { const b = F.writeBatch(F.db); b.update(F.doc(F.db, "users", u.uid), { role: v }); F.audit(b, me, "set", F.tag(u), "to " + (F.ROLES[v]?.l || v)); await b.commit(); F.forget(u.uid); toast("Updated."); done(); } catch (e) { toast.error(F.err(e)); } };
  const block = async () => { try { const b = F.writeBatch(F.db), r = F.doc(F.db, "blocklist", u.uid); blocked ? b.delete(r) : b.set(r, { username: u.username }); F.audit(b, me, blocked ? "unblocklisted" : "blocklisted", F.tag(u)); await b.commit(); setBlocked(!blocked); } catch (e) { toast.error(F.err(e)); } };
  return (
    <div className="mx-4 mb-3 space-y-3 rounded-xl border border-border p-3"><div className="text-xs text-muted-foreground">Moderator tools</div>
      {me.role === "owner" && <div className="flex items-center justify-between gap-2"><span className="text-sm">Role</span><Pick text={u.role === "default" ? "None" : u.role === "verified" ? "Verified" : "Mod"} value={u.role} options={[["default", "None"], ["verified", "Verified"], ["moderator", "Mod"]]} onChange={role} /></div>}
      <SuspendPanel u={u} done={done} />
      {me.role === "owner" && blocked !== null && <div className="flex items-center justify-between gap-2"><span className="text-sm">Blocklist</span><Button variant="outline" className="!px-3 !py-1" onClick={block}>{blocked ? "Unblock" : "Block"}</Button></div>}
    </div>
  );
}
function Profile({ id }: { id: string }) {
  const { me } = F.useMe();
  const [u, setU] = useState<any>(null), [info, setInfo] = useState<any>(null), [ps, setPs] = useState<any[]>([]), [t, setT] = useState(0);
  const reload = () => setT((x) => x + 1);
  useEffect(() => {
    (async () => {
      setU(await F.getUser(id)); F.castleInfo(id).then(setInfo);
      const s = await F.getDocs(F.query(F.collection(F.db, "posts"), F.where("authorId", "==", id)));
      setPs((await hydrate(s.docs.filter((d) => { const p: any = d.data(); return !(p.removed || p.deleted) || F.isMod(me) || (id === me?.uid && !p.deleted); }), me)).sort((a, b) => tm(b) - tm(a)));
    })().catch(() => {});
  }, [id, me?.uid, t]);
  if (!u) return <Empty icon="person" text="Loading…" />;
  const r = F.ROLES[u.role] || F.ROLES.default, self = me?.uid === id, photo = u.photo || info?.photo?.url;
  return (
    <div>
      <div className="flex items-center gap-3 p-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}>
        {photo ? <img src={photo} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary"><Ic n="person" s={32} c="#888" /></div>}
        <div><Name u={u} big /><div className="text-sm text-muted-foreground">{r.l}{info ? ` · ${info.followersCount ?? 0} followers · ${info.publicDecksCount ?? 0} public decks` : ""}</div></div>
      </div>
      {(u.bio || u.about) && <p className="whitespace-pre-wrap break-words px-4 pb-3 text-sm"><InlineEmoji text={u.bio || u.about} /></p>}
      {self && !F.susp(me) && <div className="px-4 pb-3"><Button variant="outline" className="!px-3 !py-1" onClick={async () => {
        const r = await ask({ title: "Profile description", initial: u.bio || "", placeholder: "Tell people about yourself", max: 300, action: "Save", emoji: true, allowEmpty: true }); if (!r) return;
        try { await F.updateDoc(F.doc(F.db, "users", me.uid), { bio: r.reason }); F.forget(me.uid); await F.loadMe(); reload(); toast("Saved."); } catch (e) { toast.error(F.err(e)); }
      }}>{u.bio ? "Edit description" : "Add description"}</Button></div>}
      <Tools u={u} done={reload} />
      {self && <><Susp /><div className="flex flex-wrap gap-2 px-4 pb-3">{["default", "verified"].includes(u.role) && <Button variant="outline" onClick={() => go("#apply")}>Apply to be a moderator</Button>}<Button variant="outline" onClick={() => go("#rules")}>Community guidelines</Button><Button variant="outline" onClick={() => { F.signOut(F.auth); go(""); }}>Sign out</Button></div></>}
      <div className="border-t border-border px-3 py-2 text-sm text-muted-foreground">{ps.length} request{ps.length === 1 ? "" : "s"}</div>
      {ps.map((p) => <PostCard key={p.id} p={p} reload={reload} />)}
    </div>
  );
}

function BottomNav({ hash, unread }: { hash: string; unread: number }) {
  const { me } = F.useMe();
  const tabs: [string, string, string, boolean][] = [["Home", "home", "", true], ["Moderation", "shield", "#mod", F.isMod(me)], ["Create", "add_circle", "#new", true], ["Inbox", "inbox", "#inbox", true], ["You", "person", me ? "#u-" + me.uid : "#login", true]];
  const on = (h: string) => h === "" ? hash === "" || hash.startsWith("#p-") : hash === h;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-black/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex max-w-2xl">
        {tabs.filter((x) => x[3]).map(([l, i, h]) => (
          <button key={l} onClick={() => go((h === "#new" || h === "#inbox") && !me ? "#login" : h)} className="relative flex flex-1 flex-col items-center gap-0.5 py-2" style={{ color: on(h) ? "#fff" : "#888" }}>
            <Ic n={i} f={on(h)} s={26} /><span className="text-[11px]">{l}</span>
            {l === "Inbox" && unread > 0 && <span className="absolute left-1/2 top-1 ml-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">{unread > 9 ? "9+" : unread}</span>}
          </button>))}
      </div>
    </nav>
  );
}

export function App() {
  const hash = F.useHash(), [q, setQ] = useState(""), { me } = F.useMe();
  const [ib, setIb] = useState<any>({ items: [], seen: 0 }), prev = useRef(0);
  const key = "rq.seen." + me?.uid, m = hash.match(/^#([pue])-([\w-]+)$/);
  useEffect(() => { if (hash === "#inbox" && me) prev.current = +(localStorage.getItem(key) || 0); }, [hash, me?.uid]);
  useEffect(() => {
    if (!me) return setIb({ items: [], seen: 0 });
    getInbox(me).then((items) => setIb({ items, seen: +(localStorage.getItem(key) || 0) })).catch(() => {});
  }, [me?.uid, hash === "#inbox"]);
  const unread = ib.items.filter((i: any) => i.t > ib.seen).length;
  return (
    <div className="min-h-full bg-black font-body text-white">
      <main className="mx-auto max-w-2xl" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 84px)" }}>
        {m?.[1] === "p" ? <Post id={m[2]} /> : m?.[1] === "u" ? <Profile id={m[2]} /> : m?.[1] === "e" ? <EditPost id={m[2]} /> : hash === "#rules" ? <Rules /> : hash === "#new" ? <NewPost /> : hash === "#login" ? <Login /> : hash === "#apply" ? <Apply /> :
          hash === "#inbox" ? <Inbox items={ib.items} prev={prev.current} onSeen={() => setIb((s: any) => ({ ...s, seen: Date.now() }))} /> : hash === "#mod" ? <Mod /> : <Home q={q} setQ={setQ} />}
      </main>
      <BottomNav hash={hash} unread={unread} />
      <AskHost /><Toaster />
    </div>
  );
}

function Susp() {
  const { me } = F.useMe(), [, tick] = useState(0);
  useEffect(() => { if (!F.susp(me)) return; const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, [me]);
  return F.susp(me) ? <div className="mx-3 mb-2 rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: "#F87171", color: "#F87171" }}>Suspended. Time left: {F.fmt(me.suspendedUntil - Date.now())}</div> : null;
}

function Login() {
  const [u, setU] = useState(""), [p, setP] = useState(""), [busy, setBusy] = useState(false);
  const submit = async () => { if (!u || !p) return; setBusy(true); try { await F.login(u.trim(), p); setP(""); go(""); } catch (e: any) { toast.error(e.message); setBusy(false); } };
  return <Form title="Sign in">
    <p className="text-sm text-muted-foreground">Uses your Castle account. Your password goes straight to Castle and is never stored. Signed in with Google? Use the “Need help?” link in Castletool instead.</p>
    <Input value={u} onChange={(e) => setU(e.target.value)} placeholder="Castle username or email" autoComplete="username" />
    <Input type="password" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Password" autoComplete="current-password" />
    <Button disabled={busy} onClick={submit}>Sign in</Button>
  </Form>;
}

function Apply() {
  const { me } = F.useMe();
  const [text, setText] = useState(""), [ex, setEx] = useState<any>(undefined);
  useEffect(() => { if (me) F.getDoc(F.doc(F.db, "modApplications", me.uid)).then((s) => setEx(s.exists() ? s.data() : null)).catch(() => setEx(null)); }, [me?.uid]);
  if (!me || ex === undefined) return null;
  if (!["default", "verified"].includes(me.role)) return <Form title="Moderator application"><p className="text-muted-foreground">You already have a staff role.</p></Form>;
  if (ex?.status === "pending") return <Form title="Moderator application"><p className="text-muted-foreground">Your application is waiting for review. You'll get a note in your inbox.</p></Form>;
  const send = async () => {
    if (!F.guard(me) || !text.trim()) return;
    try { const r = F.doc(F.db, "modApplications", me.uid); if (ex) await F.deleteDoc(r); const b = F.writeBatch(F.db); b.set(r, { text: text.trim(), status: "pending", createdAt: F.serverTimestamp() }); F.audit(b, me, "applied for", "moderator"); await b.commit(); toast("Application sent."); go("#inbox"); } catch (e) { toast.error(F.err(e)); }
  };
  return <Form title="Moderator application">
    {ex?.status === "declined" && <p className="text-sm text-muted-foreground">Your last application was declined. You can apply again.</p>}
    <Textarea value={text} maxLength={1500} onChange={(e) => setText(e.target.value)} placeholder="Why would you be a good moderator?" className="min-h-[160px]" /><Button onClick={send}>Send</Button></Form>;
}

async function getInbox(me: any) {
  const items: any[] = [];
  try { const a = await F.getDoc(F.doc(F.db, "modApplications", me.uid)); if (a.exists()) { const d: any = a.data(); items.push(d.status === "pending" ? { t: d.createdAt?.toMillis() || 0, icon: "shield", text: "Moderator application sent. Waiting for review." } : { t: d.decidedAt?.toMillis() || 0, icon: "shield", text: `Your moderator application was ${d.status}.` }); } } catch { /* none */ }
  const s = await F.getDocs(F.query(F.collection(F.db, "posts"), F.where("authorId", "==", me.uid)));
  await Promise.all(s.docs.map(async (d) => {
    const p: any = d.data(), id = d.id;
    if (p.removed) items.push({ t: p.removedAt?.toMillis() || 0, id, icon: "cancel", text: `Your request “${p.title}” was removed.`, sub: p.removedReason });
    if (p.status) items.push({ t: p.statusAt?.toMillis() || 0, id, icon: F.STATUS[p.status]?.[1] || "check_circle", color: F.STATUS[p.status]?.[0], text: `“${p.title}” is now ${p.status}.` });
    const c = await F.getDocs(F.query(F.collection(F.db, "posts", id, "comments"), F.orderBy("createdAt", "desc"), F.limit(20)));
    const o = c.docs.map((x) => x.data() as any).filter((x) => x.authorId !== me.uid && !x.removed);
    if (o.length) items.push({ t: o[0].createdAt?.toMillis() || 0, id, icon: "keyboard_arrow_up", text: `${o[0].authorName} commented on “${p.title}”${o.length > 1 ? ` (+${o.length - 1} more)` : ""}.`, sub: o[0].text });
  }));
  // pings: direct, plus group boxes this role can read; deduped per comment, hidden if the comment or request is gone
  const seen = new Set<string>(), posts = new Map<string, any>();
  const boxes = await Promise.all(F.pingBoxes(me).map((t) => F.getDocs(F.query(F.collection(F.db, "pings", t, "items"), F.limit(15))).catch(() => null)));
  const pings = boxes.flatMap((x) => x?.docs.map((d) => d.data() as any) || []).filter((d) => d.fromId !== me.uid && !seen.has(d.commentId) && seen.add(d.commentId));
  await Promise.all(pings.map(async (d) => {
    try {
      if (!posts.has(d.postId)) posts.set(d.postId, F.getDoc(F.doc(F.db, "posts", d.postId)));
      const [ps, cs] = await Promise.all([posts.get(d.postId), F.getDoc(F.doc(F.db, "posts", d.postId, "comments", d.commentId))]);
      const p: any = ps.data(), c: any = cs.data();
      if (!p || p.removed || p.deleted || !c || c.removed || c.deleted) return;
      items.push({ t: d.createdAt?.toMillis() || 0, id: d.postId, icon: "alternate_email", text: `${d.fromName} pinged you on “${p.title}”.`, sub: c.text });
    } catch { /* skip */ }
  }));
  return items.sort((a, b) => b.t - a.t);
}

function Inbox({ items, prev, onSeen }: any) {
  const { me } = F.useMe();
  useEffect(() => { if (me) { localStorage.setItem("rq.seen." + me.uid, String(Date.now())); onSeen(); } }, [me?.uid]);
  if (!me) return <Form title="Inbox"><Button onClick={() => go("#login")}>Sign in</Button></Form>;
  return (
    <div><h2 className="font-title text-2xl" style={{ padding: "calc(env(safe-area-inset-top) + 12px) 12px 8px" }}>Inbox</h2>
      {!items.length ? <Empty icon="inbox" text="Nothing yet. Replies, status changes, removals and application results show up here." /> :
        items.map((i: any, k: number) => (
          <div key={k} onClick={() => i.id && go("#p-" + i.id)} className="flex cursor-pointer gap-3 border-t border-border px-3 py-3 active:bg-secondary/60">
            <Ic n={i.icon} s={22} c={i.color || "#fff"} />
            <div className="min-w-0 flex-1"><div className="break-words">{i.text}</div>{i.sub && <p className="mt-0.5 line-clamp-2 break-words text-sm text-muted-foreground"><InlineEmoji text={i.sub} /></p>}<div className="mt-1 text-xs text-muted-foreground">{i.t ? agoMs(i.t) : ""}</div></div>
            {i.t > prev && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-white" />}
          </div>))}
    </div>
  );
}

// ── moderation: reports, removed items, applications (+stats), audit log ──
const when = (t: any) => { const d = t?.toDate?.(); return d ? d.toLocaleDateString() + " " + d.toLocaleTimeString() : "…"; };
function Reports() {
  const { me } = F.useMe();
  const [rs, setRs] = useState<any[] | null>(null), [t, setT] = useState(0);
  useEffect(() => {
    (async () => {
      const s = await F.getDocs(F.query(F.collection(F.db, "reports"), F.where("status", "==", "open")));
      const l = await Promise.all(s.docs.map(async (d) => {
        const r: any = { id: d.id, ref: d.ref, ...d.data() }; let prev = "";
        try { const x: any = (await F.getDoc(r.kind === "comment" ? F.doc(F.db, "posts", r.postId, "comments", r.targetId) : F.doc(F.db, "posts", r.postId))).data(); prev = x ? (r.kind === "comment" ? x.text : x.title) : "(deleted)"; } catch { /* gone */ }
        return { ...r, prev, u: await F.getUser(r.reporterId), a: await F.getUser(r.targetAuthorId) };
      }));
      setRs(l.sort((a, b) => tm(a) - tm(b)));
    })().catch(() => setRs([]));
  }, [t]);
  const close = async (r: any, status: string) => {
    try { const b = F.writeBatch(F.db); b.update(r.ref, { status, resolvedBy: me.uid, resolvedAt: F.serverTimestamp() }); F.audit(b, me, status === "resolved" ? "resolved report on" : "dismissed report on", r.kind === "comment" ? r.postId + "/" + r.targetId : r.targetId); await b.commit(); setT((x) => x + 1); } catch (e) { toast.error(F.err(e)); }
  };
  if (!rs) return <Empty icon="shield" text="Loading…" />;
  return <div>{!rs.length && <p className="border-t border-border px-3 py-3 text-sm text-muted-foreground">No open reports.</p>}
    {rs.map((r) => <div key={r.id} className="space-y-2 border-t border-border px-3 py-3">
      <div className="text-xs text-muted-foreground">{r.kind === "comment" ? "Comment" : "Request"} by <Name u={r.a} /> · reported by <Name u={r.u} /> · {F.ago(r.createdAt)}</div>
      <p className="line-clamp-3 break-words text-sm">{r.prev}</p><p className="break-words text-sm text-muted-foreground">Reason: {r.reason}</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" className="!px-3 !py-1" onClick={() => go("#p-" + r.postId)}>Open</Button><Button className="!px-3 !py-1" onClick={() => close(r, "resolved")}>Resolve</Button><Button variant="outline" className="!px-3 !py-1" onClick={() => close(r, "dismissed")}>Dismiss</Button></div></div>)}</div>;
}
function Removed() {
  const { me } = F.useMe();
  const [ps, setPs] = useState<any[]>([]), [cs, setCs] = useState<any[]>([]), [t, setT] = useState(0);
  const reload = () => setT((x) => x + 1);
  useEffect(() => {
    (async () => {
      const r = await F.getDocs(F.query(F.collection(F.db, "posts"), F.where("removed", "==", true)));
      setPs(await Promise.all(r.docs.map(async (d) => ({ id: d.id, ref: d.ref, ...d.data(), u: await F.getUser((d.data() as any).authorId) }))));
      const c = await F.getDocs(F.query(F.collection(F.db, "removedComments"), F.limit(100)));
      setCs(await Promise.all(c.docs.map(async (d) => ({ id: d.id, ...d.data(), ref: F.doc(F.db, "posts", (d.data() as any).postId, "comments", d.id), u: await F.getUser((d.data() as any).authorId) }))));
    })().catch(() => {});
  }, [t, me?.uid]);
  return <div><div className="px-3 py-2 text-sm text-muted-foreground">Removed requests ({ps.length})</div>
    {ps.map((p) => <div key={p.id} className="space-y-1 border-t border-border px-3 py-3"><div className="cursor-pointer font-medium" onClick={() => go("#p-" + p.id)}>{p.title}</div><div className="text-xs text-muted-foreground"><Name u={p.u} /></div><Reason x={p} /><div className="pt-1"><ModBtn x={p} kind="request" done={reload} /></div></div>)}
    {!ps.length && <p className="border-t border-border px-3 py-3 text-sm text-muted-foreground">Nothing removed.</p>}
    <div className="px-3 py-2 text-sm text-muted-foreground">Removed comments ({cs.length})</div>
    {cs.map((c) => <div key={c.id} className="space-y-1 border-t border-border px-3 py-3"><div className="text-xs text-muted-foreground"><Name u={c.u} /> · {F.ago(c.createdAt)}</div><p className="line-clamp-3 break-words text-sm">{c.text}</p><p className="text-sm text-muted-foreground">Removed: {c.reason}</p>
      <div className="flex gap-2 pt-1"><Button variant="outline" className="!px-3 !py-1" onClick={() => go("#p-" + c.postId)}>Open</Button><Button variant="outline" className="!px-3 !py-1" onClick={() => restoreIt(c, "comment", me, reload)}>Restore</Button></div></div>)}
    {!cs.length && <p className="border-t border-border px-3 py-3 text-sm text-muted-foreground">No removed comments.</p>}</div>;
}
function AppStats({ id }: { id: string }) {
  const [s, setS] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const col = F.collection(F.db, "posts"), u = await F.getUser(id);
      const [n, r, c] = await Promise.all([F.getCountFromServer(F.query(col, F.where("authorId", "==", id))), F.getCountFromServer(F.query(col, F.where("authorId", "==", id), F.where("removed", "==", true))), F.castleCreated(id)]);
      setS({ joined: u.createdAt?.toMillis?.(), n: n.data().count, r: r.data().count, c, sus: F.susp(u) });
    })().catch(() => setS({}));
  }, [id]);
  if (!s) return <div className="text-xs text-muted-foreground">Loading stats…</div>;
  const age = (ms?: number) => ms ? `${new Date(ms).toLocaleDateString()} (${Math.floor((Date.now() - ms) / 864e5)} days ago)` : "unavailable";
  return <div className="space-y-0.5 text-xs text-muted-foreground"><div>Castletool account: {age(s.joined)}</div><div>Castle account: {age(s.c)}</div><div>Requests: {s.n ?? "?"} ({s.r ?? "?"} removed){s.sus ? " · currently suspended" : ""}</div></div>;
}
function Apps() {
  const { me } = F.useMe();
  const [apps, setApps] = useState<any[]>([]), [t, setT] = useState(0);
  useEffect(() => { (async () => { const a = await F.getDocs(F.query(F.collection(F.db, "modApplications"), F.where("status", "==", "pending"))); setApps(await Promise.all(a.docs.map(async (d) => ({ id: d.id, ...d.data(), u: await F.getUser(d.id) })))); })().catch(() => {}); }, [t]);
  const decide = async (a: any, ok: boolean) => {
    try { const b = F.writeBatch(F.db); if (ok) b.update(F.doc(F.db, "users", a.id), { role: "moderator" }); b.update(F.doc(F.db, "modApplications", a.id), { status: ok ? "accepted" : "declined", decidedAt: F.serverTimestamp() }); F.audit(b, me, ok ? "accepted application of" : "declined application of", F.tag(a.u)); await b.commit(); F.forget(a.id); setT((x) => x + 1); } catch (e) { toast.error(F.err(e)); }
  };
  return <div><div className="px-3 py-2 text-sm text-muted-foreground">Moderator applications ({apps.length})</div>
    {apps.map((a) => <div key={a.id} className="space-y-2 border-t border-border px-3 py-3"><Name u={a.u} /><AppStats id={a.id} /><p className="whitespace-pre-wrap break-words text-sm">{a.text}</p>
      <div className="flex gap-2"><Button className="!px-4 !py-1.5" onClick={() => decide(a, true)}>Accept</Button><Button variant="outline" className="!px-4 !py-1.5" onClick={() => decide(a, false)}>Decline</Button></div></div>)}
    {!apps.length && <p className="border-t border-border px-3 py-3 text-sm text-muted-foreground">No pending applications.</p>}</div>;
}
function Audit() {
  const [rows, setRows] = useState<any[]>([]), [cur, setCur] = useState<any>(null), [more, setMore] = useState(true), [busy, setBusy] = useState(false);
  const load = async () => {
    if (busy) return; setBusy(true);
    try { const cs: any[] = [F.orderBy("createdAt", "desc")]; if (cur) cs.push(F.startAfter(cur)); cs.push(F.limit(50));
      const s = await F.getDocs((F.query as any)(F.collection(F.db, "audit"), ...cs)); setRows((r) => [...r, ...s.docs.map((d: any) => ({ id: d.id, ...d.data() }))]); setCur(s.docs[s.docs.length - 1] || null); setMore(s.docs.length === 50); } catch { setMore(false); }
    setBusy(false);
  };
  const sent = useSentinel(load, more && !busy);
  return <div className="px-3 font-mono text-xs leading-relaxed">
    {rows.map((r: any) => <div key={r.id} className="break-words border-t border-border py-1.5"><span className="text-muted-foreground">[{when(r.createdAt)}]</span> @{r.actorName} ({r.actor}) {r.action} {r.target}{r.detail ? " " + r.detail : ""}</div>)}
    <div ref={sent} className="py-4 text-center text-muted-foreground">{busy ? "Loading…" : more ? "" : rows.length ? "End of log." : "Nothing logged yet."}</div></div>;
}
function Mod() {
  const { me } = F.useMe();
  const [tab, setTab] = useState("Reports");
  if (!F.isMod(me)) return <Empty icon="shield" text="Moderators only." />;
  const tabs = ["Reports", "Removed", ...(me.role === "owner" ? ["Applications", "Audit log"] : [])];
  return (
    <div><h2 className="font-title text-2xl" style={{ padding: "calc(env(safe-area-inset-top) + 12px) 12px 8px" }}>Moderation</h2>
      <div className="flex gap-2 overflow-x-auto px-3 pb-2">{tabs.map((x) => <button key={x} onClick={() => setTab(x)} className={"shrink-0 rounded-full border px-3 py-1 text-sm " + (tab === x ? "border-white bg-white text-black" : "border-border")}>{x}</button>)}</div>
      {tab === "Reports" ? <Reports /> : tab === "Removed" ? <Removed /> : tab === "Applications" ? <Apps /> : <Audit />}
    </div>
  );
}
