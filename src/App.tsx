import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import * as F from "@/lib/fb";
import { MD } from "@/lib/mdicons";

const TYPES = Object.keys(F.TAGS), go = (h: string) => { location.hash = h; };
const sel = "h-9 rounded-full border border-border bg-black px-3 text-sm";

function Ic({ n, f, s = 20, c }: { n: string; f?: boolean; s?: number; c?: string }) {
  return <svg viewBox="0 -960 960 960" width={s} height={s} fill={c || "currentColor"} className="shrink-0" aria-hidden><path d={MD[n]?.[f ? "f" : "o"]} /></svg>;
}
function Name({ u, big }: { u: any; big?: boolean }) {
  const r = F.ROLES[u.role] || F.ROLES.default;
  return <a href={"#u-" + u.uid} onClick={(e) => e.stopPropagation()} className={"inline-flex items-center gap-1 font-medium hover:underline " + (big ? "text-lg" : "")} style={{ color: r.c }}>{u.username}{r.i && <Ic n={r.i} f s={big ? 20 : 15} />}</a>;
}
function Chip({ status }: { status: string }) {
  const [c, i] = F.STATUS[status] || ["#888888", "cancel"];
  return <span className="inline-flex items-center gap-1 font-medium" style={{ color: c }}><Ic n={i} s={16} />{status}</span>;
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
const Title = ({ p, big }: any) => <div className="flex items-start gap-2"><div className={"min-w-0 flex-1 break-words font-medium leading-snug " + (big ? "text-xl" : "")}>{p.removed ? "[removed] " : ""}{p.title}</div><Ic n={F.TAGS[p.type]} f s={big ? 26 : 22} /></div>;
const Meta = ({ p }: any) => <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{p.status && <Chip status={p.status} />}<Name u={p.u} /><span>· {F.ago(p.createdAt)}</span></div>;

function Header({ q, setQ }: { q: string; setQ: (s: string) => void }) {
  const { me, ready, signedIn } = F.useMe();
  const [, tick] = useState(0);
  useEffect(() => { if (!F.susp(me)) return; const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, [me]);
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-black/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2 px-3 py-2">
        <button onClick={() => go("")} className="font-title text-xl">Requests</button>
        <div className="order-3 flex h-9 w-full items-center gap-2 rounded-full bg-secondary px-3 sm:order-none sm:w-auto sm:flex-1"><Ic n="search" s={18} c="#888" />
          <input value={q} onChange={(e) => { setQ(e.target.value); if (location.hash) go(""); }} placeholder="Search requests" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
        <div className="ml-auto flex items-center gap-2">
          {me ? <>
            <Button className="!px-3 !py-1.5" onClick={() => go("#new")}><Ic n="add" s={18} />New</Button>
            <a href={"#u-" + me.uid} className="max-w-[110px] truncate"><Name u={me} /></a>
            <Button variant="icon" className="p-1.5" onClick={() => F.signOut(F.auth)} title="Sign out"><Ic n="logout" s={20} /></Button>
          </> : ready && !signedIn ? <Button className="!px-3 !py-1.5" onClick={() => go("#login")}>Sign in</Button> : null}
        </div>
      </div>
      {F.susp(me) && <div className="mx-auto max-w-2xl px-3 pb-2"><div className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: "#F87171", color: "#F87171" }}>Suspended. Time left: {F.fmt(me.suspendedUntil - Date.now())}</div></div>}
    </div>
  );
}

function List({ q }: { q: string }) {
  const { me } = F.useMe();
  const [all, setAll] = useState<any[] | null>(null), [filter, setFilter] = useState("All"), [sort, setSort] = useState("top"), [t, setT] = useState(0);
  useEffect(() => {
    (async () => {
      const snap = await F.getDocs(F.query(F.collection(F.db, "posts"), F.orderBy("createdAt", "desc"), F.limit(60)));
      const ps = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p: any) => F.isMod(me) || !p.removed);
      const ext = await Promise.all(ps.map(async (p: any) => ({ s: await F.score(p.id), m: await F.myVote(p.id, me?.uid), u: await F.getUser(p.authorId) })));
      setAll(ps.map((p: any, i) => ({ ...p, ...ext[i] })));
    })().catch(() => setAll([]));
  }, [t, me?.uid]);
  const ql = q.trim().toLowerCase();
  const ps = (all || []).filter((p) => (filter === "All" || p.type === filter) && (!ql || (p.title + " " + p.description).toLowerCase().includes(ql)));
  if (sort === "top") ps.sort((a, b) => b.s - a.s);
  const chip = (k: string) => <button key={k} onClick={() => setFilter(k)} className={"inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-sm " + (filter === k ? "border-white bg-white text-black" : "border-border")}>{k !== "All" && <Ic n={F.TAGS[k]} f s={16} />}{k}</button>;
  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2"><div className="flex flex-1 gap-2 overflow-x-auto">{["All", ...TYPES].map(chip)}</div>
        <select className={sel} value={sort} onChange={(e) => setSort(e.target.value)}><option value="top">Top</option><option value="new">New</option></select></div>
      {all === null ? <p className="p-6 text-center text-muted-foreground">Loading…</p> : !ps.length ? <p className="p-6 text-center text-muted-foreground">{ql ? "No matches." : "No requests yet."}</p> :
        ps.map((p) => (
          <div key={p.id} onClick={() => go("#p-" + p.id)} className="flex cursor-pointer gap-2 border-t border-border px-3 py-3 hover:bg-secondary/40" style={{ opacity: p.removed ? 0.45 : 1 }}>
            <Votes id={p.id} s={p.s} m={p.m} done={() => setT((x) => x + 1)} />
            <div className="min-w-0 flex-1"><Title p={p} /><Meta p={p} /></div>
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
  if (p === undefined) return <p className="p-6 text-center text-muted-foreground">Loading…</p>;
  if (!p || (p.removed && !F.isMod(me))) return <p className="p-6 text-center text-muted-foreground">Request not found.</p>;
  const rm = (ref: any, removed: boolean) => F.isMod(me) && <Button variant="outline" className="!px-3 !py-1" onClick={async () => { try { await F.updateDoc(ref, { removed }); reload(); } catch (e) { toast.error(F.err(e)); } }}>{removed ? "Remove" : "Restore"}</Button>;
  const post = async () => {
    if (!F.guard(me) || !text.trim()) return; setBusy(true);
    try { await F.addDoc(F.collection(F.db, "posts", id, "comments"), { authorId: me.uid, authorName: me.username, text: text.trim(), removed: false, createdAt: F.serverTimestamp() }); setText(""); reload(); } catch (e) { toast.error(F.err(e)); }
    setBusy(false);
  };
  return (
    <div>
      <button onClick={() => history.length > 1 ? history.back() : go("")} className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground"><Ic n="arrow_back" s={18} />Back</button>
      <div className="flex gap-2 px-3 pb-3"><Votes id={id} s={p.s} m={p.m} done={reload} />
        <div className="min-w-0 flex-1"><Title p={p} big /><Meta p={p} /><p className="my-3 whitespace-pre-wrap break-words">{p.description}</p>
          <div className="flex flex-wrap gap-2">
            {me?.role === "owner" && <select className={sel} value={p.status || ""} onChange={async (e) => { try { await F.updateDoc(p.ref, { status: e.target.value || null }); reload(); } catch (x) { toast.error(F.err(x)); } }}><option value="">No status</option>{Object.keys(F.STATUS).map((k) => <option key={k}>{k}</option>)}</select>}
            {rm(p.ref, !p.removed)}<Suspender u={p.u} /></div></div></div>
      <div className="border-t border-border px-3 py-2 text-sm text-muted-foreground">{cs.length} comment{cs.length === 1 ? "" : "s"}</div>
      {cs.filter((c) => !c.removed || F.isMod(me)).map((c) => (
        <div key={c.id} className="border-t border-border px-3 py-3" style={{ opacity: c.removed ? 0.45 : 1 }}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Name u={c.u} /><span>· {F.ago(c.createdAt)}</span></div>
          <p className="mt-1 whitespace-pre-wrap break-words">{c.removed ? "[removed] " : ""}{c.text}</p>
          <div className="mt-2 flex flex-wrap gap-2">{rm(c.ref, !c.removed)}<Suspender u={c.u} /></div>
        </div>))}
      <div className="space-y-2 border-t border-border p-3">
        {me ? <><Textarea value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" className="min-h-[70px]" /><Button disabled={busy} onClick={post}>Comment</Button></>
          : <p className="text-sm text-muted-foreground">Sign in to vote or comment.</p>}
      </div>
    </div>
  );
}

function Form({ title, children }: any) { return <div className="space-y-3 p-3"><h2 className="text-xl font-medium">{title}</h2>{children}</div>; }

function NewPost() {
  const { me } = F.useMe();
  const [type, setType] = useState(TYPES[0]), [title, setTitle] = useState(""), [desc, setDesc] = useState(""), [busy, setBusy] = useState(false);
  if (!me) return <p className="p-6 text-center text-muted-foreground">Sign in to post.</p>;
  const submit = async () => {
    if (!F.guard(me)) return; if (!title.trim() || !desc.trim()) return void toast("Add a title and description."); setBusy(true);
    try { const r = await F.addDoc(F.collection(F.db, "posts"), { authorId: me.uid, authorName: me.username, type, title: title.trim(), description: desc.trim(), status: null, removed: false, createdAt: F.serverTimestamp() }); go("#p-" + r.id); } catch (e) { toast.error(F.err(e)); setBusy(false); }
  };
  return <Form title="New request">
    <div className="flex flex-wrap gap-2">{TYPES.map((k) => <button key={k} onClick={() => setType(k)} className={"inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm " + (type === k ? "border-white bg-white text-black" : "border-border")}><Ic n={F.TAGS[k]} f s={16} />{k}</button>)}</div>
    <Input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
    <Textarea value={desc} maxLength={2000} onChange={(e) => setDesc(e.target.value)} placeholder="Describe it" className="min-h-[140px]" />
    <div className="flex gap-2"><Button disabled={busy} onClick={submit}>Post</Button><Button variant="outline" onClick={() => go("")}>Cancel</Button></div>
  </Form>;
}

function Login() {
  const [u, setU] = useState(""), [p, setP] = useState(""), [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!u || !p) return; setBusy(true);
    try { await F.login(u.trim(), p); setP(""); go(""); } catch (e: any) { toast.error(e.message); setBusy(false); }
  };
  return <Form title="Sign in">
    <p className="text-sm text-muted-foreground">Uses your Castle account. Your password goes straight to Castle and is never stored. Signed in with Google? Use the “Need help?” link in Castletool instead.</p>
    <Input value={u} onChange={(e) => setU(e.target.value)} placeholder="Castle username or email" autoComplete="username" />
    <Input type="password" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Password" autoComplete="current-password" />
    <div className="flex gap-2"><Button disabled={busy} onClick={submit}>Sign in</Button><Button variant="outline" onClick={() => go("")}>Cancel</Button></div>
  </Form>;
}

function Apply() {
  const { me } = F.useMe();
  const [text, setText] = useState("");
  if (!me) return null;
  const send = async () => {
    if (!F.guard(me) || !text.trim()) return;
    try { await F.setDoc(F.doc(F.db, "modApplications", me.uid), { text: text.trim(), status: "pending", createdAt: F.serverTimestamp() }); toast("Application sent."); go(""); } catch (e: any) { toast.error(e.code === "permission-denied" ? "You already applied, or can't apply right now." : F.err(e)); }
  };
  return <Form title="Moderator application"><Textarea value={text} maxLength={1500} onChange={(e) => setText(e.target.value)} placeholder="Why would you be a good moderator?" className="min-h-[140px]" />
    <div className="flex gap-2"><Button onClick={send}>Send</Button><Button variant="outline" onClick={() => go("")}>Cancel</Button></div></Form>;
}

function Profile({ id }: { id: string }) {
  const { me } = F.useMe();
  const [u, setU] = useState<any>(null), [info, setInfo] = useState<any>(null), [ps, setPs] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      setU(await F.getUser(id)); F.castleInfo(id).then(setInfo);
      const s = await F.getDocs(F.query(F.collection(F.db, "posts"), F.where("authorId", "==", id)));
      setPs(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p: any) => F.isMod(me) || !p.removed).sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    })().catch(() => {});
  }, [id, me?.uid]);
  if (!u) return <p className="p-6 text-center text-muted-foreground">Loading…</p>;
  const r = F.ROLES[u.role] || F.ROLES.default, photo = info?.photo?.url;
  return (
    <div>
      <div className="flex items-center gap-3 p-4">
        {photo ? <img src={photo} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary"><Ic n="person" s={32} c="#888" /></div>}
        <div><Name u={u} big /><div className="text-sm text-muted-foreground">{r.l}{info ? ` · ${info.followersCount ?? 0} followers · ${info.publicDecksCount ?? 0} public decks` : ""}</div></div>
      </div>
      <div className="border-t border-border px-3 py-2 text-sm text-muted-foreground">{ps.length} request{ps.length === 1 ? "" : "s"}</div>
      {ps.map((p) => <div key={p.id} onClick={() => go("#p-" + p.id)} className="cursor-pointer border-t border-border px-3 py-3 hover:bg-secondary/40" style={{ opacity: p.removed ? 0.45 : 1 }}><Title p={p} /><Meta p={{ ...p, u }} /></div>)}
    </div>
  );
}

export function App() {
  const hash = F.useHash(), [q, setQ] = useState(""), { me } = F.useMe();
  const m = hash.match(/^#([pu])-([\w-]+)$/);
  return (
    <div className="min-h-full bg-black font-body text-white">
      <Header q={q} setQ={setQ} />
      <main className="mx-auto max-w-2xl pb-24">
        {m?.[1] === "p" ? <Post id={m[2]} /> : m?.[1] === "u" ? <Profile id={m[2]} /> : hash === "#new" ? <NewPost /> : hash === "#login" ? <Login /> : hash === "#apply" && me ? <Apply /> : <List q={q} />}
        {me && ["default", "verified"].includes(me.role) && !m && hash === "" && <div className="p-4 text-center"><a href="#apply" className="text-sm text-muted-foreground underline">Apply to be a moderator</a></div>}
      </main>
      <Toaster />
    </div>
  );
}
