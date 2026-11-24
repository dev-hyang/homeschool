/* ============ 孩子用药（今天页顶部「距上次用药」卡）：纯逻辑 ============
   数据：小月亮的「宝宝用药」记录（entries.type = bmed，data.child 是哪个孩子），姊妹应用共用；
   设置：hs_family.settings.kidMeds = { rules: [{ name, hours, timing, mins, note }], hero: { <孩子 id>: true | false } }。
   规则和妈妈用药同一种写法（服药时机、最短间隔、医嘱备注见 med-advice.js，和小月亮同一份）。
   卡片开关：用户设过就听用户的；没设过，这个孩子最近 14 天有用药记录就显示（康复后点「不再显示」）。
   不碰页面和数据库（测试见 tests/kidmed-lib.test.mjs）。 */
import { medInfo } from "./med-advice.js";

const DAY = 86400e3, AUTO_DAYS = 14;
const nameOf = e => (e.name || e.cat || "").trim();

const kidRules = settings => ((settings || {}).kidMeds || {}).rules || [];
/** 清掉空行，数字转成字符串能再填回输入框 */
const cleanRules = rules => (rules || []).filter(r => r && (r.name || "").trim()).map(r => ({ name: r.name.trim(), hours: r.hours === "" || r.hours == null ? "" : String(r.hours), timing: r.timing || "", mins: r.mins === "" || r.mins == null ? "" : String(r.mins), note: (r.note || "").trim() }));

/** 这个孩子的用药记录（新的在前）；legacy = 没写 child 的老记录归谁 */
const medsOf = (rows, cid, legacy = "") => (rows || []).filter(e => e.type === "bmed" && (e.child || legacy) === cid).sort((a, b) => b.ts - a.ts);

/** 卡片开着吗 */
function heroOn(settings, cid, meds, now = Date.now()){
  const v = (((settings || {}).kidMeds || {}).hero || {})[cid];
  return v != null ? !!v : meds.some(e => e.ts > now - AUTO_DAYS * DAY);
}
/** 每种药最近一次（按名字合并，最多 limit 种，新的在前）：{ name, at, entry, count24, info } */
function recentMeds(meds, rules, now = Date.now(), limit = 4){
  const seen = new Set(), out = [];
  for (const e of meds) {
    const name = nameOf(e); if (!name || seen.has(name) || e.ts > now + 60e3) continue; seen.add(name);
    const count24 = meds.filter(x => nameOf(x) === name && x.ts > now - DAY && x.ts <= now).length;
    out.push({ name, at: e.ts, entry: e, count24, info: medInfo({ name, entry: e, rules, count24 }) });
    if (out.length >= limit) break;
  }
  return out;
}
/** 最近 7 天（含今天）每天几次，旧的在前 */
function weekCounts(meds, now = Date.now()){
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0); const start = d0.getTime();
  return Array.from({ length: 7 }, (_, i) => { const a = start - (6 - i) * DAY, b = a + DAY; return meds.filter(e => e.ts >= a && e.ts < b).length; });
}
/** 药名候选：设置里的规则 + 最近用过的 */
const nameChoices = (rules, meds) => [...new Set([...(rules || []).map(r => r.name), ...meds.map(nameOf)].filter(Boolean))].slice(0, 20);

export { AUTO_DAYS, kidRules, cleanRules, medsOf, heroOn, recentMeds, weekCounts, nameChoices };
