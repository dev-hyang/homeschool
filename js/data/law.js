/* ============ 各州在家教育法规摘要 ============
   整理自官方与权威来源，附日期；不是法律意见。新增州时在这里加一个对象。 */
const LAWS = {
  IL: {
    name: "伊利诺伊州 Illinois",
    asOf: "2026-10-16",
    verdict: "不需要申请、登记或报备。州法把在家教育视为私立学校，在家开始即可。",
    rows: [
      ["申请 / 登记", "不需要。州教育委员会 ISBE 明确说没有任何表格、文件或程序是州法要求的。ISBE 有一张自愿填写的登记表 87-02，不填也合法。"],
      ["义务教育年龄", "6 到 17 岁。6 岁前不受约束。"],
      ["必须教的科目", "语言艺术、数学、生物与物理科学、社会科学、美术、体育与健康，程度要至少相当于公立学校。"],
      ["教学语言", "核心课程须用英语教学。双语没问题，但英语不能缺席。"],
      ["考试 / 成绩上报", "不需要，也不需要向任何机构提交。"],
      ["家长资质", "没有要求。"],
      ["免疫记录", "在家教育不要求。"],
      ["从公立学校退出", "州法没有正式程序，ISBE 建议给学校一封注明日期的退学信并留底，否则孩子可能被记为旷课。"],
      ["不合规的后果", "按旷课处理：所在县的 Regional Office of Education 先调查，可转旷课官；家长可能构成 C 级轻罪。"]
    ],
    basis: "学校法典第 26-1 条（105 ILCS 5/26-1）义务教育条款及其私立学校豁免；1950 年 People v. Levisen 判例确立家庭可以构成私立学校。",
    forUs: [
      "两个孩子都在 6 岁前，目前没有任何法律动作要做。",
      "6 岁起，真正要能说明的是：六大领域都在教、程度相当、用英语。报告页的每科时长和内容记录就是证据。",
      "建议留存：课程清单、每日或每周记录、读过的书目、作品样本。"
    ],
    watch: {
      title: "立法动向",
      text: "2025 年的 HB 2827《Homeschool Act》曾要求每年向学区提交申报表、家长须有高中文凭、旷课官可索要作品集。它在 2025 年 6 月会期结束时死在众议院规则委员会，没有进入参议院。HSLDA 和 ICHE 都预期支持者会换个形式再提；原提案人已于 2025 年 10 月转任上诉法院法官。截至整理日没有查到 2026 年的新法案编号。",
      actions: ["加入 HSLDA 的伊利诺伊州邮件通知", "关注 ICHE（伊利诺伊基督徒在家教育者协会）的法律更新页", "每年开学季重新核对一次本页"]
    },
    sources: [
      ["ISBE Homeschooling", "https://www.isbe.net/pages/homeschool.aspx"],
      ["HSLDA Illinois", "https://hslda.org/legal/illinois"],
      ["HSLDA: Bad Bill Officially Dead in Illinois (2025-06-03)", "https://hslda.org/post/bad-bill-officially-dead-in-illinois"],
      ["ICHE HB2827 updates", "https://iche.org/legal/hb2827-updates"],
      ["Capitol News Illinois: homeschool bill stalls", "https://capitolnewsillinois.com/news/homeschool-bill-stalls-in-illinois-house-but-sponsor-says-its-still-alive/"],
      ["Chicago Public Schools homeschooling policy (2023)", "https://www.cpsboe.org/content/actions/2023_06/23-0628-PO3.pdf"]
    ],
    caveat: "年龄范围来自 HSLDA 州法概览和芝加哥公立学校 2023 年政策文件，两者一致；法条原文页面当时无法打开。正式决定前可致电 ICHE 847-603-1259 确认。"
  }
};
const DEFAULT_STATE = "IL";

export { LAWS, DEFAULT_STATE };
