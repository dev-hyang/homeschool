import { t, tc } from "./core/i18n.js";
import { aiIcon } from "./ask.js";
import { S, ageText, childName, stageOf } from "./core/state.js";
import { dayKey, esc } from "./core/util.js";
import { subject, weekdayLabel } from "./data/subjects.js";
import { ve, vz } from "./data/versions.js";
import { devotionDraft, learnedCount, nextToStart, poolOf, routine, scripture, tasksFor, todayPassage, todayPlan } from "./hs.js";
import { bedtimeCardHTML } from "./bedtime.js";

/* ============ 今天页：敬拜 → 经文 → 任务 ============ */
function viewToday(){
  const now = Date.now(), day = dayKey(now);
  return `
  <section class="hero"><div class="moon"></div>
    <div class="lbl">${day} · ${esc(weekdayLabel(new Date(now).getDay()))}</div>
    <div class="big">${esc(childName())}</div>
    <div class="meta"><span>${esc(ageText())}</span><span>${esc(stageOf().name)}</span><button class="chip hero-chip" data-act="print-day" title="${esc(t("打一张今天的纸：敬拜、背诵经文全文、任务、备注"))}">🖨 ${t("打印今日页")}</button></div></section>
  <div class="ask-entry"><button class="chip ask-chip" data-tab="ask" data-from="today">${aiIcon(18)} ${t("咩咩咩")}</button><span class="small muted">${t("今天的课怎么调、经文怎么背、孩子不配合怎么办…")}</span></div>
  ${devotionHTML()}
  ${reviewHTML()}
  ${tasksHTML(day)}
  ${bedtimeCardHTML()}`;
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

/* 今日背诵：像任务一样的清单。到期复习和在学的卡自动进来，做过的留在原位（✓ 背出来了 / ↻ 练过了），可撤销。
   只有 ✓ 和 ↻，没有 ✗：“再练练”只是记一次，明天再来。连续三次再练练时给家长一行提示和“先放一放”。 */
function reviewHTML(){
  const cid = S.childId, plan = todayPlan(cid), learned = learnedCount(cid), color = subject("bible").color, next = nextToStart(cid), pool = poolOf(cid);
  const tf = S.todayFilter || "all", nNew = plan.rows.filter(x => x.kind === "learn").length, nRev = plan.rows.length - nNew;
  const shown = plan.rows.filter(x => tf === "all" || (tf === "new" ? x.kind === "learn" : x.kind === "review"));
  const row = ({ s, p, kind, done }) => {
    const ok = done && p.last_result === "ok";
    // 新学的标“新学 · 本批”；复习的带“已复习 n 次 · 下次复习 日期”，背过的卡一直留着这两样
    const meta = kind === "learn"
      ? (done ? (ok ? t("今天会背了 ✓ · 下次复习 {d}", { d: p.next_review || "" }) : t("今天练过了 · 明天继续")) : `${t("新学")}${pool && pool.ids.includes(s.id) ? ` · ${t("本批")}` : ""}`)
      : (done ? (ok ? t("今天背出来了 ✓ · 已复习 {n} 次 · 下次复习 {d}", { n: p.reviews || 0, d: p.next_review || "" }) : t("今天练过了 · 明天再来"))
        : t("复习 · 已复习 {n} 次 · 原定 {d}", { n: p.reviews || 0, d: p.next_review || "" }));
    const acts = done
      ? `<button class="chip" data-act="review-undo" data-sid="${esc(s.id)}">${t("撤销")}</button>`
      : kind === "learn"
        ? `${p.last_on ? "" : `<button class="chip" data-act="learn-swap" data-sid="${esc(s.id)}" title="${t("这节不合适，随机换一节")}">${t("换一个")}</button>`}<button class="iconbtn ok" data-act="learn-done" data-sid="${esc(s.id)}" aria-label="${t("会背了")}">✓</button><button class="iconbtn redo" data-act="learn-practice" data-sid="${esc(s.id)}" aria-label="${t("今天练过了")}">↻</button>`
        : `<button class="iconbtn ok" data-act="review-remember" data-sid="${esc(s.id)}" aria-label="${t("背出来了")}">✓</button><button class="iconbtn redo" data-act="review-again" data-sid="${esc(s.id)}" aria-label="${t("再练练")}">↻</button>`;
    const hint = (p.again_streak || 0) >= 3 ? `<div class="small muted" style="grid-column:2/4;padding-bottom:6px">${t("这节对{name}有点长：可以先只背前半句，或者先放一放，过几周再来。", { name: esc(childName()) })} <button class="chip" data-act="review-pause" data-sid="${esc(s.id)}">${t("先放一放")}</button></div>` : "";
    return `<div class="task ${done ? (ok ? "done" : "again") : ""}"><span class="bar" style="background:${color}"></span>
      <div class="main"><span class="title"><b>${esc(s.ref)}</b></span><span class="verse">${esc(s.text_zh)}<span class="small muted"> ${esc(vz(s))}</span></span><span class="verse small muted">${esc(s.text_en)}${esc(ve(s))}</span><span class="meta">${meta}</span></div>
      <span class="acts">${acts}</span>${hint}</div>`; };
  const pending = plan.total - plan.done;
  return `<h2>${t("经文背诵")} · ${esc(childName())}${pending ? ` <span class="pill ok">${t("今日 {n} 节", { n: pending })}</span>` : ""}</h2>
  <div class="panel">
    ${pool || plan.rows.some(x => x.kind === "learn" && !x.p.last_on) ? `<div class="pool-line"><span class="small">${pool ? t("本批 {a}/{b} 节已会背", { a: pool.done, b: pool.total }) : t("在学的经文")}</span><button class="chip" data-act="batch-swap" title="${esc(t("还没背过的这批整批换掉，练过的留着"))}">${t("换一批")}</button></div>` : ""}
    ${plan.rows.length ? `<div class="seg today-filter" role="group" aria-label="${t("筛选")}"><button data-tf="all" aria-pressed="${tf === "all"}">${t("全部")} ${plan.rows.length}</button><button data-tf="new" aria-pressed="${tf === "new"}">${t("新学")} ${nNew}</button><button data-tf="review" aria-pressed="${tf === "review"}">${t("复习")} ${nRev}</button></div>
      ${shown.length ? `<div class="tasks">${shown.map(row).join("")}</div>` : `<p class="muted" style="margin-top:8px">${tf === "new" ? t("今天没有新学的经文。") : t("今天没有到期的复习。")}</p>`}
      <p class="small muted" style="margin-top:8px">${t("今天 {a}/{b}", { a: plan.done, b: plan.total })}${plan.later ? ` · ${t("还有 {n} 节排在后面，明天继续", { n: plan.later })}` : ""} · ${t("已会背 {n} 节", { n: learned })}。${t("会背后按 3、7、30、90、180 天自动安排复习，到期的会自动出现在这里。")}</p>`
      : `<p class="muted">${learned ? t("今天没有到期的复习，已会背 {n} 节。", { n: learned }) : t("还没有开始背诵。")}</p>`}
    ${plan.backlog ? `<div class="small" style="margin-top:10px;padding:8px 10px;border-radius:var(--radius-sm);background:var(--slate-soft)">${t("复习排队了 {n} 节，最久的已拖 {d} 天。可以周末多复习几节，也可以今天先多做几节。", { n: plan.backlog.queued, d: plan.backlog.oldest })} <button class="chip" data-act="review-more">${t("今天多复习 3 节")}</button></div>` : ""}
    ${!plan.rows.some(x => x.kind === "learn") && next ? `<div class="btns" style="margin-top:8px"><button class="btn primary" data-act="scr-start-next" data-sid="${esc(next.id)}">${t("开始下一节：{ref}", { ref: esc(next.ref) })}</button><button class="btn" data-act="scriptures">${t("经文卡库")}</button></div>`
      : `<div class="btns" style="margin-top:8px"><button class="btn" data-act="scriptures">${t("经文卡库")}</button></div>`}
    ${S.hs.settings.autoVerse === false ? "" : `<p class="small muted" style="margin-top:8px">${t("不用点“开始背”：每天 8 点（或本批全部会背后）自动从卡库拉一批，每批节数和问答占比在经文卡库里调；不合适点“换一个”或“换一批”。可在设置里关闭。")}</p>`}
  </div>`;
}

// 打印：今天页头部有“打印今日页”（只打这一天那张纸）；本周 / 本月在“我的”页

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
