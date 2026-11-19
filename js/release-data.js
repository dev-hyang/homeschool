/* 发布日志的数据（js/data/releases.js，70KB+）按需加载：只有「新版本」提示还会出现、或打开发布日志页时才下载。
   页面和提示本身画在 js/releases-ui.js（四个姊妹应用共用，不改）；这里只负责把数据交给它。加载好发出 "releases-ready"，界面据此重画。 */
import { importFresh } from "./core/lazy-reload.js";
import { APP_VERSION } from "./core/config.js";
import { locale } from "./core/i18n.js";
import { initReleases } from "./releases-ui.js";

let ready = false, loading = null;
const releasesReady = () => ready;
function loadReleases(){
  return (loading ||= importFresh(() => import("./data/releases.js")).then(({ RELEASES }) => {
    initReleases({ version: APP_VERSION, releases: RELEASES, lang: locale, accent: "var(--slate)", appId: "homeschool", open: 'data-tab="me-releases"' });
    ready = true; document.dispatchEvent(new Event("releases-ready"));
  }).catch(() => { loading = null; }));
}
/** 「新版本」提示这台设备还会不会出现（读 releases-ui.js 记的 seen / shows）：不会了就不必为它下载发布日志数据 */
function releaseBadgePossible(){
  try {
    if (localStorage.getItem("homeschool.rl.seen") === APP_VERSION) return false;
    const o = JSON.parse(localStorage.getItem("homeschool.rl.shows") || "{}");
    return !(o.v === APP_VERSION && +o.n >= 5);
  } catch { return true; }
}
export { loadReleases, releasesReady, releaseBadgePossible };
