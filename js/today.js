import { t, tc } from "./core/i18n.js";
import { S, ageText, childName, stageOf } from "./core/state.js";
import { dayKey, esc } from "./core/util.js";
import { subject, weekdayLabel } from "./data/subjects.js";
import { ve, vz } from "./data/versions.js";
import { devotionDraft, dueReviews, learnedCount, learningCards, routine, scripture, tasksFor, todayPassage } from "./hs.js";

/* ============ 今天页：敬拜 → 经文 → 任务 ============ */
function viewToday(){
  const now = Date.now(), day = dayKey(now);
  return `
  <section class="hero"><div class="moon"></div>
    <div class="lbl">${day} · ${esc(weekdayLabel(new Date(now).getDay()))}</div>
    <div class="big">${esc(childName())}</div>
    <div class="meta"><span>${esc(ageText())}</span><span>${esc(stageOf().name)}</span></div></section>
  ${devotionHTML()}
  ${reviewHTML()}
  ${tasksHTML(day)}`;
}

function devotionHTML(){
  const d = devotionDraft(), tp = todayPassage();
  const wv = S.hs.settings.weekVerse ? scripture(S.hs.settings.weekVerse) : null;
  const joined = new Set(d.children || []);
  return `<h2>${t("今日敬拜")}</h2>
  <div class="panel devo ${d.done ? "done" : ""}">
    <div class="row"><span class="k">${t("读经")}</span><div class="v"><b>${d.passage ? esc(d.passage) : tp ? tc(esc(tp.ref)) : t("还没选读经计划")}</b>${tp ? `<div class="small muted">${tc(esc(tp.note))}${tp.note ? " · " : ""}${tc(esc(tp.plan.name))} ${tp.index + 1}/${tp.total}</div>` : ""}</div><button class="chip" data-act="devo-passage">${t("改")}</button></div>
    <div class="row"><span class="k">${t("经文")}</span><div class="v">${wv ? `<b>${esc(wv.ref)}</b><div class="small">${esc(wv.text_zh)}<span class="muted">${esc(vz(wv))}</span></div><div class="small muted">${esc(wv.text_en)}${esc(ve(wv))}</div>` : `<span class="muted">${t("本周还没选经文")}</span>`}</div><button class="chip" data-act="devo-verse">${t("选")}</button></div>
    <div class="row"><span class="k">${t("诗歌")}</span><div class="v">${S.hs.settings.hymn ? `<b>${esc(S.hs.settings.hymn)}</b>` : `<span class="muted">${t("本月诗歌还没填")}</span>`}</div><button class="chip" data-act="devo-hymn">${t("填")}</button></div>
    <div class="row"><span class="k">${t("祷告")}</span><div class="v">${d.prayer ? esc(d.prayer) : `<span class="muted">${t("今天为谁、为什么祷告")}</span>`}</div><button class="chip" data-act="devo-prayer">${t("写")}</button></div>
    <div class="row"><span class="k">${t("参加")}</span><div class="v chips" style="margin:0">${S.children.map(c => `<button class="chip" data-devochild="${esc(c.id)}" aria-pressed="${joined.has(c.id)}">${esc(c.name || t("宝宝"))}</button>`).join("")}</div></div>
    <div class="btns">${d.done
      ? `<button class="btn" data-act="devo-undo">${t("今天敬拜过了 ✓ · 点击撤销")}</button>`
      : `<button class="btn primary" data-act="devo-done">${t("完成今日敬拜")}</button>`}</div>
  </div>`;
}

function reviewHTML(){
  const cid = S.childId, due = dueReviews(cid), learning = learningCards(cid), learned = learnedCount(cid);
  const card = (s, actions) => `<div class="card"><b>${esc(s.ref)}</b><div>${esc(s.text_zh)}<span class="small muted">${esc(vz(s))}</span></div><div class="small muted">${esc(s.text_en)}${esc(ve(s))}</div><div class="btns" style="margin-top:8px">${actions}</div></div>`;
  return `<h2>${t("经文背诵")} · ${esc(childName())}</h2>
  <div class="panel">
    ${due.length ? `<h3 class="small muted">${t("今天复习 {n} 节", { n: due.length })}</h3>${due.map(({ s }) => card(s, `<button class="btn primary" data-act="review-remember" data-sid="${esc(s.id)}">${t("记得")}</button><button class="btn" data-act="review-again" data-sid="${esc(s.id)}">${t("再练一天")}</button>`)).join("")}` : ""}
    ${learning.length ? `<h3 class="small muted" style="margin-top:${due.length ? 14 : 0}px">${t("在学 {n} 节", { n: learning.length })}</h3>${learning.map(({ s }) => card(s, `<button class="btn" data-act="learn-done" data-sid="${esc(s.id)}">${t("会背了")}</button>`)).join("")}` : ""}
    ${!due.length && !learning.length ? `<p class="muted">${learned ? t("今天没有到期的复习，已会背 {n} 节。", { n: learned }) : t("还没有开始背诵。")}</p>` : `<p class="small muted" style="margin-top:8px">${t("已会背 {n} 节。会背后按 3、7、30、90 天自动安排复习。", { n: learned })}</p>`}
    <div class="btns" style="margin-top:8px"><button class="btn" data-act="scriptures">${t("经文卡库")}</button></div>
  </div>`;
}

function tasksHTML(day){
  const cid = S.childId, list = tasksFor(day, cid);
  const done = list.filter(x => x.status === "done"), mins = done.reduce((a, x) => a + (+x.minutes || 0), 0);
  const row = x => { const sj = subject(x.subject), r = x.routine_id && routine(x.routine_id);
    const minutes = x.minutes ? x.minutes : r && r.minutes ? r.minutes : 0;
    return `<div class="task ${x.status}"><span class="bar" style="background:${sj.color}"></span>
      <button class="main" data-act="task-edit" data-tid="${esc(x.id)}"><span class="title">${esc(x.title)}</span><span class="meta">${esc(sj.short)}${r && r.start ? ` · ${r.start}` : ""}${minutes ? ` · ${t("{n} 分钟", { n: minutes })}` : ""}${x.child_id == null ? ` · ${t("全家")}` : ""}${x.note ? ` · ${esc(x.note)}` : ""}</span></button>
      <span class="acts">${x.status === "todo"
        ? `<button class="iconbtn ok" data-act="task-done" data-tid="${esc(x.id)}" aria-label="${t("完成")}">✓</button><button class="iconbtn" data-act="task-move" data-tid="${esc(x.id)}" aria-label="${t("顺延到明天")}">→</button><button class="iconbtn" data-act="task-skip" data-tid="${esc(x.id)}" aria-label="${t("跳过")}">✕</button>`
        : `<button class="chip" data-act="task-undo" data-tid="${esc(x.id)}">${x.status === "done" ? t("已完成 · 撤销") : t("已跳过 · 撤销")}</button>`}</span></div>`; };
  return `<h2>${t("今日任务")} · ${esc(childName())}</h2>
  <div class="panel">
    ${list.length ? `<div class="tasks">${list.map(row).join("")}</div><p class="small muted" style="margin-top:8px">${t("完成 {a}/{b}", { a: done.length, b: list.length })}${mins ? ` · ${t("约 {n} 分钟", { n: mins })}` : ""}。${t("全家项对每个孩子都显示，勾一次即可。")}</p>`
      : `<p class="muted">${t("今天没有任务。")}${S.hs.routines.length ? t("今天的周例行没有安排，或者都已顺延。") : t("先在“日历”里设置周例行，每天会自动生成任务。")}</p>`}
    <div class="btns" style="margin-top:8px"><button class="btn" data-act="task-add">＋ ${t("临时任务")}</button>${S.hs.routines.length ? "" : `<button class="btn primary" data-tab="calendar">${t("设置周例行")}</button>`}</div>
  </div>`;
}

export { viewToday };
