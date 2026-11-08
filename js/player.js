import { t } from "./core/i18n.js";
import { esc, toast } from "./core/util.js";
import * as L from "./music-lists.js";

/* ============ 音乐播放器（11-07）：一个一直在的播放器，三处共用同一个 ============
   今天页的「🎵 音乐卡」、资源 → 音乐页顶上的「正在播放」、歌单弹层里的「播放 / 学歌」都操作这同一个；
   关掉弹层、换页都不停（以前关弹层就停）。睡前安然开始时会停掉它（hs-music-stop 事件），免得两首歌一起响。
   控制：播放 / 暂停、上一首 / 下一首、拖动进度条（显示 已播 / 总长）、循环方式（🔁 歌单循环 → 🔂 单曲循环 → ➡ 播完就停）、音量（记在本机）。
   锁屏 / 耳机按键：Media Session（播放、暂停、上一首、下一首、拖动）。
   进度和时间每 ~250ms 只改那几个小元素，不重画页面；换歌、播放 / 暂停时通知外面重画（onChange）。 */
const VOL_KEY = "homeschool.v1.musicVol", LOOP_KEY = "homeschool.v1.musicLoop";
const load = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } };
const PL = {
  queue: [], i: 0, listId: "", listName: "", audio: null, url: null, playing: false, loading: false, tid: "",
  loop: ["list", "one", "off"].includes(load(LOOP_KEY, "list")) ? load(LOOP_KEY, "list") : "list",
  vol: Math.min(1, Math.max(0, +load(VOL_KEY, "0.8") || 0.8)),
};
let deps = { songBlob: null, stopPreview: () => {} }, onChange = () => {};
/** music.js 启动时接上：怎么拿音频、停掉别处的试听；状态变了怎么重画 */
export function initPlayer(d, change){ deps = { ...deps, ...d }; onChange = change || onChange; }
export const player = () => PL;
export const hasTrack = () => !!PL.queue[PL.i];
export const current = () => PL.queue[PL.i] || null;

function release(){
  if (PL.audio) { try { PL.audio.pause(); PL.audio.ontimeupdate = PL.audio.onended = PL.audio.onplay = PL.audio.onpause = PL.audio.onloadedmetadata = null; PL.audio.src = ""; } catch { /* 忽略 */ } }
  if (PL.url) URL.revokeObjectURL(PL.url);
  PL.audio = PL.url = null; PL.playing = false;
}
async function playAt(i){
  const s = PL.queue[i]; if (!s) return;
  release(); deps.stopPreview(); PL.i = i; PL.loading = true; onChange();
  try {
    const blob = await deps.songBlob(s);
    if (PL.queue[PL.i] !== s) return;   // 加载期间又换了
    const a = new Audio(); PL.url = URL.createObjectURL(blob); a.src = PL.url; a.volume = PL.vol; a.preload = "auto"; PL.audio = a;
    a.ontimeupdate = tickUI; a.onloadedmetadata = tickUI;
    a.onended = advance;
    a.onplay = () => { PL.playing = true; syncUI(); };
    a.onpause = () => { PL.playing = false; syncUI(); };
    await a.play();
  } catch (e) { PL.playing = false; toast(e.message || t("播放失败")); }
  finally { PL.loading = false; mediaMeta(); onChange(); }
}
function advance(){
  if (PL.loop === "one" && PL.audio) { PL.audio.currentTime = 0; PL.audio.play().catch(() => {}); return; }
  const n = L.nextIndex(PL.i, PL.queue.length, PL.loop);
  if (n < 0) { PL.playing = false; if (PL.audio) PL.audio.currentTime = 0; syncUI(); onChange(); return; }
  playAt(n);
}
/** 从某个歌单的第几首开始（queue = 能播的歌） */
export function playQueue(queue, i = 0, { listId = "", listName = "", tid = "" } = {}){
  if (!queue.length) { toast(t("这个歌单里还没有可以播放的歌")); return; }
  PL.queue = queue; PL.listId = listId; PL.listName = listName; PL.tid = tid;
  playAt(Math.max(0, Math.min(i, queue.length - 1)));
}
export async function toggle(){
  if (!PL.audio) { if (hasTrack()) await playAt(PL.i); return; }
  if (PL.audio.paused) await PL.audio.play().catch((e) => toast(e.message || t("播放失败"))); else PL.audio.pause();
}
export const next = () => { if (!PL.queue.length) return; const n = PL.i + 1 < PL.queue.length ? PL.i + 1 : 0; playAt(n); };
export const prev = () => { if (!PL.queue.length) return; if (PL.audio && PL.audio.currentTime > 3) { PL.audio.currentTime = 0; return; } playAt(L.prevIndex(PL.i, PL.queue.length)); };   // 播了 3 秒以上：回到这首开头
export const jump = (i) => playAt(i);
export function seekFrac(f){ if (PL.audio && PL.audio.duration) PL.audio.currentTime = Math.max(0, Math.min(1, f)) * PL.audio.duration; }
export function setVol(v){ PL.vol = Math.max(0, Math.min(1, v)); if (PL.audio) PL.audio.volume = PL.vol; try { localStorage.setItem(VOL_KEY, String(PL.vol)); } catch { /* 忽略 */ } }
export function cycleLoop(){ PL.loop = PL.loop === "list" ? "one" : PL.loop === "one" ? "off" : "list"; try { localStorage.setItem(LOOP_KEY, PL.loop); } catch { /* 忽略 */ } syncUI(); toast(t(LOOPS[PL.loop][1])); }
export function stop(){ release(); PL.queue = []; PL.i = 0; PL.tid = ""; syncUI(); onChange(); }
window.addEventListener("hs-music-stop", () => { if (PL.audio) PL.audio.pause(); });   // 睡前安然开播

/* ---- 界面：一块播放器控件（size = "card" 今天页 / "page" 音乐页 / "sheet" 弹层）---- */
export const LOOPS = { list: ["🔁", "歌单循环"], one: ["🔂", "单曲循环"], off: ["➡️", "播完就停"] };
const mmss = (s) => (Number.isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");
export function playerControlsHTML(size = "card"){
  const s = current(), a = PL.audio, pos = a && a.duration ? (a.currentTime / a.duration) * 100 : 0;
  const btn = (act, label, ch, cls = "") => `<button type="button" class="pl-btn ${cls}" data-act="${act}" aria-label="${esc(label)}" title="${esc(label)}">${ch}</button>`;
  return `<div class="pl pl-${size}" data-pl>
    <div class="pl-now"><div class="pl-title">${s ? esc(s.title) : esc(t("还没有在播放"))}</div><div class="pl-sub">${s ? `${s.artist ? `${esc(s.artist)} · ` : ""}${esc(PL.listName || "")} · ${PL.i + 1}/${PL.queue.length}` : esc(t("选一个歌单开始"))}</div></div>
    <div class="pl-prog"><span class="pl-cur">${mmss(a?.currentTime || 0)}</span><input class="pl-bar" type="range" min="0" max="100" step="0.1" value="${pos}" aria-label="${esc(t("播放进度"))}" ${s ? "" : "disabled"} style="--p:${pos}%"><span class="pl-dur">${mmss(a?.duration || s?.duration || 0)}</span></div>
    <div class="pl-ctrl">
      ${btn("pl-loop", t(LOOPS[PL.loop][1]), LOOPS[PL.loop][0], "pl-loop")}
      ${btn("pl-prev", t("上一首"), "⏮")}
      ${btn("pl-toggle", PL.playing ? t("暂停") : t("播放"), PL.loading ? "…" : PL.playing ? "❚❚" : "▶", "pl-main")}
      ${btn("pl-next", t("下一首"), "⏭")}
      <label class="pl-vol" title="${esc(t("音量"))}"><span aria-hidden="true">🔈</span><input type="range" min="0" max="1" step="0.05" value="${PL.vol}" data-plvol aria-label="${esc(t("音量"))}"></label>
    </div>
  </div>`;
}
/** 只更新进度、时间（不重画） */
function tickUI(){
  const a = PL.audio; if (!a) return;
  const pos = a.duration ? (a.currentTime / a.duration) * 100 : 0;
  document.querySelectorAll("[data-pl]").forEach((el) => {
    const bar = el.querySelector(".pl-bar"); if (bar && !bar._drag) { bar.value = String(pos); bar.style.setProperty("--p", `${pos}%`); }
    const c = el.querySelector(".pl-cur"); if (c) c.textContent = mmss(a.currentTime);
    const d = el.querySelector(".pl-dur"); if (d && a.duration) d.textContent = mmss(a.duration);
  });
  if ("mediaSession" in navigator && a.duration) { try { navigator.mediaSession.setPositionState({ duration: a.duration, position: a.currentTime, playbackRate: 1 }); } catch { /* 忽略 */ } }
}
/** 播放 / 暂停、循环方式变了：改按钮 */
function syncUI(){
  document.querySelectorAll("[data-pl]").forEach((el) => {
    const m = el.querySelector(".pl-main"); if (m) { m.textContent = PL.loading ? "…" : PL.playing ? "❚❚" : "▶"; m.setAttribute("aria-label", PL.playing ? t("暂停") : t("播放")); }
    const lp = el.querySelector(".pl-loop"); if (lp) { lp.textContent = LOOPS[PL.loop][0]; lp.setAttribute("aria-label", t(LOOPS[PL.loop][1])); lp.title = t(LOOPS[PL.loop][1]); }
  });
  tickUI();
}
function mediaMeta(){
  if (!("mediaSession" in navigator)) return;
  const s = current();
  try {
    navigator.mediaSession.metadata = s ? new MediaMetadata({ title: s.title, artist: s.artist || "", album: PL.listName || t("家庭学堂") }) : null;
    navigator.mediaSession.setActionHandler("play", () => toggle());
    navigator.mediaSession.setActionHandler("pause", () => toggle());
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", () => prev());
    navigator.mediaSession.setActionHandler("seekto", (d) => { if (PL.audio && d.seekTime != null) PL.audio.currentTime = d.seekTime; });
  } catch { /* 忽略 */ }
}
/* 拖动进度条、音量（input 事件，不走 data-act） */
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.classList?.contains("pl-bar") && el.closest("[data-pl]")) { el._drag = true; el.style.setProperty("--p", `${el.value}%`); const a = PL.audio; const c = el.closest("[data-pl]").querySelector(".pl-cur"); if (c && a?.duration) c.textContent = mmss(el.value / 100 * a.duration); }
  else if (el.dataset?.plvol !== undefined) { setVol(+el.value); document.querySelectorAll("[data-plvol]").forEach((x) => { if (x !== el) x.value = el.value; }); }
});
document.addEventListener("change", (e) => { const el = e.target; if (el.classList?.contains("pl-bar") && el.closest("[data-pl]")) { el._drag = false; seekFrac(+el.value / 100); } });

/** data-act="pl-…" */
export const isPlayerAct = (act) => act.startsWith("pl-");
export async function playerAct(act){
  switch (act) {
    case "pl-toggle": await toggle(); break;
    case "pl-next": next(); break;
    case "pl-prev": prev(); break;
    case "pl-loop": cycleLoop(); break;
    case "pl-stop": stop(); break;
  }
}
