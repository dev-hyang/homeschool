/* ============ boot ============
   模块顺序：core/config → core/util → core/state → hs ↔ core/auth ↔ views ↔ sheet → events。
   跨模块调用都在函数体内，循环引用是安全的。 */
import { t } from "./core/i18n.js";
import { initSwipeRows } from "./swipe-rows.js";
import "./events.js";
import { initSupabase } from "./core/auth.js";
import { initProviders } from "./backup.js";
import { APP_VERSION } from "./core/config.js";
import { S } from "./core/state.js";
import { refreshIfNewDay } from "./hs.js";
import { render } from "./views.js";

/* 发布后的头几分钟，浏览器可能把新的 index.html 和缓存里的旧模块混在一起（内部 import 没有版本号）。
   index.html 里的 meta 版本与 config.js 不一致时，强制重新抓取所有模块并刷新一次。 */
const MODULES = ["app", "ai", "ask", "backup", "cloud-drives", "events", "views", "minibar", "swipe-rows", "sheet", "today", "course", "resources", "routines", "reports", "law", "about", "print", "me", "hs", "library", "charts",
  "bedtime", "bedtime-play", "flows", "flows-trend", "recfilter", "principle", "data/principle", "data/emotions", "data/bedtime", "data/flows", "core/config", "core/util", "core/state", "core/auth", "core/i18n", "data/feeds", "data/subjects", "data/plans", "data/seeds", "data/law", "data/versions", "data/about", "data/curriculum", "data/bible", "data/verse-sets", "data/ideas"].map(m => `js/${m}.js`);
async function healStaleModules(){
  const want = (document.querySelector('meta[name="app-version"]') || {}).content;
  if (!want || want === APP_VERSION) return false;
  const key = "homeschool.reloaded." + want;
  try { if (sessionStorage.getItem(key)) return false; sessionStorage.setItem(key, "1"); } catch (e) { return false; }
  await Promise.all(MODULES.map(u => fetch(u, { cache: "reload" }).catch(() => null)));
  location.reload(); return true;
}

if (!(await healStaleModules())) {
  { const v = document.getElementById("appver"); if (v) v.textContent = "v" + APP_VERSION; } // 顶栏版本号：不用翻到最后一页就能对照有没有更新
  initSwipeRows({ kinds: ["break"], del: () => t("删除"), release: () => t("松手删除") });   // 行记录左滑删除（js/swipe-rows.js）
  render();          // 先画出"连接中"的壳
  initSupabase();    // 加载 supabase-js，登录状态回调里再渲染一次
  initProviders();   // 从 Dropbox 授权页跳回来时把 ?code= 换成令牌（js/backup.js）
  // 页面开着过了午夜：换到新一天的任务和敬拜
  // 每分钟：过了午夜换新一天；到了 8 点自动安排经文（refreshIfNewDay 内部判断，没事做就什么也不写）
  setInterval(async () => { if (S.cloud === "ready" && S.hs.loaded && !document.querySelector("#sheet").open) { const before = S.hs.day + "/" + S.hs.autoDay; await refreshIfNewDay(); if (before !== S.hs.day + "/" + S.hs.autoDay) render(); } }, 60e3);
}
