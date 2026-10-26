/* ============ 资源库、日常点子、各州法规、介绍页、成套经文说明的英文 ============
   键是中文原文，值是英文，由 data/content-en.js 登记。没有英文的照原样显示中文。 */
const SEEDS_EN = {
  "Pre-K 起步课程": "Pre-K starter courses", "中文识字：三字经远古篇 1–4 课": "Chinese literacy: Three-Character Classic, Ancient Times, lessons 1–4",
  "起初神造天地": "In the beginning God created heaven and earth", "神造人，有神的形象": "God makes people in his image", "人犯罪": "People sin", "挪亚": "Noah",
  "从创造到约瑟（故事圣经上）": "From creation to Joseph (Story Bible, part 1)", "英文：字母与音 A–M": "English: letters and sounds A–M", "英文：字母与音 N–Z": "English: letters and sounds N–Z",
  "英文：CVC 拼读与常见词": "English: CVC blending and sight words", "英文：短句朗读": "English: reading short sentences",
  "中文：三字经远古篇": "Chinese: Three-Character Classic, Ancient Times", "中文：三字经民族篇": "Chinese: Three-Character Classic, The Nation", "中文：三字经兴衰篇": "Chinese: Three-Character Classic, Rise and Fall",
  "数到 10、形状、规律": "Count to 10, shapes, patterns", "数到 20、比较、简单加减": "Count to 20, comparing, simple adding and taking away", "我们家与圣经时间线": "Our family and the Bible timeline", "教会历史小人物": "Church history figures",
  "秋天：树叶、种子、天气": "Autumn: leaves, seeds, weather", "每月一首诗歌、一幅画": "One hymn and one painting a month", "每月一首诗歌、一位音乐家": "One hymn and one composer a month", "每月一首诗歌、手工与戏剧": "One hymn a month, crafts and drama",
  "听从、感恩、收拾": "Obedience, thankfulness, tidying", "分享、诚实、耐心": "Sharing, honesty, patience", "勤劳、善良、为人祷告": "Diligence, kindness, praying for others",
  "Pre-K 目标": "Pre-K goals", "能背 20 节经文": "Memorise 20 verses", "能用自己的话讲 10 个圣经故事": "Tell 10 Bible stories in my own words", "会唱 10 首诗歌": "Sing 10 hymns",
  "认全英文字母及其音": "Know all the English letters and their sounds", "认读约 200–300 个中文字": "Recognise about 200–300 Chinese characters", "能自己翻书从头读到尾（看图讲）": "Page through a book from start to finish by myself (telling it from the pictures)",
  "能数到 20，再到 100": "Count to 20, then to 100", "认识常见形状和简单规律": "Know common shapes and simple patterns", "能描述四季和一周天气": "Describe the four seasons and a week of weather",
  "能说出自己家族三代人的名字和来处": "Name three generations of my family and where they came from", "每天自己收拾玩具、穿脱衣服": "Tidy my toys and dress myself every day", "会为别人祷告": "Pray for others",
  "吹号者 · 在家教育": "Trumpeter · Homeschooling", "吹号者": "Trumpeter", "理念": "Vision", "社群": "Community",
  "华人基督徒在家教育的起步路径、讲座与 Telegram 群": "Getting-started path, talks and Telegram groups for Chinese Christian homeschoolers",
  "如何開始在家教育（吹号者）": "How to start homeschooling (Trumpeter)", "从全家一起敬拜神开始的六步": "Six steps that begin with worshipping God as a family",
  "在家教育常用教材和网站（吹号者）": "Common homeschool curricula and websites (Trumpeter)", "教材清单": "Curriculum list", "2021 年整理的英文课程清单与选教材建议": "A 2021 list of English curricula with advice on choosing",
  "用中文教导圣经 TBIC《基督教新编三字经》": "Teaching the Bible in Chinese: TBIC, the New Christian Three-Character Classic", "识字": "Literacy", "三字韵文讲救恩史，边识字边学圣经，有家庭教育版": "Three-character rhymes tell the story of salvation, so children learn characters and the Bible together; a family edition is available",
  "新城要理问答 · 简体中文": "New City Catechism · Simplified Chinese", "52 问官方简体译本；App 免费含儿童歌曲": "Official Simplified Chinese translation of the 52 questions; the free app includes children’s songs",
  "华人基督教教材推荐（含华恩儿童教理问答）": "Chinese Christian curriculum recommendations (including the Huaen children’s catechism)", "华人青少年基督教教育网": "Chinese Youth Christian Education Network", "主日学": "Sunday school", "教理问答": "Catechism",
  "中文主日学、儿童圣经故事、诗歌与书店的大清单，部分链接已失效": "A large list of Chinese Sunday school materials, children’s Bible stories, hymns and bookstores; some links are dead",
  "夏洛特·梅森": "Charlotte Mason", "免费": "Free", "6 岁前不上正式课：户外、家务、共读、自然观察": "No formal lessons before age 6: outdoors, chores, reading together, nature observation",
  "拼读": "Phonics", "每天 20 分钟，轻脚本；Pre-reading 约 $120": "20 minutes a day with a light script; Pre-reading about $120", "教具": "Hands-on materials", "掌握式进度，教具加视频": "Mastery-based pacing with manipulatives and videos",
  "全科": "All subjects", "传统教材式，K5 每个字母配一节经文": "Traditional textbook style; in K5 each letter comes with a Bible verse", "前阅读": "Pre-reading", "圣经课 Bible Truths K4 单独购买": "The Bible Truths K4 course is bought separately",
  "共读": "Read-aloud", "书单": "Book list", "以文学为本，书单可作阅读参考": "Literature-based; the book list is a handy reading reference",
  "My Father's World 早期课程": "My Father’s World early-years courses", "2–3 岁、Pre-K、K 各有整年包": "Full-year packages for ages 2–3, Pre-K and K", "古典": "Classical", "绘本": "Picture books", "绘本清单质量高": "A high-quality picture-book list",
  "在线": "Online", "免费 180 天课程，学前为 Getting Ready 1": "Free 180-day course; for preschool use Getting Ready 1", "Apologia Young Explorers 适用年龄": "Apologia Young Explorers age range", "创造论": "Creation science",
  "K–6；学前用配套绘本单": "K–6; for preschool use the matching picture-book list", "故事圣经": "Story Bible", "44 个故事，每个指向基督；有中英双语版": "44 stories, each pointing to Christ; a Chinese–English edition is available",
  "州法概览与法案通知": "State-law overview and bill alerts", "ICHE 伊利诺伊基督徒在家教育者协会": "ICHE, the Illinois Christian Home Educators association", "法律更新、支持小组、年会": "Legal updates, support groups, annual convention",
  "北卡 DNPE 在家教育": "North Carolina DNPE homeschooling", "备案与测试要求（参考）": "Notice-of-intent and testing requirements (reference)"
};
export { SEEDS_EN };
