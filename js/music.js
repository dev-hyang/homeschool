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

/* ============ 播放 / 学歌 ============ */
const P = { open: false, listId: "", queue: [], i: 0, audio: null, url: null, loop: "list", lyrics: true, tid: "", playing: false };
function stopAudio(){
  if (P.audio) { try { P.audio.pause(); P.audio.onended = null; P.audio.ontimeupdate = null; } catch (e) { /* 忽略 */ } }
  if (P.url) URL.revokeObjectURL(P.url);
  P.audio = P.url = null; P.playing = false;
}
function stopPlayer(){ stopAudio(); P.open = false; P.tid = ""; }
async function playAt(i){
  const s = P.queue[i]; if (!s) return;
  stopAudio(); stopPreview();
  try {
    const blob = await songBlob(s);
    if (!P.open) return;   // 加载期间用户已经关了
    const a = new Audio(URL.createObjectURL(blob));
    P.url = a.src; P.audio = a; P.i = i; P.playing = true;
    a.onended = advance;
    a.ontimeupdate = () => { const b = $("#muBar"); if (b && a.duration) b.value = String(a.currentTime / a.duration * 100); };
    await a.play();
  } catch (e) { P.playing = false; toast(e.message || t("播放失败")); }
  drawPlayer();
}
function advance(){
  const n = L.nextIndex(P.i, P.queue.length, P.loop);
  if (n < 0) { stopAudio(); drawPlayer(); return; }
  if (P.loop === "one" && P.audio) { P.audio.currentTime = 0; P.audio.play().catch(() => {}); return; }
  playAt(n);
}
function openPlayer(listId, i = 0, tid = ""){
  const l = L.findList(lists(), listId), q = L.playable(l ? l.songs : []);
  if (!q.length) { toast(t("这个歌单里还没有可以播放的歌")); return; }
  P.open = true; P.listId = listId; P.queue = q; P.tid = tid;
  const start = l.songs[i] ? Math.max(0, q.findIndex(s => s.id === l.songs[i].id)) : 0;
  playAt(start);
}
const LOOPS = { list: ["🔁", "循环播放这个歌单"], one: ["🔂", "单曲循环"], off: ["➡", "播完就停"] };
function drawPlayer(){
  if (!P.open) return;
  const s = P.queue[P.i], l = L.findList(lists(), P.listId), lines = String(s?.lyrics || "").split(/\r?\n/);
  $("#sheetIn").innerHTML = `${head(esc(t(P.tid ? "学歌" : "播放")))}
  <p class="small muted" style="margin-top:0">${esc(l ? listName(l) : "")} · ${P.i + 1}/${P.queue.length}</p>
  <h2 style="margin:4px 0">${esc(s?.title || "")}</h2>${s?.artist ? `<p class="small muted" style="margin:0 0 8px">${esc(s.artist)}</p>` : ""}
  <input id="muBar" type="range" min="0" max="100" step="0.1" value="0" style="width:100%" aria-label="${esc(t("播放进度"))}">
  <div class="btns" style="justify-content:center"><button class="btn" data-act="mu-prev" aria-label="${esc(t("上一首"))}">⏮</button><button class="btn primary" data-act="mu-toggle" aria-label="${esc(P.playing ? t("暂停") : t("播放"))}">${P.playing ? "⏸" : "▶"}</button><button class="btn" data-act="mu-next" aria-label="${esc(t("下一首"))}">⏭</button>
    <button class="btn" data-act="mu-loop" aria-label="${esc(t(LOOPS[P.loop][1]))}" title="${esc(t(LOOPS[P.loop][1]))}">${LOOPS[P.loop][0]}</button>
    <button class="btn" data-act="mu-lyrics" aria-pressed="${P.lyrics}">${t("歌词")}</button></div>
  ${P.lyrics ? (s?.lyrics ? `<div class="panel" style="font-size:1.25em;line-height:1.9;text-align:center;max-height:38vh;overflow:auto">${lines.map(x => x.trim() ? `<div>${esc(x)}</div>` : `<div style="height:.8em"></div>`).join("")}</div>${s.lyrics_ai ? `<p class="small muted">${t("这段歌词是 AI 补的，可能和原唱有出入。")}</p>` : ""}` : `<p class="small muted">${t("这首歌还没有歌词：到歌曲编辑页粘贴，或点「让 AI 补词」。")}</p>`) : ""}
  <details style="margin-top:8px"><summary>${t("歌单里的歌")}</summary><div class="tasks">${P.queue.map((x, i) => `<button type="button" class="task" data-act="mu-jump" data-i="${i}" style="width:100%;text-align:left"><span class="bar" style="background:${i === P.i ? "var(--honey)" : "var(--sage)"}"></span><span class="main"><span class="title">${i === P.i ? "♪ " : ""}${esc(x.title)}</span></span></button>`).join("")}</div></details>
  <div class="btns"><button class="btn" data-act="ql-new" data-id="music" data-form="1">＋ ${t("记一笔")}</button>${P.tid ? `<button class="btn primary" data-act="mu-finish">${t("学完了 ✓ 完成这项任务")}</button>` : ""}</div>`;
  showSheet();
  const bar = $("#muBar"); if (bar) bar.oninput = e => { if (P.audio && P.audio.duration) P.audio.currentTime = e.target.value / 100 * P.audio.duration; };
}
$("#sheet")?.addEventListener("close", () => { if (P.open) stopPlayer(); });

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
    case "mu-prev": playAt(L.prevIndex(P.i, P.queue.length)); break;
    case "mu-next": { const n = L.nextIndex(P.i, P.queue.length, P.loop === "one" ? "list" : P.loop); if (n >= 0) playAt(n); break; }
    case "mu-jump": playAt(+d.i || 0); break;
    case "mu-toggle": if (P.audio) { if (P.audio.paused) { await P.audio.play().catch(() => {}); P.playing = true; } else { P.audio.pause(); P.playing = false; } drawPlayer(); } else playAt(P.i); break;
    case "mu-loop": P.loop = P.loop === "list" ? "one" : P.loop === "one" ? "off" : "list"; drawPlayer(); break;
    case "mu-lyrics": P.lyrics = !P.lyrics; drawPlayer(); break;
    case "mu-finish": { const tid = P.tid; stopPlayer(); closeSheet(); if (tid) { await hs.setTaskStatus(tid, "done"); toast(t("已完成")); } refresh(); break; }
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

export { viewMusic, musicEntry, musicAct, openMusicTile, learnButton, routineOpts, routinePickOf, setRoutineList, stopPlayer };
