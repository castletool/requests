import { MD } from "@/lib/mdicons";

export function Ic({ n, f, s = 20, c }: { n: string; f?: boolean; s?: number; c?: string }) {
  return <svg viewBox="0 -960 960 960" width={s} height={s} fill={c || "currentColor"} className="shrink-0" aria-hidden><path d={MD[n]?.[f ? "f" : "o"]} /></svg>;
}
