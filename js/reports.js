import { t } from "./core/i18n.js";
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
  const tasks = md.tasks.filter(x => x.child_id == null || x.child_id === cid), done = tasks.filter(x => x.status === "done");
  const devos = md.devotions.filter(d => d.done && (d.children || []).includes(cid));
  const days = new Set([...done.map(x => x.date), ...devos.map(d => d.date)]);
  const bySubject = Object.fromEntries(Object.keys(SUBJECTS).map(k => [k, { n: 0, min: 0, skip: 0, missed: 0, planned: 0, plannedMin: 0 }]));
  for (const x of tasks) { const b = bySubject[x.subject] || (bySubject[x.subject] = { n: 0, min: 0, skip: 0, missed: 0, planned: 0, plannedMin: 0 }); if (x.status === "done") { b.n++; b.min += +x.minutes || 0; } else if (x.status === "skip") b.skip++; else if (x.date < today) b.missed++; }
  // 计划：周例行在本月（到今天为止、非休息日）应出现的次数与分钟
  const routines = S.hs.routines.filter(r => r.active && (r.child_id == null || r.child_id === cid));
  const [y, m] = ym.split("-").map(Number), last = new Date(y, m, 0).getDate();
  for (let d = 1; d <= last; d++) { const date = `${ym}-${String(d).padStart(2, "0")}`; if (date > today || isOffDay(date)) continue; const wd = new Date(y, m - 1, d).getDay();
    for (const r of routines) if ((r.weekdays || []).includes(wd)) { const b = bySubject[r.subject] || (bySubject[r.subject] = { n: 0, min: 0, skip: 0, missed: 0, planned: 0, plannedMin: 0 }); b.planned++; b.plannedMin += +r.minutes || 0; } }
  const learned = S.hs.progress.filter(p => p.child_id === cid && p.status === "learned" && p.learned_on && p.learned_on >= from && p.learned_on <= to).length;
  const lessons = S.hs.lessons.filter(l => l.status === "done" && l.done_on && l.done_on >= from && l.done_on <= to && (() => { const u = S.hs.units.find(x => x.id === l.unit_id); return u && (u.child_id == null || u.child_id === cid); })()).length;
  const goals = S.hs.goals.filter(g => g.child_id === cid && g.achieved_on && g.achieved_on >= from && g.achieved_on <= to).length;
  const reading = done.filter(x => x.subject === "language" && /读|book|read/i.test(x.title)).length;
  const minutes = done.reduce((a, x) => a + (+x.minutes || 0), 0);
  const activeDays = new Set(done.map(x => x.date)).size;
  return { days: days.size, devos: devos.length, tasks: done.length, totalTasks: tasks.length, skipped: tasks.filter(x => x.status === "skip").length, missed: tasks.filter(x => x.status === "todo" && x.date < today).length, minutes, perDay: activeDays ? Math.round(minutes / activeDays) : 0, bySubject, learned, lessons, goals, reading, nights: (md.bedtime || []).filter(l => (l.children || []).includes(cid)).length };
}

const RANGE = { toddler: [20, 40], prek: [45, 90], school: [120, 180] };
function viewReports(){
  const ym = S.reportMonth, cid = S.childId;
  const st = monthStats(ym, cid);
  if (!st) { ensureMonth(ym).then(render); return `<h2>${t("报告")} · ${esc(childName())}</h2>${nav(ym)}<div class="empty">${t("正在读取 {ym}…", { ym })}</div>`; }
  const subjRows = Object.entries(st.bySubject).filter(([, v]) => v.n || v.planned || v.skip || v.missed).map(([k, v]) => { const rate = v.n + v.skip + v.missed ? Math.round(v.n / (v.n + v.skip + v.missed) * 100) : null; const warn = rate != null && rate < 60 && !gentle();
    return `<tr><td><span class="dotc" style="background:${subject(k).color}"></span>${esc(subject(k).label)}</td><td class="num">${v.n}${v.planned ? `<small class="muted">/${v.planned}</small>` : ""}</td><td class="num ${warn ? "warn" : ""}">${rate == null ? "–" : rate + "%"}</td><td class="num">${v.skip}/${v.missed}</td><td class="num">${v.min}${v.plannedMin ? `<small class="muted">/${v.plannedMin}</small>` : ""}</td></tr>`; }).join("");
  const yi = yearInfo(), stage = stageOf().key, range = RANGE[stage === "baby" ? "toddler" : stage] || RANGE.prek;
  const units = S.hs.units.filter(u => u.active && (u.child_id == null || u.child_id === cid) && unitLessons(u.id).length);
  const paced = units.map(u => ({ u, p: unitPace(u) })).filter(x => x.p);
  const yearLine = yi ? (yi.before ? t("学年 {d} 开始。", { d: yi.start }) : yi.ended ? t("学年已结束。") : t("学年第 {w} / {n} 周，第 {term} 学期，预计 {end} 结束。", { w: yi.week, n: yi.weeks, term: yi.term, end: yi.endOn })) : t("还没设置学年（设置 → 学年）。");
  const stageName = stage === "school" ? t("学龄") : stage === "prek" ? t("学前") : t("幼儿");
  const load = st.perDay > range[1] * 1.3 ? t("，偏重") : st.perDay && st.perDay < range[0] ? t("，偏轻") : "";
  return `<h2>${t("报告")} · ${esc(childName())}</h2>${nav(ym)}
  <div class="stats">
    ${stat(t("出勤天数"), st.days, t("天"))}${stat(t("家庭敬拜"), st.devos, t("天"))}${stat(t("完成任务"), `${st.tasks}<small>/${st.totalTasks}</small>`, "")}
    ${stat(t("学习时长"), st.minutes, t("分钟"))}${stat(t("背会经文"), st.learned, t("节"))}${stat(t("完成课时"), st.lessons, t("课"))}${stat(t("达成目标"), st.goals, t("项"))}${stat(t("阅读任务"), st.reading, t("次"))}${stat(t("睡前安然"), st.nights, t("晚"))}
  </div>

  <h2>${t("节奏")}</h2>
  <div class="panel">
    <p class="small">${yearLine} ${t("本月有学习的日子平均 <b>{n}</b> 分钟；{stage}阶段常见范围 {a} 到 {b} 分钟{load}。跳过 {s} 次，过期未做 {m} 次。", { n: st.perDay, stage: stageName, a: range[0], b: range[1], load, s: st.skipped, m: st.missed })}</p>
    <div class="scroll-x"><table><thead><tr><th>${t("领域")}</th><th>${t("完成/计划")}</th><th>${t("完成率")}</th><th>${t("跳过/漏做")}</th><th>${t("分钟 实际/计划")}</th></tr></thead><tbody>${subjRows || `<tr><td colspan="5" class="muted">${t("这个月还没有任务。")}</td></tr>`}</tbody></table></div>
    <p class="small muted" style="margin-top:6px">${t("“计划”按周例行在本月到今天为止应出现的次数和分钟算，休息日和假期不计。完成率低于六成连续两周，多半是那一科排多了或时间不对。")}</p>
    ${paced.length ? `<h3 class="small muted" style="margin-top:12px">${t("单元进度")}</h3>${paced.map(({ u, p }) => `<div class="small" style="margin-top:4px"><span class="dotc" style="background:${subject(u.subject).color}"></span><b>${esc(u.title)}</b> ${p.done}/${p.total} ${paceHTML(u)}</div>`).join("")}` : `<p class="small muted" style="margin-top:8px">${t("给单元填上“预计几周”后，这里会显示每个单元按计划还是快慢。")}</p>`}
    ${gentle() ? `<p class="small muted" style="margin-top:8px">${t("学前期：落后只作提示，不标红。看的是坚持（有敬拜和阅读的天数），不是进度。")}</p>` : ""}
  </div>

  <h2>${t("每科")}</h2>
  <div class="panel"><div class="btns" style="margin-top:0"><button class="btn" data-act="report-csv">${t("导出本月 CSV")}</button></div>
    <p class="small muted" style="margin-top:8px">${t("出勤天数 = 有完成任务或参加了家庭敬拜的天数。伊利诺伊州不要求上报，但如果有人问起，这一页加上课程页的记录就是证据；北卡、田纳西等州的出勤要求见法规页。")}</p></div>`;
}
const nav = ym => { const [y, m] = ym.split("-").map(Number);
  return `<div class="daynav"><button class="iconbtn" data-act="report-prev" aria-label="${t("上个月")}">‹</button><b>${t("{y} 年 {m} 月", { y, m })}</b><button class="iconbtn" data-act="report-next" aria-label="${t("下个月")}" ${ym >= dayKey(Date.now()).slice(0, 7) ? "disabled" : ""}>›</button></div>`; };
const stat = (k, v, u) => `<div class="stat"><div class="k">${k}</div><div class="v num">${v}${u ? `<small>${u}</small>` : ""}</div></div>`;
function shiftMonth(ym, d){ const [y, m] = ym.split("-").map(Number); const dt = new Date(y, m - 1 + d, 1); return dayKey(dt.getTime()).slice(0, 7); }

function reportCSV(ym, cid){
  const md = monthData(ym); if (!md) return "";
  const rows = [[t("日期"), t("孩子"), t("领域"), t("任务"), t("状态"), t("分钟"), t("记录")]];
  for (const x of md.tasks.filter(x => x.child_id == null || x.child_id === cid).sort((a, b) => a.date.localeCompare(b.date))) rows.push([x.date, x.child_id ? childName(x.child_id) : t("全家"), subject(x.subject).label, x.title, x.status, x.minutes ?? "", x.note || ""]);
  for (const d of md.devotions.filter(d => d.done)) rows.push([d.date, t("全家"), subject("bible").label, `${t("家庭敬拜")}：${d.passage || ""}`, "done", "", d.prayer || ""]);
  return "﻿" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}
function download(filename, text){ const url = URL.createObjectURL(new Blob([text], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); }

export { viewReports, monthStats, shiftMonth, reportCSV, download };
