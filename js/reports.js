import { S, childName } from "./core/state.js";
import { dayKey, esc } from "./core/util.js";
import { SUBJECTS, subject } from "./data/subjects.js";
import { ensureMonth, monthData, monthRange } from "./hs.js";
import { render } from "./views.js";

/* ============ 报告页：按月统计出勤、每科时长、敬拜、经文、课时、目标 ============ */
S.reportMonth = S.reportMonth || dayKey(Date.now()).slice(0, 7);

function monthStats(ym, cid){
  const md = monthData(ym); if (!md) return null;
  const { from, to } = monthRange(ym);
  const tasks = md.tasks.filter(t => t.child_id == null || t.child_id === cid), done = tasks.filter(t => t.status === "done");
  const devos = md.devotions.filter(d => d.done && (d.children || []).includes(cid));
  const days = new Set([...done.map(t => t.date), ...devos.map(d => d.date)]);
  const bySubject = Object.fromEntries(Object.keys(SUBJECTS).map(k => [k, { n: 0, min: 0 }]));
  for (const t of done) { const b = bySubject[t.subject] || (bySubject[t.subject] = { n: 0, min: 0 }); b.n++; b.min += +t.minutes || 0; }
  const learned = S.hs.progress.filter(p => p.child_id === cid && p.status === "learned" && p.learned_on && p.learned_on >= from && p.learned_on <= to).length;
  const lessons = S.hs.lessons.filter(l => l.status === "done" && l.done_on && l.done_on >= from && l.done_on <= to && (() => { const u = S.hs.units.find(x => x.id === l.unit_id); return u && (u.child_id == null || u.child_id === cid); })()).length;
  const goals = S.hs.goals.filter(g => g.child_id === cid && g.achieved_on && g.achieved_on >= from && g.achieved_on <= to).length;
  const reading = done.filter(t => t.subject === "language" && /读|book|read/i.test(t.title)).length;
  return { days: days.size, devos: devos.length, tasks: done.length, totalTasks: tasks.length, minutes: done.reduce((a, t) => a + (+t.minutes || 0), 0), bySubject, learned, lessons, goals, reading };
}

function viewReports(){
  const ym = S.reportMonth, cid = S.childId;
  const st = monthStats(ym, cid);
  if (!st) { ensureMonth(ym).then(render); return `<h2>报告 · ${esc(childName())}</h2>${nav(ym)}<div class="empty">正在读取 ${ym}…</div>`; }
  const subjRows = Object.entries(st.bySubject).filter(([, v]) => v.n).map(([k, v]) => `<tr><td><span class="dotc" style="background:${subject(k).color}"></span>${subject(k).label}</td><td class="num">${v.n}</td><td class="num">${v.min}</td></tr>`).join("");
  return `<h2>报告 · ${esc(childName())}</h2>${nav(ym)}
  <div class="stats">
    ${stat("出勤天数", st.days, "天")}${stat("家庭敬拜", st.devos, "天")}${stat("完成任务", `${st.tasks}<small>/${st.totalTasks}</small>`, "")}
    ${stat("学习时长", st.minutes, "分钟")}${stat("背会经文", st.learned, "节")}${stat("完成课时", st.lessons, "课")}${stat("达成目标", st.goals, "项")}${stat("阅读任务", st.reading, "次")}
  </div>
  <h2>每科</h2>
  <div class="panel scroll-x">${subjRows ? `<table><thead><tr><th>领域</th><th>完成任务</th><th>分钟</th></tr></thead><tbody>${subjRows}</tbody></table>` : `<p class="muted">这个月还没有完成的任务。</p>`}
    <div class="btns" style="margin-top:8px"><button class="btn" data-act="report-csv">导出本月 CSV</button></div>
    <p class="small muted" style="margin-top:8px">出勤天数 = 有完成任务或参加了家庭敬拜的天数。伊利诺伊州不要求上报，但如果有人问起，这一页加上课程页的记录就是证据；北卡、田纳西等州的出勤要求见法规页。</p></div>`;
}
const nav = ym => { const [y, m] = ym.split("-").map(Number); const label = `${y} 年 ${m} 月`;
  return `<div class="daynav"><button class="iconbtn" data-act="report-prev" aria-label="上个月">‹</button><b>${label}</b><button class="iconbtn" data-act="report-next" aria-label="下个月" ${ym >= dayKey(Date.now()).slice(0, 7) ? "disabled" : ""}>›</button></div>`; };
const stat = (k, v, u) => `<div class="stat"><div class="k">${k}</div><div class="v num">${v}${u ? `<small>${u}</small>` : ""}</div></div>`;
function shiftMonth(ym, d){ const [y, m] = ym.split("-").map(Number); const dt = new Date(y, m - 1 + d, 1); return dayKey(dt.getTime()).slice(0, 7); }

function reportCSV(ym, cid){
  const md = monthData(ym); if (!md) return "";
  const rows = [["日期", "孩子", "领域", "任务", "状态", "分钟", "记录"]];
  for (const t of md.tasks.filter(t => t.child_id == null || t.child_id === cid).sort((a, b) => a.date.localeCompare(b.date))) rows.push([t.date, t.child_id ? childName(t.child_id) : "全家", subject(t.subject).label, t.title, t.status, t.minutes ?? "", t.note || ""]);
  for (const d of md.devotions.filter(d => d.done)) rows.push([d.date, "全家", "圣经与信仰", `家庭敬拜：${d.passage || ""}`, "done", "", d.prayer || ""]);
  return "﻿" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}
function download(filename, text){ const url = URL.createObjectURL(new Blob([text], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); }

export { viewReports, monthStats, shiftMonth, reportCSV, download };
