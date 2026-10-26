/* ============ 界面语言：简体 / 繁體 / English ============
   约定：源码里的界面文字一律写简体中文，并用 t("…") 包起来；简体就是字典的键。
   - English：查 data/i18n-en.js，查不到就原样显示简体（不会报错）。
   - 繁體：先按 TW_PHRASES 换词（设置→設定、计划→計畫），再按 data/s2t.js 逐字转换，所以不需要维护第二份字典。
   - 用户自己录入的内容（任务、课时、经文卡……）不经过 t()，按输入原样显示；tc() 只给应用自带的内容（法规、介绍、课程库）做繁体转换。
   选择存在本机 localStorage，不进家庭设置：每个人可以用自己习惯的界面。 */
import { LS_PREFIX } from "./config.js";
import { s2tChars } from "../data/s2t.js";
import { EN } from "../data/i18n-en.js";

const LOCALES = [["zh-CN", "简体"], ["zh-TW", "繁體"], ["en", "English"]];
const KEY = LS_PREFIX + ".locale";
let cur = "zh-CN";
try { const v = localStorage.getItem(KEY); if (v && LOCALES.some(l => l[0] === v)) cur = v; } catch (e) {}

// 大陆 / 台湾用词差异（简体 → 繁体词），按长词优先匹配
const TW_PHRASES = [
  ["数据库", "資料庫"], ["服务器", "伺服器"], ["读经计划", "讀經計畫"], ["计划", "計畫"], ["设置", "設定"], ["复习", "複習"], ["干净", "乾淨"],
  ["视频", "影片"], ["打印件", "列印資料"], ["打印", "列印"], ["默认", "預設"], ["网络", "網路"], ["软件", "軟體"], ["登录", "登入"], ["账号", "帳號"],
  ["信息", "資訊"], ["界面", "介面"], ["支持", "支援"], ["链接", "連結"], ["邮箱", "電子郵件"], ["密码", "密碼"], ["刷新", "重新整理"], ["退出", "登出"],
  ["保存", "儲存"], ["鼠标", "滑鼠"], ["程序", "程式"], ["质量", "品質"], ["幼儿园", "幼兒園"], ["博客", "部落格"], ["公众号", "公眾號"], ["屏幕", "螢幕"],
  ["注册", "註冊"], ["搜索", "搜尋"], ["粘贴", "貼上"], ["复制", "複製"], ["导出", "匯出"], ["导入", "匯入"], ["出处", "出處"], ["云端", "雲端"],
  // 多音多义字按词定：历→曆/歷、钟→鐘/鍾、干→乾/幹、术→術
  ["日历", "日曆"], ["年历", "年曆"], ["分钟", "分鐘"], ["艺术", "藝術"], ["技术", "技術"], ["教材目录", "教材目錄"], ["出勤", "出勤"]
].sort((a, b) => b[0].length - a[0].length);
const twCache = new Map();
function s2t(s){
  s = String(s); if (twCache.has(s)) return twCache.get(s);
  let o = s; for (const [a, b] of TW_PHRASES) if (o.includes(a)) o = o.split(a).join(b);
  o = o.replace(/周(?=[一二三四五六日数末例]|[\s）)，。、]|$)/g, "週"); // 台湾“週”：周一、周例行、36 周
  o = s2tChars(o); twCache.set(s, o); return o;
}

/* t：界面文字。key 是简体原文；vars 替换 {name} 这类占位 */
function t(key, vars){
  let s = String(key);
  if (cur === "en") { const v = EN[s]; if (v != null) s = v; }
  else if (cur === "zh-TW") s = s2t(s);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
/* ---- 应用自带内容的翻译 ----
   data/content-en.js 把「中文原文 → 英文」登记到 CONTENT（周例行模板、读经计划、大原则、睡前安然、冲突 / 情绪管理……）。
   tc：应用自带内容的显示（繁体转换；英文查 CONTENT、再查界面字典；圣经出处在英文界面换成英文书卷名）。
   tb：存进数据库的「模板内容」（周例行标题、流程和步骤名、带领词……）显示时翻译；用户自己输入或改过的不在表里，原样显示。
   没有英文的内容照原样显示中文，不会报错。 */
const CONTENT = new Map();
let refFmt = null;
const addContent = (zh, en) => { if (typeof zh === "string" && zh && typeof en === "string" && en && !CONTENT.has(zh)) CONTENT.set(zh, en); };
const setRefFormatter = f => { refFmt = f; };
const RULES = [];   // 固定格式的句子：[正则, 函数]，查表没命中时按规则生成英文
const addRules = list => { RULES.push(...list); };
const byRule = s => { for (const [re, fn] of RULES) { const m = re.exec(s); if (m) return fn(m); } return null; };
const enOf = s => { const hit = CONTENT.get(s); if (hit != null) return hit; const ui = EN[s]; if (ui != null) return ui; const r = byRule(s); if (r != null) return r; return refFmt ? refFmt(s) : null; };
const tc = text => { const s = String(text ?? ""); if (cur === "en") { const e = enOf(s); return e != null ? e : s; } return cur === "zh-TW" ? s2t(s) : s; };
const tb = text => { const s = String(text ?? ""); if (cur === "en") { const e = enOf(s); return e != null ? e : s; } if (cur === "zh-TW") return CONTENT.has(s) || EN[s] != null ? s2t(s) : s; return s; };
function locale(){ return cur; }
function setLocale(l){ if (!LOCALES.some(x => x[0] === l)) return; cur = l; try { localStorage.setItem(KEY, l); } catch (e) {} applyLang(); }
function applyLang(){ document.documentElement.lang = cur; document.title = t("家庭学堂") + " · " + t("在家教育"); }
applyLang();

export { LOCALES, t, tc, tb, addContent, addRules, setRefFormatter, locale, setLocale, s2t };
