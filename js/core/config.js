/* ============ 云端配置（与小月亮共用同一个 Supabase 项目） ============
   只能填 anon / publishable 公开 key（设计上就是给浏览器用的，安全靠数据库的行级权限 RLS）。
   绝对不要填 service_role / secret key。两个网站都在 dev-hyang.github.io 下，登录会话自动共享。 */
const SUPABASE_URL = "https://gbhvqlraimmignhoczww.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiaHZxbHJhaW1taWduaG9jend3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3ODY5MzAsImV4cCI6MjEwNzM2MjkzMH0.Y9ZzQKGChGqnLj-69Bnljgb8BVgXbOEuHbbKt6Z5bBE";
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";

const LS_PREFIX = "homeschool.v1";            // 本设备偏好的 localStorage 前缀，与小月亮的 xiaoyueliang.v1 分开
const APP_VERSION = "2026-10-16.15";
const BABY_LOG_URL = "https://dev-hyang.github.io/baby-log/";

export { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JS, LS_PREFIX, APP_VERSION, BABY_LOG_URL };
