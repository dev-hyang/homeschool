import { t } from "./core/i18n.js";
import { D, dayKey } from "./core/util.js";

/* ============ 夜间干爽：连续干爽几晚、什么时候可以试试晚上穿内裤 ============
   记录在小月亮的 entries 里（type = night，字段 result 干爽 / 湿了、wear 拉拉裤 / 内裤、drink 睡前 1 小时喝水、woke 夜里自己醒来去尿），
   在今天页「记一笔」里记，趋势与分析页看图。早上（14 点前）记的算前一晚：日期和睡眠的「那一晚」一样，用晚上那天。
   常见的经验（美国儿科学会 AAP 等）：拉拉裤连续 5–7 个早上是干的，可以试试晚上穿内裤；穿内裤后一周里湿了大半，就先换回拉拉裤，过 1–3 个月再试，不算失败。 */
const GOAL = 5;
const nightOf = ts => (new Date(ts).getHours() < 14 ? dayKey(ts - D) : dayKey(ts));
const prevDay = d => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() - 1); return dayKey(x.getTime()); };

/** rows：[{ ts, result, wear, drink, woke }]（data 摊平）→ 每晚一条，按日期升序；同一晚记了几次，有一次湿了就算湿了 */
function nightList(rows){
  const by = {};
  for (const r of rows) {
    if (r.result !== "干爽" && r.result !== "湿了") continue;
    const date = nightOf(r.ts), cur = by[date], dry = r.result === "干爽";
    if (!cur) by[date] = { date, dry, wear: r.wear || "", drink: r.drink || "", woke: !!r.woke, ts: r.ts };
    else { cur.dry = cur.dry && dry; cur.woke = cur.woke || !!r.woke; if (r.ts > cur.ts) Object.assign(cur, { wear: r.wear || cur.wear, drink: r.drink || cur.drink, ts: r.ts }); }
  }
  return Object.values(by).sort((a, b) => a.date.localeCompare(b.date));
}

/** 从最近一晚往回数，连着的日历晚上都是干爽的有几晚（中间漏记一晚就断开） */
function streakOf(list){
  let n = 0, want = null;
  for (let i = list.length - 1; i >= 0; i--) {
    const x = list[i];
    if (!x.dry || (want && x.date !== want)) break;
    n++; want = prevDay(x.date);
  }
  return n;
}

/** 给今天页和趋势页的一句话：tone = good（可以试内裤 / 内裤稳了）、warn（建议先换回拉拉裤）、""（照常记） */
function nightAdvice(list){
  if (!list.length) return null;
  const last = list[list.length - 1], streak = streakOf(list), since7 = dayKey(Date.now() - 7 * D), since14 = dayKey(Date.now() - 14 * D);
  const w7 = list.filter(x => x.date >= since7), w14 = list.filter(x => x.date >= since14);
  const wet7 = w7.filter(x => !x.dry).length, dry14 = w14.filter(x => x.dry).length;
  const stale = last.date < dayKey(Date.now() - 3 * D);
  let tip = "", tone = "";
  if (last.wear === "内裤") {
    if (w7.length >= 4 && wet7 * 2 > w7.length) { tip = t("穿内裤后最近 7 晚湿了 {n} 晚：可以先换回拉拉裤，过 1–3 个月再试，这不算失败。", { n: wet7 }); tone = "warn"; }
    else if (streak >= GOAL) { tip = t("穿内裤已经连续 {n} 晚干爽 🎉", { n: streak }); tone = "good"; }
    else tip = t("正在试内裤：偶尔湿一次很正常，平静地换床单就好。");
  } else if (streak >= GOAL) { tip = t("连续 {n} 晚干爽 → 可以试试晚上穿内裤（床上铺两层防水垫，半夜换起来快）。", { n: streak }); tone = "good"; }
  else if (streak > 0) tip = t("连续 {n} 晚干爽，再 {k} 晚就可以试试晚上穿内裤。", { n: streak, k: GOAL - streak });
  return { last, streak, stale, dry14, n14: w14.length, tip, tone };
}

export { GOAL, nightOf, nightList, streakOf, nightAdvice };
