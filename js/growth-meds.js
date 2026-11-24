import { t } from "./core/i18n.js";
import { dayKey, esc, hm } from "./core/util.js";
import { RANGES, medTrend } from "./growth-meds-lib.js";

/* ============ 成长 → 用药记录与趋势：图表和汇总 ============
   数据是当前孩子的「宝宝用药」记录（bmed）。近 14 / 30 天按天一根柱子，近 90 天按周一根；
   下面按药名汇总：几次、最近一次。汇总的纯函数在 growth-meds-lib.js（有测试），这里只拼页面。 */
function barsHTML(bars){
  const top = Math.max(1, ...bars.map(b => b.n)), every = bars.length > 14 ? 5 : 2;
  return `<div class="gm-bars" role="img" aria-label="${esc(t("用药次数：{v}", { v: bars.map(b => b.n).join("、") }))}">${bars.map((b, i) =>
    `<span class="gm-col"><b>${b.n || ""}</b><i class="${b.n ? "" : "zero"}" style="height:${b.n ? Math.round(6 + b.n / top * 56) : 2}px"></i><small>${i % every === 0 || i === bars.length - 1 ? esc(b.label) : ""}</small></span>`).join("")}</div>`;
}
/** 范围按钮 + 柱状图 + 一句总结 + 按药名汇总 */
function trendHTML(meds, days){
  const R = medTrend(meds, days), unit = days > 31 ? t("每根柱子是一周") : t("每根柱子是一天");
  const chips = RANGES.map(n => `<button class="chip" data-act="km-range" data-d="${n}" aria-pressed="${days === n}">${t("近 {n} 天", { n })}</button>`).join("");
  const rows = R.byName.map(x => `<div class="gm-row"><b>${esc(x.name)}</b><span>${t("{n} 次", { n: x.n })} · ${t("最近 {d} {time}", { d: dayKey(x.last).slice(5).replace("-", "/"), time: hm(x.last) })}</span></div>`).join("");
  return `<div class="chips gm-range" role="group" aria-label="${esc(t("时间范围"))}">${chips}</div>
    <div class="panel">${barsHTML(R.bars)}
      <p class="small muted gm-sum">${R.total ? t("共 {n} 次，平均每天 {a} 次", { n: R.total, a: R.perDay.toFixed(1) }) : t("这段时间没有用药记录。")} · ${unit}</p>${rows ? `<div class="gm-rows">${rows}</div>` : ""}</div>`;
}
export { trendHTML };
