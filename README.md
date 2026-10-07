# 动手学 Vue 3

Vue 3 互动课程：27 章（四个学习阶段）加速查表。每章有讲解、实验台、练习和自测，另有 60 题综合测验。站点用 VitePress 构建，进度保存在浏览器里（localStorage），没有服务端。

```bash
npm install
npx playwright install chromium   # 只在跑测试时需要，只需一次
npm run dev                       # 开发服务器（热更新）
npm run build                     # 构建到 course/.vitepress/dist
npm run preview                   # 预览构建结果
npm test                          # 构建并运行全部站点测试（约 6 分钟）
```

学习功能：章节完成状态（自测答完且练习通过后自动标记）、首页总进度和继续学习、按 2/7/30 天间隔的复习提醒、类比和深入内容的显示开关、示意图点击放大。

内容写作和维护见 [course/AUTHORING.md](course/AUTHORING.md)，项目维护说明见 [CLAUDE.md](CLAUDE.md)。
