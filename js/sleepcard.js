import { t } from "./core/i18n.js";
import { musicCardHTML } from "./music.js";
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
      <div class="bt-card-foot"><button class="bt-more" data-tab="bedtime" data-from="today">${t("流程与歌单")} ›</button><button class="bt-more" data-tab="sleep" data-from="today">${t("睡眠记录与趋势")} ›</button>${wx}</div>`}
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
  const names = [t("名字卡"), t("睡眠卡"), t("音乐卡")];
  return `<div class="hero-wrap">
    <div class="hero-slider" id="heroSlider" role="region" aria-roledescription="carousel" aria-label="${esc(t("今天：名字、睡眠与音乐"))}" tabindex="0">
      <div class="hero-slide" role="group" aria-roledescription="slide" aria-label="${esc(names[0])} 1/3">${hero}</div>
      <div class="hero-slide" role="group" aria-roledescription="slide" aria-label="${esc(names[1])} 2/3">${sleepSlideHTML(p)}</div>
      <div class="hero-slide" role="group" aria-roledescription="slide" aria-label="${esc(names[2])} 3/3">${musicCardHTML()}</div>
    </div>
    ${dashesHTML(names, cur)}
  </div>`;
}

/* ── 自动换卡（11-08，和爱家小助手今日卡片同一套）：当前那条短划线像进度条，走满就到下一张（最后一张回到第一张）。
 *    手指按着、鼠标停在卡片上、键盘焦点在里面、⚙ 菜单开着时停住；手动滑 / 点过从头走；系统减少动态效果时不走。⚙ 选 5 / 10 / 15 / 30 秒或关掉，记在本机。 */
const SECS_KEY = "homeschool.v1.cardSecs", SECS = [5, 10, 15, 30];
const cardSecs = () => { try { const v = localStorage.getItem(SECS_KEY); if (v === "0") return 0; return SECS.includes(+v) ? +v : 10; } catch { return 10; } };
function dashesHTML(names, cur){
  const secs = cardSecs();
  const opt = v => `<button type="button" class="hd-opt" data-act="hero-secs" data-v="${v}" aria-pressed="${secs === v}">${v ? t("{s} 秒", { s: v }) : t("关闭自动切换")}${secs === v ? " ✓" : ""}</button>`;
  const nav = (d, label, ch) => `<button type="button" class="hero-nav" data-act="hero-step" data-d="${d}" aria-label="${esc(label)}">${ch}</button>`;
  return `<div class="hero-ctrl">
    ${nav(-1, t("上一张"), "‹")}<div class="hero-dashes ${secs ? "" : "is-off"}" role="group" aria-label="${esc(t("切换卡片"))}">${names.map((n, i) => `<button class="hero-dash ${cur === i ? "is-run" : ""}" data-act="hero-go" data-i="${i}" aria-label="${esc(n)}" aria-current="${cur === i}"><i style="animation-duration:${secs || 10}s"></i></button>`).join("")}</div>${nav(1, t("下一张"), "›")}
    <details class="hero-gear"><summary aria-label="${esc(t("自动切换的时间"))}" title="${esc(t("自动切换的时间"))}">⚙</summary><div class="hd-menu">${[...SECS, 0].map(opt).join("")}</div></details>
  </div>`;
}
function markDash(i){
  document.querySelectorAll(".hero-dash").forEach((b, k) => {
    b.setAttribute("aria-current", String(k === i));
    if (k !== i) { b.classList.remove("is-run"); return; }
    b.classList.remove("is-run"); void b.offsetWidth; b.classList.add("is-run");
  });
}
const sliderGo = (i, smooth = true) => { const el = document.getElementById("heroSlider"); if (!el) return; const calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; el.scrollTo({ left: i * (el.clientWidth + GAP), behavior: smooth && !calm ? "smooth" : "auto" }); };
document.addEventListener("animationend", e => {
  if (e.animationName !== "hdprog" || !e.target.closest?.(".hero-dash.is-run") || document.hidden || !cardSecs()) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = document.getElementById("heroSlider"); if (!el || el._down) return;
  const n = el.children.length; sliderGo(((S.heroSlide || 0) + 1) % n);
}, true);
document.addEventListener("pointerdown", e => { const el = e.target.closest?.("#heroSlider"); if (el) { el._down = true; el.closest(".hero-wrap")?.classList.add("is-hold"); } }, true);
const heroUp = () => { const el = document.getElementById("heroSlider"); if (!el || !el._down) return; el._down = false; el.closest(".hero-wrap")?.classList.remove("is-hold"); markDash(S.heroSlide || 0); if (el.contains(document.activeElement)) document.activeElement.blur(); };
document.addEventListener("pointerup", heroUp, true); document.addEventListener("pointercancel", heroUp, true);
document.addEventListener("visibilitychange", () => { if (!document.hidden) markDash(S.heroSlide || 0); });

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
  S.heroSlide = i; markDash(i);
}, true);

const isCardAct = act => act.startsWith("hero-") || act.startsWith("wx-");
async function cardAct(act, btn){
  switch (act) {
    case "hero-step": { const el = document.getElementById("heroSlider"), n = el ? el.children.length : 3; sliderGo(((S.heroSlide || 0) + +btn.dataset.d + n) % n); btn.blur(); break; }   // ‹ ›：循环
    case "hero-go": { if (+btn.dataset.i === (S.heroSlide || 0)) markDash(S.heroSlide || 0); else sliderGo(+btn.dataset.i); btn.blur(); break; }
    case "hero-secs": {   // ⚙ 选了秒数：存下来，当前那条按新时间从头走
      try { localStorage.setItem(SECS_KEY, btn.dataset.v); } catch (e) { /* 忽略 */ }
      const v = cardSecs(); document.querySelectorAll(".hero-dash i").forEach(i => { i.style.animationDuration = `${v || 10}s`; });
      document.querySelector(".hero-dashes")?.classList.toggle("is-off", !v);
      document.querySelectorAll(".hd-opt").forEach(o => { const on = +o.dataset.v === v; o.setAttribute("aria-pressed", String(on)); o.textContent = (+o.dataset.v ? t("{s} 秒", { s: +o.dataset.v }) : t("关闭自动切换")) + (on ? " ✓" : ""); });
      btn.closest("details")?.removeAttribute("open"); markDash(S.heroSlide || 0); break; }
    case "wx-locate": { const ok = await askLocation(repaint); toast(ok ? t("已用当地天气") : t("没拿到位置，先按季节显示")); repaint(); break; }
    case "wx-off": clearLocation(); repaint(); break;
  }
}

export { heroSliderHTML, restoreHero, isCardAct, cardAct };

document.addEventListener("click", e => { document.querySelectorAll(".hero-gear[open]").forEach(d => { if (!d.contains(e.target)) d.removeAttribute("open"); }); });
