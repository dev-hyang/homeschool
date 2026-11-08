import { t } from "./core/i18n.js";
import { S, childName } from "./core/state.js";
import { $, esc, newId, toast } from "./core/util.js";
import { SONG_TAGS } from "./data/bedtime.js";
import * as hs from "./hs.js";
import { closeSheet, head, openForm, showSheet } from "./sheet.js";
import { render } from "./views.js";
import { mrow } from "./me.js";
import { h2, migrateHTML, offlineHTML, songBlob, songs, stopPreview } from "./bedtime.js";
import * as L from "./music-lists.js";
import * as PLY from "./player.js";

/* ============ 音乐：歌单 + 学歌 / 播放（资源页的一个入口） ============
   歌曲库（上传 MP3、标签、歌词）还是 js/bedtime.js 里的「全部歌曲」页；这里管歌单和播放：
   · 默认歌单：按歌的标签自动分类（被爱与安慰 / 神的话语 / 放下与休息 / 轻柔唤醒）；
   · 自定义歌单：自己建，随时加歌 / 删歌 / 调顺序；
   · 今天页「记一笔」里的「音乐」格：点开直接是给这个孩子选好的歌单，可以播，也可以记一笔；
   · 周例行里敬拜 / 音乐的任务：上面有「▶ 学歌」按钮，点开就是选好的歌单，歌词放大，循环播放，学完一键完成任务。
   歌单只存 hs_family.settings.music（见 music-lists.js），不需要新的数据库迁移。逻辑都在 music-lists.js，这里只管界面和播放。 */
const tagNames = () => Object.fromEntries(Object.entries(SONG_TAGS).map(([k, v]) => [k, t(v)]));
const music = () => L.musicOf(S.hs.settings);
const lists = () => L.allLists(songs(), music().playlists, tagNames(), t("全部歌曲"));
const listName = l => (l.kind === "all" ? t("全部歌曲") : l.name);
async function saveMusic(patch){
  try { await hs.saveSettings({ music: { ...music(), ...patch } }); return true; }
  catch (e) { toast(e.message || t("保存失败")); return false; }
}
const refresh = () => render();
const pill = s => (s.tags || []).filter(k => SONG_TAGS[k]).map(k => `<span class="pill">${esc(t(SONG_TAGS[k]))}</span>`).join(" ");

/* ============ 音乐页（资源 → 音乐） ============ */
function musicEntry(){
  const n = songs().length, pl = music().playlists.length;
  return mrow('data-tab="res-music"', t("音乐"), n ? t("{n} 首歌 · {m} 个自定义歌单；按标签自动分类，学歌、播放", { n, m: pl }) : t("还没有歌：先添加几首 MP3，再建歌单、学歌"), "♪");
}
function listRow(l){
  const play = L.playable(l.songs).length;
  return `<div class="task"><span class="bar" style="background:${l.kind === "custom" ? "var(--honey)" : "var(--sage)"}"></span>
    <button class="main" data-act="mu-open" data-id="${esc(l.id)}"><span class="title">${esc(listName(l))}</span><span class="meta">${t("{n} 首", { n: l.songs.length })}${l.kind === "tag" ? ` · ${t("按标签自动")}` : ""}${l.songs.length && !play ? ` · ${t("还没有音频")}` : ""}</span></button>
    <span class="acts">${play ? `<button class="iconbtn" data-act="mu-play-all" data-id="${esc(l.id)}" aria-label="${esc(t("播放"))}">▶</button>` : ""}</span></div>`;
}
function viewMusic(){
  const all = lists(), cid = S.childId, pick = L.tilePickOf(music(), cid, all), custom = all.filter(l => l.kind === "custom");
  return `${h2(t("音乐"), songs().length ? t("{n} 首", { n: songs().length }) : "")}
  ${offlineHTML()}${S.bt.missing ? migrateHTML() : ""}
  ${PLY.hasTrack() ? `<h2>${t("正在播放")}</h2><div class="panel">${PLY.playerControlsHTML("page")}<div class="btns" style="margin-top:6px;justify-content:center"><button class="btn sm" data-act="mu-show-player">${t("歌词与歌单")}</button></div></div>` : ""}
  <p class="small muted">${t("先在「全部歌曲」里上传歌，再建歌单、学歌。睡前、冲突、情绪、唤醒的流程也用这里的歌。")}</p>
  <div class="panel mlist">${mrow('data-tab="bt-songs"', t("全部歌曲"), songs().length ? t("添加 / 编辑歌曲、标签、歌词、下载到本机") : t("还没有歌：点进去添加 MP3"), "♬")}</div>
  <h2>${t("歌单")}</h2>
  <div class="panel"><p class="small muted" style="margin-top:0">${t("默认歌单按歌的标签自动分类；自己建的歌单可以随意加歌、删歌、调顺序。点歌单看里面的歌，▶ 从头播。")}</p>
    ${all.length > 1 || songs().length ? `<div class="tasks">${all.map(listRow).join("")}</div>` : `<div class="empty">${t("还没有歌。")}</div>`}
    <div class="btns" style="margin-top:8px"><button class="btn primary" data-act="mu-new">＋ ${t("新建歌单")}</button></div>
    ${custom.length ? "" : `<p class="small muted" style="margin:8px 0 0">${t("例如「早晨唱的歌」「本月赞美诗」「睡前轻音乐」。")}</p>`}</div>
  ${cid ? `<h2>${t("今天页的「音乐」格")}</h2><div class="panel"><p class="small" style="margin-top:0">${t("给 {n}：点今天页的「🎵 音乐」格，打开这个歌单。", { n: esc(childName()) })}</p>
    <div class="seg" role="group" aria-label="${esc(t("今天页的「音乐」格"))}" style="flex-direction:column;align-items:stretch">${all.map(l => `<button type="button" data-act="mu-tile-pick" data-id="${esc(l.id)}" aria-pressed="${l.id === pick}">${esc(listName(l))} · ${t("{n} 首", { n: l.songs.length })}</button>`).join("")}</div>
    <p class="small muted" style="margin:8px 0 0">${t("在今天页「记一笔 → 自定义」里把「音乐」格加进来。")}</p></div>` : ""}`;
}

/* ============ 歌单详情（弹层） ============ */
let cur = null;   // 当前打开的歌单 id
function drawList(){
  const l = L.findList(lists(), cur); if (!l) { closeSheet(); return; }
  const custom = l.kind === "custom", play = L.playable(l.songs).length;
  const row = (s, i) => `<div class="task"><span class="bar" style="background:${s.path ? "var(--sage)" : "var(--line)"}"></span>
    <button class="main" data-act="mu-play" data-id="${esc(l.id)}" data-i="${i}" ${s.path ? "" : "disabled"}><span class="title">${esc(s.title)}</span><span class="meta">${s.artist ? esc(s.artist) + " · " : ""}${s.path ? pill(s) : t("还没有音频")}</span></button>
    <span class="acts">${s.path ? `<button class="iconbtn" data-act="mu-play" data-id="${esc(l.id)}" data-i="${i}" aria-label="${esc(t("从这首开始播"))}">▶</button>` : ""}
      ${custom ? `<button class="iconbtn" data-act="mu-up" data-sid="${esc(s.id)}" aria-label="${esc(t("上移"))}" ${i ? "" : "disabled"}>↑</button><button class="iconbtn" data-act="mu-down" data-sid="${esc(s.id)}" aria-label="${esc(t("下移"))}" ${i < l.songs.length - 1 ? "" : "disabled"}>↓</button><button class="iconbtn redo" data-act="mu-rm" data-sid="${esc(s.id)}" aria-label="${esc(t("从歌单里去掉"))}">✕</button>` : ""}</span></div>`;
  $("#sheetIn").innerHTML = `${head(esc(listName(l)))}
  <p class="small muted">${t("{n} 首", { n: l.songs.length })}${l.kind === "tag" ? ` · ${t("默认歌单：按标签自动分类，到歌曲里改标签就会变")}` : l.kind === "all" ? ` · ${t("所有歌曲")}` : ""}</p>
  <div class="btns" style="margin-top:0">${play ? `<button class="btn primary" data-act="mu-play-all" data-id="${esc(l.id)}">▶ ${t("播放 / 学歌")}</button>` : ""}
    ${custom ? `<button class="btn" data-act="mu-add" data-id="${esc(l.id)}">＋ ${t("添加歌曲")}</button><button class="btn" data-act="mu-rename" data-id="${esc(l.id)}">${t("改名")}</button>` : ""}
    <button class="btn" data-act="mu-tile-pick" data-id="${esc(l.id)}" data-keep="1">🎵 ${t("设为今天页「音乐」格")}</button></div>
  <div class="panel">${l.songs.length ? `<div class="tasks">${l.songs.map(row).join("")}</div>` : `<div class="empty">${custom ? t("还是空的：点「＋ 添加歌曲」挑几首。") : t("这个歌单里还没有歌。")}</div>`}</div>
  ${custom ? `<div class="btns"><button class="btn danger" data-act="mu-delete" data-id="${esc(l.id)}">${t("删除歌单")}</button></div><p class="small muted">${t("删歌单不会删歌曲，歌曲还在「全部歌曲」里。")}</p>` : ""}`;
  showSheet();
}
const openList = id => { cur = id; drawList(); };

/** 给自定义歌单挑歌：点一下就加 / 去掉，立刻保存 */
function drawPicker(id){
  const l = L.findList(lists(), L.PL + id), mine = new Set((l?.songs || []).map(s => s.id));   // id 是自定义歌单的原始 id（不带 pl: 前缀）
  $("#sheetIn").innerHTML = `${head(esc(t("添加歌曲")))}
  <p class="small muted">${t("点一下加进「{n}」，再点一下去掉。", { n: esc(l ? l.name : "") })}</p>
  <div class="panel">${songs().length ? `<div class="tasks">${songs().map(s => `<button type="button" class="task pick-row" data-act="mu-pick" data-id="${esc(id)}" data-sid="${esc(s.id)}" aria-pressed="${mine.has(s.id)}" style="width:100%;text-align:left"><span class="bar" style="background:${mine.has(s.id) ? "var(--sage)" : "var(--line)"}"></span><span class="main"><span class="title">${mine.has(s.id) ? "✓ " : ""}${esc(s.title)}</span><span class="meta">${s.artist ? esc(s.artist) + " · " : ""}${pill(s)}</span></span></button>`).join("")}</div>` : `<div class="empty">${t("还没有歌：先到「全部歌曲」添加。")}</div>`}</div>
  <div class="btns"><button class="btn primary" data-act="mu-pick-done" data-id="${esc(id)}">${t("完成")}</button></div>`;
  showSheet();
}

/** 从一首歌的编辑页「加到歌单…」：勾选它在哪些自定义歌单里，也能当场新建一个 */
function drawAddTo(songId){
  const s = songs().find(x => x.id === songId); if (!s) return;
  const pls = music().playlists;
  $("#sheetIn").innerHTML = `${head(esc(t("加到歌单")))}
  <p class="small muted">${esc(s.title)}</p>
  <div class="panel">${pls.length ? `<div class="seg" role="group" style="flex-direction:column;align-items:stretch">${pls.map(p => `<button type="button" data-act="mu-addto-toggle" data-id="${esc(p.id)}" data-sid="${esc(songId)}" aria-pressed="${L.inList(pls, p.id, songId)}">${L.inList(pls, p.id, songId) ? "✓ " : ""}${esc(p.name)}</button>`).join("")}</div>` : `<p class="muted">${t("还没有自建歌单。")}</p>`}
    <div class="btns"><button class="btn" data-act="mu-addto-new" data-sid="${esc(songId)}">＋ ${t("新建歌单并加入")}</button></div>
    <p class="small muted">${t("按标签的默认歌单是自动的：改歌的标签就行。")}</p></div>
  <div class="btns"><button class="btn primary" data-act="mu-addto-done">${t("完成")}</button></div>`;
  showSheet();
}
const nameForm = (title, initial, onSave) => openForm(title, [{ k: "name", label: "歌单名称", type: "text", ph: "早晨唱的歌" }], { name: initial }, async f => {
  const ok = await onSave(f.name); if (ok === false) return;
});
const nameError = e => toast(e === "dup" ? t("已经有同名的歌单了") : t("请填歌单名称"));

/* ============ 播放 / 学歌 ============
   声音在 js/player.js（一直在，今天页音乐卡、音乐页、这个弹层共用）；这里只管弹层：歌词、歌单里的歌、记一笔、学完。关掉弹层音乐照常放。 */
const SH = { open: false, lyrics: true };
PLY.initPlayer({ songBlob, stopPreview }, () => { if (SH.open) drawPlayer(); if (S.tab === "today" || S.tab === "res-music") render(); });
function stopPlayer(){ PLY.stop(); SH.open = false; }
function openPlayer(listId, i = 0, tid = "", { sheet = true } = {}){
  const l = L.findList(lists(), listId), q = L.playable(l ? l.songs : []);
  if (!q.length) { toast(t("这个歌单里还没有可以播放的歌")); return; }
  const start = l.songs[i] ? Math.max(0, q.findIndex(s => s.id === l.songs[i].id)) : 0;
  SH.open = sheet;
  PLY.playQueue(q, start, { listId, listName: listName(l), tid });
  if (sheet) drawPlayer();
}
/** 今天页滑动卡片里的「🎵 音乐卡」：顶上选歌单、选歌（选了就从那首开始放）；下面是播放控件（进度、循环、上下首、音量）。
 *  没在放时：歌单默认是给这个孩子选好的（今天页「音乐」格那个），▶ 从头放 */
let cardList = "";
function musicCardHTML(){
  const all = lists(), P = PLY.player(), playing = PLY.hasTrack();
  const listId = playing && P.listId ? P.listId : (cardList && L.findList(all, cardList) ? cardList : L.tilePickOf(music(), S.childId, all));
  const l = L.findList(all, listId), q = L.playable(l ? l.songs : []);
  if (!songs().length) return `<section class="musiccard is-idle" aria-label="${esc(t("音乐卡"))}"><div class="mc-head"><span class="mc-ico" aria-hidden="true">🎵</span><b>${t("音乐")}</b></div>
    <div class="mc-empty"><span class="pl-sub">${t("还没有歌：先在「全部歌曲」里加几首 MP3")}</span><button class="btn sm" data-tab="bt-songs" data-from="today">${t("去添加")}</button></div></section>`;
  const cur = playing ? PLY.current() : null;
  // 第一行：🎵 + 歌单选择 + 歌单 ›；第二行：选歌（就是歌名）+ 演唱者 · 第几首；下面进度和控件
  const plSel = `<select class="mc-plsel" data-mcpl aria-label="${esc(t("选歌单"))}">${all.map((x) => `<option value="${esc(x.id)}" ${x.id === listId ? "selected" : ""}>${esc(listName(x))}（${L.playable(x.songs).length}）</option>`).join("")}</select>`;
  const songSel = `<select class="mc-songsel" data-mcsong aria-label="${esc(t("选歌"))}" ${q.length ? "" : "disabled"}>${playing ? "" : `<option value="">${esc(t("选一首，或点 ▶ 从头放"))}</option>`}${q.map((x, i) => `<option value="${i}" ${cur && cur.id === x.id ? "selected" : ""}>${esc(x.title)}</option>`).join("")}</select>`;
  const sub = playing ? `${cur?.artist ? `${esc(cur.artist)} · ` : ""}${P.i + 1}/${P.queue.length}` : t("{n} 首", { n: q.length });
  const head = `<div class="mc-head"><span class="mc-ico" aria-hidden="true">🎵</span>${plSel}<button class="mc-link" data-tab="res-music" data-from="today" aria-label="${esc(t("歌单"))}">${t("歌单")} ›</button></div>`;
  const body = playing ? PLY.playerControlsHTML("card")
    : `<div class="mc-start">${q.length ? `<button class="pl-btn pl-main mc-play" data-act="mu-card-play" data-id="${esc(listId)}" aria-label="${esc(t("开始播放"))}">${PLY.ICON.play}</button>` : ""}<span class="pl-sub">${t("开始后可以拖动进度、单曲循环、调音量；换页也不停")}</span></div>`;
  return `<section class="musiccard ${playing ? "" : "is-idle"}" aria-label="${esc(t("音乐卡"))}">${head}<div class="mc-song">${songSel}<div class="pl-sub">${sub}</div></div>${body}
    ${playing ? `<div class="mc-foot"><button class="mc-link" data-act="mu-show-player">${t("歌词")}</button><button class="mc-link" data-act="pl-stop">${t("停止")}</button></div>` : ""}</section>`;
}
/* 音乐卡上换歌单 / 选歌 */
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset?.mcpl !== undefined) { cardList = el.value; if (PLY.hasTrack()) openPlayer(el.value, 0, "", { sheet: false }); else render(); }
  else if (el.dataset?.mcsong !== undefined && el.value !== "") {
    const P = PLY.player(), id = el.closest(".musiccard")?.querySelector("[data-mcpl]")?.value || cardList;
    if (PLY.hasTrack() && P.listId === id) PLY.jump(+el.value);
    else { const l = L.findList(lists(), id), q = L.playable(l ? l.songs : []); PLY.playQueue(q, +el.value, { listId: id, listName: l ? listName(l) : "" }); }
  }
});
function drawPlayer(){
  if (!SH.open) return;
  const P = PLY.player(), s = PLY.current(), lines = String(s?.lyrics || "").split(/\r?\n/);
  $("#sheetIn").innerHTML = `${head(esc(t(P.tid ? "学歌" : "播放")))}
  ${PLY.playerControlsHTML("sheet")}
  <div class="btns" style="justify-content:center;margin-top:4px"><button class="btn" data-act="mu-lyrics" aria-pressed="${SH.lyrics}">${t("歌词")}</button></div>
  ${SH.lyrics ? (s?.lyrics ? `<div class="panel" style="font-size:1.25em;line-height:1.9;text-align:center;max-height:38vh;overflow:auto">${lines.map(x => x.trim() ? `<div>${esc(x)}</div>` : `<div style="height:.8em"></div>`).join("")}</div>` : `<p class="small muted" style="text-align:center">${t("这首歌还没有歌词。")}</p>`) : ""}
  <details style="margin-top:8px"><summary>${t("歌单里的歌")}</summary><div class="tasks">${P.queue.map((x, i) => `<button type="button" class="task" data-act="mu-jump" data-i="${i}" style="width:100%;text-align:left"><span class="bar" style="background:${i === P.i ? "var(--honey)" : "var(--line)"}"></span><span class="main"><span class="title">${esc(x.title)}</span></span></button>`).join("")}</div></details>
  <div class="btns"><button class="btn" data-act="ql-new" data-id="music" data-form="1">＋ ${t("记一笔")}</button>${P.tid ? `<button class="btn primary" data-act="mu-finish">${t("学完了 ✓ 完成这项任务")}</button>` : ""}<button class="btn" data-act="pl-stop">${t("停止播放")}</button></div>`;
  showSheet();
}
$("#sheet")?.addEventListener("close", () => { SH.open = false; });   // 关弹层不停音乐（今天页音乐卡、音乐页上还能控制）

/* ============ 今天页「音乐」格：点开直接是选好的歌单 ============ */
function openMusicTile(){
  const all = lists(), id = L.tilePickOf(music(), S.childId, all), l = L.findList(all, id), play = L.playable(l ? l.songs : []).length;
  $("#sheetIn").innerHTML = `${head(esc(`🎵 ${t("音乐")} · ${childName()}`))}
  ${songs().length ? `<p class="small" style="margin-top:0">${t("选好的歌单：")}<b>${esc(l ? listName(l) : "")}</b> · ${t("{n} 首", { n: l ? l.songs.length : 0 })}</p>
    <div class="btns" style="margin-top:0">${play ? `<button class="btn primary" data-act="mu-play-all" data-id="${esc(id)}">▶ ${t("开始")}</button>` : ""}<button class="btn" data-act="ql-new" data-id="music" data-form="1">＋ ${t("记一笔")}</button><button class="btn" data-tab="res-music">${t("打开音乐页")}</button></div>
    <div class="field"><div class="lab">${t("换一个歌单（只对 {n} 的音乐格生效）", { n: esc(childName()) })}</div><div class="seg" style="flex-direction:column;align-items:stretch">${all.map(x => `<button type="button" data-act="mu-tile-pick" data-id="${esc(x.id)}" data-sheet="tile" aria-pressed="${x.id === id}">${esc(listName(x))} · ${t("{n} 首", { n: x.songs.length })}</button>`).join("")}</div></div>
    ${l && l.songs.length ? `<div class="tasks">${l.songs.slice(0, 8).map((s, i) => `<div class="task"><span class="bar" style="background:${s.path ? "var(--sage)" : "var(--line)"}"></span><button class="main" data-act="mu-play" data-id="${esc(id)}" data-i="${i}" ${s.path ? "" : "disabled"}><span class="title">${esc(s.title)}</span><span class="meta">${s.artist ? esc(s.artist) : ""}</span></button></div>`).join("")}</div>` : ""}`
    : `<div class="empty">${t("还没有歌。")}</div><div class="btns"><button class="btn primary" data-tab="bt-songs">${t("去添加歌曲")}</button><button class="btn" data-act="ql-new" data-id="music" data-form="1">＋ ${t("只记一笔")}</button></div>`}`;
  showSheet();
}

/* ============ 周例行任务上的「▶ 学歌」 ============ */
function learnButton(task, routine){
  const id = L.routineListOf(music(), routine, task.child_id || S.childId, lists());
  return id && task.status === "todo" ? `<button class="chip" data-act="mu-learn" data-id="${esc(id)}" data-tid="${esc(task.id)}" title="${esc(t("打开选好的歌单，开始学歌"))}">▶ ${t("学歌")}</button>` : "";
}
/** 周例行编辑表单里的「学歌」选项（自动 / 不显示 / 各个歌单）和保存 */
const routineOpts = () => [["", t("自动")], ["none", t("不显示")], ...lists().map(l => [l.id, listName(l)])];
const routinePickOf = rid => (music().routineList || {})[rid] || "";
async function setRoutineList(rid, value){
  const rl = { ...(music().routineList || {}) };
  if (value) rl[rid] = value; else delete rl[rid];
  await saveMusic({ routineList: rl });
}

/* ============ 点击分发（data-act="mu-…"，由 events.js 转进来） ============ */
async function musicAct(act, el){
  const d = el.dataset, pls = music().playlists;
  switch (act) {
    case "mu-open": openList(d.id); break;
    case "mu-new": nameForm("新建歌单", "", async name => {
      const r = L.createList(pls, name, newId()); if (!r.ok) { nameError(r.error); return false; }
      if (await saveMusic({ playlists: r.playlists })) { refresh(); openList("pl:" + r.id); }
    }); break;
    case "mu-rename": { const p = pls.find(x => "pl:" + x.id === d.id); if (!p) break;
      nameForm("改名", p.name, async name => { const r = L.renameList(pls, p.id, name); if (!r.ok) { nameError(r.error); return false; } if (await saveMusic({ playlists: r.playlists })) { refresh(); openList(d.id); } }); break; }
    case "mu-delete": { const p = pls.find(x => "pl:" + x.id === d.id); if (!p || !confirm(t("删除歌单「{n}」？歌曲不会被删。", { n: p.name }))) break;
      const tp = { ...(music().tilePick || {}) }; for (const k of Object.keys(tp)) if (tp[k] === d.id) delete tp[k];
      const rl = { ...(music().routineList || {}) }; for (const k of Object.keys(rl)) if (rl[k] === d.id) delete rl[k];
      if (await saveMusic({ playlists: L.deleteList(pls, p.id), tilePick: tp, routineList: rl })) { closeSheet(); refresh(); } break; }
    case "mu-add": drawPicker(d.id.replace(/^pl:/, "")); break;
    case "mu-pick": { const id = d.id, on = L.inList(pls, id, d.sid);
      if (await saveMusic({ playlists: on ? L.removeSong(pls, id, d.sid) : L.addSongs(pls, id, [d.sid]) })) drawPicker(id); break; }
    case "mu-pick-done": refresh(); openList("pl:" + d.id); break;
    case "mu-rm": case "mu-up": case "mu-down": {
      const id = cur && cur.replace(/^pl:/, ""); if (!id) break;
      const next = act === "mu-rm" ? L.removeSong(pls, id, d.sid) : L.moveSong(pls, id, d.sid, act === "mu-up" ? -1 : 1);
      if (await saveMusic({ playlists: next })) { refresh(); drawList(); } break; }
    case "mu-play-all": openPlayer(d.id, 0); break;
    case "mu-play": openPlayer(d.id, +d.i || 0); break;
    case "mu-learn": openPlayer(d.id, 0, d.tid); break;
    case "mu-jump": PLY.jump(+d.i || 0); break;
    case "mu-lyrics": SH.lyrics = !SH.lyrics; drawPlayer(); break;
    case "mu-show-player": SH.open = true; drawPlayer(); break;
    case "mu-card-play": openPlayer(d.id, 0, "", { sheet: false }); break;
    case "mu-finish": { const tid = PLY.player().tid; stopPlayer(); closeSheet(); if (tid) { await hs.setTaskStatus(tid, "done"); toast(t("已完成")); } refresh(); break; }
    case "mu-tile-pick": { const tp = { ...(music().tilePick || {}), [S.childId]: d.id };
      if (S.childId && await saveMusic({ tilePick: tp })) { toast(t("已设为 {n} 的音乐格歌单", { n: childName() })); refresh(); if (d.sheet === "tile") openMusicTile(); else if (d.keep) drawList(); } break; }
    case "mu-song-addto": drawAddTo(d.id); break;
    case "mu-addto-toggle": { const on = L.inList(pls, d.id, d.sid);
      if (await saveMusic({ playlists: on ? L.removeSong(pls, d.id, d.sid) : L.addSongs(pls, d.id, [d.sid]) })) drawAddTo(d.sid); break; }
    case "mu-addto-new": nameForm("新建歌单", "", async name => {
      const r = L.createList(pls, name, newId()); if (!r.ok) { nameError(r.error); return false; }
      if (await saveMusic({ playlists: L.addSongs(r.playlists, r.id, [d.sid]) })) { refresh(); drawAddTo(d.sid); }
    }); break;
    case "mu-addto-done": closeSheet(); refresh(); break;
    default: break;
  }
}

export { viewMusic, musicEntry, musicAct, openMusicTile, learnButton, routineOpts, routinePickOf, setRoutineList, stopPlayer, musicCardHTML };
