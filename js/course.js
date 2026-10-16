import { S, childName } from "./core/state.js";
import { esc } from "./core/util.js";
import { COURSE_TEMPLATES, GOAL_TEMPLATES } from "./data/seeds.js";
import { SUBJECTS, subject } from "./data/subjects.js";
import { unitLessons, unitProgress } from "./hs.js";

/* ============ 课程页：科目 → 单元 → 课时，加学前目标 ============ */
S.courseSubject = S.courseSubject || "bible";

function viewCourse(){
  if (!S.hs.phase2) return `<div class="empty">课程、目标和资源库需要数据库迁移 004。<br>请在 Supabase 执行本地 <code>supabase/migrations/004_homeschool_phase2_4.sql</code>，然后刷新。</div>`;
  const cid = S.childId, sj = S.courseSubject;
  const mine = S.hs.units.filter(u => (u.child_id == null || u.child_id === cid) && u.active);
  const bySubject = Object.keys(SUBJECTS).map(k => ({ k, n: mine.filter(u => u.subject === k).length }));
  const units = mine.filter(u => u.subject === sj).sort((a, b) => a.sort - b.sort);
  const lessonRow = l => `<div class="lesson ${l.status}">
    <span class="st" aria-hidden="true">${l.status === "done" ? "✓" : l.status === "skip" ? "–" : "○"}</span>
    <button class="main" data-act="lesson-edit" data-lid="${esc(l.id)}"><span class="title">${esc(l.title)}</span>${l.faith_note || l.verse_ref ? `<span class="meta">${esc(l.faith_note)}${l.faith_note && l.verse_ref ? " · " : ""}${esc(l.verse_ref)}</span>` : ""}${l.status === "done" ? `<span class="meta">完成于 ${esc(l.done_on || "")}${l.minutes ? ` · ${l.minutes} 分钟` : ""}</span>` : ""}</button>
    <span class="acts">${l.status === "done"
      ? `<button class="chip" data-act="lesson-undo" data-lid="${esc(l.id)}">撤销</button>`
      : `<button class="chip" data-act="lesson-schedule" data-lid="${esc(l.id)}">排到今天</button><button class="chip" data-act="lesson-done" data-lid="${esc(l.id)}">完成</button>`}</span></div>`;
  const unitCard = u => { const p = unitProgress(u.id), pct = p.total ? Math.round(p.done / p.total * 100) : 0;
    return `<div class="panel unit">
      <div class="row"><div class="v"><b>${esc(u.title)}</b>${u.child_id == null ? ` <span class="small muted">· 全家</span>` : ""}${u.note ? `<div class="small muted">${esc(u.note)}</div>` : ""}</div><button class="chip" data-act="unit-edit" data-uid="${esc(u.id)}">编辑</button></div>
      <div class="progress" aria-label="进度 ${p.done}/${p.total}"><span style="width:${pct}%;background:${subject(u.subject).color}"></span></div>
      <div class="small muted" style="margin:4px 0 6px">${p.done}/${p.total} 课时</div>
      ${unitLessons(u.id).map(lessonRow).join("") || `<p class="muted small">还没有课时。</p>`}
      <div class="btns" style="margin-top:8px"><button class="btn" data-act="lesson-add" data-uid="${esc(u.id)}">＋ 课时</button></div></div>`; };
  const goals = S.hs.goals.filter(g => g.child_id === cid).sort((a, b) => a.sort - b.sort);
  return `<h2>课程 · ${esc(childName())}</h2>
  <div class="chips" role="group" aria-label="领域">${bySubject.map(({ k, n }) => `<button class="chip" data-subject="${k}" aria-pressed="${k === sj}">${SUBJECTS[k].label}${n ? ` ${n}` : ""}</button>`).join("")}</div>
  ${units.length ? units.map(unitCard).join("") : `<div class="empty">「${SUBJECTS[sj].label}」还没有单元。${mine.length ? "" : "套用起步课程最快，之后再按自家情况改。"}</div>`}
  <div class="btns"><button class="btn primary" data-act="unit-add">＋ 单元</button>${mine.length ? "" : Object.entries(COURSE_TEMPLATES).map(([k, t]) => `<button class="btn" data-act="course-template" data-tpl="${k}">套用：${esc(t.name)}</button>`).join("")}</div>
  <p class="small muted" style="margin-top:8px">每课时的“信仰连接”是一句话，提醒这一课和圣经的关联。“排到今天”会生成一条今日任务，勾完任务课时自动完成。</p>

  <h2>学习目标 · ${esc(childName())}</h2>
  <div class="panel">
    ${goals.length ? goals.map(g => `<div class="task ${g.achieved_on ? "done" : ""}"><span class="bar" style="background:${subject(g.area).color}"></span>
      <button class="main" data-act="goal-edit" data-gid="${esc(g.id)}"><span class="title">${esc(g.title)}</span><span class="meta">${subject(g.area).short}${g.achieved_on ? ` · 达成于 ${esc(g.achieved_on)}` : g.target_on ? ` · 目标 ${esc(g.target_on)}` : ""}${g.evidence ? ` · ${esc(g.evidence)}` : ""}</span></button>
      <span class="acts"><button class="iconbtn ${g.achieved_on ? "" : "ok"}" data-act="goal-toggle" data-gid="${esc(g.id)}" aria-label="${g.achieved_on ? "撤销达成" : "标记达成"}">${g.achieved_on ? "↺" : "✓"}</button></span></div>`).join("")
      : `<p class="muted">还没有目标。学前阶段用清单而不是考试。</p>`}
    <div class="btns" style="margin-top:8px"><button class="btn" data-act="goal-add">＋ 目标</button>${goals.length ? "" : Object.entries(GOAL_TEMPLATES).map(([k, t]) => `<button class="btn" data-act="goal-template" data-tpl="${k}">套用：${esc(t.name)}</button>`).join("")}</div>
  </div>`;
}

export { viewCourse };
