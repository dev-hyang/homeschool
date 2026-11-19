/* ============ boot ============
   模块顺序：core/config → core/util → core/state → hs ↔ core/auth ↔ views ↔ sheet → events。
   跨模块调用都在函数体内，循环引用是安全的。 */
import { locale, t } from "./core/i18n.js";
import { initSwipeRows } from "./swipe-rows.js";
import { initCompactFilters, watchStick } from "./compact-filters.js";
import "./filterbar.js";
import "./data/content-en.js";   // 应用自带内容的英文登记（英文界面下 tc / tb 用）
import "./events.js";
import "./attach.js";   // AI 附件区 + 会自己长高的文字框（姊妹应用同一份）
import { initSupabase } from "./core/auth.js";
import { initProviders } from "./backup.js";
import { APP_VERSION } from "./core/config.js";
import { S } from "./core/state.js";
import { refreshIfNewDay } from "./hs.js";
import { render, restoreRoute } from "./views.js";
import { initReleases } from "./releases-ui.js";
import { RELEASES } from "./data/releases.js";

/* 发布后的头几分钟，浏览器可能把新的 index.html 和缓存里的旧程序文件混在一起（GitHub Pages 缓存约 10 分钟）。
   打包后真正的文件是 dist/app.js（入口，src 带 ?v= 版本号）和 dist/chunks/ 下带内容哈希的块（文件名随内容变，不会读到旧的）；
   所以只需要绕过缓存重新抓 index.html 和入口。index.html 里的 meta 版本与 config.js 不一致时，重新抓取后刷新一次。 */
async function healStaleModules(){
  const want = (document.querySelector('meta[name="app-version"]') || {}).content;
  if (!want || want === APP_VERSION) return false;
  const key = "homeschool.reloaded." + want;
  try { if (sessionStorage.getItem(key)) return false; sessionStorage.setItem(key, "1"); } catch (e) { return false; }
  const entry = (document.querySelector('script[type="module"][src]') || {}).src;
  await Promise.all([location.pathname, entry].filter(Boolean).map(u => fetch(u, { cache: "reload" }).catch(() => null)));
  location.reload(); return true;
}

if (!(await healStaleModules())) {
  { const v = document.getElementById("appver"); if (v) v.textContent = "v" + APP_VERSION; } // 顶栏版本号：不用翻到最后一页就能对照有没有更新
  // 发布日志（js/releases-ui.js，四个姊妹应用共用）：我的 → 发布日志；新版本头几次打开时今天页顶上有提示
  initReleases({ version: APP_VERSION, releases: RELEASES, lang: locale, accent: "var(--slate)", appId: "homeschool", open: 'data-tab="me-releases"' });
  initSwipeRows({ kinds: ["break"], del: () => t("删除"), release: () => t("松手删除") });   // 行记录左滑删除（js/swipe-rows.js）
  // 筛选条（js/filterbar.js）：手机上收成「搜索 + 筛选 (n)」一行，滑动时固定在路径条下面（爱家小助手 shared/compact-filters.js 同一份）
  initCompactFilters({ root: document.getElementById("main"), ui: () => ({ "zh-TW": "tw", en: "en" }[locale()] || "zh") });
  watchStick({ path: ".crumb" });
  restoreRoute();    // 网址里记着的页（#/gr-size）：刷新后还停在这一页（js/views.js）
  render();          // 先画出"连接中"的壳
  initSupabase();    // 加载 supabase-js，登录状态回调里再渲染一次
  initProviders();   // 从 Dropbox 授权页跳回来时把 ?code= 换成令牌（js/backup.js）
  // 页面开着过了午夜：换到新一天的任务和敬拜
  // 每分钟：过了午夜换新一天；到了 8 点自动安排经文（refreshIfNewDay 内部判断，没事做就什么也不写）
  setInterval(async () => { if (S.cloud === "ready" && S.hs.loaded && !document.querySelector("#sheet").open) { const before = S.hs.day + "/" + S.hs.autoDay; await refreshIfNewDay(); if (before !== S.hs.day + "/" + S.hs.autoDay) render(); } }, 60e3);
}
