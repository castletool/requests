import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import * as F from "@/lib/fb";
import { MD } from "@/lib/mdicons";

const TYPES = Object.keys(F.TAGS), go = (h: string) => { location.hash = h; };
const sel = "h-9 rounded-full border border-border bg-black px-3 text-sm";
const agoMs = (ms: number) => F.ago({ toMillis: () => ms });
const hasId = (p: any) => !!p;

function Ic({ n, f, s = 20, c }: { n: string; f?: boolean; s?: number; c?: string }) {
  return <svg viewBox="0 -960 960 960" width={s} height={s} fill={c || "currentColor"} className="shrink-0" aria-hidden><path d={MD[n]?.[f ? "f" : "o"]} /></svg>;
}
function Name({ u, big }: { u: any; big?: boolean }) {
  const r = F.ROLES[u.role] || F.ROLES.default;
  return <a href={"#u-" + u.uid} onClick={(e) => e.stopPropagation()} className={"inline-flex items-center gap-1 font-medium hover:underline " + (big ? "text-lg" : "")} style={{ color: r.c }}>{u.username}{r.i && <Ic n={r.i} f s={big ? 20 : 15} />}</a>;
}
const Chip = ({ status }: { status: string }) => { const [c, i] = F.STATUS[status] || ["#888888", "cancel"]; return <span className="inline-flex items-center gap-1 font-medium" style={{ color: c }}><Ic n={i} s={16} />{status}</span>; };
const Badge = ({ t }: { t: string }) => <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-white"><Ic n={F.TAGS[t]} f s={13} />{t}</span>;
const Meta = ({ p }: any) => <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><Badge t={p.type} />{p.status && <Chip status={p.status} />}<Name u={p.u} /><span>· {F.ago(p.createdAt)}</span></div>;
const Reason = ({ x }: any) => x.removed && x.removedReason ? <p className="mt-2 rounded-lg border border-border p-2 text-sm text-muted-foreground">Removed: {x.removedReason}</p> : null;
const Empty = ({ icon, text }: { icon: string; text: string }) => <div className="flex flex-col items-center gap-2 p-10 text-muted-foreground"><Ic n={icon} s={36} />{text}</div>;
const Form = ({ title, children }: any) => <div className="space-y-3 p-3"><h2 className="font-title text-2xl">{title}</h2>{children}</div>;

// ── reason dialog ─────────────────────────────────────────────────────
let ask: (t: string) => Promise<string | null> = async () => null;
function AskHost() {
  const [s, setS] = useState<any>(null), [v, setV] = useState("");
  useEffect(() => { ask = (t) => new Promise((r) => { setV(""); setS({ t, r }); }); }, []);
  if (!s) return null;
  const done = (x: string | null) => { s.r(x); setS(null); };
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={() => done(null)}>
      <div className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-black p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium">{s.t}</h3>
        <Textarea autoFocus value={v} maxLength={200} onChange={(e) => setV(e.target.value)} placeholder="Reason (shown to the author)" className="min-h-[90px]" />
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => done(null)}>Cancel</Button><Button variant="destructive" disabled={!v.trim()} onClick={() => done(v.trim())}>Remove</Button></div>
      </div>
    </div>
  );
}
async function removeIt(ref: any, me: any, what: string, done: () => void) {
  const r = await ask(`Remove this ${what}?`); if (!r) return;
  try { await F.updateDoc(ref, { removed: true, removedReason: r, removedAt: F.serverTimestamp(), removedBy: me.uid }); done(); } catch (e) { toast.error(F.err(e)); }
}
const restoreIt = async (ref: any, done: () => void) => { try { await F.updateDoc(ref, { removed: false }); done(); } catch (e) { toast.error(F.err(e)); } };
function ModBtn({ x, kind, done }: any) {
  const { me } = F.useMe();
  if (!F.isMod(me)) return null;
  return x.removed ? <Button variant="outline" className="!px-3 !py-1" onClick={() => restoreIt(x.ref, done)}>Restore</Button>
    : <Button variant="destructive" className="!px-3 !py-1" onClick={() => removeIt(x.ref, me, kind, done)}>Remove</Button>;
}

function Votes({ id, s, m, done }: any) {
  const { me } = F.useMe();
  const vote = async (d: number) => {
    if (!F.guard(me)) return;
    const r = F.doc(F.db, "posts", id, "votes", me.uid);
    try { Math.sign(m) === d ? await F.deleteDoc(r) : await F.setDoc(r, { score: d * (me.role === "default" ? 1 : 2) }); } catch (e) { toast.error(F.err(e)); }
    done();
  };
  const b = (d: number, n: string) => <button onClick={() => vote(d)} className="rounded-full p-0.5 hover:bg-accent" style={{ color: Math.sign(m) === d ? "#fff" : "#888" }}><Ic n={n} f={Math.sign(m) === d} s={26} /></button>;
  return <div className="flex w-9 shrink-0 flex-col items-center" onClick={(e) => e.stopPropagation()}>{b(1, "keyboard_arrow_up")}<b className="text-sm">{s}</b>{b(-1, "keyboard_arrow_down")}</div>;
}

function Susp() {
  const { me } = F.useMe(), [, tick] = useState(0);
  useEffect(() => { if (!F.susp(me)) return; const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, [me]);
  return F.susp(me) ? <div className="mx-3 mb-2 rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: "#F87171", color: "#F87171" }}>Suspended. Time left: {F.fmt(me.suspendedUntil - Date.now())}</div> : null;
}

// ── home ──────────────────────────────────────────────────────────────
function Home({ q, setQ }: { q: string; setQ: (s: string) => void }) {
  const { me } = F.useMe();
  const [all, setAll] = useState<any[] | null>(null), [filter, setFilter] = useState("All"), [sort, setSort] = useState("top"), [t, setT] = useState(0);
  useEffect(() => {
    (async () => {
      const snap = await F.getDocs(F.query(F.collection(F.db, "posts"), F.orderBy("createdAt", "desc"), F.limit(60)));
      const ps = snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() })).filter((p: any) => !p.removed || F.isMod(me) || p.authorId === me?.uid);
      const ext = await Promise.all(ps.map(async (p: any) => ({ s: await F.score(p.id), m: await F.myVote(p.id, me?.uid), u: await F.getUser(p.authorId) })));
      setAll(ps.map((p: any, i) => ({ ...p, ...ext[i] })));
    })().catch(() => setAll([]));
  }, [t, me?.uid]);
  const ql = q.trim().toLowerCase();
  const ps = (all || []).filter((p) => (filter === "All" || p.type === filter) && (!ql || (p.title + " " + p.description).toLowerCase().includes(ql)));
  if (sort === "top") ps.sort((a, b) => b.s - a.s);
  const chip = (k: string) => <button key={k} onClick={() => setFilter(k)} className={"inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-sm " + (filter === k ? "border-white bg-white text-black" : "border-border")}>{k !== "All" && <Ic n={F.TAGS[k]} f s={15} />}{k}</button>;
  return (
    <div>
      <div className="sticky top-0 z-10 bg-black/95 px-3 pb-2 backdrop-blur" style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
        <div className="flex h-10 items-center gap-2 rounded-full bg-secondary px-3"><Ic n="search" s={20} c="#888" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search requests" className="min-w-0 flex-1 bg-transparent outline-none" />
          {q && <button onClick={() => setQ("")}><Ic n="close" s={18} c="#888" /></button>}</div>
        <div className="mt-2 flex items-center gap-2"><div className="flex flex-1 gap-2 overflow-x-auto">{["All", ...TYPES].map(chip)}</div>
          <select className={sel} value={sort} onChange={(e) => setSort(e.target.value)}><option value="top">Top</option><option value="new">New</option></select></div>
      </div>
      <Susp />
      {all === null ? <Empty icon="search" text="Loading…" /> : !ps.length ? <Empty icon="search" text={ql ? "No matches." : "No requests yet."} /> :
        ps.map((p) => (
          <div key={p.id} onClick={() => go("#p-" + p.id)} className="flex cursor-pointer gap-2 border-t border-border px-3 py-3 active:bg-secondary/60" style={{ opacity: p.removed ? 0.5 : 1 }}>
            <Votes id={p.id} s={p.s} m={p.m} done={() => setT((x) => x + 1)} />
            <div className="min-w-0 flex-1"><div className="break-words font-medium leading-snug">{p.removed ? "[removed] " : ""}{p.title}</div>
              {!p.removed && <p className="mt-0.5 line-clamp-2 break-words text-sm text-muted-foreground">{p.description}</p>}<Meta p={p} /></div>
          </div>))}
    </div>
  );
}

const SUSP: [string, number][] = [["Suspend…", -1], ["1 hour", 36e5], ["1 day", 864e5], ["7 days", 6048e5], ["30 days", 2592e6], ["Lift suspension", 0]];
function Suspender({ u }: { u: any }) {
  const { me } = F.useMe();
  if (!F.isMod(me) || me.uid === u.uid || !["default", "verified"].includes(u.role)) return null;
  return <select className={sel} value="-1" onChange={async (e) => { const v = +e.target.value; try { await F.updateDoc(F.doc(F.db, "users", u.uid), { suspendedUntil: v ? Date.now() + v : 0 }); F.forget(u.uid); toast("Updated."); } catch (x) { toast.error(F.err(x)); } }}>{SUSP.map(([l, v]) => <option key={l} value={v}>{l}</option>)}</select>;
}

function Post({ id }: { id: string }) {
  const { me } = F.useMe();
  const [p, setP] = useState<any>(undefined), [cs, setCs] = useState<any[]>([]), [t, setT] = useState(0), [text, setText] = useState(""), [busy, setBusy] = useState(false);
  const reload = () => setT((x) => x + 1);
  useEffect(() => {
    (async () => {
      const s = await F.getDoc(F.doc(F.db, "posts", id));
      if (!s.exists()) return setP(null);
      const d: any = { id, ref: s.ref, ...s.data() };
      const [sc, m, u] = await Promise.all([F.score(id), F.myVote(id, me?.uid), F.getUser(d.authorId)]);
      const c = await F.getDocs(F.query(F.collection(F.db, "posts", id, "comments"), F.orderBy("createdAt", "asc")));
      const cl = await Promise.all(c.docs.map(async (x) => ({ ref: x.ref, id: x.id, ...x.data(), u: await F.getUser((x.data() as any).authorId) })));
      setP({ ...d, s: sc, m, u }); setCs(cl);
    })().catch(() => setP(null));
  }, [id, t, me?.uid]);
  if (p === undefined) return <Empty icon="search" text="Loading…" />;
  if (!p || (p.removed && !F.isMod(me) && p.authorId !== me?.uid)) return <Empty icon="search" text="Request not found." />;
  const post = async () => {
    if (!F.guard(me) || !text.trim()) return; setBusy(true);
    try { await F.addDoc(F.collection(F.db, "posts", id, "comments"), { authorId: me.uid, authorName: me.username, text: text.trim(), removed: false, createdAt: F.serverTimestamp() }); setText(""); reload(); } catch (e) { toast.error(F.err(e)); }
    setBusy(false);
  };
  return (
    <div>
      <button onClick={() => history.length > 1 ? history.back() : go("")} className="flex items-center gap-1 px-3 py-3 text-sm text-muted-foreground" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}><Ic n="arrow_back" s={18} />Back</button>
      <div className="flex gap-2 px-3 pb-3"><Votes id={id} s={p.s} m={p.m} done={reload} />
        <div className="min-w-0 flex-1"><div className="break-words text-xl font-medium leading-snug">{p.removed ? "[removed] " : ""}{p.title}</div><Meta p={p} />
          <p className="my-3 whitespace-pre-wrap break-words">{p.description}</p><Reason x={p} />
          <div className="mt-2 flex flex-wrap gap-2">
            {me?.role === "owner" && <select className={sel} value={p.status || ""} onChange={async (e) => { try { await F.updateDoc(p.ref, { status: e.target.value || null, statusAt: F.serverTimestamp() }); reload(); } catch (x) { toast.error(F.err(x)); } }}><option value="">No status</option>{Object.keys(F.STATUS).map((k) => <option key={k}>{k}</option>)}</select>}
            <ModBtn x={p} kind="request" done={reload} /><Suspender u={p.u} /></div></div></div>
      <div className="border-t border-border px-3 py-2 text-sm text-muted-foreground">{cs.length} comment{cs.length === 1 ? "" : "s"}</div>
      {cs.filter((c) => !c.removed || F.isMod(me) || c.authorId === me?.uid).map((c) => (
        <div key={c.id} className="border-t border-border px-3 py-3" style={{ opacity: c.removed ? 0.5 : 1 }}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Name u={c.u} /><span>· {F.ago(c.createdAt)}</span></div>
          <p className="mt-1 whitespace-pre-wrap break-words">{c.removed ? "[removed] " : ""}{c.text}</p><Reason x={c} />
          <div className="mt-2 flex flex-wrap gap-2"><ModBtn x={c} kind="comment" done={reload} /><Suspender u={c.u} /></div>
        </div>))}
      <div className="space-y-2 border-t border-border p-3">
        {me ? <><Textarea value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" className="min-h-[70px]" /><Button disabled={busy} onClick={post}>Comment</Button></>
          : <Button variant="outline" onClick={() => go("#login")}>Sign in to vote or comment</Button>}
      </div>
    </div>
  );
}

function NewPost() {
  const { me } = F.useMe();
  const [type, setType] = useState(TYPES[0]), [title, setTitle] = useState(""), [desc, setDesc] = useState(""), [busy, setBusy] = useState(false);
  if (!me) return <Form title="New request"><Button onClick={() => go("#login")}>Sign in to post</Button></Form>;
  const submit = async () => {
    if (!F.guard(me)) return; if (!title.trim() || !desc.trim()) return void toast("Add a title and description."); setBusy(true);
    try { const r = await F.addDoc(F.collection(F.db, "posts"), { authorId: me.uid, authorName: me.username, type, title: title.trim(), description: desc.trim(), status: null, removed: false, createdAt: F.serverTimestamp() }); go("#p-" + r.id); } catch (e) { toast.error(F.err(e)); setBusy(false); }
  };
  return <Form title="New request">
    <div className="flex flex-wrap gap-2">{TYPES.map((k) => <button key={k} onClick={() => setType(k)} className={"inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm " + (type === k ? "border-white bg-white text-black" : "border-border")}><Ic n={F.TAGS[k]} f s={16} />{k}</button>)}</div>
    <Input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
    <Textarea value={desc} maxLength={2000} onChange={(e) => setDesc(e.target.value)} placeholder="Describe it" className="min-h-[160px]" />
    <Button disabled={busy} onClick={submit}>Post</Button>
  </Form>;
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
    try { const r = F.doc(F.db, "modApplications", me.uid); if (ex) await F.deleteDoc(r); await F.setDoc(r, { text: text.trim(), status: "pending", createdAt: F.serverTimestamp() }); toast("Application sent."); go("#inbox"); } catch (e) { toast.error(F.err(e)); }
  };
  return <Form title="Moderator application">
    {ex?.status === "declined" && <p className="text-sm text-muted-foreground">Your last application was declined. You can apply again.</p>}
    <Textarea value={text} maxLength={1500} onChange={(e) => setText(e.target.value)} placeholder="Why would you be a good moderator?" className="min-h-[160px]" /><Button onClick={send}>Send</Button></Form>;
}

// ── inbox: built from your own posts + application, no extra storage ────
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
            <div className="min-w-0 flex-1"><div className="break-words">{i.text}</div>{i.sub && <p className="mt-0.5 line-clamp-2 break-words text-sm text-muted-foreground">{i.sub}</p>}<div className="mt-1 text-xs text-muted-foreground">{i.t ? agoMs(i.t) : ""}</div></div>
            {i.t > prev && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-white" />}
          </div>))}
    </div>
  );
}

// ── moderation ────────────────────────────────────────────────────────
function Mod() {
  const { me } = F.useMe();
  const [apps, setApps] = useState<any[]>([]), [rem, setRem] = useState<any[]>([]), [t, setT] = useState(0);
  const reload = () => setT((x) => x + 1);
  useEffect(() => {
    if (!F.isMod(me)) return;
    (async () => {
      if (me.role === "owner") { const a = await F.getDocs(F.query(F.collection(F.db, "modApplications"), F.where("status", "==", "pending"))); setApps(await Promise.all(a.docs.map(async (d) => ({ id: d.id, ...d.data(), u: await F.getUser(d.id) })))); }
      const r = await F.getDocs(F.query(F.collection(F.db, "posts"), F.where("removed", "==", true)));
      setRem(await Promise.all(r.docs.map(async (d) => ({ id: d.id, ref: d.ref, ...d.data(), u: await F.getUser((d.data() as any).authorId) }))));
    })().catch(() => {});
  }, [t, me?.uid]);
  if (!F.isMod(me)) return <Empty icon="shield" text="Moderators only." />;
  const decide = async (id: string, ok: boolean) => {
    try { if (ok) await F.updateDoc(F.doc(F.db, "users", id), { role: "moderator" }); await F.updateDoc(F.doc(F.db, "modApplications", id), { status: ok ? "accepted" : "declined", decidedAt: F.serverTimestamp() }); F.forget(id); reload(); } catch (e) { toast.error(F.err(e)); }
  };
  return (
    <div><h2 className="font-title text-2xl" style={{ padding: "calc(env(safe-area-inset-top) + 12px) 12px 8px" }}>Moderation</h2>
      {me.role === "owner" && <><div className="px-3 py-2 text-sm text-muted-foreground">Moderator applications ({apps.length})</div>
        {apps.map((a) => <div key={a.id} className="space-y-2 border-t border-border px-3 py-3"><Name u={a.u} /><p className="whitespace-pre-wrap break-words text-sm">{a.text}</p>
          <div className="flex gap-2"><Button className="!px-4 !py-1.5" onClick={() => decide(a.id, true)}>Accept</Button><Button variant="outline" className="!px-4 !py-1.5" onClick={() => decide(a.id, false)}>Decline</Button></div></div>)}
        {!apps.length && <p className="border-t border-border px-3 py-3 text-sm text-muted-foreground">No pending applications.</p>}</>}
      <div className="px-3 py-2 text-sm text-muted-foreground">Removed requests ({rem.length})</div>
      {rem.map((p) => <div key={p.id} className="space-y-1 border-t border-border px-3 py-3"><div className="cursor-pointer font-medium" onClick={() => go("#p-" + p.id)}>{p.title}</div><div className="text-xs text-muted-foreground"><Name u={p.u} /></div><Reason x={p} /><div className="pt-1"><ModBtn x={p} kind="request" done={reload} /></div></div>)}
      {!rem.length && <p className="border-t border-border px-3 py-3 text-sm text-muted-foreground">Nothing removed.</p>}
    </div>
  );
}

// ── profile / "You" ───────────────────────────────────────────────────
function Profile({ id }: { id: string }) {
  const { me } = F.useMe();
  const [u, setU] = useState<any>(null), [info, setInfo] = useState<any>(null), [ps, setPs] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      setU(await F.getUser(id)); F.castleInfo(id).then(setInfo);
      const s = await F.getDocs(F.query(F.collection(F.db, "posts"), F.where("authorId", "==", id)));
      setPs(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p: any) => !p.removed || F.isMod(me) || id === me?.uid).sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    })().catch(() => {});
  }, [id, me?.uid]);
  if (!u) return <Empty icon="person" text="Loading…" />;
  const r = F.ROLES[u.role] || F.ROLES.default, photo = info?.photo?.url, self = me?.uid === id;
  return (
    <div>
      <div className="flex items-center gap-3 p-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}>
        {photo ? <img src={photo} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary"><Ic n="person" s={32} c="#888" /></div>}
        <div><Name u={u} big /><div className="text-sm text-muted-foreground">{r.l}{info ? ` · ${info.followersCount ?? 0} followers · ${info.publicDecksCount ?? 0} public decks` : ""}</div></div>
      </div>
      {self && <><Susp /><div className="flex flex-wrap gap-2 px-4 pb-3">{["default", "verified"].includes(u.role) && <Button variant="outline" onClick={() => go("#apply")}>Apply to be a moderator</Button>}<Button variant="outline" onClick={() => { F.signOut(F.auth); go(""); }}>Sign out</Button></div></>}
      <div className="border-t border-border px-3 py-2 text-sm text-muted-foreground">{ps.length} request{ps.length === 1 ? "" : "s"}</div>
      {ps.map((p) => <div key={p.id} onClick={() => go("#p-" + p.id)} className="cursor-pointer border-t border-border px-3 py-3 active:bg-secondary/60" style={{ opacity: p.removed ? 0.5 : 1 }}><div className="break-words font-medium">{p.removed ? "[removed] " : ""}{p.title}</div><Meta p={{ ...p, u }} /><Reason x={p} /></div>)}
    </div>
  );
}

function BottomNav({ hash, unread }: { hash: string; unread: number }) {
  const { me } = F.useMe();
  const tabs: [string, string, string, boolean][] = [["Home", "home", "", true], ["Create", "add_circle", "#new", true], ["Inbox", "inbox", "#inbox", true], ["Moderation", "shield", "#mod", F.isMod(me)], ["You", "person", me ? "#u-" + me.uid : "#login", true]];
  const on = (h: string) => h === "" ? hash === "" || hash.startsWith("#p-") : hash === h || (h === "#login" && hash === "#login") || (h.startsWith("#u-") && hash === h);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-black/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex max-w-2xl">
        {tabs.filter((t) => t[3]).map(([l, i, h]) => {
          const needs = (h === "#new" || h === "#inbox") && !me;
          return <button key={l} onClick={() => go(needs ? "#login" : h)} className="relative flex flex-1 flex-col items-center gap-0.5 py-2" style={{ color: on(h) ? "#fff" : "#888" }}>
            <Ic n={i} f={on(h)} s={26} /><span className="text-[11px]">{l}</span>
            {l === "Inbox" && unread > 0 && <span className="absolute left-1/2 top-1 ml-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">{unread > 9 ? "9+" : unread}</span>}
          </button>;
        })}
      </div>
    </nav>
  );
}

export function App() {
  const hash = F.useHash(), [q, setQ] = useState(""), { me } = F.useMe();
  const [ib, setIb] = useState<any>({ items: [], seen: 0 }), prev = useRef(0);
  const key = "rq.seen." + me?.uid, m = hash.match(/^#([pu])-([\w-]+)$/);
  useEffect(() => { if (hash === "#inbox" && me) prev.current = +(localStorage.getItem(key) || 0); }, [hash, me?.uid]);
  useEffect(() => {
    if (!me) return setIb({ items: [], seen: 0 });
    getInbox(me).then((items) => setIb({ items, seen: +(localStorage.getItem(key) || 0) })).catch(() => {});
  }, [me?.uid, hash === "#inbox"]);
  const unread = ib.items.filter((i: any) => i.t > ib.seen).length;
  return (
    <div className="min-h-full bg-black font-body text-white">
      <main className="mx-auto max-w-2xl" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 84px)" }}>
        {m?.[1] === "p" ? <Post id={m[2]} /> : m?.[1] === "u" ? <Profile id={m[2]} /> : hash === "#new" ? <NewPost /> : hash === "#login" ? <Login /> : hash === "#apply" ? <Apply /> :
          hash === "#inbox" ? <Inbox items={ib.items} prev={prev.current} onSeen={() => setIb((s: any) => ({ ...s, seen: Date.now() }))} /> : hash === "#mod" ? <Mod /> : <Home q={q} setQ={setQ} />}
      </main>
      <BottomNav hash={hash} unread={unread} />
      <AskHost /><Toaster />
    </div>
  );
}
void hasId;
