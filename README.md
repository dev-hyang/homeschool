# homeschool

家庭学堂 · 以信仰为中心的在家教育规划与记录。小月亮（baby-log）的姊妹应用：小月亮回答"刚才发生了什么"，家庭学堂回答"接下来做什么、做到哪了"。

纯静态网页，无构建步骤，托管在 GitHub Pages：`https://dev-hyang.github.io/homeschool/`。

## 与小月亮的关系

- 同一个 Supabase 项目、同一个账号、同一个家庭、同一份孩子列表。两个站点都在 `dev-hyang.github.io` 下，登录会话通过浏览器自动共享。
- 孩子的名字和生日在小月亮里维护；这里只读。数据库里孩子来自 `children` 表（迁移 002），表还没建时回退到 `families.settings` 的 JSON。
- 数据库脚本统一放在 baby-log 仓库的 `supabase/` 目录（基线 `schema.sql` 加编号迁移）。本仓库以后新增的表也写成那里的迁移文件。
- 在线优先：直接读写 Supabase，不做离线队列；本机只存"当前看哪个孩子"和主题。

## 文件结构

```
index.html        页面骨架
app.css           样式（与小月亮同一套设计语言）
js/
  app.js          入口
  core/config.js  Supabase 地址与公开 key、版本号、小月亮地址
  core/util.js    DOM / 时间小工具
  core/state.js   状态 S、孩子与年龄、阶段
  core/auth.js    登录、家庭、成员、孩子读取、实时刷新
  views.js        页面渲染（今天 / 课程 / 资源 / 日历 / 报告）
  sheet.js        设置页
  events.js       事件分发
```

## 阶段

| 阶段 | 内容 | 状态 |
|---|---|---|
| 0 | 地基：共享登录、家庭、孩子切换；children 表迁移 | 本仓库当前 |
| 1 | 每日敬拜、经文卡与复习、周例行模板、今日任务 | 下一步 |
| 2 | 七个领域的课程树、信仰连接、学前目标 | |
| 3 | 中英文资源库、月历、教会年历预留 | |
| 4 | 月度报告导出、回写小月亮活动记录 | |

设计方案见家庭内部的 Claude 文档《Homeschool 设计方案》。

## 本地调试

ES Module 需要通过 http(s) 访问：

```
python -m http.server 8766
```

然后打开 `http://127.0.0.1:8766/`。本地调试时和小月亮不在同一个源，登录要单独做一次。
