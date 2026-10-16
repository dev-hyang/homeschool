import { t, tc } from "./core/i18n.js";
import { S, childName, stageOf } from "./core/state.js";
import { esc } from "./core/util.js";
import { GOAL_TEMPLATES, SCOPE_PREK } from "./data/seeds.js";
import { SUBJECTS, subject } from "./data/subjects.js";
import { nextInChain, unitDone, unitLessons, unitPace, unitProgress, yearInfo } from "./hs.js";

/* ============ 课程页：科目 → 单元 → 课时，节奏，年度范围，学前目标 ============ */
S.courseSubject = S.courseSubject || "bible";
const gentle = () => ["baby", "toddler", "prek"].includes(stageOf().key); // 学前期落后只提示，不标红

function paceHTML(u){
  const p = unitPace(u); if (!p) return S.hs.pacing && !u.weeks ? `<span class="small muted">${t("未设预计周数")}</span>` : "";
  let txt, cls = "muted";
  if (p.done >= p.total) txt = t("已完成");
  else if (p.diff > 0) { txt = t("快 {n} 课", { n: p.diff }); cls = "ok"; }
  else if (p.diff < 0) { txt = t("慢 {n} 课", { n: -p.diff }); cls = gentle() ? "muted" : "warn"; }
  else txt = t("按计划");
  const proj = p.done < p.total ? (p.projectOn ? ` · ${t("照最近速度约 {d} 完成", { d: p.projectOn })}` : p.done ? "" : ` · ${t("还没开始")}`) : "";
  return `<span class="small pace ${cls}">${txt}${p.overdue ? ` · ${t("已过预计结束日")}` : ""} · ${t("预计 {w} 周到 {d}", { w: u.weeks, d: p.endOn })}${proj}</span>`;
}

/* 课程库里这个领域的下一单元 */
function nextHTML(sj, cid, units){
  const c = nextInChain(sj, cid);
  const allDone = units.length > 0 && units.every(unitDone);
  const label = SUBJECTS[sj].label, stageName = tc(c.stageName || "");
  if (!c.total) return `<div class="panel" style="margin-top:10px"><p class="small muted">${t("课程库里「{s}」在{st}没有预设单元，用“粘贴教材目录”或自己写。", { s: label, st: stageName || t("这个阶段") })}</p></div>`;
  if (!c.next) return `<div class="panel" style="margin-top:10px"><p class="small">${t("{st} 阶段「{s}」的 {n} 个单元都已生成", { st: stageName, s: label, n: c.total })}${allDone ? t("并完成") : ""}。${c.stage === "school" ? t("K 以后的内容来自你们选的教材，用“粘贴教材目录”继续。") : t("孩子进入下一阶段后这里会换成新的单元链；也可以用“粘贴教材目录”加自己的。")}</p></div>`;
  const row = tr => { const n = tr.next; if (!n) return `<div class="row" style="margin-top:6px"><div class="v small muted">${t("{track}轨道的 {n} 个单元都已生成。", { track: tc(tr.track), n: tr.total })}</div></div>`;
    return `<div class="row" style="margin-top:6px"><div class="v"><span class="small muted">${stageName} · ${label}${tr.track ? ` · ${tc(tr.track)}` : ""} · ${t("第 {i}/{n} 单元", { i: n.index + 1, n: c.total })}</span><div><b>${t("下一单元：")}${tc(n.title)}</b></div><div class="small muted">${n.weeks ? t("建议 {w} 周", { w: n.weeks }) : ""}${n.lessons.length ? ` · ${t("{n} 节课时", { n: n.lessons.length })}` : ` · ${t("骨架单元，课时用“粘贴教材目录”填")}`}</div></div>
      <button class="btn ${allDone || !units.length ? "primary" : ""}" data-act="gen-next" data-sj="${sj}" data-track="${esc(tr.track)}">${t("生成")}</button></div>`; };
  return `<div class="panel ${allDone ? "next-hot" : ""}" style="margin-top:10px">${allDone ? `<div class="small muted">${t("当前单元已完成")}</div>` : ""}${c.tracks.map(row).join("")}</div>`;
}

function viewCourse(){
  if (!S.hs.phase2) return `<div class="empty">${t("课程、目标和资源库需要数据库迁移 004。")}<br>${t("请在 Supabase 执行本地")} <code>supabase/migrations/004_homeschool_phase2_4.sql</code>${t("，然后刷新。")}</div>`;
  const cid = S.childId, sj = S.courseSubject, yi = yearInfo();
  const mine = S.hs.units.filter(u => (u.child_id == null || u.child_id === cid) && u.active);
  const bySubject = Object.keys(SUBJECTS).map(k => ({ k, n: mine.filter(u => u.subject === k).length }));
  const units = mine.filter(u => u.subject === sj).sort((a, b) => (a.term || 9) - (b.term || 9) || a.sort - b.sort);
  const lessonRow = l => `<div class="lesson ${l.status}">
    <span class="st" aria-hidden="true">${l.status === "done" ? "✓" : l.status === "skip" ? "–" : "○"}</span>
    <button class="main" data-act="lesson-edit" data-lid="${esc(l.id)}"><span class="title">${esc(l.title)}</span>${l.faith_note || l.verse_ref ? `<span class="meta">${esc(l.faith_note)}${l.faith_note && l.verse_ref ? " · " : ""}${esc(l.verse_ref)}</span>` : ""}${l.status === "done" ? `<span class="meta">${t("完成于 {d}", { d: esc(l.done_on || "") })}${l.minutes ? ` · ${t("{n} 分钟", { n: l.minutes })}` : ""}</span>` : ""}</button>
    <span class="acts">${l.status === "done"
      ? `<button class="chip" data-act="lesson-undo" data-lid="${esc(l.id)}">${t("撤销")}</button>`
      : `<button class="chip" data-act="lesson-schedule" data-lid="${esc(l.id)}">${t("排到今天")}</button><button class="chip" data-act="lesson-done" data-lid="${esc(l.id)}">${t("完成")}</button>`}</span></div>`;
  const unitCard = u => { const p = unitProgress(u.id), pct = p.total ? Math.round(p.done / p.total * 100) : 0;
    return `<div class="panel unit">
      <div class="row"><div class="v"><b>${esc(u.title)}</b>${u.term ? ` <span class="small muted">· ${t("第 {n} 学期", { n: u.term })}</span>` : ""}${u.child_id == null ? ` <span class="small muted">· ${t("全家")}</span>` : ""}${u.note ? `<div class="small muted">${esc(u.note)}</div>` : ""}</div><button class="chip" data-act="unit-edit" data-uid="${esc(u.id)}">${t("编辑")}</button></div>
      <div class="progress" aria-label="${t("进度")} ${p.done}/${p.total}"><span style="width:${pct}%;background:${subject(u.subject).color}"></span></div>
      <div class="small muted" style="margin:4px 0 6px">${p.done}/${p.total} ${t("课时")} ${paceHTML(u)}</div>
      ${unitLessons(u.id).map(lessonRow).join("") || `<p class="muted small">${t("还没有课时。")}</p>`}
      <div class="btns" style="margin-top:8px"><button class="btn" data-act="lesson-add" data-uid="${esc(u.id)}">＋ ${t("课时")}</button></div></div>`; };
  const goals = S.hs.goals.filter(g => g.child_id === cid).sort((a, b) => a.sort - b.sort);
  const scope = SCOPE_PREK[sj] || [];
  const haveTitles = new Set(mine.map(u => u.title));
  const yearLine = yi ? (yi.before ? t("学年 {d} 开始，还有 {n} 周", { d: yi.start, n: 1 - yi.week }) : yi.ended ? t("学年已结束（共 {n} 周）", { n: yi.weeks }) : t("第 {w} / {n} 周 · 第 {term} 学期", { w: yi.week, n: yi.weeks, term: yi.term })) : t("还没设置学年。到设置里填开学日期和周数，单元就能显示“按计划 / 快 / 慢”。");
  return `<h2>${t("课程")} · ${esc(childName())}</h2>
  <p class="small muted">${yearLine}${S.hs.pacing ? "" : " " + t("节奏字段需要迁移 006。")}</p>
  <div class="chips" role="group" aria-label="${t("领域")}">${bySubject.map(({ k, n }) => `<button class="chip" data-subject="${k}" aria-pressed="${k === sj}">${SUBJECTS[k].label}${n ? ` ${n}` : ""}</button>`).join("")}</div>
  ${units.length ? units.map(unitCard).join("") : `<div class="empty">${t("「{s}」还没有单元。", { s: SUBJECTS[sj].label })}</div>`}
  ${nextHTML(sj, cid, units)}
  <div class="btns"><button class="btn" data-act="unit-add">＋ ${t("自己写单元")}</button><button class="btn" data-act="outline-import">${t("粘贴教材目录")}</button>${mine.length ? "" : `<button class="btn primary" data-act="gen-round">${t("生成本阶段第一轮（七个领域各一个单元）")}</button>`}</div>
  <p class="small muted" style="margin-top:8px">${t("每课时的“信仰连接”是一句话，提醒这一课和圣经的关联。“排到今天”会生成一条今日任务，勾完任务课时自动完成。给单元填“预计几周”后会按周例行推算应完成多少。")}</p>

  ${scope.length ? `<h2>${t("年度范围")} · ${SUBJECTS[sj].label}${t("（Pre-K 建议）")}</h2>
  <div class="panel scroll-x"><table><thead><tr><th>${t("学期")}</th><th>${t("单元主题")}</th><th>${t("周")}</th><th></th></tr></thead><tbody>
    ${scope.map(([term, title, weeks]) => `<tr><td>${term}</td><td>${tc(title)}</td><td class="num">${weeks}</td><td>${haveTitles.has(title) ? `<span class="small muted">${t("已加 ✓")}</span>` : `<button class="chip" data-act="scope-add" data-ss="${sj}" data-title="${esc(title)}" data-weeks="${weeks}" data-term="${term}">${t("加为单元")}</button>`}</td></tr>`).join("")}
  </tbody></table><p class="small muted" style="margin-top:8px">${t("36 周 = 3 个学期 × 12 周。这是“打算走过什么”的地图，只建空单元，课时按自家教材填。学前期以孩子节奏为准，这张表是软目标。")}</p></div>` : ""}

  <h2>${t("学习目标")} · ${esc(childName())}</h2>
  <div class="panel">
    ${goals.length ? goals.map(g => `<div class="task ${g.achieved_on ? "done" : ""}"><span class="bar" style="background:${subject(g.area).color}"></span>
      <button class="main" data-act="goal-edit" data-gid="${esc(g.id)}"><span class="title">${esc(g.title)}</span><span class="meta">${esc(subject(g.area).short)}${g.achieved_on ? ` · ${t("达成于 {d}", { d: esc(g.achieved_on) })}` : g.target_on ? ` · ${t("目标 {d}", { d: esc(g.target_on) })}` : ""}${g.evidence ? ` · ${esc(g.evidence)}` : ""}</span></button>
      <span class="acts"><button class="iconbtn ${g.achieved_on ? "" : "ok"}" data-act="goal-toggle" data-gid="${esc(g.id)}" aria-label="${g.achieved_on ? t("撤销达成") : t("标记达成")}">${g.achieved_on ? "↺" : "✓"}</button></span></div>`).join("")
      : `<p class="muted">${t("还没有目标。学前阶段用清单而不是考试。")}</p>`}
    <div class="btns" style="margin-top:8px"><button class="btn" data-act="goal-add">＋ ${t("目标")}</button>${goals.length ? "" : Object.entries(GOAL_TEMPLATES).map(([k, g]) => `<button class="btn" data-act="goal-template" data-tpl="${k}">${t("套用：")}${tc(g.name)}</button>`).join("")}</div>
  </div>`;
}

export { viewCourse, paceHTML, gentle };
