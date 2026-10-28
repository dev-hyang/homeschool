import { t } from "./core/i18n.js";
import { S, ageMonths } from "./core/state.js";
import { $, esc, toast } from "./core/util.js";
import { sleepCardParts } from "./bedtime.js";
import { askLocation, clearLocation, ensureWeather, hasLoc, sceneNow } from "./weather.js";
import { render } from "./views.js";

/* ============ 今天页顶上的滑动卡：名字卡 ⇄ 睡眠卡 ============
   左右滑（或点下面的小圆点）切换。睡眠卡有两种样子：
   · 没人在睡：白天按天气演卡通宝宝（js/weather.js），下面是流程选择 +「开始」，点开始先选谁参加；
   · 有人在睡：只剩睡觉的图标，下面是 唤醒歌 / 唤醒 / 改（和以前今日敬拜里那一行一样，js/wake.js）。
   睡眠状态读所有孩子的，不跟着顶上选中的孩子走。 */
const GAP = 10;   // 和 app.css 里 .hero-slider 的 gap 一致
const repaint = () => { if (S.tab === "today" && !$("#sheet").open) render(); };

const RIDE = /[🚴🛹🛴]/u;   // 大孩子的骑行 / 滑行场景：主角不动，路和风景往后退
function artHTML(sc){
  const deco = sc.deco.map(([e, x, kind, dl]) => `<span class="sp sc-d sc-${kind}" style="--x:${x}%;--dl:${dl}s">${e}</span>`).join("");
  if (sc.pg) {   // 2–6 岁游乐场：滑梯上有人滑下来、秋千来回荡
    return `<div class="sc-art" aria-hidden="true">${deco}<span class="sp sc-slider">🧒</span><span class="sp sc-slide">🛝</span><span class="sp sc-swing" style="--x:72%"><span class="sc-pend"><span>👧</span></span></span></div>`;
  }
  if (RIDE.test(sc.run)) {
    return `<div class="sc-art" aria-hidden="true">${deco}<span class="sp sc-pass" style="--dl:0s">🌳</span><span class="sp sc-pass slow" style="--dl:-4s">🏡</span><span class="sc-road"></span><span class="sp sc-ride"><span class="sc-bob">${esc(sc.run)}</span></span></div>`;
  }
  return `<div class="sc-art" aria-hidden="true">${deco}<span class="sp sc-run"><span class="sc-bob">${esc(sc.run)}</span></span></div>`;
}
function sleepArtHTML(){
  return `<div class="sc-art" aria-hidden="true"><span class="sp sc-d sc-sway" style="--x:12%;--dl:0s">⭐</span><span class="sp sc-d sc-sway" style="--x:34%;--dl:1.2s">⭐</span><span class="sp sc-d sc-sway" style="--x:66%;--dl:.6s">⭐</span><span class="sp sc-d sc-sway" style="--x:88%;--dl:0s">🌙</span><span class="sc-zzz"><span class="sc-big">😴</span><span class="sc-z z1">z</span><span class="sc-z z2">Z</span><span class="sc-z z3">Z</span></span></div>`;
}
/** 一张卡：天空 + 动画铺满整张，流程选择 / 开始 / 天气浮在下面一块半透明的底板上，不再分上下两层 */
function sleepSlideHTML(p){
  const asleep = p.asleep, sc = asleep ? null : sceneNow(new Date(), ageMonths(S.childId));
  const wx = asleep ? "" : hasLoc()
    ? `<button class="bt-more" data-act="wx-off">📍 ${t("不用当地天气")}</button>`
    : `<button class="chip" data-act="wx-locate" title="${esc(t("只在这台设备上记位置，用来查当地天气"))}">📍 ${t("用当地天气")}</button>`;
  return `<section class="sleepcard sky-${asleep ? "sleep" : sc.sky}" aria-label="${esc(t("睡眠卡"))}">
    ${asleep ? sleepArtHTML() : `${artHTML(sc)}<p class="sc-cap">${esc(t(sc.cap))}</p>`}
    <div class="sc-ctl">
      ${asleep ? p.actions : `<div class="bt-pick">${p.pick}<button class="btn primary sm bt-go" data-act="bt-start" data-kid="${esc(S.childId || "")}" ${p.n ? "" : "disabled"}>${t("开始")}</button></div>
      <div class="bt-card-foot"><button class="bt-more" data-tab="bedtime" data-from="today">${t("流程与歌单")} ›</button>${wx}</div>`}
    </div></section>`;
}

/** 把名字卡（hero）和睡眠卡包成左右滑的两张 */
function heroSliderHTML(hero){
  const p = sleepCardParts(S.childId);
  ensureWeather(repaint);
  // 刚有人睡着时自动翻到睡眠卡；之后听用户自己滑
  if (S.heroSlide == null || (p.asleep && !S.heroAsleep)) S.heroSlide = p.asleep ? 1 : 0;
  S.heroAsleep = p.asleep;
  const cur = S.heroSlide;
  const names = [t("名字卡"), t("睡眠卡")];
  return `<div class="hero-wrap">
    <div class="hero-slider" id="heroSlider" role="region" aria-roledescription="carousel" aria-label="${esc(t("今天：名字与睡眠"))}" tabindex="0">
      <div class="hero-slide" role="group" aria-roledescription="slide" aria-label="${esc(names[0])} 1/2">${hero}</div>
      <div class="hero-slide" role="group" aria-roledescription="slide" aria-label="${esc(names[1])} 2/2">${sleepSlideHTML(p)}</div>
    </div>
    <div class="hero-dots" role="group" aria-label="${esc(t("切换卡片"))}">${names.map((n, i) => `<button class="hero-dot" data-act="hero-go" data-i="${i}" aria-label="${esc(n)}" aria-current="${cur === i}"></button>`).join("")}</div>
  </div>`;
}

/** render() 把页面换掉之后调：滑回用户刚才停的那一张 */
function restoreHero(){
  const el = document.getElementById("heroSlider"); if (!el || !el.clientWidth) return;
  el.scrollTo({ left: (S.heroSlide || 0) * (el.clientWidth + GAP), behavior: "instant" });
}
// 手滑时记下停在哪一张、同步小圆点（scroll 不冒泡，用捕获）
document.addEventListener("scroll", e => {
  const el = e.target; if (!el || el.id !== "heroSlider") return;
  const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth + GAP));
  if (i === S.heroSlide) return;
  S.heroSlide = i;
  document.querySelectorAll(".hero-dot").forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
}, true);

const isCardAct = act => act.startsWith("hero-") || act.startsWith("wx-");
async function cardAct(act, btn){
  switch (act) {
    case "hero-go": { const el = document.getElementById("heroSlider"); if (!el) break;
      const calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: +btn.dataset.i * (el.clientWidth + GAP), behavior: calm ? "auto" : "smooth" }); break; }
    case "wx-locate": { const ok = await askLocation(repaint); toast(ok ? t("已用当地天气") : t("没拿到位置，先按季节显示")); repaint(); break; }
    case "wx-off": clearLocation(); repaint(); break;
  }
}

export { heroSliderHTML, restoreHero, isCardAct, cardAct };
