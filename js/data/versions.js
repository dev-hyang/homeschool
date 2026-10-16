/* ============ 圣经译本 ============
   经文卡的中英文各自标明译本；这里只是常见选项，表单里也可以自填。 */
const VERSIONS_ZH = ["和合本", "和合本修订版", "新译本", "当代译本", "新汉语译本", "参考译文"];
const VERSIONS_EN = ["ESV", "NASB", "NIV", "KJV", "NKJV", "NLT", "CSB", "NIrV"];
const DEFAULT_ZH = "和合本", DEFAULT_EN = "ESV";
// "（和合本）" / "(ESV)"，没有译本时为空串
const vz = s => s && s.version_zh ? `（${s.version_zh}）` : "";
const ve = s => s && s.version_en ? ` (${s.version_en})` : "";

export { VERSIONS_ZH, VERSIONS_EN, DEFAULT_ZH, DEFAULT_EN, vz, ve };
