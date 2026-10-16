/* ============ 各州在家教育法规摘要 ============
   整理自各州官方页面、法条和 HSLDA 州页，附整理日期；不是法律意见。
   默认伊利诺伊，其余四州供搬家或比较时参考。新增州时在这里加一个对象即可。 */
const LAWS = {
  IL: {
    name: "伊利诺伊州 Illinois",
    asOf: "2026-10-16",
    level: "最宽松：无需通知",
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
  },

  MI: {
    name: "密歇根州 Michigan",
    asOf: "2026-10-16",
    level: "宽松：无需通知（走豁免 f）",
    verdict: "走学校法典的家庭教育豁免（exemption f）不需要向任何人报备，教满法定的八个科目即可。另一条路是登记为非公立学校，要报表和教师资质，一般家庭不选。",
    rows: [
      ["申请 / 登记", "豁免 f 不需要。州教育厅 MDE 的在家教育登记表是自愿的，只有向本地学区申请特殊教育服务时才需要填。"],
      ["义务教育年龄", "6 岁到 18 岁生日（2009 年 12 月后满 11 岁的孩子适用 18 岁上限）。"],
      ["必须教的科目", "法条列明八科：阅读、拼写、数学、科学、历史、公民、文学、写作、英语语法，须是“有组织的教育计划”。"],
      ["考试 / 成绩上报", "不需要。"],
      ["家长资质", "豁免 f 下没有要求，只要是父母或法定监护人。"],
      ["免疫记录", "不要求。"],
      ["另一条路：登记为非公立学校（豁免 a）", "每年 10 月向 MDE 报 Nonpublic School Membership Report，科目须与公立学校相当；教师须有证书或学士学位，除非以真诚的宗教信念申请豁免。好处是可申请部分辅助服务。"],
      ["执法", "本地中间学区 ISD 负责义务教育执法，被问到时能说明在教这八科即可。"]
    ],
    basis: "Revised School Code, MCL 380.1561(3)(f) 家庭教育豁免与 (3)(a) 州批准的非公立学校豁免。",
    forUs: ["搬去密歇根基本不改变现在的做法，只是科目清单换成法条列的八科，报告页按这八科统计即可。", "两个孩子 6 岁前同样没有任何动作。"],
    watch: { title: "立法动向", text: "整理日未查到待审的在家教育法案。密歇根近年多次有人提出登记制提案但均未通过，建议每年核对一次。", actions: ["关注 HSLDA 密歇根州页", "关注 INCH（Information Network for Christian Homes）"] },
    sources: [
      ["MCL 380.1561（密歇根州议会法条全文）", "https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-380-1561"],
      ["MDE: Exemption (f) Home School", "https://www.michigan.gov/mde/services/flexible-learning/options/nonpub-home/home-school-information/exemption-f-home-school"],
      ["MDE: Nonpublic & Home Schools", "https://www.michigan.gov/mde/services/flexible-learning/options/nonpub-home"],
      ["HSLDA Michigan", "https://hslda.org/legal/michigan"]
    ],
    caveat: "MDE 的网页当时无法直接打开，细节来自法条原文和搜索摘要；非公立学校路径的教师资质规则请以 MDE 当年的手册为准。"
  },

  IN: {
    name: "印第安纳州 Indiana",
    asOf: "2026-10-16",
    level: "宽松：无需通知，但要有出勤记录",
    verdict: "不需要登记或报备，州里也不收任何记录。唯一硬性义务是保存每日出勤记录、教满 180 天、提供“相当于公立学校”的教育。",
    rows: [
      ["申请 / 登记", "不需要。向州教育厅报备是自愿的；从公立学校退学时要书面通知校长。高中阶段退学须签 Withdrawal to Non-Accredited Nonpublic School 表，否则按辍学处理并影响驾照。"],
      ["义务教育年龄", "满 7 岁那年的秋季学期开始，到 18 岁。幼儿园鼓励但不强制。"],
      ["天数", "每学年（7 月 1 日至次年 6 月 30 日）180 天教学，由家长决定上课日和每天时长。"],
      ["出勤记录", "必须保存准确的每日出勤记录（IC 20-33-2-20），本地学区总监或州出勤官可以要求查看。没有规定格式。"],
      ["必须教的科目", "法律要求“相当于公立学校”的教育，但没有定义；非认证私立学校不受州课程内容要求约束。教育厅建议保留持续学习的证据。"],
      ["考试", "不要求。教育厅建议定期做标准化测试，可自费私下进行。"],
      ["家长资质 / 免疫", "都没有要求。"]
    ],
    basis: "Indiana Code 20-33-2（义务教育）：-6 年龄、-12 非认证私立学校、-20 出勤记录、-28 相当教育。",
    forUs: ["如果搬去印第安纳，报告页的“出勤天数”就从锦上添花变成法律义务，今日任务的完成记录正好充当每日出勤。", "180 天按学年计，可跨年度规划。"],
    watch: { title: "立法动向", text: "整理日未查到待审的在家教育法案。", actions: ["关注 HSLDA 印第安纳州页", "关注 IAHE（Indiana Association of Home Educators）"] },
    sources: [
      ["Indiana DOE: Homeschool Help Sheet", "https://www.in.gov/doe/students/homeschool-information/homeschool-help-sheet"],
      ["Indiana DOE: Homeschool FAQ (PDF)", "https://www.in.gov/doe/files/Homeschool-FAQ-21-08-03.pdf"],
      ["Indiana Code Title 20（IC 20-33-2）", "https://iga.in.gov/laws/2025/ic/titles/20"],
      ["HSLDA Indiana", "https://hslda.org/legal/indiana"]
    ],
    caveat: "上限 18 岁来自 HSLDA 概览；教育厅页面只写了“满 7 岁那年秋季开始”。"
  },

  NC: {
    name: "北卡罗来纳州 North Carolina",
    asOf: "2026-10-16",
    level: "中等：要备案、家长要有高中文凭、每年考试",
    verdict: "必须先向州非公立教育司 DNPE 提交开办意向书（Notice of Intent），拿到确认后才能开始；每年要做一次全国标准化测试并留存出勤和免疫记录。",
    rows: [
      ["申请 / 登记", "孩子满 7 岁前至少 5 个工作日提交 Notice of Intent；一户一份，覆盖所有适龄孩子。DNPE 一般 3 到 5 个工作日确认，确认前不要退学或开学。5、6 月不受理，7 月 1 日后再提交。"],
      ["义务教育年龄", "满 7 岁到未满 16 岁。孩子 7 岁前不用备案。"],
      ["家长资质", "授课人至少高中文凭或同等学历（G.S. 115C-564），提交意向书时要附证明。"],
      ["学年", "每年至少 9 个日历月按固定时间表上课，节假日除外。建议每天 5 小时，但不是法律要求。"],
      ["记录", "每个学生的年度出勤记录和免疫记录须保存在家中学校现场。"],
      ["考试", "每个学生每学年考一次全国标准化成就测试，须涵盖英语语法、阅读、拼写、数学；测试种类自选，无最低分要求；成绩至少保存一年，DNPE 可要求查看。首次测试应在意向书确认后 12 个月内完成。"],
      ["结束", "在 DNPE 门户关闭学校或通知 DNPE。"]
    ],
    basis: "N.C. Gen. Stat. Chapter 115C Article 39（非公立学校）：115C-563 家庭学校定义、115C-564 资质与年度测试、115C-548/556 九个月与出勤免疫记录、115C-552/560 意向书。",
    forUs: ["这是五州里要求最具体的一个：7 岁前备案、每年一次标准化测试、文凭证明。报告页的出勤和每科记录在这里是必需品。", "免疫记录按州法有宗教豁免声明的替代方式。"],
    watch: { title: "立法动向", text: "HSLDA 州页列有 Senate Bill 866 的相关文章，状态未查明；DNPE 提到驾照资格证书要求自 2026 年 10 月 1 日起取消。", actions: ["在北卡议会网站查 SB 866 状态", "关注 NCHE（North Carolinians for Home Education）"] },
    sources: [
      ["DNPE: How to Start a Home School in North Carolina", "https://www.doa.nc.gov/divisions/non-public-education/home-schools/requirements-recommendations"],
      ["DNPE: File an Intent to Operate a Home School", "https://www.doa.nc.gov/divisions/non-public-education/home-schools/file-notice-intent"],
      ["DNPE: Standardized Testing Required for Home Schools", "https://www.doa.nc.gov/divisions/non-public-education/home-schools/standardized-testing"],
      ["N.C. Gen. Stat. 115C Article 39", "https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/ByArticle/Chapter_115C/Article_39.html"],
      ["HSLDA North Carolina", "https://hslda.org/legal/north-carolina"]
    ],
    caveat: "DNPE 对首次测试时间的两处说法略有出入（意向书确认后 12 个月内 / 按日历年），稳妥做法是确认后 12 个月内先考一次，之后每年一次。"
  },

  TN: {
    name: "田纳西州 Tennessee",
    asOf: "2026-10-16",
    level: "中等：三选一，独立在家教育要向学区报备",
    verdict: "三条路：独立在家教育（每年向本地学区交意向书，家长须高中文凭或同等学历，每天 4 小时、每年 180 天，5/7/9 年级考试）；挂靠教会相关学校（Category IV，不用交意向书，按学校要求）；或读经认证的在线私立学校。多数基督徒家庭选第二条。",
    rows: [
      ["独立在家教育：报备", "向居住地学区交 Intent to Home School 表，首年无截止日期，之后每学年开学前重交；学年中途可随时退学转入。每个学区有 home school coordinator。"],
      ["独立在家教育：家长资质", "高中文凭或州认可的同等学历（GED、HiSET），随意向书提交证明。"],
      ["独立在家教育：时间与记录", "每天至少 4 小时、每年 180 天；学年结束时把出勤记录交给学区 director of schools。"],
      ["独立在家教育：考试", "5、7、9 年级考标准化测试：家长自选全国常模测试，由非亲属监考，或参加州教育委员会批准的评估。"],
      ["教会相关学校（Category IV 伞校）", "家长在州批准的教会相关学校名下授课，遵守该校要求；不用交意向书，从公立学校退学时可能要出示在读证明；记录、测试和文凭由该校负责。9 到 12 年级家长可能需要文凭。"],
      ["经认证在线学校（Category III）", "属于私立学校而非在家教育，在家上学，须经州教育委员会认可的区域机构认证。"],
      ["义务教育年龄", "6 到 17 岁。"],
      ["免疫", "在家教育不要求。学区每年须向在家教育家庭提供脑膜炎相关信息。"]
    ],
    basis: "Tenn. Code Ann. 49-6-3050（在家教育）与 49-6-3001（义务教育年龄）；田纳西教育厅 Home School 指南（2026 年 6 月修订）。",
    forUs: ["如果搬去田纳西，挂靠教会相关伞校是最省事的路径，吹号者社群里也最常见；独立路径则要每年报备并在 5/7/9 年级考试。", "每天 4 小时的要求只适用于独立路径，且从 K 开始计。"],
    watch: { title: "立法动向", text: "SB 122 / HB 1152（第 114 届）曾提出对使用常模课程的家庭免除多数通知和报告要求，最终状态未查明。", actions: ["在田纳西议会网站查 SB 122 状态", "关注 HSLDA 田纳西州页与 THEA（Tennessee Home Education Association）"] },
    sources: [
      ["Tennessee DOE: Home Schooling in TN", "https://www.tn.gov/education/families/school-options/home-schooling-in-tn.html"],
      ["Tennessee DOE: Independent Home School Requirements (PDF)", "https://www.tn.gov/content/dam/tn/education/nonpublic/Independent_Home_School_Requirements.pdf"],
      ["Tennessee DOE: Home School FAQ (PDF)", "https://www.tn.gov/content/dam/tn/education/nonpublic/Home_School_FAQ.pdf"],
      ["Tennessee Comptroller: Home Schooling in Tennessee (2018)", "https://www.comptroller.tn.gov/content/dam/cot/orea/advanced-search/2018/2018_OREA_Homeschool.pdf"],
      ["HSLDA Tennessee", "https://hslda.org/legal/tennessee"]
    ],
    caveat: "伞校的测试要求各校不同，2018 年的州资料说 Category IV 学生不受州测试要求约束，以所选学校的现行规定为准。"
  }
};
const STATE_ORDER = ["IL", "MI", "IN", "NC", "TN"];
const DEFAULT_STATE = "IL";

export { LAWS, STATE_ORDER, DEFAULT_STATE };
