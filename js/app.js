/* ============ boot ============
   模块顺序：core/config → core/util → core/state → core/auth ↔ views ↔ sheet → events。
   跨模块调用都在函数体内，auth ↔ views 的循环引用是安全的。 */
import "./events.js";
import { initSupabase } from "./core/auth.js";
import { S } from "./core/state.js";
import { refreshIfNewDay } from "./hs.js";
import { render } from "./views.js";

render();          // 先画出"连接中"的壳
initSupabase();    // 加载 supabase-js，登录状态回调里再渲染一次
// 页面开着过了午夜：换到新一天的任务和敬拜
setInterval(async () => { if (S.cloud === "ready" && S.hs.loaded && S.hs.day !== new Date().toISOString().slice(0, 10)) { await refreshIfNewDay(); render(); } }, 60e3);
