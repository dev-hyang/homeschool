// node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { selectAll } from "../js/core/paged.js";

/* ---- 分页读全量（js/core/paged.js）：假的查询构造器，按 range 切片 ---- */
const fakeTable = (n, { failAt = -1 } = {}) => {
  const rows = Array.from({ length: n }, (_, i) => ({ id: i })), calls = [];
  const q = () => ({ range: async (a, b) => { calls.push([a, b]); if (a === failAt) return { data: null, error: { message: "boom" } }; return { data: rows.slice(a, Math.min(b + 1, a + 1000)), error: null }; } });
  return { q, calls };
};

test("selectAll：不到一页只读一次；整好 1000 行多读一次空页；超过 1000 按页接着读", async () => {
  let t = fakeTable(5); let r = await selectAll(t.q); assert.equal(r.data.length, 5); assert.deepEqual(t.calls, [[0, 999]]);
  t = fakeTable(1000); r = await selectAll(t.q); assert.equal(r.data.length, 1000); assert.equal(t.calls.length, 2);
  t = fakeTable(2345); r = await selectAll(t.q); assert.equal(r.data.length, 2345); assert.deepEqual(r.data.map(x => x.id), Array.from({ length: 2345 }, (_, i) => i));
  assert.deepEqual(t.calls, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test("selectAll：max 读够就停，最后一页只要剩下的；出错返回 error", async () => {
  let t = fakeTable(9000); let r = await selectAll(t.q, 2500); assert.equal(r.data.length, 2500); assert.deepEqual(t.calls, [[0, 999], [1000, 1999], [2000, 2499]]);
  t = fakeTable(3000, { failAt: 1000 }); r = await selectAll(t.q); assert.equal(r.data, null); assert.equal(r.error.message, "boom");
});

/* ---- 列表分页（js/pager.js）：在浏览器外跑，先垫上 localStorage / matchMedia / document ---- */
const store = new Map();
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
let narrowScreen = false;
globalThis.matchMedia = () => ({ matches: narrowScreen });
globalThis.document = globalThis.document || { documentElement: {}, title: "" };
const P = await import("../js/pager.js");
const { S } = await import("../js/core/state.js");
const list = Array.from({ length: 47 }, (_, i) => i);

test("每页条数：没选过时宽屏 20、窄屏 10；只接受 5/10/20/50", () => {
  store.clear(); narrowScreen = false; assert.equal(P.pageSize(), 20);
  narrowScreen = true; assert.equal(P.pageSize(), 10);
  P.setPageSize(50); assert.equal(P.pageSize(), 50);
  P.setPageSize(7); assert.equal(P.pageSize(), 50);
  store.clear(); narrowScreen = false;
});

test("paged：只给前一页，有更多才出「继续加载」；继续加载多一页；重置 / 换页签 / 换孩子回到一页", () => {
  S.tab = "res-library"; S.childId = "a";
  let pg = P.paged("x", list); assert.equal(pg.rows.length, 20); assert.match(pg.more, /data-pg-more="x"/);
  P.morePage("x"); pg = P.paged("x", list); assert.equal(pg.rows.length, 40);
  P.morePage("x"); pg = P.paged("x", list); assert.equal(pg.rows.length, 47); assert.equal(pg.more, "");
  assert.equal(P.paged("y", list).rows.length, 20);   // 各列表各记各的
  P.resetPage("x"); assert.equal(P.paged("x", list).rows.length, 20);
  P.morePage("x"); S.tab = "res-scriptures"; assert.equal(P.paged("x", list).rows.length, 20);
  P.morePage("x"); S.childId = "b"; assert.equal(P.paged("x", list).rows.length, 20);
  assert.equal(P.paged("x", list.slice(0, 20)).more, "");   // 刚好一页：不出按钮
});
