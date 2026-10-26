import { t } from "./core/i18n.js";
import { S } from "./core/state.js";
import { D, dayKey, esc } from "./core/util.js";
import { weekdayLabel } from "./data/subjects.js";

/* ============ 记录的日期筛选 + 列表 / 时间线 ============
   按习惯养成的看法：先看「今天」「本周」，再往回看「近 2 周」「本月」，最后「近 3 个月」「全部」，由近到远。
   同一套用在冲突管理、睡前状况、睡前每晚的记录上；每个列表有自己的 key，各记各的选择（只在这次打开期间）。
   一天的记录在时间线里归成一组，组头写「今天 / 昨天 / 周几 日期」。 */
const RANGES = [["today", "今天"], ["week", "本周"], ["2w", "近 2 周"], ["month", "本月"], ["3m", "近 3 个月"], ["all", "全部"]];
const st = key => ((S.rf ||= {})[key] ||= { range: "2w", view: "list" });
const mondayKey = () => dayKey(Date.now() - ((new Date().getDay() + 6) % 7) * D);
function rangeFrom(range){
  const now = Date.now(), today = dayKey(now);
  return { today, week: mondayKey(), "2w": dayKey(now - 13 * D), month: today.slice(0, 8) + "01", "3m": dayKey(now - 89 * D), all: "" }[range] ?? "";
}
const inRange = (key, items) => { const from = rangeFrom(st(key).range); return items.filter(x => !from || x.date >= from).sort((a, b) => (b.date + (b.updated_at || "")).localeCompare(a.date + (a.updated_at || ""))); };
const dayLabel = date => { const today = dayKey(Date.now()), y = dayKey(Date.now() - D); return date === today ? t("今天") : date === y ? t("昨天") : `${weekdayLabel(new Date(date + "T12:00:00").getDay())} ${date.slice(5)}`; };

function barHTML(key, shown, total){
  const s = st(key);
  return `<div class="rf-bar"><div class="chips rf-chips" role="group" aria-label="${t("日期范围")}">${RANGES.map(([k, l]) => `<button type="button" class="chip" data-act="rf-set" data-key="${esc(key)}" data-range="${k}" aria-pressed="${s.range === k}">${t(l)}</button>`).join("")}</div>
    <div class="rf-row"><span class="small muted">${t("{n} 条", { n: shown })}${shown !== total ? ` / ${t("共 {n} 条", { n: total })}` : ""}</span>
      <div class="seg rf-view" role="group" aria-label="${t("视图")}"><button type="button" data-act="rf-set" data-key="${esc(key)}" data-view="list" aria-pressed="${s.view === "list"}">${t("列表")}</button><button type="button" data-act="rf-set" data-key="${esc(key)}" data-view="timeline" aria-pressed="${s.view === "timeline"}">${t("时间线")}</button></div></div></div>`;
}
/** 筛选条 + 列表或时间线。items 要有 date（YYYY-MM-DD）；rowHTML(item) 返回 .task 行（列表）；tlHTML(item) 返回时间线里的一小块 */
function recordsHTML(key, items, rowHTML, tlHTML, empty){
  const shown = inRange(key, items), s = st(key);
  let body;
  if (!shown.length) body = `<div class="empty">${empty}</div>`;
  else if (s.view === "timeline") {
    const groups = []; shown.forEach(x => { const g = groups[groups.length - 1]; if (g && g.date === x.date) g.items.push(x); else groups.push({ date: x.date, items: [x] }); });
    body = `<div class="tl">${groups.map(g => `<div class="tl-day"><div class="tl-head"><b>${esc(dayLabel(g.date))}</b> <span class="small muted">${g.date}</span></div>${g.items.map(x => `<div class="tl-item">${(tlHTML || rowHTML)(x)}</div>`).join("")}</div>`).join("")}</div>`;
  } else body = `<div class="tasks">${shown.map(rowHTML).join("")}</div>`;
  return `${barHTML(key, shown.length, items.length)}<div class="panel" style="margin-top:8px">${body}</div>`;
}
function setFilter(key, d){ const s = st(key); if (d.range) s.range = d.range; if (d.view) s.view = d.view; }

export { recordsHTML, setFilter, inRange, rangeFrom, dayLabel, RANGES };
