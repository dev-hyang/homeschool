/* ============ 成长 → 用药记录与趋势：汇总（纯函数，不碰页面；测试见 tests/growth-meds.test.mjs） ============
   近 14 / 30 天按天一根柱子，近 90 天按周一根；再按药名汇总：几次、最近一次。 */
const D = 86400e3;
const pad = x => String(x).padStart(2, "0");
const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const RANGES = [14, 30, 90];
const nameOf = e => (e.name || e.cat || "").trim() || "?";
const dayStart = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** 近 days 天（含今天）的汇总：bars = 每根柱子 { label, from, n }（超过 31 天按周分，周从 days 的第一天起算）、total、byName = [{ name, n, last }] 次数多的在前 */
function medTrend(meds, days, now = Date.now()){
  const start = dayStart(now) - (days - 1) * D, end = dayStart(now) + D;
  const inRange = meds.filter(e => e.ts >= start && e.ts < end);
  const step = days > 31 ? 7 : 1, bars = [];
  for (let a = start; a < end; a += step * D) bars.push({ from: a, label: dayKey(a).slice(5).replace("-", "/"), n: 0 });
  for (const e of inRange) bars[Math.min(bars.length - 1, Math.floor((e.ts - start) / (step * D)))].n++;
  const by = new Map();
  for (const e of inRange) { const k = nameOf(e), o = by.get(k) || { name: k, n: 0, last: 0 }; o.n++; o.last = Math.max(o.last, e.ts); by.set(k, o); }
  return { bars, total: inRange.length, days, perDay: inRange.length / days, byName: [...by.values()].sort((a, b) => b.n - a.n || b.last - a.last) };
}
export { RANGES, medTrend };
