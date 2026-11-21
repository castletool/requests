import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, where, limit, serverTimestamp, getAggregateFromServer, sum } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";
export { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, where, limit, serverTimestamp, signOut };

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
export const score = async (id: string) => { try { return (await getAggregateFromServer(collection(db, "posts", id, "votes"), { s: sum("score") })).data().s || 0; } catch { return 0; } };
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
