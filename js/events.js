import { loadChildren, sbAuth, sbFamily, sbLogout } from "./core/auth.js";
import { LS_PREFIX } from "./core/config.js";
import { S, setChild } from "./core/state.js";
import { $, toast } from "./core/util.js";
import { openSettings } from "./sheet.js";
import { render, toggleKids } from "./views.js";

/* ============ 事件分发 ============ */
document.addEventListener("click", async ev => {
  if (!$("#kids").hidden && !ev.target.closest("#bname")) toggleKids(false);
  const t = ev.target.closest("button"); if (!t) return;
  if (t.id === "bname") { if (S.children.length) toggleKids(); else openSettings(); return; }
  if (t.dataset.tab) { S.tab = t.dataset.tab; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.kidsel) { setChild(t.dataset.kidsel); render(); $("#bname").focus(); return; }
  if (t.dataset.copy) { try { await navigator.clipboard.writeText(t.dataset.copy); toast("已复制：" + t.dataset.copy); } catch (e) { toast("请手动复制：" + t.dataset.copy); } return; }
  if (t.dataset.themeSet !== undefined) {
    const v = t.dataset.themeSet; if (v) document.documentElement.dataset.theme = v; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem(LS_PREFIX + ".theme", v); } catch (e) {}
    openSettings(); return;
  }
  switch (t.dataset.act) {
    case "settings": openSettings(); break;
    case "close": $("#sheet").close(); break;
    case "sb-login": await sbAuth("login"); break;
    case "sb-signup": await sbAuth("signup"); break;
    case "sb-create": await sbFamily("create"); break;
    case "sb-join": await sbFamily("join"); break;
    case "sb-logout": await sbLogout(); break;
  }
});
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("#kids").hidden) { toggleKids(false); $("#bname").focus(); }
  else if ($("#sheet").open) $("#sheet").close();
});
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && S.cloud === "ready") { await loadChildren(); render(); }
});
