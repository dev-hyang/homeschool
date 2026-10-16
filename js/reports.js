import { S, childName, stageOf } from "./core/state.js";
import { D, dayKey, esc } from "./core/util.js";
import { SUBJECTS, subject } from "./data/subjects.js";
import { gentle, paceHTML } from "./course.js";
import { ensureMonth, isOffDay, monthData, monthRange, unitLessons, unitPace, yearInfo } from "./hs.js";
import { render } from "./views.js";

/* ============ 报告页：按月统计 + 节奏（计划 vs 实际） ============ */
S.reportMonth = S.reportMonth || dayKey(Date.now()).slice(0, 7);

function monthStats(ym, cid){
  const md = monthData(ym); if (!md) return null;
  const { from, to } = monthRange(ym), today = dayKey(Date.now());
  const tasks = md.tasks.filter(t => t.child_id == null || t.child_id === cid), done = tasks.filter(t => t.status === "done");
  const devos = md.devotions.filter(d => d.done && (d.children || []).includes(cid));
  const days = new Set([...done.map(t => t.date), ...devos.map(d => d.date)]);
  const bySubject = Object.fromEntries(Object.keys(SUBJECTS).map(k => [k, { n: 0, min: 0, skip: 0, missed: 0, planned: 0, plannedMin: 0 }]));
  for (const t of tasks) { const b = bySubject[t.subject] || (bySubject[t.subject] = { n: 0, min: 0, skip: 0, missed: 0, planned: 0, plannedMin: 0 }); if (t.status === "done") { b.n++; b.min += +t.minutes || 0; } else if (t.status === "skip") b.skip++; else if (t.date < today) b.missed++; }
  // 计划：周例行在本月（到今天为止、非休息日）应出现的次数与分钟
  const routines = S.hs.routines.filter(r => r.active && (r.child_id == null || r.child_id === cid));
  const [y, m] = ym.split("-").map(Number), last = new Date(y, m, 0).getDate();
  for (let d = 1; d <= last; d++) { const date = `${ym}-${String(d).padStart(2, "0")}`; if (date > today || isOffDay(date)) continue; const wd = new Date(y, m - 1, d).getDay();
    for (const r of routines) if ((r.weekdays || []).includes(wd)) { const b = bySubject[r.subject] || (bySubject[r.subject] = { n: 0, min: 0, skip: 0, missed: 0, planned: 0, plannedMin: 0 }); b.planned++; b.plannedMin += +r.minutes || 0; } }
  const learned = S.hs.progress.filter(p => p.child_id === cid && p.status === "learned" && p.learned_on && p.learned_on >= from && p.learned_on <= to).length;
  const lessons = S.hs.lessons.filter(l => l.status === "done" && l.done_on && l.done_on >= from && l.done_on <= to && (() => { const u = S.hs.units.find(x => x.id === l.unit_id); return u && (u.child_id == null || u.child_id === cid); })()).length;
  const goals = S.hs.goals.filter(g => g.child_id === cid && g.achieved_on && g.achieved_on >= from && g.achieved_on <= to).length;
  const reading = done.filter(t => t.subject === "language" && /读|book|read/i.test(t.title)).length;
  const minutes = done.reduce((a, t) => a + (+t.minutes || 0), 0);
  const activeDays = new Set(done.map(t => t.date)).size;
  return { days: days.size, devos: devos.length, tasks: done.length, totalTasks: tasks.length, skipped: tasks.filter(t => t.status === "skip").length, missed: tasks.filter(t => t.status === "todo" && t.date < today).length, minutes, perDay: activeDays ? Math.round(minutes / activeDays) : 0, bySubject, learned, lessons, goals, reading };
}

const RANGE = { toddler: [20, 40], prek: [45, 90], school: [120, 180] };
function viewReports(){
  const ym = S.reportMonth, cid = S.childId;
  const st = monthStats(ym, cid);
  if (!st) { ensureMonth(ym).then(render); return `<h2>报告 · ${esc(childName())}</h2>${nav(ym)}<div class="empty">正在读取 ${ym}…</div>`; }
  const subjRows = Object.entries(st.bySubject).filter(([, v]) => v.n || v.planned || v.skip || v.missed).map(([k, v]) => { const rate = v.n + v.skip + v.missed ? Math.round(v.n / (v.n + v.skip + v.missed) * 100) : null; const warn = rate != null && rate < 60 && !gentle();
    return `<tr><td><span class="dotc" style="background:${subject(k).color}"></span>${subject(k).label}</td><td class="num">${v.n}${v.planned ? `<small class="muted">/${v.planned}</small>` : ""}</td><td class="num ${warn ? "warn" : ""}">${rate == null ? "–" : rate + "%"}</td><td class="num">${v.skip}/${v.missed}</td><td class="num">${v.min}${v.plannedMin ? `<small class="muted">/${v.plannedMin}</small>` : ""}</td></tr>`; }).join("");
  const yi = yearInfo(), stage = stageOf().key, range = RANGE[stage === "baby" ? "toddler" : stage] || RANGE.prek;
  const units = S.hs.units.filter(u => u.active && (u.child_id == null || u.child_id === cid) && unitLessons(u.id).length);
  const paced = units.map(u => ({ u, p: unitPace(u) })).filter(x => x.p);
  return `<h2>报告 · ${esc(childName())}</h2>${nav(ym)}
  <div class="stats">
    ${stat("出勤天数", st.days, "天")}${stat("家庭敬拜", st.devos, "天")}${stat("完成任务", `${st.tasks}<small>/${st.totalTasks}</small>`, "")}
    ${stat("学习时长", st.minutes, "分钟")}${stat("背会经文", st.learned, "节")}${stat("完成课时", st.lessons, "课")}${stat("达成目标", st.goals, "项")}${stat("阅读任务", st.reading, "次")}
  </div>

  <h2>节奏</h2>
  <div class="panel">
    <p class="small">${yi ? (yi.before ? `学年 ${yi.start} 开始。` : yi.ended ? `学年已结束。` : `学年第 ${yi.week} / ${yi.weeks} 周，第 ${yi.term} 学期，预计 ${yi.endOn} 结束。`) : "还没设置学年（设置 → 学年）。"} 本月有学习的日子平均 <b>${st.perDay}</b> 分钟；${stage === "school" ? "学龄" : stage === "prek" ? "学前" : "幼儿"}阶段常见范围 ${range[0]} 到 ${range[1]} 分钟${st.perDay > range[1] * 1.3 ? "，偏重" : st.perDay && st.perDay < range[0] ? "，偏轻" : ""}。跳过 ${st.skipped} 次，过期未做 ${st.missed} 次。</p>
    <div class="scroll-x"><table><thead><tr><th>领域</th><th>完成/计划</th><th>完成率</th><th>跳过/漏做</th><th>分钟 实际/计划</th></tr></thead><tbody>${subjRows || `<tr><td colspan="5" class="muted">这个月还没有任务。</td></tr>`}</tbody></table></div>
    <p class="small muted" style="margin-top:6px">“计划”按周例行在本月到今天为止应出现的次数和分钟算，休息日和假期不计。完成率低于六成连续两周，多半是那一科排多了或时间不对。</p>
    ${paced.length ? `<h3 class="small muted" style="margin-top:12px">单元进度</h3>${paced.map(({ u, p }) => `<div class="small" style="margin-top:4px"><span class="dotc" style="background:${subject(u.subject).color}"></span><b>${esc(u.title)}</b> ${p.done}/${p.total} ${paceHTML(u)}</div>`).join("")}` : `<p class="small muted" style="margin-top:8px">给单元填上“预计几周”后，这里会显示每个单元按计划还是快慢。</p>`}
    ${gentle() ? `<p class="small muted" style="margin-top:8px">学前期：落后只作提示，不标红。看的是坚持（有敬拜和阅读的天数），不是进度。</p>` : ""}
  </div>

  <h2>每科</h2>
  <div class="panel"><div class="btns" style="margin-top:0"><button class="btn" data-act="report-csv">导出本月 CSV</button></div>
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
