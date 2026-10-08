# 动手学 Vue 3

Vue 3 互动课程：26 章（6 个学习阶段）加速查表。每章有讲解、实验台、练习和自测，每个阶段末尾有一次阶段测验。站点用 VitePress 构建，进度保存在浏览器里（localStorage），没有服务端。

```bash
npm install
npx playwright install chromium   # 只在跑测试时需要，只需一次
npm run dev                       # 开发服务器（热更新）
npm run build                     # 构建到 course/.vitepress/dist
npm run preview                   # 预览构建结果
npm test                          # 单元测试，再构建并运行全部站点测试（约 7 分钟）
```

学习功能：章节完成状态（自测全部答对且练习全部通过后自动标记）、首页总进度和继续学习、课前热身、按 1/3/7/16/35 天间隔的今日复习和混合练习、练习的提示阶梯、章末自我解释、6 个阶段测验、示意图点击放大。规则见 [CLAUDE.md](CLAUDE.md) 的“学习机制”一节。

内容写作和维护见 [course/AUTHORING.md](course/AUTHORING.md)，项目维护说明见 [CLAUDE.md](CLAUDE.md)。
