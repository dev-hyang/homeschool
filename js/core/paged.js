/* ============ 分页读全量：PostgREST 每次最多回 1000 行（max-rows），.limit() 写多大都会被截断 ============
   q() 每次返回一条新的查询（筛选写好，排序要确定：最后用唯一列兜底，比如 .order("id")），这里按 1000 行一页 .range() 读到底。
   max：最多要几行（读够就停）。返回 { data, error }，和直接 await 一条查询的形状一样，调用处照旧用。
   同样的循环在 js/backup.js 的 readAll 里（那边没排序、表没建时当空，单独留着）。 */
const PAGE = 1000;
async function selectAll(q, max = Infinity){
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await q().range(from, Math.min(from + PAGE, max) - 1);
    if (error) return { data: null, error };
    out.push(...(data || []));
    if (!data || data.length < PAGE || out.length >= max) return { data: out, error: null };
  }
}

export { selectAll };
