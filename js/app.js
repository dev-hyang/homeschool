/* ============ boot ============
   模块顺序：core/config → core/util → core/state → core/auth ↔ views ↔ sheet → events。
   跨模块调用都在函数体内，auth ↔ views 的循环引用是安全的。 */
import "./events.js";
import { initSupabase } from "./core/auth.js";
import { render } from "./views.js";

render();          // 先画出"连接中"的壳
initSupabase();    // 加载 supabase-js，登录状态回调里再渲染一次
