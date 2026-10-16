import { BABY_LOG_URL, SUPABASE_ANON_KEY, SUPABASE_JS, SUPABASE_URL } from "./config.js";
import { t } from "./i18n.js";
import { CHILD_KEY, S, setChildren } from "./state.js";
import { $, esc, toast } from "./util.js";
import { attachRealtime, loadAll } from "../hs.js";
import { refreshSettingsIfOpen, render } from "../views.js";

/* ============ 登录、家庭、孩子（与小月亮共用同一套表） ============
   小月亮负责创建家庭、邀请家人、维护孩子列表；这里读同一份数据。
   孩子来自 children 表（迁移 002）；表还没建时回退到 families.settings 里的 JSON，功能不受影响。 */
const SB = { configured: false, client: null, uid: undefined, channel: null };

function initSupabase(){
  const hp = new URLSearchParams(location.hash.slice(1));
  if (hp.get("error_code")) {
    const code = hp.get("error_code");
    setTimeout(() => toast(code === "otp_expired" ? t("确认链接已失效：请直接用邮箱和密码登录试试，不行再重新注册") : t("登录链接有问题：") + (hp.get("error_description") || code)), 300);
    history.replaceState(null, "", location.pathname + location.search);
  }
  SB.configured = /^https:\/\/.+/.test(SUPABASE_URL) && !SUPABASE_URL.includes("YOUR-") && !SUPABASE_ANON_KEY.includes("YOUR-");
  if (!SB.configured) { S.cloud = "offline"; render(); return false; }
  const tag = document.createElement("script");
  tag.src = SUPABASE_JS;
  tag.onload = () => {
    SB.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    SB.client.auth.onAuthStateChange((_evt, session) => {
      const uid = session?.user?.id || null;
      S.user = session?.user || null;
      if (uid === SB.uid) return;
      SB.uid = uid;
      setTimeout(afterAuth, 0); // don't call Supabase inside its own auth callback
    });
  };
  tag.onerror = () => { S.cloud = "offline"; toast(t("云端组件加载失败，请检查网络后刷新")); render(); };
  document.head.appendChild(tag);
  return true;
}
async function afterAuth(){
  teardownRealtime(); S.family = null; S.members = {}; setChildren([]);
  if (!S.user) { S.cloud = "signedout"; render(); refreshSettingsIfOpen(); return; }
  const { data, error } = await SB.client.from("family_members").select("family_id, families(*)").eq("user_id", S.user.id).limit(1);
  if (error) { S.cloud = "offline"; toast(t("连接云端失败，请稍后刷新")); render(); refreshSettingsIfOpen(); return; }
  if (!data.length || !data[0].families) { S.cloud = "nofamily"; render(); refreshSettingsIfOpen(); return; }
  await enterFamily(data[0].families);
}
async function enterFamily(fam){
  S.family = fam;
  await Promise.all([loadMembers(), loadChildren()]);
  S.cloud = "ready";
  render();                 // show the shell with the family first
  await loadAll();          // homeschool rows (hs_* tables)
  setupRealtime();
  render(); refreshSettingsIfOpen();
}
async function loadMembers(){
  const { data } = await SB.client.from("family_members").select("user_id, display_name").eq("family_id", S.family.id);
  S.members = Object.fromEntries((data || []).map(m => [m.user_id, m.display_name || t("家人")]));
}
async function loadChildren(){
  const norm = list => (list || []).filter(c => c && c.id).map(c => ({ id: c.id, name: c.name || "", birth: c.birth || "" }));
  const { data, error } = await SB.client.from("children").select("id, name, birth, sort").eq("family_id", S.family.id).order("sort");
  if (!error && data && data.length) { S.childrenSource = "table"; setChildren(norm(data)); return; }
  S.childrenSource = "settings";
  setChildren(norm(S.family.settings && S.family.settings.children));
}
// 小月亮改了孩子列表（families.settings）后，这里跟着刷新；children 表由数据库触发器同步
function setupRealtime(){
  teardownRealtime();
  SB.channel = SB.client.channel("homeschool-" + S.family.id)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "families", filter: "id=eq." + S.family.id }, async payload => {
      if (payload.new) { S.family = { ...S.family, ...payload.new }; await loadChildren(); if (!$("#sheet").open) render(); else refreshSettingsIfOpen(); }
    });
  if (S.hs.loaded) attachRealtime(SB.channel, () => { if (!$("#sheet").open) render(); });
  SB.channel.subscribe();
}
function teardownRealtime(){ if (SB.channel && SB.client) { SB.client.removeChannel(SB.channel); SB.channel = null; } }

async function sbAuth(kind){
  const email = $("#sb_email")?.value.trim(), password = $("#sb_pw")?.value || "";
  if (!email || password.length < 6) { toast(t("请填写邮箱和至少 6 位的密码")); return; }
  if (kind === "signup") {
    const { data, error } = await SB.client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) { toast(t("注册失败：") + (/registered/i.test(error.message) ? t("这个邮箱已注册，直接登录") : error.message)); return; }
    toast(data.session ? t("注册成功") : t("已注册。请先到邮箱点确认链接，再回来登录"));
  } else {
    const { error } = await SB.client.auth.signInWithPassword({ email, password });
    toast(error ? t("登录失败：邮箱或密码不对") : t("已登录"));
  }
}
async function sbFamily(kind){
  const display = $("#sb_display")?.value.trim() || t("家人");
  const { data, error } = kind === "create"
    ? await SB.client.rpc("create_family", { p_name: t("我们家"), p_display: display })
    : await SB.client.rpc("join_family", { p_code: $("#sb_code")?.value || "", p_display: display });
  if (error || !data) { toast(kind === "join" ? t("邀请码不对，请核对后再试") : t("创建失败，请稍后再试")); return; }
  toast(kind === "create" ? t("家庭已创建") : t("已加入家庭"));
  await enterFamily(Array.isArray(data) ? data[0] : data);
}
async function sbLogout(){
  await SB.client.auth.signOut();
  try { localStorage.removeItem(CHILD_KEY); } catch (e) {}
  toast(t("已退出"));
}
function familyHTML(){
  if (!SB.configured) return `<p class="small muted">${t("还没有配置云端：在 js/core/config.js 里填好 Supabase 地址和 key。")}</p>`;
  if (!SB.client) return `<p class="small muted">${t("云端组件还在加载或加载失败。请检查网络后刷新页面。")}</p>`;
  if (!S.user) return `
    <p class="small muted">${t("和小月亮是同一个账号。在同一台设备上登录过小月亮的话，刷新一下通常就已经登录了。")}</p>
    <div class="field"><label for="sb_email">${t("邮箱")}</label><input id="sb_email" type="text" inputmode="email" autocomplete="email"></div>
    <div class="field"><label for="sb_pw">${t("密码（至少 6 位）")}</label><input id="sb_pw" type="password" autocomplete="current-password"></div>
    <div class="btns"><button class="btn primary" data-act="sb-login">${t("登录")}</button><button class="btn" data-act="sb-signup">${t("注册新账号")}</button></div>`;
  if (!S.family) return `
    <p class="small muted">${t("已登录 {email}。建议先在", { email: esc(S.user.email) })}<a href="${BABY_LOG_URL}" target="_blank" rel="noopener">${t("小月亮")}</a>${t("里创建家庭并填好孩子；也可以在这里创建或用邀请码加入。")}</p>
    <div class="field"><label for="sb_display">${t("你在家里的称呼")}</label><input id="sb_display" type="text" placeholder="${t("妈妈 / 爸爸 / 外婆")}"></div>
    <div class="btns"><button class="btn primary" data-act="sb-create">${t("创建家庭")}</button></div>
    <div class="field"><label for="sb_code">${t("或者输入邀请码")}</label><input id="sb_code" type="text" autocapitalize="characters" autocomplete="off"></div>
    <div class="btns"><button class="btn" data-act="sb-join">${t("加入家庭")}</button><button class="btn" data-act="sb-logout">${t("退出登录")}</button></div>`;
  return `
    <p>${t("家庭成员：")}${Object.values(S.members).map(esc).join("、") || t("只有你")}</p>
    <p>${t("邀请码")} <b class="num" style="font-size:20px;letter-spacing:.12em">${esc(S.family.invite_code)}</b> <button class="chip" data-copy="${esc(S.family.invite_code)}">${t("复制")}</button></p>
    <p class="small muted">${t("家人用同一个邀请码加入后，小月亮和家庭学堂都能一起用。")}</p>
    <div class="btns"><button class="btn" data-act="sb-logout">${t("退出登录")}</button></div>`;
}

export { SB, initSupabase, afterAuth, enterFamily, loadChildren, sbAuth, sbFamily, sbLogout, familyHTML };
