import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, where, limit, serverTimestamp, getAggregateFromServer, getCountFromServer, count, sum, writeBatch, startAfter } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";
export { getCountFromServer, writeBatch, startAfter, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, where, limit, serverTimestamp, signOut };

const app = initializeApp({ apiKey: "AIzaSyCq0GAXA9rae8_xuO4UHfn3Mr8Td7dxDnE", authDomain: "castletool-70b7f.firebaseapp.com", projectId: "castletool-70b7f", storageBucket: "castletool-70b7f.firebasestorage.app", messagingSenderId: "821509247017", appId: "1:821509247017:web:0444605f9f1128ebde8c38" });
export const auth = getAuth(app), db = getFirestore(app);
const WORKER = "https://castletool-tickets-auth.juniorboy62011.workers.dev";
const CH = { "X-OS": "cli", "X-CLI-API-Version": "4", "X-Scene-Creator-Version": "latest", Accept: "application/json", "Content-Type": "application/json" };

export const ROLES: any = { default: { c: "#ffffff", i: null, l: "Member" }, verified: { c: "#fde047", i: "verified", l: "Verified" }, moderator: { c: "#4ade80", i: "shield", l: "Moderator" }, owner: { c: "#a78bfa", i: "star", l: "Owner" } };
export const STATUS: any = { "Not Planned": ["#888888", "cancel"], "Intended Feature": ["#a3e635", "check_circle"], "Low Priority": ["#fde047", "counter_3"], "High Priority": ["#fb923c", "counter_2"], "Highest Priority": ["#ef4444", "counter_1"], "Completed": ["#ffffff", "check_circle"] };
export const TAGS: any = { Feature: "add_circle", Change: "change_circle", "Visual Bug": "visibility", "Functional Bug": "bug_report" };

export const err = (e: any) => e?.code === "permission-denied" ? "Not allowed (signed out, blocked, or suspended)." : e?.message || "Something went wrong.";
export const susp = (m: any) => !!m && m.suspendedUntil > Date.now();
export const isMod = (m: any) => !!m && (m.role === "moderator" || m.role === "owner");
export const guard = (m: any) => { if (!m) { toast("Sign in first."); return false; } if (susp(m)) { toast("Your account is suspended."); return false; } return true; };
export const fmt = (ms: number) => { const s = Math.ceil(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return `${d ? d + "d " : ""}${d || h ? h + "h " : ""}${m}m ${s % 60}s`; };
export const ago = (t: any) => { if (!t) return "now"; const s = Math.max(0, (Date.now() - t.toMillis()) / 1000); return s < 60 ? "just now" : s < 3600 ? Math.floor(s / 60) + "m ago" : s < 86400 ? Math.floor(s / 3600) + "h ago" : Math.floor(s / 86400) + "d ago"; };

// ── session: #signin=<firebase token> from Castletool is consumed and removed from the address bar before anything renders
const tok = (location.hash.match(/^#signin=(.+)$/) || [])[1];
if (tok) { history.replaceState(null, "", location.pathname + location.search); signInWithCustomToken(auth, tok).catch(() => toast("Sign-in failed. Try the link in Castletool again.")); }

let me: any = null, ready = false;
const subs = new Set<() => void>(), ucache = new Map<string, any>();
export async function loadMe() {
  const u = auth.currentUser; me = null;
  if (u) { try { const s = await getDoc(doc(db, "users", u.uid)); if (s.exists()) { me = { uid: u.uid, ...s.data() }; ucache.set(u.uid, { uid: u.uid, ...s.data() }); } } catch { /* signed out view */ } }
  ready = true; subs.forEach((f) => f());
}
onAuthStateChanged(auth, () => void loadMe());
export function useMe() {
  const [, n] = useState(0);
  useEffect(() => { const f = () => n((x) => x + 1); subs.add(f); return () => void subs.delete(f); }, []);
  return { me, ready, signedIn: !!auth.currentUser };
}
export function useHash() {
  const [h, setH] = useState(location.hash);
  useEffect(() => { const f = () => setH(location.hash); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return h;
}

export async function getUser(id: string) {
  if (!ucache.has(id)) { const s = await getDoc(doc(db, "users", id)); ucache.set(id, s.exists() ? { uid: id, ...s.data() } : { uid: id, username: "unknown", role: "default" }); }
  return ucache.get(id);
}
export const forget = (id: string) => ucache.delete(id);
export const stats = async (id: string) => {
  try {
    const [v, c] = await Promise.all([getAggregateFromServer(collection(db, "posts", id, "votes"), { s: sum("score"), n: count() }), getCountFromServer(collection(db, "posts", id, "comments"))]);
    return { s: v.data().s || 0, vn: v.data().n || 0, cn: c.data().count || 0 };
  } catch { return { s: 0, vn: 0, cn: 0 }; }
};
export const myVote = async (id: string, uid?: string) => { try { return uid ? ((await getDoc(doc(db, "posts", id, "votes", uid))).data() || {}).score || 0 : 0; } catch { return 0; } };

/** Public Castle profile bits; best effort (null if Castle refuses an unauthenticated lookup). */
export async function castleInfo(id: string) {
  try {
    const r = await fetch("https://api.castle.xyz/graphql", { method: "POST", headers: CH, body: JSON.stringify({ query: "query($id:ID!){user(userId:$id){photo{url} followersCount publicDecksCount}}", variables: { id } }) });
    return (await r.json())?.data?.user || null;
  } catch { return null; }
}

export async function login(u: string, p: string) {
  const r = await fetch("https://api.castle.xyz/graphql", { method: "POST", headers: CH, body: JSON.stringify({ query: "mutation($u:String!,$p:String!){loginV2(usernameOrEmail:$u,password:$p){token}}", variables: { u, p } }) });
  const j = await r.json(), t = j?.data?.loginV2?.token;
  if (!t) throw new Error(j?.errors?.[0]?.message || "Castle rejected the sign-in.");
  const a = await fetch(WORKER + "/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: t }) });
  if (a.status === 403) throw new Error("This account is blocked.");
  const b = await a.json();
  if (!b.firebaseToken) throw new Error("Sign-in failed. Try again later.");
  await signInWithCustomToken(auth, b.firebaseToken);
}

export const tag = (u: any) => `@${u.username} (${u.uid})`;
export const dur = (ms: number) => { const m = Math.round(ms / 6e4); return m < 60 ? m + " min" : m < 1440 ? Math.round(m / 60) + " h" : Math.round(m / 1440) + " d"; };
/** Adds an audit-log entry to a batch so it commits together with the action it describes. */
export function audit(b: any, me: any, action: string, target: string, detail = "") {
  b.set(doc(collection(db, "audit")), { actor: me.uid, actorName: me.username, action, target: target.slice(0, 120), detail: detail.slice(0, 250), createdAt: serverTimestamp() });
}
export const limitDoc = (uid: string, kind: string) => doc(db, "limits", kind + "-" + uid);
/** Seconds until this user may post / comment again (rules enforce 60s for posts, 15s for comments). */
export async function waitLeft(uid: string, kind: "post" | "comment") {
  try { const t = (await getDoc(limitDoc(uid, kind))).data()?.t?.toMillis?.(); return t ? Math.max(0, Math.ceil((t + (kind === "post" ? 60e3 : 15e3) - Date.now()) / 1000)) : 0; } catch { return 0; }
}
/** Castle account creation time (ms), best effort. */
export async function castleCreated(id: string): Promise<number | null> {
  try {
    const r = await fetch("https://api.castle.xyz/graphql", { method: "POST", headers: CH, body: JSON.stringify({ query: "query($id:ID!){user(userId:$id){createdTime}}", variables: { id } }) });
    const v = (await r.json())?.data?.user?.createdTime; if (v == null) return null;
    const n = typeof v === "number" ? (v < 1e12 ? v * 1000 : v) : Date.parse(v); return isFinite(n) ? n : null;
  } catch { return null; }
}
