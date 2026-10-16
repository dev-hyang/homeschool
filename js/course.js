import { S, childName, stageOf } from "./core/state.js";
import { esc } from "./core/util.js";
import { COURSE_TEMPLATES, GOAL_TEMPLATES, SCOPE_PREK } from "./data/seeds.js";
import { SUBJECTS, subject } from "./data/subjects.js";
import { unitLessons, unitPace, unitProgress, yearInfo } from "./hs.js";

/* ============ 课程页：科目 → 单元 → 课时，节奏，年度范围，学前目标 ============ */
S.courseSubject = S.courseSubject || "bible";
const gentle = () => ["baby", "toddler", "prek"].includes(stageOf().key); // 学前期落后只提示，不标红

function paceHTML(u){
  const p = unitPace(u); if (!p) return S.hs.pacing && !u.weeks ? `<span class="small muted">未设预计周数</span>` : "";
  let txt, cls = "muted";
  if (p.done >= p.total) txt = "已完成";
  else if (p.diff > 0) { txt = `快 ${p.diff} 课`; cls = "ok"; }
  else if (p.diff < 0) { txt = `慢 ${-p.diff} 课`; cls = gentle() ? "muted" : "warn"; }
  else txt = "按计划";
  const proj = p.done < p.total ? (p.projectOn ? ` · 照最近速度约 ${p.projectOn} 完成` : p.done ? "" : " · 还没开始") : "";
  return `<span class="small pace ${cls}">${txt}${p.overdue ? " · 已过预计结束日" : ""} · 预计 ${u.weeks} 周到 ${p.endOn}${proj}</span>`;
}

function viewCourse(){
  if (!S.hs.phase2) return `<div class="empty">课程、目标和资源库需要数据库迁移 004。<br>请在 Supabase 执行本地 <code>supabase/migrations/004_homeschool_phase2_4.sql</code>，然后刷新。</div>`;
  const cid = S.childId, sj = S.courseSubject, yi = yearInfo();
  const mine = S.hs.units.filter(u => (u.child_id == null || u.child_id === cid) && u.active);
  const bySubject = Object.keys(SUBJECTS).map(k => ({ k, n: mine.filter(u => u.subject === k).length }));
  const units = mine.filter(u => u.subject === sj).sort((a, b) => (a.term || 9) - (b.term || 9) || a.sort - b.sort);
  const lessonRow = l => `<div class="lesson ${l.status}">
    <span class="st" aria-hidden="true">${l.status === "done" ? "✓" : l.status === "skip" ? "–" : "○"}</span>
    <button class="main" data-act="lesson-edit" data-lid="${esc(l.id)}"><span class="title">${esc(l.title)}</span>${l.faith_note || l.verse_ref ? `<span class="meta">${esc(l.faith_note)}${l.faith_note && l.verse_ref ? " · " : ""}${esc(l.verse_ref)}</span>` : ""}${l.status === "done" ? `<span class="meta">完成于 ${esc(l.done_on || "")}${l.minutes ? ` · ${l.minutes} 分钟` : ""}</span>` : ""}</button>
    <span class="acts">${l.status === "done"
      ? `<button class="chip" data-act="lesson-undo" data-lid="${esc(l.id)}">撤销</button>`
      : `<button class="chip" data-act="lesson-schedule" data-lid="${esc(l.id)}">排到今天</button><button class="chip" data-act="lesson-done" data-lid="${esc(l.id)}">完成</button>`}</span></div>`;
  const unitCard = u => { const p = unitProgress(u.id), pct = p.total ? Math.round(p.done / p.total * 100) : 0;
    return `<div class="panel unit">
      <div class="row"><div class="v"><b>${esc(u.title)}</b>${u.term ? ` <span class="small muted">· 第 ${u.term} 学期</span>` : ""}${u.child_id == null ? ` <span class="small muted">· 全家</span>` : ""}${u.note ? `<div class="small muted">${esc(u.note)}</div>` : ""}</div><button class="chip" data-act="unit-edit" data-uid="${esc(u.id)}">编辑</button></div>
      <div class="progress" aria-label="进度 ${p.done}/${p.total}"><span style="width:${pct}%;background:${subject(u.subject).color}"></span></div>
      <div class="small muted" style="margin:4px 0 6px">${p.done}/${p.total} 课时 ${paceHTML(u)}</div>
      ${unitLessons(u.id).map(lessonRow).join("") || `<p class="muted small">还没有课时。</p>`}
      <div class="btns" style="margin-top:8px"><button class="btn" data-act="lesson-add" data-uid="${esc(u.id)}">＋ 课时</button></div></div>`; };
  const goals = S.hs.goals.filter(g => g.child_id === cid).sort((a, b) => a.sort - b.sort);
  const scope = SCOPE_PREK[sj] || [];
  const haveTitles = new Set(mine.map(u => u.title));
  return `<h2>课程 · ${esc(childName())}</h2>
  <p class="small muted">${yi ? (yi.before ? `学年 ${yi.start} 开始，还有 ${1 - yi.week} 周` : yi.ended ? `学年已结束（共 ${yi.weeks} 周）` : `第 ${yi.week} / ${yi.weeks} 周 · 第 ${yi.term} 学期`) : `还没设置学年。到设置里填开学日期和周数，单元就能显示“按计划 / 快 / 慢”。`}${S.hs.pacing ? "" : " 节奏字段需要迁移 006。"}</p>
  <div class="chips" role="group" aria-label="领域">${bySubject.map(({ k, n }) => `<button class="chip" data-subject="${k}" aria-pressed="${k === sj}">${SUBJECTS[k].label}${n ? ` ${n}` : ""}</button>`).join("")}</div>
  ${units.length ? units.map(unitCard).join("") : `<div class="empty">「${SUBJECTS[sj].label}」还没有单元。${mine.length ? "" : "套用起步课程最快，之后再按自家情况改。"}</div>`}
  <div class="btns"><button class="btn primary" data-act="unit-add">＋ 单元</button>${mine.length ? "" : Object.entries(COURSE_TEMPLATES).map(([k, t]) => `<button class="btn" data-act="course-template" data-tpl="${k}">套用：${esc(t.name)}</button>`).join("")}</div>
  <p class="small muted" style="margin-top:8px">每课时的“信仰连接”是一句话，提醒这一课和圣经的关联。“排到今天”会生成一条今日任务，勾完任务课时自动完成。给单元填“预计几周”后会按周例行推算应完成多少。</p>

  ${scope.length ? `<h2>年度范围 · ${SUBJECTS[sj].label}（Pre-K 建议）</h2>
  <div class="panel scroll-x"><table><thead><tr><th>学期</th><th>单元主题</th><th>周</th><th></th></tr></thead><tbody>
    ${scope.map(([term, title, weeks]) => `<tr><td>${term}</td><td>${esc(title)}</td><td class="num">${weeks}</td><td>${haveTitles.has(title) ? `<span class="small muted">已加 ✓</span>` : `<button class="chip" data-act="scope-add" data-ss="${sj}" data-title="${esc(title)}" data-weeks="${weeks}" data-term="${term}">加为单元</button>`}</td></tr>`).join("")}
  </tbody></table><p class="small muted" style="margin-top:8px">36 周 = 3 个学期 × 12 周。这是“打算走过什么”的地图，只建空单元，课时按自家教材填。学前期以孩子节奏为准，这张表是软目标。</p></div>` : ""}

  <h2>学习目标 · ${esc(childName())}</h2>
  <div class="panel">
    ${goals.length ? goals.map(g => `<div class="task ${g.achieved_on ? "done" : ""}"><span class="bar" style="background:${subject(g.area).color}"></span>
      <button class="main" data-act="goal-edit" data-gid="${esc(g.id)}"><span class="title">${esc(g.title)}</span><span class="meta">${subject(g.area).short}${g.achieved_on ? ` · 达成于 ${esc(g.achieved_on)}` : g.target_on ? ` · 目标 ${esc(g.target_on)}` : ""}${g.evidence ? ` · ${esc(g.evidence)}` : ""}</span></button>
      <span class="acts"><button class="iconbtn ${g.achieved_on ? "" : "ok"}" data-act="goal-toggle" data-gid="${esc(g.id)}" aria-label="${g.achieved_on ? "撤销达成" : "标记达成"}">${g.achieved_on ? "↺" : "✓"}</button></span></div>`).join("")
      : `<p class="muted">还没有目标。学前阶段用清单而不是考试。</p>`}
    <div class="btns" style="margin-top:8px"><button class="btn" data-act="goal-add">＋ 目标</button>${goals.length ? "" : Object.entries(GOAL_TEMPLATES).map(([k, t]) => `<button class="btn" data-act="goal-template" data-tpl="${k}">套用：${esc(t.name)}</button>`).join("")}</div>
  </div>`;
}

export { viewCourse, paceHTML, gentle };
