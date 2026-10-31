import { LS_PREFIX } from "./core/config.js";
import { t } from "./core/i18n.js";
import { S } from "./core/state.js";
import { esc, loadJSON, saveJSON } from "./core/util.js";

/* ============ 长列表分页：先在全量上筛选 / 排序 / 统计，只画前 N 条，底下一个「继续加载」 ============
   每页条数是全应用一个设置，存在这台设备（设置 → 显示）；没选过时窄屏 10、宽屏 20。
   每个列表一个 key，各记各的「已显示几条」；换页签、换孩子时全部回到一页，换筛选 / 搜索 / 排序时调 resetPage(key)。 */
const PAGE_SIZES = [5, 10, 20, 50];
const KEY = LS_PREFIX + ".pageSize";
const narrow = () => { try { return matchMedia("(max-width: 640px)").matches; } catch (e) { return false; } };
function pageSize(){ const v = +loadJSON(KEY, 0); return PAGE_SIZES.includes(v) ? v : (narrow() ? 10 : 20); }
const P = { sig: "", n: {} };
function setPageSize(n){ n = +n; if (!PAGE_SIZES.includes(n)) return; saveJSON(KEY, n); P.n = {}; }
// 页签或孩子变了：所有列表回到一页
const sig = () => `${S.tab}|${S.childId || ""}`;
function shownOf(key){ const s = sig(); if (P.sig !== s) { P.sig = s; P.n = {}; } return P.n[key] || pageSize(); }
function resetPage(key){ delete P.n[key]; }
function morePage(key){ P.n[key] = shownOf(key) + pageSize(); }
/** list 是筛选 / 排序后的全量；返回要画的前几条 rows，和「继续加载」按钮（没有更多时是空串） */
function paged(key, list){
  const n = shownOf(key), rows = list.slice(0, n);
  return { rows, more: list.length > n ? moreHTML(key) : "" };
}
const moreHTML = key => `<div class="btns pg-more" style="margin-top:8px;justify-content:center"><button type="button" class="btn" data-pg-more="${esc(key)}">${t("继续加载")}</button></div>`;
/** 设置里的「每页显示」选择（样式同界面语言 / 外观的 seg） */
const pageSizeHTML = () => `<div class="seg" role="group" aria-label="${t("每页显示")}" style="margin-top:8px">${PAGE_SIZES.map(n => `<button data-page-size="${n}" aria-pressed="${pageSize() === n}">${t("{n} 条", { n })}</button>`).join("")}</div>`;

export { PAGE_SIZES, pageSize, setPageSize, shownOf, resetPage, morePage, paged, pageSizeHTML };
