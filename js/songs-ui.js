/* ============ 歌单行的手势 ============
   · 右滑：露出红色「删除」，滑过约三分之一行宽松手 → 删除（先确认）；
   · 左滑：露出蓝色「加到流程」，滑过约三分之一行宽松手 → 打开「加到流程」选择页（睡前流程的某一步，或冲突 / 情绪话题的推荐歌曲）；
   · 长按最右边的 ⋮⋮（约 0.4 秒，手机会轻震一下）→ 这一行浮起，上下拖动调顺序，松手保存；
   · 键盘 / 读屏：⋮⋮ 上按 ↑ ↓ 移动；删除和「加到流程」在歌曲的编辑页里也有按钮。
   行结构：.song-row > .song-bg（背后的两个标签）+ .song-in（前面那一层，跟着手指走）。只管 .song-row，别的列表不受影响。
   触摸：行上 touch-action: pan-y（竖向滚动照常，横向手势交给这里）；⋮⋮ 上 touch-action: none（长按拖动）。 */
const START = 8, LONG = 380;
let cb = { onDelete: null, onAdd: null, onReorder: null }, st = null, swallow = false;
const rowOf = n => n && n.closest && n.closest(".song-row");
const setX = (row, x) => { row.style.setProperty("--x", x + "px"); row.classList.toggle("to-right", x > 0); row.classList.toggle("to-left", x < 0); };
const threshold = row => Math.min(130, row.offsetWidth * 0.35);

function down(e){
  const row = rowOf(e.target); if (!row || (e.button != null && e.button !== 0)) return;
  const handle = e.target.closest(".song-handle");
  if (handle) { st = { kind: "press", row, pid: e.pointerId, x0: e.clientX, y0: e.clientY, timer: setTimeout(() => startDrag(), LONG) }; return; }
  if (e.target.closest(".acts button, input, select, textarea")) return;   // 播放等按钮不当作滑动的起点
  st = { kind: "maybe", row, pid: e.pointerId, x0: e.clientX, y0: e.clientY };
}
function move(e){
  if (!st || e.pointerId !== st.pid) return;
  const dx = e.clientX - st.x0, dy = e.clientY - st.y0;
  if (st.kind === "maybe") {
    if (Math.abs(dx) > START && Math.abs(dx) > Math.abs(dy) * 1.3) { st.kind = "swipe"; try { st.row.setPointerCapture(e.pointerId); } catch (x) { /* 忽略 */ } st.row.classList.add("swiping"); }
    else if (Math.abs(dy) > START) { st = null; return; }
  }
  if (st.kind === "swipe") { setX(st.row, dx); st.row.classList.toggle("ready", Math.abs(dx) > threshold(st.row)); }
  else if (st.kind === "press" && Math.hypot(dx, dy) > 8) { clearTimeout(st.timer); st = null; }   // 长按之前就动了：不是长按
  else if (st.kind === "drag") dragMove(e);
}
function up(e){
  if (!st || e.pointerId !== st.pid) return;
  clearTimeout(st.timer);
  const { kind, row } = st;
  if (kind === "swipe") {
    const dx = e.clientX - st.x0, th = threshold(row), id = row.dataset.id;
    swallow = true; setTimeout(() => { swallow = false; }, 350);
    row.classList.remove("swiping", "ready"); setX(row, 0);
    if (dx > th && cb.onDelete) cb.onDelete(id); else if (dx < -th && cb.onAdd) cb.onAdd(id);
  } else if (kind === "drag") endDrag();
  st = null;
}
function cancel(){ if (!st) return; clearTimeout(st.timer); if (st.kind === "swipe") { st.row.classList.remove("swiping", "ready"); setX(st.row, 0); } if (st.kind === "drag") endDrag(true); st = null; }

/* ---- 长按拖动排序 ---- */
function startDrag(){
  if (!st || st.kind !== "press") return;
  const row = st.row; st.kind = "drag"; st.list = row.parentElement; st.base = row.offsetTop;
  row.classList.add("dragging"); try { row.setPointerCapture(st.pid); } catch (x) { /* 忽略 */ }
  if (navigator.vibrate) { try { navigator.vibrate(15); } catch (x) { /* 忽略 */ } }
}
function dragMove(e){
  const row = st.row, list = st.list, y = e.clientY;
  const sib = [...list.querySelectorAll(".song-row")].filter(r => r !== row);
  for (const s of sib) {
    const r = s.getBoundingClientRect(), mid = r.top + r.height / 2, below = row.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING;
    if (below && y > mid) { list.insertBefore(row, s.nextSibling); break; }
    if (!below && y < mid) { list.insertBefore(row, s); break; }
  }
  row.style.transform = `translateY(${y - st.y0 - (row.offsetTop - st.base)}px)`;
}
function endDrag(abort){
  const row = st.row, list = st.list; row.style.transform = ""; row.classList.remove("dragging");
  swallow = true; setTimeout(() => { swallow = false; }, 350);
  if (!abort && cb.onReorder) cb.onReorder([...list.querySelectorAll(".song-row")].map(r => r.dataset.id), row.dataset.id);
}
/* 键盘：⋮⋮ 上按 ↑ ↓ */
function key(e){
  const h = e.target.closest && e.target.closest(".song-handle"); if (!h || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
  e.preventDefault();
  const row = rowOf(h), rows = [...row.parentElement.querySelectorAll(".song-row")], i = rows.indexOf(row), j = i + (e.key === "ArrowUp" ? -1 : 1);
  if (j < 0 || j >= rows.length) return;
  const ids = rows.map(r => r.dataset.id); [ids[i], ids[j]] = [ids[j], ids[i]];
  if (cb.onReorder) cb.onReorder(ids, row.dataset.id);
}

function initSongRows(callbacks){
  cb = { ...cb, ...callbacks };
  document.addEventListener("pointerdown", down, { passive: true });
  document.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("pointerup", up, { passive: true });
  document.addEventListener("pointercancel", cancel, { passive: true });
  document.addEventListener("keydown", key);
  document.addEventListener("click", e => { if (swallow && rowOf(e.target)) { e.preventDefault(); e.stopPropagation(); } }, true);   // 手势结束时别当成点击
  document.addEventListener("contextmenu", e => { if (e.target.closest && e.target.closest(".song-handle")) e.preventDefault(); });   // 长按不弹系统菜单
}

export { initSongRows };
