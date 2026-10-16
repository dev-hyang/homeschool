/* ============ 界面语言：只翻译框架（页签、抬头、状态、设置里的几个词），记录内容按输入原样显示 ============
   选择存在本机 localStorage，不进家庭设置：每个人可以用自己习惯的界面。 */
import { LS_PREFIX } from "./config.js";

const LOCALES = [["zh-CN", "简体"], ["zh-TW", "繁體"], ["en", "English"]];
const KEY = LS_PREFIX + ".locale";
const IDX = { "zh-CN": 0, "zh-TW": 1, en: 2 };
let cur = "zh-CN";
try { const v = localStorage.getItem(KEY); if (v && IDX[v] != null) cur = v; } catch (e) {}

const STR = {
  brand: ["家庭学堂", "家庭學堂", "Family Homeschool"],
  schoolOf: ["{name}的学堂", "{name}的學堂", "{name}’s School"],
  baby: ["宝宝", "寶寶", "Baby"],
  tabToday: ["今天", "今天", "Today"], tabCourse: ["课程", "課程", "Courses"], tabResources: ["资源", "資源", "Resources"],
  tabCalendar: ["日历", "日曆", "Calendar"], tabReports: ["报告", "報告", "Reports"], tabLaw: ["法规", "法規", "Laws"],
  about: ["介绍", "介紹", "About"], aboutTitle: ["关于家庭学堂", "關於家庭學堂", "About Family Homeschool"],
  settings: ["设置", "設定", "Settings"], close: ["关闭", "關閉", "Close"],
  connecting: ["连接中", "連線中", "Connecting"], offline: ["云端不可用", "雲端不可用", "Cloud unavailable"],
  signedout: ["未登录", "未登入", "Signed out"], nofamily: ["还没加入家庭", "還沒加入家庭", "No family yet"],
  family: ["家庭 · {n} 人", "家庭 · {n} 人", "Family · {n}"],
  noKids: ["家庭里还没有孩子", "家庭裡還沒有孩子", "No children in the family yet"],
  afterLogin: ["登录后显示孩子", "登入後顯示孩子", "Sign in to see your children"],
  manageKids: ["家庭与孩子…", "家庭與孩子…", "Family & children…"],
  switchChild: ["切换孩子", "切換孩子", "Switch child"],
  language: ["界面语言", "介面語言", "Language"],
  languageNote: ["只切换页签、抬头、按钮这些框架文字；记录内容保持你输入时的样子，简体、繁体、英文都可以输入。", "只切換頁籤、抬頭、按鈕這些框架文字；記錄內容保持你輸入時的樣子，簡體、繁體、英文都可以輸入。", "Switches only the frame: tabs, header and buttons. Your entries stay exactly as typed, in any script."],
  display: ["显示", "顯示", "Display"], theme: ["外观", "外觀", "Appearance"],
  themeSystem: ["跟随系统", "跟隨系統", "System"], themeLight: ["浅色", "淺色", "Light"], themeDark: ["深色", "深色", "Dark"],
  version: ["版本", "版本", "Version"]
};
function t(k, vars){ const row = STR[k]; let s = row ? row[IDX[cur]] : k; if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, b); return s; }
function locale(){ return cur; }
function setLocale(l){ if (IDX[l] == null) return; cur = l; try { localStorage.setItem(KEY, l); } catch (e) {} applyLang(); }
function applyLang(){ document.documentElement.lang = cur; document.title = t("brand") + (cur === "en" ? " · Homeschool" : " · 在家教育"); }
applyLang();

export { LOCALES, t, locale, setLocale };
