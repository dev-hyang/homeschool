/* ============ 发布日志的数据（我的 → 发布日志；今天页顶上的「新版本」提示） ============
   每次推送：改 js/core/config.js 的 APP_VERSION，并在最上面加一条同版本号的记录（最新在前）。
   写给家长看：一句话简介 + 1–4 条短要点，不写技术词。k：new 新功能 / better 改进 / fix 修复。 */
export const RELEASES = [
  { v: "2026-11-27.6", title: { zh: "内部整理（界面和用法不变）", en: "Behind-the-scenes tidy-up (no change to how it looks or works)" }, items: [
    { k: "better", zh: "更新了和爱家小助手、牧羊人共用的「切换视图」按钮样式（加了「切换」小字、竖线和 ▾），这个应用里暂时用不到；你现在看到的界面和操作都和上一版一样。", en: "Updated the shared “switch view” button style (a “Switch” label, divider and ▾). This app does not use it yet; nothing you see or do has changed." },
  ] },
  { v: "2026-11-27.5", title: { zh: "内部整理（界面和用法不变）", en: "Behind-the-scenes tidy-up (no change to how it looks or works)" }, items: [
    { k: "better", zh: "更新了和牧羊人、小月亮共用的进度横条（慢慢走满、轮播绕回），以后用得上；你现在看到的界面和操作都和上一版一样。", en: "Updated the progress dashes shared with Shepherd and Baby log (gradual fill, carousel wrap) for later; what you see and how it works are unchanged." }
  ] },
  { v: "2026-11-27.4", title: { zh: "内部整理（界面和用法不变）", en: "Behind-the-scenes tidy-up (no change to how it looks or works)" }, items: [
    { k: "better", zh: "更新了和牧羊人共用的进度横条样式（可带序号、‹ › 和 ⚙），以后用得上；你现在看到的界面和操作都和上一版一样。", en: "Updated the progress-dash styles shared with Shepherd (optional number, ‹ › and ⚙) for later; what you see and how it works are unchanged." }
  ] },
  { v: "2026-11-27.3", title: { zh: "内部整理（界面和用法不变）", en: "Behind-the-scenes tidy-up (no change to how it looks or works)" }, items: [
    { k: "better", zh: "更新了和小月亮、牧羊人共用的记录列表和视图切换样式，以后用得上；你现在看到的界面和操作都和上一版一样。", en: "Updated the record-list and view-switch styles shared with Baby log and Shepherd, for later; what you see and how it works are unchanged." }
  ] },
  { v: "2026-11-27.2", title: { zh: "内部整理（界面和用法不变）", en: "Behind-the-scenes tidy-up (no change to how it looks or works)" }, items: [
    { k: "better", zh: "准备了牧羊人用的记录列表样式（列表 / 时间轴），以后用得上；你现在看到的界面和操作都和上一版一样。", en: "Added the record-list styles (list / timeline) used by Shepherd for later; what you see and how it works are unchanged." }
  ] },
  { v: "2026-11-27.1", title: { zh: "内部整理（界面和用法不变）", en: "Behind-the-scenes tidy-up (no change to how it looks or works)" }, items: [
    { k: "better", zh: "准备了牧羊人用的目录、视图切换和进度条样式，以后用得上；你现在看到的界面和操作都和上一版一样。", en: "Added the directory, view-switch and progress-bar styles used by Shepherd for later; what you see and how it works are unchanged." }
  ] },
  { v: "2026-11-25.2", title: { zh: "可输入的下拉框和爱家小助手统一", en: "Type-in dropdowns now match Pantry" }, items: [
    { k: "better", zh: "疫苗名称、自填项这类「可以输入、也有以前的选择可点」的框，电脑上点进去就列出可选项，打字筛选，点一项填进去并收起；也可以填列表里没有的。手机上继续用手机自带的建议条。", en: "On laptop, type-in fields with suggestions list the options when you click in, filter as you type and close after you pick one; you can still type something new. Phones keep their built-in suggestions." },
  ] },
  { v: "2026-11-25.1", title: { zh: "表单：取消 / 保存固定在底部，不常用的操作收进右上角 ⋯", en: "Forms: Cancel / Save pinned at the bottom, rare actions in the ⋯ menu" }, items: [
    { k: "better", zh: "各个表单和弹出的页面：顶部不再有「关闭」；表单底部固定显示「取消」「保存」，其他页面底部是「关闭」，往下滚动也一直在。", en: "Forms and pop-up pages no longer have a Close button at the top; forms keep Cancel and Save pinned at the bottom, other pages keep a Close button there." },
    { k: "better", zh: "「删除」「加到流程 / 歌单」「按出处抓取经文」这些不常用的操作，收进表单右上角的 ⋯ 菜单，不会再误点。", en: "Delete, Add to routine / playlist and Fetch verse now live in the ⋯ menu at the top right of a form to avoid accidental taps." },
  ] },
  { v: "2026-11-24.12", title: { zh: "菜单行换成共用的行控件", en: "Menu rows use the shared row control" }, items: [
    { k: "better", zh: "「我的」和化验列表等菜单行换成和爱家小助手同一个行控件：同样的最小高度和分隔线（界面几乎不变）。", en: "Menu rows such as Me and the lab list now use the same row control as Home Pantry: same minimum height and dividers (nearly no visible change)." },
  ] },
  { v: "2026-11-24.11", title: { zh: "箭头统一成共用控件", en: "Arrows now use the shared arrow control" }, items: [
    { k: "better", zh: "菜单行右边的箭头、顶部孩子名字旁的小三角、发布日志的箭头，换成和爱家小助手同一个箭头控件（界面几乎不变）。", en: "The arrows on menu rows, the little caret next to the child's name and the release-notes arrow now use the same control as Home Pantry (nearly no visible change)." },
  ] },
  { v: "2026-11-24.10", title: { zh: "表单和对话框底部的按钮：取消靠左、保存靠右", en: "Form and dialog buttons: Cancel on the left, Save on the right" }, items: [
    { k: "better", zh: "按钮条换成和爱家小助手同一个按钮条控件：一个按钮靠右（手机上占满一行）；两个按钮取消靠左、主按钮靠右，以前主按钮在前。", en: "Button rows now use the same control as Home Pantry: one button on the right (full width on phones); with two, Cancel is on the left and the main action on the right (the main action used to come first)." },
  ] },
  { v: "2026-11-24.9", title: { zh: "所有按钮换成统一的按钮控件", en: "All buttons now use the shared button control" }, items: [
    { k: "better", zh: "全站按钮换成和爱家小助手同一个按钮控件：默认 40px、小号 34px，手机上点按区域仍不小于 44px（以前 38 到 46px 不等）。", en: "Every button now uses the same control as Home Pantry: 40 px default, 34 px small, with a tap area still at least 44 px on phones (it used to range from 38 to 46 px)." },
    { k: "fix", zh: "如果哪个页面的按钮看起来不对（颜色、大小、位置），请告诉我，这次是整体替换。", en: "If a button looks wrong on any page (colour, size, position), please tell me; this was a wholesale replacement." },
  ] },
  { v: "2026-11-24.8", title: { zh: "共用样式表多了按钮变量", en: "Shared stylesheet gains button variables" }, items: [
    { k: "better", zh: "同步共用按钮样式，并设置本站主按钮用墨色底（界面不变，下一版起按钮换成共用控件）。", en: "Synced the shared button style and set this app's primary button to the ink colour (no visible change; buttons move to the shared control next)." },
  ] },
  { v: "2026-11-24.7", title: { zh: "共用样式表的按钮点按区域", en: "Shared stylesheet: button tap area" }, items: [
    { k: "better", zh: "和爱家小助手同步共用样式：默认号按钮在手机上的点按区域也不小于 44px（本站暂未使用，界面不变）。", en: "Synced shared styles from Home Pantry: default-size buttons also keep a 44 px tap area on phones (not used here yet; nothing changes on screen)." },
  ] },
  { v: "2026-11-24.6", title: { zh: "共用样式表多了按钮和按钮条", en: "Shared stylesheet gains button and button-row styles" }, items: [
    { k: "better", zh: "和爱家小助手同步共用样式：标准按钮高度（40 / 34px）和按钮条排法（本站暂未使用，界面不变）。", en: "Synced shared styles from Home Pantry: standard button heights (40 / 34 px) and the button-row layout (not used here yet; nothing changes on screen)." },
  ] },
  { v: "2026-11-24.5", title: { zh: "共用样式表多了箭头、行、选项和数字框样式", en: "Shared stylesheet gains arrow, row, option and number-field styles" }, items: [
    { k: "better", zh: "和爱家小助手同步共用样式：箭头、记录行、可选项、弹窗变量、数字框（本站暂未使用，界面不变）。", en: "Synced shared styles from Home Pantry: arrow, row, option, sheet variables, number field (not used here yet; nothing changes on screen)." },
  ] },
  { v: "2026-11-24.4", title: { zh: "用药设置：每种药可以单独关掉顶部卡片", en: "Medicine settings: switch the top card off per medicine" }, items: [
    { k: "better", zh: "「用药设置」里每种药多了「显示 / 不显示在顶部卡片」，和小月亮妈妈用药一样；某种药好了不吃了，选「不显示」，它就不再出现在今天页的用药卡里，记录和趋势照常保留", en: "Each medicine in Medicine settings can be shown or hidden on the top card, like Baby Log mom meds; once one is finished choose Hide and it leaves the Today card while its records and trends stay" },
  ] },
  { v: "2026-11-24.3", title: { zh: "成长 → 用药记录与趋势", en: "Growth → Medicine records & trends" }, items: [
    { k: "new", zh: "成长的「身体与健康」里新增「用药记录与趋势」：近 14 / 30 天每天几次、近 90 天每周几次的柱状图，按药名汇总次数和最近一次，下面是每一次（能搜索、筛类别、列表 / 时间线，点一条改或删）", en: "Growth → Body & health has a new Medicine records & trends page: bars for doses per day (14 / 30 days) or per week (90 days), totals and latest dose per medicine, and every dose below (searchable, filterable, list or timeline, tap to edit or delete)" },
    { k: "better", zh: "今天页用药卡的「历史」直接打开这一页；「病史 · 过敏 · 用药」里的用药列表挪到这里，原处留一个入口", en: "The History button on the Today medicine card opens this page; the medicine list moved here from History · Allergies · Meds, which keeps a link" },
  ] },
  { v: "2026-11-24.2", title: { zh: "孩子用药卡更紧凑", en: "A more compact child medicine card" }, items: [
    { k: "better", zh: "今天页的用药卡缩到和名字卡差不多高：大数字旁边放近 7 天小柱子，服药时机、医嘱和其他药各占一行（放不下就省略），四个按钮排成一排（记一次、历史、设置、隐藏）", en: "The Today medicine card is now close to the name card's height: the 7-day bars sit beside the big number, timing, note and other medicines take one line each, and the four buttons share a row (Log, History, Settings, Hide)" },
    { k: "fix", zh: "用药设置里孩子开关的按钮加高到 44px", en: "The child switches in Medicine settings are now 44 px tall" },
  ] },
  { v: "2026-11-24.1", title: { zh: "今天页顶部：孩子的「距上次用药」大卡片", en: "Today: a Since-last-medicine card for each child" }, items: [
    { k: "new", zh: "孩子最近 14 天有用药记录，今天页顶部就多一张用药卡：距上次多久、哪种药、下次可服时间、服药时机和医嘱、其他药各自多久、近 7 天每天几次", en: "When a child has had a medicine in the last 14 days, Today gets a card with the time since the last dose, which medicine, when the next is allowed, how to take it, the other medicines, and doses per day for the week" },
    { k: "new", zh: "卡片上点「记一次用药」可以指定哪天几点（补记）；「用药设置」里填每种药的最短间隔、服药时机和医嘱，也能决定哪个孩子显示这张卡", en: "Log a medicine from the card, picking the day and time to back-fill; Medicine settings holds each medicine's interval, timing and note, and which children show the card" },
    { k: "better", zh: "康复了点「不再显示」，卡片就不再出现，随时能重新打开；成长 → 病史 · 过敏 · 用药里的修改表单也能填服药时机", en: "Tap Hide once the child has recovered; turn it back on any time. The edit form under Growth → History · Allergies · Meds can note timing too" },
  ] },
  { v: "2026-11-23.1", title: { zh: "共用的小提示控件多了「右上角角标」样式", en: "Shared info-tip control gains a corner-badge style" }, items: [
    { k: "better", zh: "共用的小 i 提示新增贴在文字右上角的小角标形态（小 / 中 / 大三种）；这个应用里现有的提示外观不变", en: "The shared info tip gains a small badge style at the top-right of text (small / medium / large); existing tips in this app look the same" },
  ] },
  { v: "2026-11-22.1", title: { zh: "AI 录入疫苗：更不容易记重", en: "AI intake: fewer duplicate vaccine records" }, items: [
    { k: "fix", zh: "就诊小结里把以前打过的疫苗又列了一遍时，已经记过的（同一种、同一剂次，日期差几天也算）默认不勾，不会再记一份", en: "When a visit summary re-lists shots already given, vaccines you have already recorded (same vaccine and dose, even if the date is a few days off) are left unticked" },
    { k: "better", zh: "让 AI 只读这次就诊当天打的针，跳过重新印出来的接种历史；同一张单子里重复读到的针也只留一条", en: "The AI now reads only shots given at this visit and skips the re-printed history; repeats within one page are kept once" }
  ] },

  { v: "2026-11-20.2", title: { zh: "筛选按钮的数字不再把默认值算进去", en: "The Filter counter no longer counts default values" }, items: [
    { k: "fix", zh: "手机上「筛选 (n)」的数字：默认值不是下拉第一项的筛选（比如默认选「全部历史」），不再被算成已筛选", en: "On phones, the Filter (n) number no longer counts a dropdown that sits at its default value even when the default is not the first option" }
  ] },

  { v: "2026-11-20.1", title: { zh: "修复：选了筛选后不再自动跳进搜索框、弹出键盘", en: "Fix: picking a filter no longer jumps into the search box and opens the keyboard" }, items: [
    { k: "fix", zh: "在各页的筛选条里选了下拉选项后，页面不再自动把光标放进搜索框（手机上也不会弹出键盘）", en: "After choosing a dropdown option in a filter bar, the cursor no longer jumps into the search box (and the phone keyboard stays closed)" }
  ] },
  { v: "2026-11-19.10", title: { zh: "手机上的筛选按钮：时间范围这类默认值不是第一项的下拉不再算进角标", en: "Phone Filters button: dropdowns whose default is not the first option no longer count in the badge" }, items: [
    { k: "better", zh: "手机上「筛选」按钮的数字角标，不再把默认值不是第一项的下拉（例如时间范围）算成已筛选", en: "The number on the phone Filters button no longer counts dropdowns whose default is not the first option (such as a time range)" }
  ] },
  { v: "2026-11-19.9", title: { zh: "手机上的筛选按钮，搜索框包在外框里时位置也对了", en: "The Filters button sits in the right place even when the search box is wrapped" }, items: [
    { k: "better", zh: "手机上“筛选”按钮现在总是排在搜索框后面（以前搜索框包在外框里的页面，按钮会跑到搜索框前面）", en: "On phones the Filters button now always comes after the search box (it used to land before it on pages where the search box is wrapped)" }
  ] },
  { v: "2026-11-19.8", title: { zh: "清理没用到的旧样式", en: "Cleaned up unused old styles" }, items: [
    { k: "better", zh: "删掉了几行没有页面在用的旧样式，外观和功能不变", en: "Removed a few lines of old styles no page uses; nothing looks or works differently" }
  ] },
  { v: "2026-11-19.7", title: { zh: "手机上筛选面板：顶上一行放“筛选”和“清除筛选”", en: "Mobile filter panel: a header row with the title and Clear filters" }, items: [
    { k: "better", zh: "手机上点开“筛选”后，“清除筛选”收进面板第一行（左边“筛选”字样、右边清除），不再单独占一行把搜索框和下拉隔开；点清除后面板保持打开，能马上看到已恢复默认", en: "On phones, Clear filters now sits in the first row of the opened filter panel (title on the left, Clear on the right) instead of a row of its own; after clearing, the panel stays open so you can see the defaults" },
    { k: "better", zh: "“清除筛选”按钮在手机上加高到 44px，更好点", en: "The Clear filters button is 44px tall on phones, easier to tap" }
  ] },
  { v: "2026-11-19.6", title: { zh: "各页的小状态标签统一成共用的徽标样式", en: "Small status labels now use the shared badge style" }, items: [
    { k: "better", zh: "“家主”“已完成”“自定义”“待办提醒”等小标签换成和其他应用一致的徽标样式（字略粗、颜色统一）", en: "Small labels such as Owner, Done, Custom and Due now use the same badge style as the other apps (slightly bolder, consistent colors)" }
  ] },
  { v: "2026-11-19.5", title: { zh: "手机上的小按钮更好点", en: "Small buttons are easier to tap on phones" }, items: [
    { k: "better", zh: "手机上各页的小按钮和小图标按钮加高到 44px，不容易点偏；电脑上外观不变", en: "Small buttons and icon buttons are now 44px tall on phones so they are easier to hit; desktop looks the same" }
  ] },
  { v: "2026-11-19.4", title: { zh: "修复：深色主题下「已选 n 个」这类浅底数字角标的字看不清", en: "Fix: soft count badges unreadable in the dark theme" }, items: [
    { k: "fix", zh: "手动选深色主题时，「已选 n 个」这类浅底数字角标变成深字配深底、几乎看不见，现在恢复清楚", en: "With the dark theme picked manually, soft count badges (like '3 selected') showed dark text on a dark fill; they are readable again" }
  ] },
  { v: "2026-11-19.3", title: { zh: "深色主题下的数字角标看得清了；提示文字可换行", en: "Count badges readable in the dark theme; tips can wrap lines" }, items: [
    { k: "fix", zh: "手动选了深色主题时，数字角标里的字几乎看不清，现在清楚了", en: "With the dark theme picked manually, the numbers inside count badges were nearly unreadable; they are clear now" },
    { k: "better", zh: "共用的提示气泡支持多行文字（现在的页面还没用到，外观不变）", en: "The shared tip bubble can show multi-line text (no page uses it yet, so nothing looks different)" }
  ] },
  { v: "2026-11-19.2", title: { zh: "表单里的输入框、下拉、日期一样高；加入共用的徽标、铃铛、提示样式", en: "Form fields share one height; shared badge, bell and hint styles added" }, items: [
    { k: "better", zh: "表单里的输入框、下拉、日期原来高度差一两个像素，现在一样高", en: "Inputs, dropdowns and dates in forms were a pixel or two apart in height; they now match" },
    { k: "better", zh: "加入一套和爱家小助手共用的徽标、提醒铃铛（带数字 / 红点角标）、问号提示的样式，颜色用本站自己的色板；现在的页面还没用上，外观不变", en: "Added the badge, notification bell (with count / dot) and hint styles shared with the other apps, in this app's own colors; existing pages don't use them yet, so nothing looks different" }
  ] },
  { v: "2026-11-19.1", title: { zh: "修复：发新版后旧页面切换语言偶尔失败", en: "Fix: switching language on an already-open page could fail after an update" }, items: [
    { k: "fix", zh: "应用更新后，之前就开着的页面切换英文 / 繁體偶尔下载失败；现在会自动刷新一次换成新版，不用手动刷新", en: "After an update, a page that was already open could fail to switch to English / Traditional Chinese; it now refreshes itself once to get the new version" }
  ] },
  { v: "2026-11-18.3", title: { zh: "打开更快：英文词典按需下载", en: "Faster to open: the English dictionary downloads only when needed" }, items: [
    { k: "better", zh: "用简体中文时不再下载英文和繁體的词典，发布日志的内容也等要看时才下载，打开更快；用英文或繁體时画面不变", en: "With the Simplified Chinese interface the English and Traditional dictionaries are no longer downloaded, and release notes load only when you view them, so the app opens faster; English and Traditional look the same as before" }
  ] },
  { v: "2026-11-18.2", title: { zh: "应用切换器和语言切换器随应用一起发布", en: "App switcher and language switcher now ship with the app" }, items: [
    { k: "better", zh: "右上角的应用切换和语言切换改为随本应用一起发布，不再临时从别的站点加载，更稳定；用法和外观不变", en: "The app and language switchers in the top corner now ship with this app instead of loading from another site, so they are more reliable; how they look and work is unchanged" }
  ] },
  { v: "2026-11-18.1", title: { zh: "打开更快：程序文件打包发布", en: "Faster to open: app files are now bundled" }, items: [
    { k: "better", zh: "打开应用时要下载的文件从近百个合成了几个，网慢的时候更明显；页面和操作都没有变", en: "The app now downloads a handful of files instead of around ninety when it opens, which helps most on slow connections; pages and actions are unchanged" }
  ] },
  { v: "2026-11-16.10", title: { zh: "修复：手机上滑动时，搜索 / 筛选条盖住底部页签", en: "Fix: the search / filter bar covered the bottom tabs when scrolling on phones" }, items: [
    { k: "fix", zh: "记录列表往下滑，搜索和筛选条滑过屏幕下方时不再盖住底部页签；固定在顶上时紧贴顶栏下面", en: "Scrolling a records list, the search and filter bar no longer covers the bottom tabs as it passes the bottom of the screen; when pinned it sits right under the top strip" },
    { k: "fix", zh: "点开「筛选」时，下拉面板如果会伸到底部页签下面，会先把页面往上推，推不动就向上展开", en: "When the Filters dropdown would run under the bottom tabs, the page scrolls up first, or the dropdown opens upward if it cannot" }
  ] },
  { v: "2026-11-16.9", title: { zh: "化验：去牧羊人录入的入口放进录入表", en: "Labs: the Shepherd entry link now lives inside the entry form" }, items: [
    { k: "better", zh: "化验页只留一个「录入化验」按钮；录入表抬头有「AI 录入」（默认开）和「在牧羊人里录入」，点错不会再跳走", en: "The Labs page keeps one \"Enter labs\" button; the form header has \"AI entry\" (on by default) and \"Enter in Shepherd\", so you won't jump away by mistake" },
    { k: "better", zh: "点「AI 录入」可以收起 / 展开 AI 区，已填的数字不会丢", en: "Tap \"AI entry\" to hide or show the AI area; numbers you already typed are kept" }
  ] },
  { v: "2026-11-16.8", title: { zh: "录入按页面分开：基本体征、体检与就诊、疫苗各有自己的录入", en: "Entry split by page: vital signs, checkups & visits and vaccines each have their own" }, items: [
    { k: "new", zh: "基本体征、体检与就诊、疫苗页各一个录入按钮（「录入基本体征」「录入体检 / 就诊」「录入疫苗」），表单只放这一页相关的内容；默认 AI 录入，可切换成手动录入", en: "Vital signs, Checkups & visits and Vaccines each get their own entry button, and the form holds only what belongs to that page; AI entry by default, switchable to manual" },
    { k: "better", zh: "录入基本体征：至少要填一项体征才能保存", en: "Entering vital signs now requires at least one measurement before saving" },
    { k: "better", zh: "化验页只留「录入化验」和「在牧羊人里录入化验」两个按钮；成长首页的「AI 综合录入」仍可一次录入全部", en: "The Labs page keeps just \"Enter labs\" and \"Enter labs in Shepherd\"; \"AI all-in-one entry\" on the Growth page still records everything at once" },
    { k: "better", zh: "AI 读到这个入口用不上的内容时会提醒，可到「AI 综合录入」一起存", en: "If AI finds items this entry doesn't use, you are told and can save them with \"AI all-in-one entry\"" }
  ] },
  { v: "2026-11-16.7", title: { zh: "「AI 综合录入」：每一块可以折叠；页面名用 · 分隔", en: "\"AI all-in-one entry\": every section folds; page name uses ·" }, items: [
    { k: "better", zh: "成长首页的「AI 录入体检」改名「AI 综合录入」", en: "\"AI checkup entry\" on the Growth page is now \"AI all-in-one entry\"" },
    { k: "better", zh: "录入表里的每一块（体征、疫苗、用药、里程碑、多次测量、化验）点标题就能展开 / 折叠，改别处时不会丢", en: "Each section of the entry form (vitals, vaccines, medicine, milestones, tables, labs) can be folded or unfolded by tapping its title, and stays that way while you edit" },
    { k: "better", zh: "页面名改成「病史 · 过敏 · 用药」", en: "The page name is now \"History · allergies · medicine\"" }
  ] },
  { v: "2026-11-16.6", title: { zh: "修复：刷新总回到同一页；化验页按钮；页面名字", en: "Fix: refresh always returning to the same page; Labs buttons; page name" }, items: [
    { k: "fix", zh: "在某一页打开过表单后刷新，之后再换页、再刷新总是回到那一页：现在刷新后停在当前这一页", en: "After refreshing with a form open, later refreshes kept returning to the same page; now a refresh stays on the page you are on" },
    { k: "fix", zh: "化验页顶上的按钮在手机上被挤得文字不全：现在「录入化验」「AI 录入体检」并排，「在牧羊人里录入化验」单独一行", en: "Buttons at the top of Labs were cramped on phones; now Enter labs and AI entry sit side by side and the Shepherd link has its own row" },
    { k: "better", zh: "页面名「病史 / 过敏 / 用药」改成「病史 · 过敏 · 用药」，不再和路径里的 / 混在一起", en: "The page name \"History / allergies / medicine\" now uses · so it no longer looks like a path separator" }
  ] },
  { v: "2026-11-16.5", title: { zh: "化验页可以直接录入整张化验表，AI 帮你填", en: "Enter a whole lab sheet right in Labs, with AI filling the table" }, items: [
    { k: "new", zh: "化验页新增「＋ 录入化验」：选日期和套餐（血脂、血常规、代谢综合…），一次填好整张表的结果、单位和参考范围，和牧羊人里的录入一样", en: "New \"+ Enter labs\" on the Labs page: pick the date and panel (lipids, blood count, metabolic…) and fill results, units and reference ranges for the whole sheet, like in Shepherd" },
    { k: "new", zh: "拍化验单或粘贴文字，AI 把表填好，你核对后保存；单子上有多个日期时先填项目最多的那天，并提示其余的怎么录", en: "Photograph a lab sheet or paste text and AI fills the table for you to check; if the sheet has several dates, the date with the most results is filled and you are told how to enter the rest" },
    { k: "better", zh: "孩子的参考范围不预填（内置的是成人范围），以化验单上的为准；同一天同一项已有的会更新，不会重复记", en: "Reference ranges are not pre-filled for children (built-in ones are adult ranges); use the lab sheet's. A result already saved for the same day and test is updated, not duplicated" }
  ] },
  { v: "2026-11-16.4", title: { zh: "化验页重做：按套餐分组，有走势和历史，能改能再记", en: "Labs page redone: grouped by panel, with trends and history, editable" }, items: [
    { k: "new", zh: "化验按「血脂、血常规、代谢综合…」分组，每项显示最新值、是否超出范围和一条小走势", en: "Labs are grouped by panel (lipids, blood count, metabolic…); each test shows its latest value, whether it is out of range and a small trend" },
    { k: "new", zh: "点一项进入单项页：参考范围里的位置、完整走势图、每次的记录；点一条可以改或删，也能「再记一次这一项」", en: "Tap a test for its own page: where it sits in the range, a full trend chart and every result; tap one to edit or delete, or add another result" },
    { k: "better", zh: "同一个项目不管是按名字还是按代码存的，都合成一条走势", en: "The same test is combined into one trend whether it was saved by name or by code" }
  ] },
  { v: "2026-11-16.3", title: { zh: "化验页的录入链接直接到这个孩子", en: "Labs page entry link goes straight to this child" }, items: [
    { k: "better", zh: "「在牧羊人里录入化验」现在直接打开牧羊人里这个孩子的录入化验，不再先到牧羊人首页（爸爸）", en: "\"Enter labs in Shepherd\" now opens that child's lab entry in Shepherd instead of the Shepherd home page" }
  ] },
  { v: "2026-11-16.2", title: { zh: "修复：在身体与健康页刷新后一直「正在读取」", en: "Fix: Health pages stuck on \"Loading\" after a refresh" }, items: [
    { k: "fix", zh: "在 基本体征、体检与就诊、疫苗、化验、病史 这几页刷新，读完数据会马上显示出来", en: "Refreshing on Vital signs, Visits, Vaccines, Labs or History now shows the records as soon as they load" }
  ] },
  { v: "2026-11-16.1", title: { zh: "刷新后还停在原来那一页", en: "Refresh keeps you on the same page" }, items: [
    { k: "better", zh: "比如在 成长 → 基本体征 刷新，还是回到基本体征，不再跳回今天；网址也能收藏或发给家人", en: "Refreshing on, say, Growth → Vital signs brings you back there instead of Today; the link can be bookmarked or shared" }
  ] },
  { v: "2026-11-15.5", title: { zh: "AI 解读和小月亮通用", en: "AI explanations shared with Little Moon" }, items: [
    { k: "better", zh: "体检、就诊的 AI 解读和小月亮用同一套：在哪边保留的，两边都能看到、重新分析或清除", en: "Checkup and visit explanations work the same in Little Moon: one kept in either app shows in both and can be redone or cleared there" }
  ] },
  { v: "2026-11-15.4", title: { zh: "AI 录入能一次读整张表；每条体检、就诊、化验都能让 AI 解读", en: "AI entry reads whole tables; AI explains each checkup, visit and lab" }, items: [
    { k: "new", zh: "AI 录入：生长表、历次体征表按日期一行读出来，化验单每一项连参考范围一起读出来；核对后一次存成多条，化验存到化验页", en: "AI entry: growth and vitals tables are read one row per date, lab sheets item by item with reference ranges; review and save them all at once, labs go to the Labs page" },
    { k: "new", zh: "体检与就诊、化验（按日期）每条都有「✦ AI 解读」：这次结果说明、医生建议是什么意思怎么做、后续注意、下次可以问医生的问题", en: "Each checkup, visit and lab date has \"✦ AI explanation\": what the results show, what the doctor's advice means, what to watch next, questions for next time" },
    { k: "better", zh: "解读先给你看，选「保留」才存下来；保留的可以重新分析或清除。牧羊人的就诊解读两边通用", en: "You see the explanation first and choose Keep to save it; kept ones can be redone or cleared. Visit explanations are shared with Shepherd" }
  ] },
  { v: "2026-11-15.3", title: { zh: "筛选、排序、搜索换成统一的一条", en: "One consistent filter bar everywhere" }, items: [
    { k: "better", zh: "成长记录、身体与健康、经文卡库、资源库、日常点子、冲突管理和睡前的记录：一行搜索框 + 下拉筛选 + 排序，和爱家小助手同一个样子", en: "Growth records, health, scripture cards, resources, ideas, conflict and bedtime records: one row with search, filter dropdowns and sort, same as Home Helper" },
    { k: "new", zh: "成长记录可以搜索、按类型筛、选最新或最早在前；改过筛选会出现「✕ 清除筛选」", en: "Growth records can be searched, filtered by type and sorted newest or oldest first; \"✕ Clear filters\" appears when a filter is set" },
    { k: "better", zh: "手机上筛选收成一个「筛选」按钮（数字 = 用了几个筛选），点开才出下拉，往下滑时这一行固定在顶上", en: "On phones the filters fold into one \"Filters\" button (the number shows how many are on); the row stays at the top while scrolling" }
  ] },
  { v: "2026-11-15.2", title: { zh: "成长 → 身体与健康：记录能筛、能看时间线、能改", en: "Growth → Health: filter, timeline and edit records" }, items: [
    { k: "new", zh: "基本体征、体检与就诊、疫苗、用药的记录：按时间（近 1 年 / 近 3 年 / 全部）和类别筛，列表 | 时间线（按年份）切换", en: "Vital signs, visits, vaccines and medicines: filter by time (past year / 3 years / all) and type, and switch between list and a by-year timeline" },
    { k: "new", zh: "点一条就能改或删：体检 / 就诊和测量用录入那张表改，疫苗和用药有自己的小表；和小月亮是同一份记录", en: "Tap a record to edit or delete it: visits and measurements use the entry form, vaccines and medicines have their own short form; same records as Little Moon" },
    { k: "better", zh: "用药记录不再只显示最近半年，旧的也能找到", en: "Medicine records are no longer limited to the last six months" }
  ] },
  { v: "2026-11-15.1", title: { zh: "录入体检：医院和医生分开填", en: "Checkup entry: hospital and doctor are separate" }, items: [
    { k: "better", zh: "AI 录入体检时，「医院 / 诊所」和「医生」是两栏，AI 也分开读出来", en: "When adding a checkup, \"Hospital / clinic\" and \"Doctor\" are two fields, and AI reads them separately" },
    { k: "better", zh: "就诊记录里显示「医院 · 医生」；以前写在一起的旧记录照常显示", en: "Visit records show \"Hospital · Doctor\"; older records with both in one field still show as before" }
  ] },
  { v: "2026-11-14.6", title: { zh: "修复：今天页打不开", en: "Fix: Today page failed to load" }, items: [
    { k: "fix", zh: "上一版的一个小错误让页面打不开，已修好", en: "A small mistake in the last version stopped the page from loading; fixed" }
  ] },
  { v: "2026-11-14.5", title: { zh: "睡眠卡：几点入睡、睡了多久、要不要叫醒", en: "Sleep card: when they fell asleep, how long, when to wake" }, items: [
    { k: "new", zh: "孩子在睡时，睡眠卡显示几点入睡、已经睡了多久（自己会走）", en: "While a child sleeps, the sleep card shows when they fell asleep and how long it has been (updates by itself)" },
    { k: "new", zh: "按年龄提示要不要叫醒：午睡建议几点前叫醒，睡太久或太晚了提醒；早上睡够了也会提示", en: "Age-based wake hints: when to end a nap, a nudge if it runs long or late, and in the morning once night sleep is enough" },
    { k: "fix", zh: "音乐卡的选歌单、选歌下拉框点开就关的问题修好了", en: "The playlist and song dropdowns on the music card no longer close right after opening" }
  ] },
  { v: "2026-11-14.4", title: { zh: "基本体征：对照同龄正常范围，随时问 AI", en: "Vital signs: normal ranges by age, ask AI anytime" }, items: [
    { k: "better", zh: "数据表多了「年龄」一列；手机上表格不再横向滚动", en: "Data tables show the age at each measurement; no sideways scrolling on phones" },
    { k: "new", zh: "心率、血压图上标出这个年龄的正常范围，超出的点画成红圈；BMI 显示健康体重 / 超重等", en: "Pulse and blood pressure charts show the normal range for the child's age; points outside it are circled in red; BMI shows healthy / overweight etc." },
    { k: "new", zh: "「问 AI 这些体征」：带上各项数和同龄参考范围，直接去咩咩咩问", en: "\"Ask AI about these\" opens the AI page with the numbers and age ranges attached" }
  ] },
  { v: "2026-11-14.3", title: { zh: "身高体重改成「基本体征」，每项都有走势线", en: "Height & weight is now \"Vital signs\" with a trend line for each" }, items: [
    { k: "better", zh: "身高、体重的走势改成折线图，按真实日期排、标出年份和百分位（P62）", en: "Height and weight trends are line charts on real dates, with years and percentiles (P62)" },
    { k: "new", zh: "头围、BMI、血压、心率有记录就各有一张走势图", en: "Head size, BMI, blood pressure and pulse each get a trend chart once recorded" },
    { k: "better", zh: "每项可以点开 / 收起；图下面有数据表，默认收起", en: "Tap to open or fold each one; a data table under each chart, folded by default" }
  ] },
  { v: "2026-11-14.2", title: { zh: "体检单多读 BMI、血压、百分位；重扫不重复", en: "Checkups: BMI, blood pressure, percentiles; no repeats on re-scan" }, items: [
    { k: "new", zh: "两岁以后的体检单：AI 会一起读出 BMI、血压、心率和体重 / 身高 / BMI 的同龄百分位", en: "For checkups after age 2, AI also reads BMI, blood pressure, pulse and the age percentiles" },
    { k: "better", zh: "同一天的单子再扫一次，会更新原来那条记录、补上新的数，不会多记一条", en: "Re-scanning a sheet from the same day updates that record with the new numbers instead of adding another" },
    { k: "better", zh: "已经记过的针、药、里程碑默认不勾；勾上就更新原来那条", en: "Shots, medicines and milestones already logged are unchecked; check one to update it" }
  ] },
  { v: "2026-11-14.1", title: { zh: "修好：拍疫苗本可以一次录入很多针", en: "Fixed: scan a whole vaccine record at once" }, items: [
    { k: "fix", zh: "拍疫苗本 / 接种记录表，AI 会把表里每一针都读出来，每针用自己的接种日期", en: "Scanning a vaccine record table now reads every dose, each with its own date" },
    { k: "better", zh: "已经记过的针默认不勾，免得记重；每针的日期都可以改", en: "Shots you already logged are unchecked so nothing is doubled; each date can be edited" }
  ] },
  { v: "2026-11-12.2", title: { zh: "问咩咩咩可以带照片和文件", en: "Ask with photos and files" }, items: [
    { k: "new", zh: "提问框下面可以拍照、选多张图片或 PDF 一起问，每张都能删", en: "Add several photos or PDFs under the question box; remove any of them" },
    { k: "better", zh: "体检录入：文字框和按钮之间留出距离", en: "Checkup logging: more space between the text box and the buttons" }
  ] },
  { v: "2026-11-12.1", title: { zh: "AI 分析可以补充自己的话和照片；录入附件一格一格显示", en: "Add your own notes and photos to the AI review; attachments as thumbnails" }, items: [
    { k: "new", zh: "AI 身心灵分析下面多了「补充信息」：写几句、拍照或上传文件（成绩单、医生的单子），一起分析；默认收起", en: "AI whole-child review has an optional \"Add details\" area (notes, photos, files) that's folded by default" },
    { k: "better", zh: "体检录入的照片和文件显示成缩略图，可以拍很多次、每张都能删；文字框跟着内容长高", en: "Checkup photos and files show as removable thumbnails; text boxes grow with what you paste" },
    { k: "better", zh: "身高体重页的按钮小一号", en: "Smaller buttons on the height & weight page" }
  ] },
  { v: "2026-11-11.11", title: { zh: "修好：手机上按钮下面的空白（第二次）", en: "Fixed: blank space under buttons on phones (again)" }, items: [
    { k: "fix", zh: "成长主题页「＋ 记一笔」那一行下面的空白去掉了", en: "Removed the gap under the \"＋\" row on Growth topic pages" }
  ] },
  { v: "2026-11-11.10", title: { zh: "修好：手机上按钮下面多出一块空白", en: "Fixed: extra blank space under buttons on phones" }, items: [
    { k: "fix", zh: "成长主题页「＋ 记一笔」那一行下面不再空出一大块", en: "No more large gap under the \"＋\" row on Growth topic pages" }
  ] },
  { v: "2026-11-11.9", title: { zh: "手机上成长主题页的按钮更紧凑", en: "Tighter buttons on Growth topic pages on phones" }, items: [
    { k: "better", zh: "「＋ 记一笔」按钮一行排下，和时间范围按钮一样高；指标卡一行放得下三张", en: "The \"＋\" log buttons fit in one row at the same height as the time range; three indicator cards fit per row" }
  ] },
  { v: "2026-11-11.8", title: { zh: "多个孩子可以一起唤醒；睡前流程结束可以填开始睡眠时间", en: "Wake several children at once; set the fall-asleep time after the bedtime routine" }, items: [
    { k: "new", zh: "唤醒时，其他也在睡的孩子默认一起选上，一次记下醒来", en: "When waking one child, the others still asleep are selected too and logged together" },
    { k: "new", zh: "睡前流程结束页新增「开始睡眠时间」，孩子晚一些睡着可以改", en: "The bedtime routine's finish page has a \"Fell asleep at\" time you can adjust" },
    { k: "better", zh: "成长主题页的走势图在电脑上不再撑得很高，指标卡铺满一行", en: "On laptops, Growth trend charts no longer stretch tall, and indicator cards fill the row" }
  ] },
  { v: "2026-11-11.7", title: { zh: "成长页重新设计：一层一层点进去", en: "Growth redesigned: tap through layer by layer" }, items: [
    { k: "better", zh: "首页三张卡：身体与健康、习惯与情绪、学习与培训，每行一句最新情况", en: "The Growth home has three cards (Body & health, Habits & emotions, Learning & training), each row with a one-line update" },
    { k: "better", zh: "每个主题一页，同一个样子：时间范围、记一笔、指标、走势图、记录", en: "Every topic page looks the same: time range, log, indicators, trend chart, records" },
    { k: "new", zh: "手机上左右滑动换到同一块的上一个 / 下一个主题", en: "On phones, swipe left / right to the previous / next topic" },
    { k: "better", zh: "睡前安然、趋势与分析留在 资源 → 定制流程", en: "Bedtime and Trends stay under Resources → Custom flows" }
  ] },
  { v: "2026-11-11.6", title: { zh: "成长页细节：录入表标题、睡眠平均更准", en: "Growth details: form title, more accurate sleep average" }, items: [
    { k: "better", zh: "一次录入表的标题缩短，手机上「关闭」不再挤成两行", en: "Shorter title on the logging form, so Close no longer wraps on phones" },
    { k: "fix", zh: "忘了点「醒了」的超长睡眠（超过 16 小时）不再拉高夜间睡眠平均", en: "Very long sleeps (over 16 hours, usually a missed wake-up) no longer inflate the night-sleep average" }
  ] },
  { v: "2026-11-11.5", title: { zh: "成长页排版整理：手机和电脑都更整齐", en: "Tidier Growth layout on phone and laptop" }, items: [
    { k: "better", zh: "三大块按钮、AI 分析的范围按钮大小统一，不再折行忽大忽小", en: "Block buttons and AI review range buttons are the same size and no longer wrap unevenly" },
    { k: "better", zh: "卡片、筛选器、按钮之间的间距统一", en: "Even spacing between cards, filters and buttons" },
    { k: "fix", zh: "打开再关掉表单后，顶上的窄条不再盖住顶栏", en: "Closing a form no longer leaves the slim bar covering the header" }
  ] },
  { v: "2026-11-11.4", title: { zh: "成长页新增「AI 身心灵分析」", en: "New AI whole-child review on Growth" }, items: [
    { k: "new", zh: "把身体、习惯情绪、属灵、学习放在一起看：先说做得好的，再给最值得加强的几件事", en: "Looks at body, habits & emotions, faith and learning together: what's going well first, then the few things most worth working on" },
    { k: "new", zh: "三种看法：全盘、最近两周、需要留意", en: "Three views: everything, the last two weeks, and what needs attention" },
    { k: "new", zh: "每一块都有这周可以做的事，还有问儿科医生的问题、家长怎么配合", en: "Each area comes with things to try this week, questions for the pediatrician and tips for parents" }
  ] },
  { v: "2026-11-11.3", title: { zh: "修好：小宝宝的旧记录算到了大孩子名下", en: "Fixed: the baby's older records showed under an older child" }, items: [
    { k: "fix", zh: "小月亮里没标孩子的旧记录，现在和小月亮一样归到对应的孩子（成长、睡眠、夜间干爽都受影响）", en: "Older Little Moon records without a child now go to the same child as in Little Moon (Growth, sleep and dry nights)" }
  ] },
  { v: "2026-11-11.2", title: { zh: "成长页新增「身体与健康」，体检可以让 AI 一次录入", en: "Growth adds Body & health, with AI checkup logging" }, items: [
    { k: "new", zh: "身高体重、体检与就诊、疫苗、化验、病史 / 过敏 / 用药放在一页", en: "Height & weight, checkups & visits, vaccines, labs, history / allergies / medicine on one page" },
    { k: "new", zh: "拍体检小结或打一段话，AI 读出体征、疫苗、医生建议、维生素，核对后一次保存", en: "Snap the checkup summary or type a few lines; AI picks out measurements, shots, advice and vitamins to check and save at once" },
    { k: "better", zh: "和小月亮、牧羊人是同一份记录，三边都能看到", en: "Same records as Little Moon and Shepherd, visible in all three" }
  ] },
  { v: "2026-11-11.1", title: { zh: "新的「成长」页签：习惯与情绪、学习与培训", en: "New Growth tab: habits & emotions, learning & training" }, items: [
    { k: "new", zh: "底部多了「成长」：原来的成长记录分成「习惯与情绪」和「学习与培训」两大块", en: "Growth is now a bottom tab, split into Habits & emotions and Learning & training" },
    { k: "new", zh: "学习与培训：如厕训练、夜间干爽、阅读、语言，加上课程进度、经文背诵和课外班汇总", en: "Learning & training: potty training, dry nights, reading and words, plus course progress, memory verses and classes" },
    { k: "new", zh: "记一笔新增「课外班」：钢琴、游泳、球队…记时长和进度", en: "New \"Classes\" tile in Quick log: piano, swimming, teams… with time and progress" },
    { k: "better", zh: "日历搬进了「课程」页", en: "The calendar now lives under Course" }
  ] },
  { v: "2026-11-09.2", title: { zh: "补记的日期和时间不能选到未来", en: "Logged dates and times can no longer be in the future" }, items: [
    { k: "better", zh: "睡眠记录、睡前流程记录、情绪和冲突记录、目标的达成日期：晚于现在的变灰、不能选", en: "Sleep records, bedtime logs, emotion and conflict records and a goal's achieved date: anything later than now is greyed out" },
    { k: "better", zh: "排课、计划、假期这些安排性质的日期不受影响，照样能选未来", en: "Scheduling dates such as tasks, plans and breaks are unchanged and can still be in the future" }
  ] },
  { v: "2026-11-09.1", title: { zh: "填写的内容不会再被自动刷新冲掉", en: "What you type is no longer wiped by auto-refresh" }, items: [{ k: "fix", zh: "填表时没保存的内容不会再被自动刷新冲掉（咩咩咩的提问、睡前播放页的备注、备份路径、登录框等），光标也留在原处", en: "Unsaved text is no longer wiped when the app refreshes in the background (Ask questions, bedtime player notes, backup paths, sign-in), and the cursor stays put" }] },
  { v: "2026-11-08.6", title: { zh: "修好了打不开的问题", en: "Fixed the app not opening" }, items: [{ k: "fix", zh: "上一版更新后应用可能一直空白、打不开，已修好", en: "After the last update the app could stay blank and not open; this is fixed" }] },
  { v: "2026-11-08.5", title: { zh: "发布日志可以按天或按版本分组，补上了早期的更新记录", en: "Release notes can be grouped by day or version; early history added" }, items: [
    { k: "new", zh: "发布日志新增「分组」：按版本或按天，记住你的选择", en: "New Group option in Release notes: by version or by day, remembered on this device" },
    { k: "better", zh: "补上了从上线第一天起的更新记录", en: "Added the update history all the way back to day one" }
  ] },
  { v: "2026-11-08.4", title: { zh: "新增「发布日志」：每次更新了什么一看就知道", en: "New Release notes: see what changed in each update" }, items: [
    { k: "new", zh: "我的 → 发布日志：按类型、时间筛选，列表或时间线查看", en: "Me → Release notes: filter by type or time, view as a list or timeline" },
    { k: "new", zh: "有新版本时，今天页顶上会提示几次，点开就能看", en: "After an update, Today shows a short notice a few times; tap to read it" },
    { k: "better", zh: "顶栏的版本号可以点，直接打开发布日志", en: "Tap the version number in the header to open the release notes" }
  ] },
  { v: "2026-11-08.3", title: { zh: "成长记录换了新样子，筛选和趋势更好用", en: "Growth log redesigned: easier filters and trends" }, items: [
    { k: "better", zh: "成长记录：电脑上用标签、手机上用下拉切换各部分", en: "Growth log: tabs on a laptop, a dropdown on a phone to switch sections" },
    { k: "new", zh: "一个筛选搞定时间、类型和排序，点趋势图也能筛下面的记录", en: "One filter for time, type and order; tap a trend tile or bar to filter the records" },
    { k: "new", zh: "记录可以按列表或时间线查看", en: "View records as a list or a timeline" },
    { k: "better", zh: "今天页顶上的滑动卡加了 ‹ › 按钮", en: "Today's top cards get ‹ › buttons" }
  ] },
  { v: "2026-11-08.2", title: { zh: "音乐卡的下拉框更好认", en: "Music card dropdowns are easier to spot" }, items: [
    { k: "better", zh: "音乐卡的下拉框有边框和箭头，一看就知道能选，字也小一点", en: "Music card dropdowns now have a border and arrow, with smaller text" }
  ] },
  { v: "2026-11-08.1", title: { zh: "今天页顶上的卡片自动轮播", en: "Today's top cards now rotate on their own" }, items: [
    { k: "new", zh: "顶上的卡片每 10 秒自动换一张，可以改快慢或关掉", en: "The top cards change every 10 seconds; adjust the timing or turn it off" },
    { k: "better", zh: "手指按住或鼠标停在上面时暂停", en: "Pauses while you touch or hover over it" },
    { k: "better", zh: "音乐卡和其他卡一样高", en: "The music card is now the same height as the others" }
  ] },
  { v: "2026-11-07.2", title: { zh: "音乐卡可以选歌单或单曲", en: "Music card: pick a playlist or a single song" }, items: [
    { k: "new", zh: "音乐卡可以选歌单，也可以只放一首歌", en: "Choose a playlist or just one song on the music card" },
    { k: "fix", zh: "深色主题下播放按钮不再白底白字看不清", en: "Play button no longer disappears in dark mode" },
    { k: "better", zh: "播放按钮排得更整齐", en: "Tidier player controls" }
  ] },
  { v: "2026-11-07.1", title: { zh: "音乐换页也不停，今天页多了音乐卡", en: "Music keeps playing across pages; new music card on Today" }, items: [
    { k: "new", zh: "换页面音乐照样播放；今天页顶上可以滑到 🎵 音乐卡", en: "Music keeps playing when you switch pages; swipe to the 🎵 card on Today" },
    { k: "new", zh: "进度条、循环（整个歌单 / 单曲）、上一首下一首、音量", en: "Progress bar, repeat playlist or song, previous/next and volume" },
    { k: "better", zh: "睡前安然：某一步超时会振动，倒数 10 秒进下一步", en: "Bedtime: an overrunning step vibrates and counts down 10 s to the next one" }
  ] },
  { v: "2026-11-06.3", title: { zh: "新增成长记录页：2 岁以上孩子的记录和趋势", en: "New Growth log page for kids 2 and up" }, items: [
    { k: "new", zh: "快速记录里的如厕、吃饭、户外、情绪等都能在一页看到", en: "See potty, meals, outdoor time, moods and more from Quick log in one place" },
    { k: "new", zh: "从快速记录或「我的」都能进入", en: "Open it from Quick log or from Me" }
  ] },
  { v: "2026-11-06.2", title: { zh: "新增夜间干爽记录", en: "New dry-nights tracking" }, items: [
    { k: "new", zh: "快速记录多了「夜间干爽」，一点就记", en: "New Dry night tile in Quick log" },
    { k: "new", zh: "连续干爽几晚后，提示可以试试穿内裤睡", en: "After a run of dry nights, a hint suggests trying underwear" },
    { k: "new", zh: "趋势里能看到干爽的天数变化", en: "See dry nights over time in the trends" }
  ] },
  { v: "2026-11-06.1", title: { zh: "直接打印今天页更干净", en: "Cleaner printout of the Today page" }, items: [
    { k: "better", zh: "浏览器直接打印今天页时只留今日敬拜、经文背诵和今日任务", en: "Printing Today from the browser keeps only worship, verse memory and tasks" }
  ] },
  { v: "2026-11-04.1", title: { zh: "新增睡眠页：2 岁以上孩子的睡眠记录和趋势", en: "New Sleep page for kids 2 and up" }, items: [
    { k: "new", zh: "睡眠卡 → 睡眠记录与趋势：近两个月的睡眠，点开可改或删", en: "Sleep card → Sleep log & trends: the last two months, tap to edit or delete" },
    { k: "new", zh: "每天睡多久、几点睡几点起，和同龄建议对比", en: "Hours per day, bedtime and wake time compared with age guidelines" },
    { k: "better", zh: "夜间睡眠和午睡分开记、分开算", en: "Night sleep and naps are recorded and counted separately" }
  ] },
  { v: "2026-11-03.1", title: { zh: "备份更完整，更新后自动用上新版本", en: "Fuller backups, and updates load properly" }, items: [
    { k: "better", zh: "备份更完整：睡前安然的歌曲和记录也会备份", en: "Fuller backups: bedtime songs and logs are included" },
    { k: "fix", zh: "更新后偶尔还停在旧版本的问题已修好", en: "Fixed the app sometimes staying on the old version after an update" }
  ] },
  { v: "2026-10-29.1", title: { zh: "新增音乐页和歌单，长列表打开更快", en: "New Music page and playlists; long lists open faster" }, items: [
    { k: "new", zh: "资源 → 音乐：自动分好的歌单，也能自己建歌单", en: "Resources → Music: ready-made playlists, or make your own" },
    { k: "new", zh: "周例行里的唱歌任务多了「学唱」，大字歌词跟着唱", en: "Singing tasks get a Learn button with big lyrics to sing along" },
    { k: "better", zh: "长列表分批显示，打开更快；每批几条可在设置里改", en: "Long lists load in batches and open faster; set the batch size in Settings" },
    { k: "fix", zh: "记录很多时，备份和趋势不再漏掉一部分", en: "Backups and trends no longer miss records when there are many" }
  ] },
  { v: "2026-10-28.3", title: { zh: "快速记录可按孩子自选，睡眠卡换新场景", en: "Quick log tiles per child; new sleep card scenes" }, items: [
    { k: "new", zh: "今天页新增「快速记录」：情绪、如厕、吃饭、户外一点就记", en: "New Quick log on Today: tap to log mood, potty, meals or outdoor time" },
    { k: "new", zh: "每个孩子可以自选要显示的格子，按年龄推荐", en: "Pick the tiles for each child, with suggestions by age" },
    { k: "better", zh: "1 岁以下的孩子直接去小月亮记录", en: "Kids under 1 are pointed to Little Moon instead" },
    { k: "better", zh: "睡眠卡：2–6 岁是游乐场，骑车场景的路会动", en: "Sleep card: a playground for ages 2–6, and a moving road when biking" }
  ] },
  { v: "2026-10-28.2", title: { zh: "今天页可以一点记下孩子的情绪", en: "Log your child's mood from Today in one tap" }, items: [
    { k: "new", zh: "今天页新增情绪卡：点一个表情就记下，同步到小月亮", en: "New mood card on Today: tap an emoji to log it, synced to Little Moon" }
  ] },
  { v: "2026-10-28.1", title: { zh: "加入家庭更安全，新增「返回」按钮", en: "Safer family joining, plus a Back button" }, items: [
    { k: "better", zh: "邀请码有有效期，新成员要先批准才能加入", en: "Invite codes now expire, and new members need approval to join" },
    { k: "better", zh: "今天页卡片按年龄换场景：小的是游乐场，大的是运动和阅读", en: "Today's card shows scenes by age: a playground for little ones, sports and reading for older kids" },
    { k: "new", zh: "路径条上加了「‹ 返回」，回到上一页", en: "A ‹ Back button in the path bar takes you to the previous page" }
  ] },
  { v: "2026-10-27.7", title: { zh: "睡眠卡只显示当前孩子", en: "The sleep card shows only the selected child" }, items: [
    { k: "better", zh: "在睡时只留睡觉图标和音乐、唤醒、改三个按钮", en: "While asleep it shows just the sleep icon and Music, Wake and Edit" },
    { k: "better", zh: "白天显示流程选择和「开始」按钮", en: "During the day it shows the routine picker and a Start button" }
  ] },
  { v: "2026-10-27.6", title: { zh: "今天页顶上新增睡眠卡", en: "New sleep card at the top of Today" }, items: [
    { k: "new", zh: "和名字卡左右滑动切换，没人睡时显示随天气变化的卡通画", en: "Swipe between it and the name card; when nobody is asleep it shows a weather cartoon" },
    { k: "better", zh: "开始睡前流程时先选谁参加", en: "Bedtime now starts by choosing who is taking part" },
    { k: "fix", zh: "刷新后睡眠记录显示不全的问题已修好", en: "Fixed sleep records not fully showing after a refresh" }
  ] },
  { v: "2026-10-27.5", title: { zh: "睡前完成页防误触", en: "Bedtime finish page guards against mis-taps" }, items: [
    { k: "better", zh: "点「不记录，关闭」会先确认，不会误丢整晚的记录", en: "“Close without saving” asks first, so a night's log isn't lost by mistake" },
    { k: "fix", zh: "深色主题下日期选择器颜色正常了", en: "Date pickers look right in dark mode" }
  ] },
  { v: "2026-10-27.4", title: { zh: "睡眠记录的时间框不再超出屏幕", en: "Sleep record time fields fit the screen" }, items: [
    { k: "fix", zh: "编辑睡眠记录时，日期时间框不再超出屏幕", en: "Date and time fields no longer run off the screen when editing a sleep record" }
  ] },
  { v: "2026-10-27.3", title: { zh: "睡眠记录的时间看得见了", en: "Sleep record times are visible again" }, items: [
    { k: "fix", zh: "编辑睡眠记录时，入睡和醒来时间不再一片白", en: "Bedtime and wake times no longer show as blank white boxes when editing" }
  ] },
  { v: "2026-10-27.2", title: { zh: "设置里能看存储用量", en: "See storage usage in Settings" }, items: [
    { k: "new", zh: "设置里新增「存储用量」", en: "New Storage usage in Settings" },
    { k: "better", zh: "上传睡前歌曲前先检查空间，快满时拦住", en: "Bedtime song uploads check space first and stop when it's nearly full" }
  ] },
  { v: "2026-10-27.1", title: { zh: "今天页的睡前一行更简洁", en: "Tidier bedtime line on Today" }, items: [
    { k: "better", zh: "只显示当前孩子最近一条睡前或醒来记录", en: "Shows only the selected child's latest bedtime or wake-up record" }
  ] },
  { v: "2026-10-26.21", title: { zh: "睡前播放页的按钮固定在底部", en: "Bedtime player buttons stay at the bottom" }, items: [
    { k: "better", zh: "上一步、下一步、收起文字、遇到状况、音量固定在底部", en: "Back, Next, Hide text, Something came up and Volume stay pinned at the bottom" },
    { k: "better", zh: "文字在上面滚动，不会被按钮挡住", en: "Text scrolls above without being covered" }
  ] },
  { v: "2026-10-26.20", title: { zh: "睡前每一步可以放多首歌", en: "Each bedtime step can play several songs" }, items: [
    { k: "new", zh: "选歌改成按标签分组的多选，可选标签也可选具体的歌", en: "Pick songs by tag or by title from a grouped multi-select" },
    { k: "better", zh: "播放时轮流放，也可以换一首", en: "Songs take turns during playback, and you can switch to another" }
  ] },
  { v: "2026-10-26.19", title: { zh: "唤醒歌可以切歌", en: "Switch songs while waking up" }, items: [
    { k: "better", zh: "在睡卡片排成三行，每个孩子一样整齐", en: "The asleep card is laid out in three tidy rows for every child" },
    { k: "new", zh: "唤醒歌可以上一首、下一首，放完自动接下一首", en: "Wake-up songs have previous/next and play on to the next one" }
  ] },
  { v: "2026-10-26.18", title: { zh: "修好「唤醒」按钮，睡前默认只选当前孩子", en: "Wake button fixed; bedtime defaults to the current child" }, items: [
    { k: "fix", zh: "点「唤醒」或「改」不再报错", en: "Tapping Wake or Edit no longer shows an error" },
    { k: "fix", zh: "「谁参加了」默认是当前孩子，不再把所有孩子都记成在睡", en: "“Who took part” defaults to the current child, so not every child is marked asleep" },
    { k: "new", zh: "在睡那一行加了 ♪，一键放轻柔唤醒歌", en: "A ♪ button on the asleep row plays gentle wake-up songs" },
    { k: "better", zh: "歌单入口挪到「定制流程」页", en: "The playlist now lives on the Custom routines page" }
  ] },
  { v: "2026-10-26.17", title: { zh: "睡前做完自动记入睡，还能一键唤醒", en: "Bedtime logs sleep automatically, with one-tap wake-up" }, items: [
    { k: "new", zh: "睡前流程完成后，自动在小月亮记下开始睡", en: "Finishing bedtime logs the start of sleep in Little Moon" },
    { k: "new", zh: "今天页显示 😴 在睡和「唤醒」按钮，记下醒来时间", en: "Today shows 😴 asleep with a Wake button to log the wake-up time" },
    { k: "new", zh: "唤醒时可以放轻柔的歌，音量慢慢变大", en: "Play gentle wake-up songs that slowly fade in" }
  ] },
  { v: "2026-10-26.16", title: { zh: "英文界面补全课程库等内置内容", en: "Course library and more now in English" }, items: [
    { k: "better", zh: "课程库、日常点子、各州法规、介绍页等都有英文了", en: "Course library, daily ideas, state laws, the About page and more now have English" }
  ] },
  { v: "2026-10-26.15", title: { zh: "睡前、冲突、情绪等内容有了英文", en: "Bedtime, conflict and emotion content now in English" }, items: [
    { k: "better", zh: "周例行、读经计划、睡前安然、冲突和情绪管理都有英文", en: "Weekly routines, reading plans, Bedtime Peace, conflict and emotion care all have English" },
    { k: "better", zh: "英文界面里经文出处显示英文书卷名", en: "Bible references show English book names in English" }
  ] },
  { v: "2026-10-26.13", title: { zh: "午睡流程不再说「今晚」", en: "Nap routines no longer say “tonight”" }, items: [
    { k: "fix", zh: "午睡流程有自己的一套带领词，结束时说「午安」", en: "Nap routines have their own guide words and nap-time closing" },
    { k: "better", zh: "每个流程的带领词都可以单独改", en: "Guide words can be edited for each routine" }
  ] },
  { v: "2026-10-26.12", title: { zh: "睡前步骤可以拖动排序、左滑删除", en: "Drag to reorder bedtime steps, swipe left to delete" }, items: [
    { k: "better", zh: "长按 ⋮⋮ 上下拖动调顺序", en: "Long-press ⋮⋮ and drag to reorder" },
    { k: "better", zh: "向左滑露出「删除」，先确认再删", en: "Swipe left to reveal Delete, with a confirmation" }
  ] },
  { v: "2026-10-26.11", title: { zh: "今天页的睡前收成一行", en: "Bedtime on Today fits on one line" }, items: [
    { k: "better", zh: "流程用下拉框选，右边一个「开始」", en: "Pick the routine from a dropdown, with Start beside it" },
    { k: "better", zh: "下面一行小字显示经文和上次记录", en: "A small line below shows the verse and the last record" }
  ] },
  { v: "2026-10-26.10", title: { zh: "睡前卡片和流程页重新整理", en: "Bedtime card and routine page redesigned" }, items: [
    { k: "better", zh: "今天页的睡前做成一张整齐的小卡片", en: "Bedtime on Today is now a neat small card" },
    { k: "better", zh: "流程页分成流程、步骤、模板三块，彩色时间条一看就懂", en: "The routine page has three parts—routine, steps, templates—with a coloured time bar" }
  ] },
  { v: "2026-10-26.9", title: { zh: "睡前流程可以另存为新流程", en: "Save a bedtime routine as a new one" }, items: [
    { k: "new", zh: "「另存为新流程」：复制当前步骤并起个新名字", en: "Save as new routine copies the current steps under a new name" },
    { k: "better", zh: "套用模板前会说清楚会覆盖当前流程", en: "Applying a template warns that it replaces the current routine" }
  ] },
  { v: "2026-10-26.8", title: { zh: "歌单滑动方向改对了", en: "Playlist swipe directions fixed" }, items: [
    { k: "fix", zh: "向左滑是删除，向右滑是加到流程，和其他列表一致", en: "Swipe left to delete, right to add to a routine, like other lists" }
  ] },
  { v: "2026-10-26.7", title: { zh: "睡前可以建多个流程，话题卡推荐歌曲", en: "Multiple bedtime routines; songs suggested on topic cards" }, items: [
    { k: "new", zh: "睡前支持多个流程，比如晚觉、午睡、起步版", en: "Several bedtime routines, such as night, nap and starter" },
    { k: "new", zh: "冲突和情绪话题卡加了「推荐歌曲」", en: "Conflict and emotion topics now suggest songs" },
    { k: "better", zh: "歌单可以滑动删除或加到流程，拖动排序", en: "Playlist songs: swipe to delete or add to a routine, drag to reorder" },
    { k: "fix", zh: "新家庭点睡前步骤对不上的问题修好了", en: "Fixed bedtime steps not matching up for brand-new families" }
  ] },
  { v: "2026-10-26.6", title: { zh: "加上网站图标", en: "Added a site icon" }, items: [
    { k: "fix", zh: "浏览器标签页有了图标", en: "The browser tab now shows an icon" }
  ] },
  { v: "2026-10-26.5", title: { zh: "新增「我们的根基」和情绪管理", en: "New “Our foundation” and Emotion care" }, items: [
    { k: "new", zh: "今天页最上面一张「我们的根基」卡，写下教养的大原则", en: "An “Our foundation” card at the top of Today sets out core parenting principles" },
    { k: "new", zh: "新增情绪管理：嫉妒、焦虑、厌学、屏幕、青春期等", en: "New Emotion care: jealousy, anxiety, school refusal, screens, puberty and more" },
    { k: "better", zh: "冲突管理按六个年龄段给出不同的解释和做法", en: "Conflict care gives advice for six age bands" },
    { k: "better", zh: "打开时自动同步小月亮的最新记录", en: "Opens with the latest Little Moon records synced automatically" }
  ] },
  { v: "2026-10-26.4", title: { zh: "冲突管理可以问咩咩咩，还能自定义状况", en: "Conflict care: ask Baa Baa and add your own situations" }, items: [
    { k: "new", zh: "每张状况卡可以「问一问咩咩咩」，带上家里最近的记录", en: "Each situation can “Ask Baa Baa”, including your recent records" },
    { k: "new", zh: "自定义状况，让咩咩咩补全做法和经文", en: "Add your own situations and let Baa Baa fill in steps and verses" },
    { k: "new", zh: "新增「趋势与分析」：入睡起床、冲突次数、大人孩子的状态", en: "New Trends: bedtimes, wake times, conflicts and how everyone was doing" },
    { k: "better", zh: "状况卡里的经文显示全文，记录可按日期筛选", en: "Verses on situation cards show in full; records can be filtered by date" }
  ] },
  { v: "2026-10-26.3", title: { zh: "新增定制流程和冲突管理", en: "New Custom routines and Conflict care" }, items: [
    { k: "new", zh: "资源页新增「定制流程」，放睡前安然和冲突管理", en: "New Custom routines on Resources, holding Bedtime Peace and Conflict care" },
    { k: "new", zh: "冲突管理：害怕、不愿分享、打人、发脾气等七种状况的做法", en: "Conflict care: what to do for seven situations like fear, not sharing, hitting and tantrums" },
    { k: "better", zh: "在这里记一笔，会自动写进小月亮", en: "Logging an incident here also saves it to Little Moon" },
    { k: "better", zh: "经文卡库、参考来源、打印都改成带路径的子页", en: "Scripture Cards, References and Print are now sub-pages with a path bar" }
  ] },
  { v: "2026-10-26.2", title: { zh: "睡前经文页不再卡住", en: "Bedtime verse page no longer freezes" }, items: [
    { k: "fix", zh: "经文没抓到时不再卡死，显示原因和「再试」按钮", en: "If a verse can't be fetched, the page no longer freezes and shows why, with Retry" }
  ] },
  { v: "2026-10-26.1", title: { zh: "新增睡前安然：一家人的睡前敬拜", en: "New Bedtime Peace: family bedtime worship" }, items: [
    { k: "new", zh: "以诗篇 4:8 为中心的睡前流程，每步可改名、时长和歌曲", en: "A bedtime routine centred on Psalm 4:8; rename steps, set times and songs" },
    { k: "new", zh: "播放页整页深色，到时轻轻震一下，锁屏也能放", en: "A dark full-screen player with a gentle buzz at each step; plays on the lock screen" },
    { k: "new", zh: "上传自家的歌，下载一次后离线也能放", en: "Upload your own songs and play them offline" },
    { k: "new", zh: "常见睡前状况的应对，每晚记录进日历和报告", en: "Help for common bedtime struggles; each night goes into the calendar and reports" }
  ] },
  { v: "2026-10-25.22", title: { zh: "备份记录不再时有时无", en: "Backup list no longer comes and goes" }, items: [
    { k: "fix", zh: "Google 登录过期时保留原来的备份记录，并提示重新授权", en: "When the Google sign-in expires, the backup list stays and offers to reconnect" }
  ] },
  { v: "2026-10-25.21", title: { zh: "AI 问询改名「咩咩咩」", en: "The AI helper is now called Baa Baa" }, items: [
    { k: "better", zh: "「小Y问」改名「咩咩咩」，换上卡通小羊图标", en: "The AI helper is renamed Baa Baa, with a cartoon lamb icon" }
  ] },
  { v: "2026-10-25.20", title: { zh: "备份记录更清爽", en: "Tidier backup list" }, items: [
    { k: "better", zh: "默认只显示最近 3 条备份，更早的可以展开", en: "Shows the last 3 backups, with older ones tucked away" },
    { k: "better", zh: "来源默认选 Google Drive", en: "Google Drive is the default source" }
  ] },
  { v: "2026-10-25.19", title: { zh: "新增「小Y问」：在家教育的 AI 问询", en: "New AI helper for homeschool questions" }, items: [
    { k: "new", zh: "七个常见话题：调整今天的课、背经文、孩子坐不住等", en: "Seven common topics: adjusting today's lessons, memorising verses, restless kids and more" },
    { k: "new", zh: "填自己的 AI key 直接出答案，没有就复制问题去常用 AI", en: "Get answers with your own AI key, or copy the question to a popular AI app" },
    { k: "better", zh: "只发学习统计，不发孩子姓名和备注", en: "Only learning stats are sent—never names or notes" }
  ] },
  { v: "2026-10-25.18", title: { zh: "子页顶上显示完整路径", en: "Sub-pages show the full path" }, items: [
    { k: "better", zh: "子页顶部显示完整路径，每一层都能点回去", en: "Sub-pages show the full path at the top; tap any level to go back" }
  ] },
  { v: "2026-10-25.17", title: { zh: "备份到选好的 Drive 文件夹更可靠", en: "Backups to a chosen Drive folder work reliably" }, items: [
    { k: "fix", zh: "在 Google Drive 里选的文件夹，之后写备份不再失败", en: "Backups to a folder picked in Google Drive no longer fail" }
  ] },
  { v: "2026-10-25.16", title: { zh: "Drive 文件夹路径加了说明", en: "Clearer hint for the Drive folder" }, items: [
    { k: "better", zh: "路径框下提示：想用已有的文件夹，请点「选一个文件夹」", en: "A hint explains how to pick an existing Drive folder" }
  ] },
  { v: "2026-10-25.15", title: { zh: "云盘升级后不用重新连接", en: "No need to reconnect cloud drives" }, items: [
    { k: "fix", zh: "原来连好的云盘自动沿用，不用重新连接", en: "Cloud drives you already connected stay connected" },
    { k: "better", zh: "备份结果里显示 Google Drive、Dropbox 的名字", en: "Backup results name Google Drive or Dropbox" }
  ] },
  { v: "2026-10-25.14", title: { zh: "定时备份交给小月亮统一做", en: "Scheduled backups now run from Little Moon" }, items: [
    { k: "better", zh: "定时备份由小月亮统一做，这里手动备份和恢复", en: "Little Moon handles scheduled backups; back up and restore by hand here" },
    { k: "better", zh: "能直接用小月亮的备份文件恢复，只补缺不覆盖", en: "Restore straight from a Little Moon backup; it only fills in what's missing" },
    { k: "better", zh: "云盘连一次，四个应用都能用", en: "Connect a cloud drive once for all four apps" }
  ] },
  { v: "2026-10-25.13", title: { zh: "备份可以直接存到 Google Drive 和 Dropbox", en: "Back up straight to Google Drive or Dropbox" }, items: [
    { k: "new", zh: "连上 Google Drive 或 Dropbox，备份放在你指定的文件夹", en: "Connect Google Drive or Dropbox and save backups to a folder you choose" },
    { k: "new", zh: "已有的备份按来源查看，可下载、恢复、删除", en: "Browse backups by source to download, restore or delete" }
  ] },
  { v: "2026-10-25.12", title: { zh: "备份与恢复页重新整理", en: "Backup & restore page redesigned" }, items: [
    { k: "better", zh: "状态卡加两个主按钮，备份频率一点就选", en: "A status card with two main buttons, and one-tap frequency" },
    { k: "better", zh: "「备份到哪」改成可勾选的卡片，手机电脑都整齐", en: "Choose destinations from tick cards, neat on phone and laptop" }
  ] },
  { v: "2026-10-25.11", title: { zh: "新增备份与恢复", en: "New Backup & restore" }, items: [
    { k: "new", zh: "我的 → 备份与恢复：现在备份，或只下载一份", en: "Me → Backup & restore: back up now or just download a copy" },
    { k: "new", zh: "按周、按月或自定义天数自动备份", en: "Automatic backups weekly, monthly or every few days" },
    { k: "new", zh: "存到云端、电脑文件夹或下载，恢复前先预览", en: "Save to the cloud, a folder or a download; preview before restoring" }
  ] },
  { v: "2026-10-24.10", title: { zh: "左滑删除不再打乱排版", en: "Swipe-to-delete no longer disturbs layouts" }, items: [
    { k: "fix", zh: "左滑删除不再打乱列表行的排版", en: "Swiping to delete no longer messes up row layouts" }
  ] },
  { v: "2026-10-24.9", title: { zh: "只有该删的行才能左滑", en: "Only deletable rows can be swiped" }, items: [
    { k: "fix", zh: "不该删的区域不会再被误当成可以左滑删除", en: "Areas that shouldn't be deleted can no longer be swiped away" }
  ] },
  { v: "2026-10-24.8", title: { zh: "左滑后点红色按钮能删除了", en: "Tapping the red Delete button works" }, items: [
    { k: "fix", zh: "左滑露出红色按钮后，点它就删除，不再弹回", en: "After swiping, tapping the red button deletes instead of bouncing back" }
  ] },
  { v: "2026-10-24.7", title: { zh: "左滑删除不改变行的样式", en: "Swipe-to-delete keeps row styles" }, items: [
    { k: "fix", zh: "能左滑删除的行，样式和原来一样", en: "Swipeable rows keep their original look" }
  ] },
  { v: "2026-10-24.6", title: { zh: "学年假期可以左滑删除", en: "Swipe left to delete school breaks" }, items: [
    { k: "better", zh: "设置里学年的假期行可以左滑删除", en: "In Settings, swipe a school break left to delete it" }
  ] },
  { v: "2026-10-24.5", title: { zh: "往下滚动时顶部有一条固定栏", en: "A slim bar stays on top while scrolling" }, items: [
    { k: "new", zh: "往下滚时顶部固定一条窄条，有返回和标题，点标题回到顶部", en: "Scrolling down shows a slim bar with Back and the title; tap the title to jump up" }
  ] },
  { v: "2026-10-24.4", title: { zh: "手机上版本号不再挤", en: "Version number fits on phones" }, items: [
    { k: "fix", zh: "窄屏时版本号放在同步状态下面，宽屏同一行", en: "On narrow screens the version sits under the sync status; on wider ones, beside it" }
  ] },
  { v: "2026-10-24.3", title: { zh: "儿童要理问答有了中文", en: "Children's catechism now in Chinese" }, items: [
    { k: "new", zh: "儿童要理问答 145 问加入中文，一键导入中英文", en: "All 145 catechism questions now have Chinese; import both languages in one tap" },
    { k: "new", zh: "可以逐段标「已核对」", en: "Mark each section as checked" }
  ] },
  { v: "2026-10-24.2", title: { zh: "经文卡库新增 10 套成套经文", en: "10 new verse sets in Scripture Cards" }, items: [
    { k: "new", zh: "创造、十诫、主祷文、圣诞、复活等 10 套，按年级标好", en: "10 themed sets—Creation, Ten Commandments, Lord's Prayer, Christmas, Easter and more—marked by grade" },
    { k: "new", zh: "儿童要理问答可以成套一键导入，不用粘贴", en: "Import the children's catechism as a set, no pasting needed" }
  ] },
  { v: "2026-10-24.1", title: { zh: "顶栏显示版本号", en: "Version number in the header" }, items: [
    { k: "new", zh: "同步状态旁显示版本号，方便看有没有更新", en: "The version shows beside the sync status, so you can tell if you're up to date" }
  ] },
  { v: "2026-10-23.4", title: { zh: "资源页新增经文卡库入口", en: "Scripture Cards on the Resources page" }, items: [
    { k: "new", zh: "资源页可以直接进入经文卡库", en: "Open Scripture Cards straight from Resources" },
    { k: "better", zh: "经文卡库的顶部重新整理", en: "Tidier Scripture Cards header" }
  ] },
  { v: "2026-10-23.3", title: { zh: "背经文按批自动安排，经文卡库加图表", en: "Memory verses come in batches; charts in Scripture Cards" }, items: [
    { k: "better", zh: "背诵经文按「本批」自动拉取", en: "Memory verses are picked automatically in batches" },
    { k: "new", zh: "经文卡库加了图表，进度一目了然", en: "Charts in Scripture Cards show progress at a glance" },
    { k: "new", zh: "日历上可以补记", en: "Catch up on missed entries from the calendar" }
  ] },
  { v: "2026-10-23.2", title: { zh: "今天页可以只打印今天", en: "Print just today from the Today page" }, items: [
    { k: "new", zh: "今天页加「打印今日页」：敬拜、经文、任务和备注", en: "New Print today: worship, memory verse, tasks and notes" }
  ] },
  { v: "2026-10-23.1", title: { zh: "换语言更方便，子页路径固定在顶部", en: "Easier language switch; sub-page path stays on top" }, items: [
    { k: "better", zh: "顶栏地球按钮切换简体、繁體、English", en: "A globe button in the header switches between Simplified, Traditional and English" },
    { k: "better", zh: "子页的路径条固定在顶部，下滑也看得到", en: "The sub-page path bar stays visible while scrolling" }
  ] },
  { v: "2026-10-22.1", title: { zh: "应用切换换成九宫格", en: "New grid app switcher" }, items: [
    { k: "better", zh: "右上角九宫格切换姊妹应用，手机上从底部弹出", en: "Switch sister apps from a grid in the top right; on phones it slides up from the bottom" }
  ] },
  { v: "2026-10-21.1", title: { zh: "姊妹应用加入「牧羊人」", en: "Shepherd joins the sister apps" }, items: [
    { k: "new", zh: "姊妹应用里多了第四个：牧羊人", en: "A fourth sister app: Shepherd" }
  ] },
  { v: "2026-10-19.1", title: { zh: "经文复习不再越积越多", en: "Verse reviews no longer pile up" }, items: [
    { k: "better", zh: "90 天复习之后再加一次 180 天的复习", en: "An extra review 180 days after the 90-day one" },
    { k: "new", zh: "复习积压时今天页提示，一键「今天多复习 3 条」", en: "When reviews pile up, Today offers “Review 3 more today”" }
  ] },
  { v: "2026-10-18.4", title: { zh: "打印改成在页面里直接预览", en: "Printing previews right in the page" }, items: [
    { k: "better", zh: "打印时页面变成要打的纸，有返回和打印按钮，打完自动回来", en: "Print turns the page into the sheet with Back and Print, and returns when done" }
  ] },
  { v: "2026-10-18.3", title: { zh: "打印不再打开新标签页", en: "Printing no longer opens a new tab" }, items: [
    { k: "better", zh: "只打要的那张纸，不用开新标签页", en: "Prints just the sheet without opening a new tab" }
  ] },
  { v: "2026-10-18.2", title: { zh: "打印的纸单独打开", en: "The print sheet opens on its own" }, items: [
    { k: "better", zh: "打印时纸单独打开，屏幕上也能先看到", en: "The sheet opens on its own so you can see it before printing" }
  ] },
  { v: "2026-10-18.1", title: { zh: "手机上打印不再打错页面", en: "Phone printing prints the right page" }, items: [
    { k: "fix", zh: "手机上打印不会再打成「我的」页", en: "Printing on phones no longer prints the Me page instead" }
  ] },
  { v: "2026-10-17.12", title: { zh: "周例行一次看一天", en: "Weekly routine shows one day at a time" }, items: [
    { k: "better", zh: "周例行默认打开今天，左右箭头切换星期", en: "Weekly routine opens on today; arrows switch days" },
    { k: "better", zh: "星期条显示每天几项，「整周」看全部", en: "The weekday strip shows item counts; Whole week shows everything" }
  ] },
  { v: "2026-10-17.11", title: { zh: "姊妹应用按钮回到右上角", en: "Sister-app buttons back in the top right" }, items: [
    { k: "better", zh: "姊妹应用的按钮回到右上角，和小月亮一样", en: "Sister-app buttons are back in the top right, like Little Moon" }
  ] },
  { v: "2026-10-17.10", title: { zh: "周例行的按钮挪到上面", en: "Weekly routine buttons moved up" }, items: [
    { k: "better", zh: "添加、套用模板和说明放到最上面", en: "Add, Apply template and the explanation now sit at the top" }
  ] },
  { v: "2026-10-17.9", title: { zh: "课程、资源、日历分成小页", en: "Courses, Resources and Calendar split into sub-pages" }, items: [
    { k: "better", zh: "课程分成单元与课时、年度范围、学习目标", en: "Courses split into Units & lessons, Yearly scope and Goals" },
    { k: "better", zh: "资源分成日常点子、资源库、参考来源", en: "Resources split into Daily ideas, Library and References" },
    { k: "better", zh: "每个入口直接显示简要情况", en: "Each entry shows a quick summary" }
  ] },
  { v: "2026-10-17.8", title: { zh: "新增「我的」页签", en: "New Me tab" }, items: [
    { k: "new", zh: "底部新增「我的」：报告、法规、设置、介绍、打印", en: "New Me tab at the bottom: reports, laws, settings, about and print" },
    { k: "better", zh: "顶栏更简洁", en: "A cleaner header" }
  ] },
  { v: "2026-10-17.7", title: { zh: "换上自己的配色和字体", en: "A look of its own" }, items: [
    { k: "better", zh: "浅蓝底、深蓝字、衬线标题，和小月亮区分开", en: "Light blue background, navy text and serif headings, distinct from Little Moon" },
    { k: "better", zh: "深色主题换成深蓝色调", en: "Dark theme in navy tones" },
    { k: "better", zh: "姊妹应用「家庭妈妈小助手」改名「爱家小助手」", en: "Sister app renamed Loving Home Helper" }
  ] },
  { v: "2026-10-17.6", title: { zh: "设置页顶部更简洁", en: "Simpler Settings header" }, items: [
    { k: "better", zh: "设置页去掉重复的「介绍」按钮", en: "Removed the duplicate About button from Settings" }
  ] },
  { v: "2026-10-17.5", title: { zh: "顶栏的设置、介绍、打印重新排列", en: "Header buttons rearranged" }, items: [
    { k: "better", zh: "宽屏上设置、介绍、打印并排，手机上收进 ⋯ 菜单", en: "Settings, About and Print side by side on wide screens; in a ⋯ menu on phones" }
  ] },
  { v: "2026-10-17.4", title: { zh: "关闭弹出页回到原来的位置", en: "Closing a panel returns you to where you were" }, items: [
    { k: "fix", zh: "关闭弹出页后回到打开前的位置", en: "Closing a panel returns to your previous scroll position" }
  ] },
  { v: "2026-10-17.3", title: { zh: "标题旁可以切换姊妹应用", en: "Switch sister apps beside the title" }, items: [
    { k: "new", zh: "标题两边的箭头切换到小月亮等姊妹应用", en: "Arrows beside the title switch to Little Moon and other sister apps" },
    { k: "new", zh: "设置里新增「姊妹应用」", en: "New Sister apps section in Settings" }
  ] },
  { v: "2026-10-17.2", title: { zh: "每天自动挑经文，可打印日、周、月计划", en: "Daily verse auto-pick; print day, week and month" }, items: [
    { k: "new", zh: "早上 8 点没有在学的经文时自动挑一节，也可以换", en: "At 8am, if nothing is being learned, a verse is picked for you; swap if you like" },
    { k: "new", zh: "可以打印今天、本周、本月的计划", en: "Print today's, this week's or this month's plan" }
  ] },
  { v: "2026-10-17.1", title: { zh: "背经文变成每天的任务清单", en: "Memory verses as a daily checklist" }, items: [
    { k: "better", zh: "到期的复习自动排进每天，数量按年龄限制", en: "Due reviews are added to each day, capped by age" },
    { k: "better", zh: "只有「会了」和「再来」，做完可以撤销", en: "Just “Got it” and “Again”, with undo" },
    { k: "better", zh: "经文卡库可以筛选，按复习日期排序", en: "Scripture Cards can be filtered and sorted by review date" }
  ] },
  { v: "2026-10-16.19", title: { zh: "成员可以改自己的名字", en: "Members can rename themselves" }, items: [
    { k: "new", zh: "成员可以改自己的名字，管理者可以改任何人的", en: "Members can rename themselves; owners can rename anyone" }
  ] },
  { v: "2026-10-16.18", title: { zh: "家庭管理者可以管理成员", en: "Owners can manage members" }, items: [
    { k: "new", zh: "管理者可以重置邀请码、调整成员权限、移除成员", en: "Owners can reset the invite code, change member roles and remove members" }
  ] },
  { v: "2026-10-16.17", title: { zh: "日常点子加入中文来源", en: "Chinese sources for Daily ideas" }, items: [
    { k: "new", zh: "日常点子新增三个中文来源，每天推荐两篇", en: "Three Chinese sources for Daily ideas, with two picks a day" }
  ] },
  { v: "2026-10-16.16", title: { zh: "整个界面可以切换语言", en: "Switch the whole app's language" }, items: [
    { k: "new", zh: "整个界面可切换简体、繁體、English", en: "Switch the whole app between Simplified, Traditional and English" }
  ] },
  { v: "2026-10-16.15", title: { zh: "日常点子来自育儿博客", en: "Daily ideas from parenting blogs" }, items: [
    { k: "new", zh: "日常点子从博客取最新的内容", en: "Daily ideas now come fresh from blogs" },
    { k: "new", zh: "加了界面语言切换", en: "Added an interface language switch" }
  ] },
  { v: "2026-10-16.14", title: { zh: "抓取经文的设置更清楚", en: "Clearer verse-fetching settings" }, items: [
    { k: "better", zh: "自动抓取经文里列出每个译本的来源和需要什么", en: "Auto-fetch lists each translation's source and what it needs" }
  ] },
  { v: "2026-10-16.13", title: { zh: "抓取经文支持更多译本", en: "More translations for fetching verses" }, items: [
    { k: "new", zh: "新增 BSB、NLT、当代译本，也能抓 NASB、NIV、CSB、NKJV", en: "Added BSB, NLT and CCB, plus NASB, NIV, CSB and NKJV" }
  ] },
  { v: "2026-10-16.12", title: { zh: "生成的经文卡有中英文标题", en: "Generated verse cards get bilingual titles" }, items: [
    { k: "better", zh: "经文卡标题中英对照，如「诗篇 56:3 - Psalms 56:3」", en: "Card titles in both languages, e.g. 诗篇 56:3 - Psalms 56:3" },
    { k: "fix", zh: "同一处经文不会重复生成", en: "The same verse is no longer added twice" }
  ] },
  { v: "2026-10-16.11", title: { zh: "新增日常点子", en: "New Daily ideas" }, items: [
    { k: "new", zh: "资源页按年龄推荐手工、户外和家务点子", en: "Resources suggests crafts, outdoor play and chores by age" }
  ] },
  { v: "2026-10-16.10", title: { zh: "从圣经和要理问答生成经文卡", en: "Generate verse cards from the Bible and catechism" }, items: [
    { k: "new", zh: "可以从圣经和新城要理问答生成经文卡", en: "Create verse cards from the Bible and the New City Catechism" }
  ] },
  { v: "2026-10-16.9", title: { zh: "点顶栏标记打开介绍", en: "Header badge opens the guide" }, items: [
    { k: "better", zh: "点孩子名字旁的标记就能打开介绍", en: "Tap the badge beside the child's name to open the guide" }
  ] },
  { v: "2026-10-16.8", title: { zh: "新增课程库", en: "New curriculum library" }, items: [
    { k: "new", zh: "按阶段和科目的课程库，中英文两条线并行", en: "A curriculum library by stage and subject, with English and Chinese tracks" },
    { k: "new", zh: "一键生成下一单元，也可以粘贴大纲导入", en: "Generate the next unit in one tap, or paste an outline to import" }
  ] },
  { v: "2026-10-16.7", title: { zh: "保存失败时说明原因", en: "Save errors explain what went wrong" }, items: [
    { k: "better", zh: "保存失败时提示具体原因", en: "Failed saves now show the reason" }
  ] },
  { v: "2026-10-16.6", title: { zh: "新增学年、假期和进度", en: "School year, breaks and pacing" }, items: [
    { k: "new", zh: "设置学年和假期", en: "Set the school year and breaks" },
    { k: "new", zh: "单元按周排进度，看得出是否跟上", en: "Pace units by week and see if you're on track" },
    { k: "new", zh: "学前年度范围图，报告里加进度，还有介绍页", en: "A Pre-K yearly scope map, pacing in reports, and an About page" }
  ] },
  { v: "2026-10-16.5", title: { zh: "经文卡分别选中英文译本", en: "Choose Chinese and English versions for verse cards" }, items: [
    { k: "new", zh: "经文卡分别记中文和英文译本，家庭可设默认", en: "Verse cards keep Chinese and English versions, with family defaults" },
    { k: "better", zh: "导入的经文标明和合本、ESV", en: "Imported verses are labelled CUV / ESV" }
  ] },
  { v: "2026-10-16.4", title: { zh: "新增课程、资源、日历和月报", en: "Courses, resources, calendar and monthly reports" }, items: [
    { k: "new", zh: "课程树带信仰连接和学习目标", en: "A course tree with faith links and goals" },
    { k: "new", zh: "资源库和月历，可以标休息日", en: "A resource library and a month calendar with days off" },
    { k: "new", zh: "月度报告，可以导出表格", en: "Monthly reports you can export as a spreadsheet" },
    { k: "better", zh: "可以选择同步到小月亮", en: "Optionally mirror to Little Moon" }
  ] },
  { v: "2026-10-16.3", title: { zh: "法规页可以切换州", en: "Switch states on the law page" }, items: [
    { k: "new", zh: "法规页加了密歇根、印第安纳、北卡、田纳西", en: "The law page adds Michigan, Indiana, North Carolina and Tennessee" }
  ] },
  { v: "2026-10-16.2", title: { zh: "每日敬拜、背经文和今天的任务", en: "Daily worship, memory verses and today's tasks" }, items: [
    { k: "new", zh: "每日敬拜和经文卡，按间隔复习", en: "Daily worship and scripture cards with spaced review" },
    { k: "new", zh: "周例行和今天的任务清单", en: "Weekly routines and today's task list" },
    { k: "new", zh: "读经计划和伊利诺伊州在家教育法规", en: "Reading plans and Illinois homeschool law" }
  ] },
  { v: "2026-10-16.1", title: { zh: "家庭学堂上线", en: "Family Homeschool launches" }, items: [
    { k: "new", zh: "用小月亮的账号登录，共用家庭和孩子", en: "Sign in with your Little Moon account and share the same family and children" },
    { k: "new", zh: "新生儿的年龄按天显示，和小月亮一样", en: "Newborns' ages show in days, like Little Moon" }
  ] }
];
