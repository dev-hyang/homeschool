import { addContent, setRefFormatter } from "../core/i18n.js";
import { SISTER_APPS } from "../core/config.js";
import { refEn } from "./bible.js";
import { ANCHOR_EN, ANCHOR_ZH, FLOW_TEMPLATES, GUIDE, NAP_TEXT, PARENT_LINES, PRINCIPLES, READINGS, SITUATIONS, SONG_IDEAS, TEXT_TEMPLATE } from "./bedtime.js";
import { CONFLICTS } from "./flows.js";
import { EMOTIONS } from "./emotions.js";
import { REC } from "./music.js";
import { PLANS } from "./plans.js";
import { ANGER, CORE, HARD } from "./principle.js";
import { ROUTINE_TEMPLATES } from "./seeds.js";
import { CONFLICTS_EN, EMOTIONS_EN } from "./en-flows.js";
import { BEDTIME_EN, MUSIC_EN, PLANS_EN, PRINCIPLE_EN, ROUTINES_EN, SISTER_EN } from "./en-content.js";

/* ============ 「中文原文 → 英文」登记表 ============
   应用自带的内容（模板、计划、大原则、睡前安然、冲突 / 情绪管理……）英文放在 en-*.js 里，结构和中文数据一一对应；
   这里按字段、按数组下标对齐，登记到 core/i18n.js 的 CONTENT。英文界面下 tc() / tb() 会自动换成英文。
   页面（app.js）一加载就执行一次。 */
const stats = { pairs: 0, orphans: [] };
function align(zh, en, path = ""){
  if (typeof en === "string") { if (typeof zh === "string") { addContent(zh, en); stats.pairs++; } else stats.orphans.push(path); return; }
  if (Array.isArray(en)) { if (!Array.isArray(zh)) { stats.orphans.push(path); return; } en.forEach((e, i) => align(zh[i], e, `${path}[${i}]`)); return; }
  if (en && typeof en === "object") { if (!zh || typeof zh !== "object") { stats.orphans.push(path); return; } for (const k of Object.keys(en)) align(zh[k], en[k], `${path}.${k}`); }
}
const byId = list => Object.fromEntries(list.map(x => [x.id, x]));

setRefFormatter(refEn);
addContent(ANCHOR_ZH, ANCHOR_EN);   // 诗篇 4:8 的中文经文 → 英文
align(byId(CONFLICTS), CONFLICTS_EN, "conflicts");
align(byId(EMOTIONS), EMOTIONS_EN, "emotions");
align(REC, MUSIC_EN, "music");
align(ROUTINE_TEMPLATES, ROUTINES_EN, "routines");
PLANS.forEach(p => { const e = PLANS_EN[p.id]; if (!e) return; addContent(p.name, e.name); addContent(p.desc, e.desc); p.items.forEach((it, i) => { const n = Array.isArray(e.notes) ? e.notes[i] : e.notes[i]; if (it[1] && n) { addContent(it[1], n); stats.pairs++; } }); });
SISTER_APPS.forEach((a, i) => addContent(a.desc, SISTER_EN[i]));
align(CORE, PRINCIPLE_EN.CORE, "core"); align(ANGER, PRINCIPLE_EN.ANGER, "anger"); align(HARD, PRINCIPLE_EN.HARD, "hard");
align(FLOW_TEMPLATES, BEDTIME_EN.FLOW_TEMPLATES, "flowTemplates"); align(TEXT_TEMPLATE, BEDTIME_EN.TEXT_TEMPLATE, "textTemplate"); align(NAP_TEXT, BEDTIME_EN.NAP_TEXT, "napText");
align(PRINCIPLES, BEDTIME_EN.PRINCIPLES, "principles"); align(SITUATIONS, BEDTIME_EN.SITUATIONS, "situations"); align(READINGS, BEDTIME_EN.READINGS, "readings");
align(PARENT_LINES, BEDTIME_EN.PARENT_LINES, "parentLines"); align(GUIDE, BEDTIME_EN.GUIDE, "guide"); align(SONG_IDEAS, BEDTIME_EN.SONG_IDEAS, "songIdeas");

export { stats as CONTENT_STATS };
