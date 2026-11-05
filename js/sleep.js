import { SB } from "./core/auth.js";
import { selectAll } from "./core/paged.js";
import { t } from "./core/i18n.js";
import { S, ageMonths, ageText } from "./core/state.js";
import { D, H, dayKey, esc, hm, weekday } from "./core/util.js";
import { bedClock, clockOfDay, timeDots } from "./flows-trend.js";
import { openNewSleep } from "./wake.js";
import { render } from "./views.js";

/* ============ 睡眠页：2 岁以上的孩子不在小月亮里显示了，睡眠的 记录 / 补记 / 修改 / 趋势 都在这里 ============
   数据就是小月亮的 entries（type = sleep），两边读写同一条，互相同步；这里不另建表（备份不用改）。
   夜间睡眠 vs 午睡：记录上有 nap（true / false，这里的表单会写）就按它；没有就按时间猜——18 点后或凌晨 4 点前入睡、且睡够 3 小时（还在睡的也算）= 夜间，其余 = 午睡。
   夜间睡眠归到「入睡那个晚上」的日期（凌晨入睡的算前一天晚上），午睡归到当天。改 / 删用 wake.js 的同一张表单。 */
const DAYS = 61, MAX_ROWS = 3000, RANGES = [7, 14, 30];
const L = (S.sl = S.sl || { rows: [], loaded: false, loading: false, err: "", key: "", days: 14, show: 14 });
const fid = () => S.family && S.family.id;
const ready = () => !!(SB.client && fid() && S.hs.loaded);

async function load(){
  if (L.loading || !ready()) return;
  L.loading = true; L.err = "";
  const f = fid(), since = Date.now() - DAYS * D;
  let res;
  try { res = await selectAll(() => SB.client.from("entries").select("id,ts,data").eq("family_id", f).eq("type", "sleep").eq("deleted", false).gte("ts", since).order("ts", { ascending: false }).order("id"), MAX_ROWS); }
  catch (e) { res = { data: null, error: { message: (e && e.message) || "network" } }; }
  L.loading = false; L.key = f;
  if (res.error) L.err = res.error.message || "error";
  else { L.rows = (res.data || []).map(r => ({ id: r.id, ts: +r.ts, data: r.data || {} })); L.loaded = true; }
  if (S.tab === "sleep" && !document.querySelector("#sheet")?.open) render();
}
/** 记录改了（这里的表单、小月亮那边、别的家人）：睡眠页开着就重读 */
window.addEventListener("hs-sleep-changed", () => { if (L.loaded || S.tab === "sleep") load(); });

const mine = () => { const cid = S.childId, first = S.children[0] && S.children[0].id; return L.rows.filter(r => r.data.child === cid || (!r.data.child && first === cid)); };
const endOf = r => (+r.data.end > r.ts ? +r.data.end : 0);
function isNap(r){
  if (r.data.nap === true) return true;
  if (r.data.nap === false) return false;
  const h = new Date(r.ts).getHours(), end = endOf(r);
  return !((h >= 18 || h < 4) && (!end || end - r.ts >= 3 * H));
}
/** 夜间睡眠归到入睡那个晚上（凌晨 4 点前入睡的算前一天），午睡归当天 */
const nightOf = r => (!isNap(r) && new Date(r.ts).getHours() < 4 ? dayKey(r.ts - D) : dayKey(r.ts));
/** 入睡时刻 = 离 18:00 的分钟数（和趋势页一样，跨午夜也连续）；大约 -6h…+18h */
const bedMin = ts => { const d = new Date(ts), m = d.getHours() * 60 + d.getMinutes(); return ((m - 1080 + 1440 + 360) % 1440) - 360; };
const wakeMin = ts => { const d = new Date(ts); return d.getHours() * 60 + d.getMinutes(); };
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const sd = a => { const m = avg(a); return a.length > 1 ? Math.sqrt(a.reduce((x, v) => x + (v - m) ** 2, 0) / a.length) : null; };
const durText = ms => { const m = Math.max(0, Math.round(ms / 60e3)), h = Math.floor(m / 60); return h ? t("{h} 小时 {m} 分", { h, m: m % 60 }) : t("{n} 分钟", { n: m }); };
const hrs = ms => Math.round(ms / H * 10) / 10;

/** 建议睡眠（每天合计，含午睡）：AASM / AAP 的分龄建议 */
function recommend(months){
  if (months == null) return null;
  if (months < 12) return [12, 16];
  if (months < 36) return [11, 14];
  if (months < 72) return [10, 13];
  if (months < 156) return [9, 12];
  return [8, 10];
}

/** 每天：夜间 / 午睡各多少毫秒（只算已醒的），夜间的入睡 / 起床（取最长那段） */
function daily(days){
  const from = dayKey(Date.now() - (days - 1) * D), by = {};
  for (const r of mine()) {
    const end = endOf(r); if (!end) continue;
    const date = nightOf(r); if (date < from) continue;
    const x = (by[date] ||= { date, night: 0, nap: 0, naps: 0, main: null });
    if (isNap(r)) { x.nap += end - r.ts; x.naps++; }
    else { x.night += end - r.ts; if (!x.main || end - r.ts > x.main.end - x.main.ts) x.main = { ts: r.ts, end }; }
  }
  return by;
}

/** 每天一根柱：夜间（蓝）+ 午睡（金）叠起来，背后浅绿带 = 建议范围；每根柱都带 <title> 文字，读屏能读 */
function sleepBars(dates, by, rec){
  const W = 300, Ht = 150, Lm = 26, Bm = 20, T = 6, R = 4;
  const tot = d => (by[d] ? by[d].night + by[d].nap : 0) / H;
  const top = Math.max(rec ? rec[1] + 2 : 14, Math.ceil(Math.max(0, ...dates.map(tot)) + 1));
  const n = dates.length, slot = (W - Lm - R) / n, bw = Math.max(3, slot * 0.7), Y = h => T + (1 - h / top) * (Ht - T - Bm);
  const grid = []; for (let h = 0; h <= top; h += top > 16 ? 4 : 2) grid.push(`<line x1="${Lm}" x2="${W - R}" y1="${Y(h).toFixed(1)}" y2="${Y(h).toFixed(1)}" stroke="var(--line)"/><text x="${Lm - 4}" y="${(Y(h) + 3).toFixed(1)}" text-anchor="end" class="ch-tick">${h}</text>`);
  const band = rec ? `<rect x="${Lm}" y="${Y(rec[1]).toFixed(1)}" width="${W - Lm - R}" height="${(Y(rec[0]) - Y(rec[1])).toFixed(1)}" fill="var(--sage)" opacity=".14"/>` : "";
  const every = n <= 14 ? 1 : 5;
  const g = dates.map((d, i) => {
    const x0 = Lm + i * slot + (slot - bw) / 2, v = by[d], nh = v ? v.night / H : 0, ph = v ? v.nap / H : 0;
    const label = v ? `${d} · ${t("夜间")} ${durText(v.night)}${v.nap ? ` · ${t("午睡")} ${durText(v.nap)}` : ""}` : `${d} · ${t("没有记录")}`;
    const yN = Y(nh), yP = Y(nh + ph);
    return `<g><title>${esc(label)}</title>${nh ? `<rect x="${x0.toFixed(1)}" y="${yN.toFixed(1)}" width="${bw.toFixed(1)}" height="${(Y(0) - yN).toFixed(1)}" fill="var(--sky)"/>` : ""}${ph ? `<rect x="${x0.toFixed(1)}" y="${yP.toFixed(1)}" width="${bw.toFixed(1)}" height="${(yN - yP).toFixed(1)}" fill="var(--honey)"/>` : ""}
      ${i % every === 0 || i === n - 1 ? `<text x="${(x0 + bw / 2).toFixed(1)}" y="${Ht - 6}" text-anchor="middle" class="ch-tick">${esc(n <= 14 ? d.slice(8) : d.slice(5).replace("-", "/"))}</text>` : ""}</g>`;
  }).join("");
  return `<figure class="lib-chart"><svg viewBox="0 0 ${W} ${Ht}" role="img" aria-label="${esc(t("每天睡了几小时"))}">${band}${grid.join("")}${g}</svg>
    <p class="legend-line"><span><i style="background:var(--sky)"></i>${t("夜间睡眠")}</span><span><i style="background:var(--honey)"></i>${t("午睡")}</span>${rec ? `<span><i style="background:var(--sage);opacity:.35"></i>${t("建议 {a}–{b} 小时", { a: rec[0], b: rec[1] })}</span>` : ""}</p></figure>`;
}

function trendHTML(){
  const days = L.days, dates = Array.from({ length: days }, (_, i) => dayKey(Date.now() - (days - 1 - i) * D)), by = daily(days), rec = recommend(ageMonths());
  const rows = Object.values(by), nights = rows.filter(x => x.main), napDays = rows.filter(x => x.naps);
  const total = rows.filter(x => x.night).map(x => x.night + x.nap), beds = nights.map(x => bedMin(x.main.ts)), wakes = nights.map(x => wakeMin(x.main.end));
  const avgTot = avg(total), spread = sd(beds);
  const stat = (k, v, sub = "") => `<div class="stat"><div class="k">${k}</div><div class="v num">${v}${sub ? `<small>${sub}</small>` : ""}</div></div>`;
  const okTxt = avgTot == null || !rec ? "" : avgTot / H < rec[0] ? t("偏少") : avgTot / H > rec[1] ? t("偏多") : t("在建议范围内");
  const pts = list => list.map(([date, v]) => ({ date, v, on: false }));
  return `<div class="chips" role="group" aria-label="${t("时间范围")}">${RANGES.map(d => `<button type="button" class="chip" data-act="sl-days" data-v="${d}" aria-pressed="${days === d}">${t("近 {n} 天", { n: d })}</button>`).join("")}</div>
  <div class="panel"><div class="stats">
    ${stat(t("平均每天"), avgTot == null ? "–" : hrs(avgTot), avgTot == null ? "" : `${t("小时")}${okTxt ? " · " + okTxt : ""}`)}
    ${stat(t("平均入睡"), beds.length ? bedClock(avg(beds)) : "–")}
    ${stat(t("平均起床"), wakes.length ? clockOfDay(avg(wakes)) : "–")}
    ${stat(t("入睡时间波动"), spread == null ? "–" : `±${Math.round(spread)}`, spread == null ? "" : t("分钟"))}
    ${stat(t("午睡"), `${napDays.length}<small>/${days}</small>`, napDays.length ? `${t("天")} · ${t("平均 {d}", { d: durText(avg(napDays.map(x => x.nap))) })}` : t("天"))}
  </div>
  <p class="small muted" style="margin:8px 0 0">${rec ? t("{age}建议每天睡 {a}–{b} 小时（含午睡，AASM / AAP）。", { age: ageText(), a: rec[0], b: rec[1] }) : ""}${t("入睡时间波动越小越好：每天差不多同一时间上床，比偶尔早睡更有用。")}</p></div>
  <h2>${t("每天睡了几小时")}</h2><div class="panel">${rows.length ? sleepBars(dates, by, rec) : `<p class="small muted" style="margin:0">${t("这段时间还没有睡眠记录。睡前流程结束会自动记「开始睡」，早上点「唤醒」；也可以在下面补记。")}</p>`}</div>
  ${nights.length ? `<h2>${t("入睡时间")}</h2><div class="panel">${timeDots(t("入睡时间"), pts(nights.map(x => [x.date, bedMin(x.main.ts)])), dates, bedClock)}</div>
  <h2>${t("起床时间")}</h2><div class="panel">${timeDots(t("起床时间"), pts(nights.map(x => [x.date, wakeMin(x.main.end)])), dates, clockOfDay)}</div>` : ""}`;
}

function listHTML(){
  const from = dayKey(Date.now() - (L.show - 1) * D), groups = {};
  for (const r of mine()) { const k = nightOf(r); if (k >= from) (groups[k] ||= []).push(r); }
  const keys = Object.keys(groups).sort().reverse();
  const row = r => {
    const end = endOf(r), nap = isNap(r), d = r.data, extra = [d.how, d.where].filter(Boolean).map(x => esc(t(x))).join(" · ");
    return `<li><button type="button" class="sl-row" data-act="wk-edit" data-id="${esc(r.id)}" aria-label="${esc(`${nap ? t("午睡") : t("夜间睡眠")} ${hm(r.ts)}${end ? " → " + hm(end) : ""}，${t("点一下修改")}`)}">
      <span class="sl-ic" aria-hidden="true">${nap ? "☀️" : "🌙"}</span>
      <span class="sl-main"><b class="num">${hm(r.ts)} → ${end ? hm(end) : `<span class="badge">${t("在睡")}</span>`}</b>${extra || d.note ? `<small class="muted">${[extra, d.note && esc(d.note)].filter(Boolean).join(" · ")}</small>` : ""}</span>
      <span class="sl-dur num">${end ? esc(durText(end - r.ts)) : ""}</span></button></li>`;
  };
  const body = keys.map(k => {
    const list = groups[k].sort((a, b) => a.ts - b.ts), tot = list.reduce((a, r) => a + (endOf(r) ? endOf(r) - r.ts : 0), 0);
    return `<li class="sl-day"><b>${esc(k.slice(5))} ${esc(t(weekday(new Date(k + "T12:00:00").getTime())))}</b>${tot ? `<span class="muted small">${t("共 {d}", { d: durText(tot) })}</span>` : ""}</li>${list.map(row).join("")}`;
  }).join("");
  const more = L.show < DAYS ? `<button type="button" class="btn sm" data-act="sl-more">${t("显示更早的 14 天")}</button>` : "";
  return `<div class="btns" style="margin-bottom:8px"><button type="button" class="btn primary sm" data-act="sl-add">＋ ${t("补记一段睡眠")}</button></div>
    ${keys.length ? `<ul class="sl-list">${body}</ul>` : `<p class="small muted">${t("最近 {n} 天没有睡眠记录。", { n: L.show })}</p>`}
    <div class="btns" style="margin-top:8px">${more}</div>
    <p class="small muted" style="margin:8px 0 0">${t("点一条可以改时间、怎么入睡、在哪儿睡、备注，或删除。这里的记录和小月亮是同一份，两边同步。")}</p>`;
}

function viewSleep(){
  if (!ready()) return `<h2>${t("睡眠")}</h2><div class="panel"><p class="small muted" style="margin:0">${t("登录并加入家庭后，这里显示睡眠记录。")}</p></div>`;
  if ((!L.loaded || L.key !== fid()) && !L.loading && !L.err) setTimeout(load, 0);
  const c = S.children.find(k => k.id === S.childId), name = c ? c.name || t("宝宝") : "";
  const status = L.loading && !L.loaded ? `<p class="small muted" role="status">${t("正在读取睡眠记录…")}</p>` : L.err ? `<p class="small muted" role="status">${t("读不到睡眠记录：")}${esc(L.err)} <button type="button" class="chip" data-act="sl-reload">${t("重试")}</button></p>` : "";
  return `<h2>${esc(name ? t("{n}的睡眠", { n: name }) : t("睡眠"))}</h2>${status}
  ${L.loaded ? `${trendHTML()}<h2>${t("睡眠记录")}</h2><div class="panel">${listHTML()}</div>` : ""}`;
}

async function sleepAct(act, btn){
  const d = btn.dataset;
  switch (act) {
    case "sl-days": L.days = +d.v; render(); break;
    case "sl-more": L.show = Math.min(DAYS, L.show + 14); render(); break;
    case "sl-reload": L.err = ""; await load(); break;
    case "sl-add": openNewSleep(S.childId); break;
  }
}
const sleepRow = id => L.rows.find(r => r.id === id) || null;

export { viewSleep, sleepAct, sleepRow, isNap };
