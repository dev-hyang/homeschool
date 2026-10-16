/* ============ 圣经书卷、出处解析、经文抓取 ============
   公有领域译本直接从 getBible（api.getbible.net，无需密钥，允许浏览器跨域）取：
     中文：和合本 cus、新译本 cns     英文：WEB web、KJV kjv、ASV asv
   ESV 有版权且 api.esv.org 不允许浏览器直接跨域，需要一个小代理（Supabase Edge Function），在设置里填代理地址。 */
const BOOKS = [
  [1, "创世记", "创", "Genesis", "Gen"], [2, "出埃及记", "出", "Exodus", "Ex|Exod"], [3, "利未记", "利", "Leviticus", "Lev"], [4, "民数记", "民", "Numbers", "Num"], [5, "申命记", "申", "Deuteronomy", "Deut|Dt"],
  [6, "约书亚记", "书", "Joshua", "Josh"], [7, "士师记", "士", "Judges", "Judg|Jdg"], [8, "路得记", "得", "Ruth", "Ruth"], [9, "撒母耳记上", "撒上", "1 Samuel", "1 Sam|1Sam|1 Sa"], [10, "撒母耳记下", "撒下", "2 Samuel", "2 Sam|2Sam|2 Sa"],
  [11, "列王纪上", "王上", "1 Kings", "1 Kgs|1Kgs|1 Ki"], [12, "列王纪下", "王下", "2 Kings", "2 Kgs|2Kgs|2 Ki"], [13, "历代志上", "代上", "1 Chronicles", "1 Chr|1Chr|1 Ch"], [14, "历代志下", "代下", "2 Chronicles", "2 Chr|2Chr|2 Ch"], [15, "以斯拉记", "拉", "Ezra", "Ezra"],
  [16, "尼希米记", "尼", "Nehemiah", "Neh"], [17, "以斯帖记", "斯", "Esther", "Esth|Est"], [18, "约伯记", "伯", "Job", "Job"], [19, "诗篇", "诗", "Psalms", "Psalm|Ps|Pss"], [20, "箴言", "箴", "Proverbs", "Prov|Pr"],
  [21, "传道书", "传", "Ecclesiastes", "Eccl|Ecc"], [22, "雅歌", "歌", "Song of Solomon", "Song|SoS|Song of Songs"], [23, "以赛亚书", "赛", "Isaiah", "Isa|Is"], [24, "耶利米书", "耶", "Jeremiah", "Jer"], [25, "耶利米哀歌", "哀", "Lamentations", "Lam"],
  [26, "以西结书", "结", "Ezekiel", "Ezek|Eze"], [27, "但以理书", "但", "Daniel", "Dan"], [28, "何西阿书", "何", "Hosea", "Hos"], [29, "约珥书", "珥", "Joel", "Joel"], [30, "阿摩司书", "摩", "Amos", "Amos"],
  [31, "俄巴底亚书", "俄", "Obadiah", "Obad|Ob"], [32, "约拿书", "拿", "Jonah", "Jon"], [33, "弥迦书", "弥", "Micah", "Mic"], [34, "那鸿书", "鸿", "Nahum", "Nah"], [35, "哈巴谷书", "哈", "Habakkuk", "Hab"],
  [36, "西番雅书", "番", "Zephaniah", "Zeph|Zep"], [37, "哈该书", "该", "Haggai", "Hag"], [38, "撒迦利亚书", "亚", "Zechariah", "Zech|Zec"], [39, "玛拉基书", "玛", "Malachi", "Mal"],
  [40, "马太福音", "太", "Matthew", "Matt|Mt"], [41, "马可福音", "可", "Mark", "Mk"], [42, "路加福音", "路", "Luke", "Lk"], [43, "约翰福音", "约", "John", "Jn"], [44, "使徒行传", "徒", "Acts", "Ac"],
  [45, "罗马书", "罗", "Romans", "Rom"], [46, "哥林多前书", "林前", "1 Corinthians", "1 Cor|1Cor|1 Co"], [47, "哥林多后书", "林后", "2 Corinthians", "2 Cor|2Cor|2 Co"], [48, "加拉太书", "加", "Galatians", "Gal"], [49, "以弗所书", "弗", "Ephesians", "Eph"],
  [50, "腓立比书", "腓", "Philippians", "Phil|Php"], [51, "歌罗西书", "西", "Colossians", "Col"], [52, "帖撒罗尼迦前书", "帖前", "1 Thessalonians", "1 Thess|1Thess|1 Th"], [53, "帖撒罗尼迦后书", "帖后", "2 Thessalonians", "2 Thess|2Thess|2 Th"], [54, "提摩太前书", "提前", "1 Timothy", "1 Tim|1Tim|1 Ti"],
  [55, "提摩太后书", "提后", "2 Timothy", "2 Tim|2Tim|2 Ti"], [56, "提多书", "多", "Titus", "Tit"], [57, "腓利门书", "门", "Philemon", "Philem|Phm"], [58, "希伯来书", "来", "Hebrews", "Heb"], [59, "雅各书", "雅", "James", "Jas"],
  [60, "彼得前书", "彼前", "1 Peter", "1 Pet|1Pet|1 Pe"], [61, "彼得后书", "彼后", "2 Peter", "2 Pet|2Pet|2 Pe"], [62, "约翰一书", "约一", "1 John", "1 Jn|1Jn|1 Jo"], [63, "约翰二书", "约二", "2 John", "2 Jn|2Jn|2 Jo"], [64, "约翰三书", "约三", "3 John", "3 Jn|3Jn|3 Jo"],
  [65, "犹大书", "犹", "Jude", "Jude"], [66, "启示录", "启", "Revelation", "Rev"]
];
const norm = s => s.toLowerCase().replace(/[\s.．·]/g, "").replace(/[：:]/g, ":");
// 名字 → 书号（中文全名、中文简称、英文全名、英文缩写）；中文简称只在后面紧跟数字时才算，避免“约”误判
const BOOK_INDEX = new Map();
for (const [n, zh, zhAbbr, en, enAbbr] of BOOKS) { BOOK_INDEX.set(norm(zh), n); BOOK_INDEX.set(norm(zhAbbr), n); BOOK_INDEX.set(norm(en), n); for (const a of enAbbr.split("|")) BOOK_INDEX.set(norm(a), n); }
const book = n => BOOKS.find(b => b[0] === n);

/* "约翰福音 3:16-18" / "约 3：16" / "诗篇 23" / "1 John 4:19" / "Psalm 100" → { n, zh, en, chapter, from, to } 或 null */
function parseRef(ref){
  const s = String(ref || "").trim().replace(/[：]/g, ":").replace(/[－—–~～]/g, "-").replace(/\s+/g, " ");
  const m = s.match(/^(.+?)\s*(\d+)(?::(\d+)(?:-(\d+))?)?\s*$/); if (!m) return null;
  const name = norm(m[1]); if (!name) return null;
  const n = BOOK_INDEX.get(name); if (!n) return null;
  const b = book(n), chapter = +m[2], from = m[3] ? +m[3] : null, to = m[4] ? +m[4] : from;
  return { n, zh: b[1], en: b[3], chapter, from, to, label: `${b[1]} ${chapter}${from ? ":" + from + (to && to !== from ? "-" + to : "") : ""}`, labelEn: `${b[3]} ${chapter}${from ? ":" + from + (to && to !== from ? "-" + to : "") : ""}` };
}

/* ---- 抓取 ---- */
const ZH = { "和合本": "cus", "新译本": "cns" }, EN = { WEB: "web", KJV: "kjv", ASV: "asv" };
const cache = new Map();
async function chapter(abbr, n, ch){
  const key = `${abbr}/${n}/${ch}`; if (cache.has(key)) return cache.get(key);
  const r = await fetch(`https://api.getbible.net/v2/${abbr}/${n}/${ch}.json`); if (!r.ok) throw new Error(`getBible ${r.status}`);
  const j = await r.json(); cache.set(key, j); return j;
}
// 取一段经文；返回 { text, version }。版本名就是用户看到的译本标签。
async function fetchPassage(ref, version, esvProxy){
  const p = typeof ref === "string" ? parseRef(ref) : ref; if (!p) throw new Error("看不懂这个出处");
  if (version === "ESV") {
    if (!esvProxy) throw new Error("ESV 需要在设置里填代理地址");
    const r = await fetch(`${esvProxy}${esvProxy.includes("?") ? "&" : "?"}q=${encodeURIComponent(p.labelEn)}`); if (!r.ok) throw new Error(`ESV 代理 ${r.status}`);
    const j = await r.json(); const text = (j.text || (j.passages && j.passages[0]) || "").replace(/\s+/g, " ").trim();
    if (!text) throw new Error("ESV 没有返回经文"); return { text, version: "ESV" };
  }
  const abbr = ZH[version] || EN[version]; if (!abbr) throw new Error(`不支持自动抓取 ${version}`);
  const j = await chapter(abbr, p.n, p.chapter);
  const verses = (j.verses || []).filter(v => p.from == null || (v.verse >= p.from && v.verse <= p.to));
  if (!verses.length) throw new Error("没有这节经文");
  const zh = !!ZH[version];
  const text = verses.map(v => String(v.text || "").replace(/^[「\s　]+/, "").trim()).join(zh ? "" : " ").replace(/\s+/g, " ").trim();
  return { text, version };
}
const canFetch = (version, esvProxy) => !!(ZH[version] || EN[version] || (version === "ESV" && esvProxy));

export { BOOKS, parseRef, fetchPassage, canFetch, ZH as ZH_SOURCES, EN as EN_SOURCES };
