import { LS_PREFIX } from "./config.js";
import { D, startOfDay } from "./util.js";

/* ============ 应用状态 ============
   在线优先：家庭、成员、孩子都来自 Supabase，不在本机保存副本。
   本机只记两样偏好：当前看哪个孩子、主题。 */
const S = {
  tab: "today",
  cloud: "loading",        // loading | offline | signedout | nofamily | ready
  user: null, family: null, members: {},
  children: [], childId: null,
  childrenSource: null     // "table"（children 表）或 "settings"（迁移 002 还没跑时的 JSON 回退）
};
const CHILD_KEY = LS_PREFIX + ".child";

function setChildren(list){
  S.children = list;
  let cid = S.childId; if (cid == null) { try { cid = localStorage.getItem(CHILD_KEY); } catch (e) {} }
  S.childId = list.some(c => c.id === cid) ? cid : (list[0] ? list[0].id : null);
}
const child = (id = S.childId) => S.children.find(c => c.id === id) || null;
const childName = (id = S.childId) => (child(id) && child(id).name) || "宝宝";
function setChild(id){ if (!S.children.some(c => c.id === id)) return; S.childId = id; try { localStorage.setItem(CHILD_KEY, id); } catch (e) {} }

/* ---- 年龄 ---- */
function birthTs(cid = S.childId){ const c = child(cid); return c && c.birth ? new Date(c.birth + "T00:00:00").getTime() : null; }
function ageDays(cid = S.childId, at = Date.now()){ const b = birthTs(cid); return b == null ? null : Math.floor((startOfDay(at) - b) / D); }
function ageMonths(cid = S.childId, at = Date.now()){
  const b = birthTs(cid); if (b == null) return null;
  const bd = new Date(b), n = new Date(at);
  let m = (n.getFullYear() - bd.getFullYear()) * 12 + n.getMonth() - bd.getMonth(); if (n.getDate() < bd.getDate()) m--;
  return Math.max(0, m);
}
function ageText(cid = S.childId){
  const m = ageMonths(cid); if (m == null) return "没有填生日";
  return m < 24 ? `${m} 个月` : `${Math.floor(m / 12)} 岁 ${m % 12} 个月`;
}
// 阶段：2 岁前只记录不排课；2–3 岁节奏；3–5 岁 Pre-K；5 岁起 K+
function stageOf(cid = S.childId){
  const m = ageMonths(cid); if (m == null) return { key: "prek", name: "学前" };
  if (m < 24) return { key: "baby", name: "婴幼儿" };
  if (m < 36) return { key: "toddler", name: "幼儿" };
  if (m < 60) return { key: "prek", name: "学前 Pre-K" };
  return { key: "school", name: "学龄" };
}

export { S, CHILD_KEY, setChildren, child, childName, setChild, birthTs, ageDays, ageMonths, ageText, stageOf };
