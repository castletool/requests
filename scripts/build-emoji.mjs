#!/usr/bin/env node
// Packs a Mutant Standard folder tree for the site.
//   node scripts/build-emoji.mjs <pack-dir> [--no-copy]
// - flattens every .svg into public/emoji/<code>.svg (code = file name without .svg and without the _hmn hand suffix)
// - writes src/lib/emoji-index.json (categories, codes, unicode -> code map)
// Banned emoji and the utils/ folder are skipped. For the unicode map run once with:  npm i --no-save emojibase-data
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const BANNED = new Set(["middle_finger", "rooster", "peacock", "peach", "melon", "cherry", "eggplant", "banana", "cannabis_leaf", "cannabis", "18_plus"]);
const SKIP_DIRS = new Set(["utils"]);
const CATS = [
  ["expressions", "Expressions", "smile"], ["people_animals", "People & animals", "paw_print"], ["nature_effects", "Nature & effects", "sun"],
  ["food_drink_herbs", "Food & drink", "pizza"], ["activities_clothing", "Activities", "basketball"], ["objects", "Objects", "light_bulb"],
  ["symbols", "Symbols", "red_heart"], ["gender_sexuality_relationships", "Pride", "rainbow_flag"], ["extra", "Extra", "crt"],
];
const SUB_FIRST = ["smileys/typical", "smileys/other", "hands", "semi_body", "body_parts", "no_body"];
// Mutant names that differ from Unicode/GitHub/iamcal names. Add more here as the report lists them.
const ALIASES = {
  blushing: "😊", slight_smile: "🙂", wink_tongue: "😜", stuck_out_tongue: "😛", sunglasses_face: "😎", crying: "😢",
  hugging_face: "🤗", red_heart: "❤️", beating_heart: "💓", red_exclamation_mark: "❗", red_question_mark: "❓",
  gray_exclamation_mark: "❕", gray_question_mark: "❔", tick: "✔️", green_tick: "✅", cross: "❌", sob: "😭",
  laughing: "😆", rofl: "🤣", grin: "😁", grinning: "😀", smiley: "😃", smile: "😄", joy: "😂", heart_eyes: "😍",
  grimace: "😬", money_face: "🤑", monocle: "🧐", nauseous: "🤢", party_face: "🥳", persevering: "😣", starry_eyes: "🤩", swearing: "🤬",
  mind_blown: "🤯", zippy_face: "🤐", asleep: "😴", bandaged: "🤕", scared: "😨", imp_angry: "👿", imp_devious: "😈", tengu_mask: "👺",
  ok_gesture: "🙆", tipping_hand: "💁", palms_up: "🤲", fist_facing_left: "🤛", fist_facing_right: "🤜", paw_print: "🐾", paws: "🐾",
  "2_busts_in_silhouette": "👥", bang: "💥", shining_star: "🌟", crescent_moon_1: "🌙", sun_face: "🌞", water_drop: "💧", lightning_bolt: "⚡",
  hot_drink: "☕", donut: "🍩", knife_and_fork: "🍴", meat_drumstick: "🍗", onigiri: "🍙", plate: "🍽", senbei: "🍘", chef: "🧑‍🍳",
  rugby_ball: "🏉", "8_ball": "🎱", hanafuda_card: "🎴", bath_with_person: "🛀", closed_mailbox: "📪", curled_page: "📃",
  decreasing_graph: "📉", increasing_graph: "📈", folder: "📁", open_folder: "📂", inbox: "📥", outbox: "📤", page: "📄", page_with_pencil: "📝",
  red_book: "📕", triangle_ruler: "📐", magnifying_glass_left: "🔍", magnifying_glass_right: "🔎", capsule: "💊", camcorder: "📹",
  gamepad: "🎮", landline_phone: "☎", phone_off: "📴", phone_receiver: "📞", phone_vibrate: "📳", phone_with_arrow: "📲",
  arrow_curve_down: "⤵", arrow_curve_up: "⤴", arrow_curve_left: "↩", arrow_curve_right: "↪", arrow_down_left: "↙", arrow_down_right: "↘",
  arrow_up_left: "↖", arrow_up_right: "↗", arrow_left_right: "↔", battery_full: "🔋", battery_low: "🪫", finish_flag: "🏁", triangle_flag: "🚩",
  bandaged_heart: "❤️‍🩹", heart_arrow: "💘", ribbon_heart: "💝", acceptable: "🉑", bargain: "🉐", blood_type_a: "🅰", blood_type_ab: "🆎",
  blood_type_b: "🅱", blood_type_o: "🅾", discount: "🈹", free_of_charge: "🈚", month: "🈷", no_vacancy: "🈵", not_free: "🈶",
  open_for_business: "🈺", passing_grade: "🈴", request: "🈸", reserved: "🈯", vacancy: "🈳", play_down: "🔽", play_up: "🔼",
  skip_back: "⏮", skip_forward: "⏭", repeat_once: "🔂", "8_asterisk": "✳", "8_star": "✴", currency_conversion: "💱", diamond_with_dot: "💠",
  globe: "🌐", staff_of_asclepius: "⚕", tick_box: "☑", "0": "0️⃣", "1": "1️⃣", "2": "2️⃣", "3": "3️⃣", "4": "4️⃣", "5": "5️⃣", "6": "6️⃣",
  "7": "7️⃣", "8": "8️⃣", "9": "9️⃣", "10": "🔟", latin_lowercase: "🔡", latin_uppercase: "🔠", numbers: "🔢", signal: "📶", special_characters: "🔣",
  large_black_square: "⬛", large_white_square: "⬜", medium_black_square: "◼", medium_white_square: "◻", medium_small_black_square: "◾",
  medium_small_white_square: "◽", small_black_square: "▪", small_white_square: "▫", red_downward_triangle: "🔻", red_upward_triangle: "🔺",
  litter_in_bin: "🚮", metro_sign: "Ⓜ", speaker_loud_volume: "🔊", speaker_muted: "🔇", speech_bubble: "💬", spiky_speech_bubble: "🗯",
  thought_bubble: "💭", double_loop: "➿", exclamation_exclamation: "‼", music_note: "🎵", music_notes: "🎶", male_symbol: "♂", female_symbol: "♀",
  green_money: "💵", yellow_money: "💴",
  upside_down: "🙃", neutral_face: "😐", expressionless: "😑", thumbs_up: "👍", thumbs_down: "👎",
};

const src = process.argv[2], noCopy = process.argv.includes("--no-copy");
if (!src || !fs.existsSync(src)) { console.error("usage: node scripts/build-emoji.mjs <pack-dir> [--no-copy]"); process.exit(1); }

const found = new Map(); // code -> { file, cat, sub }
(function walk(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name), r = rel ? rel + "/" + e.name : e.name;
    if (e.isDirectory()) { if (!(rel === "" && SKIP_DIRS.has(e.name))) walk(p, r); continue; }
    if (!e.name.endsWith(".svg")) continue;
    const code = e.name.slice(0, -4).replace(/_hmn$/, "");
    if (BANNED.has(code)) { console.log("banned, skipped:", code); continue; }
    if (found.has(code)) { console.log("duplicate, kept first:", code, r); continue; }
    const [cat, ...rest] = r.split("/"); found.set(code, { file: p, cat, sub: rest.slice(0, -1).join("/") });
  }
})(src, "");

const subRank = (s) => { const i = SUB_FIRST.indexOf(s); return i < 0 ? 99 : i; };
const cats = CATS.map(([id, label, icon]) => {
  const codes = [...found].filter(([, v]) => v.cat === id).sort((a, b) => subRank(a[1].sub) - subRank(b[1].sub) || a[1].sub.localeCompare(b[1].sub) || a[0].localeCompare(b[0])).map(([c]) => c);
  return { id, label, icon: codes.includes(icon) ? icon : codes[0], codes };
}).filter((c) => c.codes.length);
const known = new Set(cats.flatMap((c) => c.codes));
for (const [c, v] of found) if (!known.has(c)) console.log("not in a known category:", c, v.cat);

// unicode -> code
const strip = (s) => s.replace(/\uFE0F/g, "");
const unicode = {}, matched = new Set();
try {
  const req = createRequire(path.resolve("package.json")), D = req("emojibase-data/en/data.json");
  const byName = new Map(), add = (n, e) => { if (n && !byName.has(n)) byName.set(n, e); };
  const sc = {};
  for (const f of ["cldr", "github", "iamcal", "emojibase", "joypixels"]) { try { Object.assign(sc, Object.fromEntries(Object.entries(req(`emojibase-data/en/shortcodes/${f}.json`)).map(([h, v]) => [h + "|" + f, v]))); } catch { /* preset missing */ } }
  const byHex = new Map(); for (const [k, v] of Object.entries(sc)) { const h = k.split("|")[0]; byHex.set(h, [...(byHex.get(h) || []), ...[].concat(v)]); }
  for (const d of D) {
    add(d.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""), d.emoji);
    for (const s of byHex.get(d.hexcode) || []) add(s.toLowerCase(), d.emoji);
  }
  for (const code of known) {
    const e = ALIASES[code] || byName.get(code);
    if (e) { unicode[strip(e)] = code; matched.add(code); }
  }
} catch {
  // no emojibase-data: keep the map that is already in the index
  try { for (const [u, c] of Object.entries(JSON.parse(fs.readFileSync("src/lib/emoji-index.json", "utf8")).unicode)) if (known.has(c)) { unicode[u] = c; matched.add(c); } console.log("emojibase-data not installed: kept the existing unicode map"); }
  catch { console.log("emojibase-data not installed: unicode map left empty (npm i --no-save emojibase-data)"); }
}

fs.writeFileSync("src/lib/emoji-index.json", JSON.stringify({ cats, unicode }) + "\n");
if (!noCopy) {
  fs.mkdirSync("public/emoji", { recursive: true });
  for (const f of fs.readdirSync("public/emoji")) if (f.endsWith(".svg")) fs.rmSync("public/emoji/" + f);
  for (const [c, v] of found) fs.copyFileSync(v.file, `public/emoji/${c}.svg`);
}
console.log(`${known.size} emoji, ${Object.keys(unicode).length} unicode mappings${noCopy ? " (no copy)" : ", copied to public/emoji"}`);
console.log("no unicode match (fine for Mutant-only art):", [...known].filter((c) => !matched.has(c)).join(" "));
