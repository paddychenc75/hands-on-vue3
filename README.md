# 动手学 Vue 3

中文交互式 Vue 3 课程：29 章，6 个阶段（入门、进阶、高级、原理与架构、生态与实战、深入），外加一页速查表。每章有讲解、可运行的实验台、自动判分的练习和章内自测，每个阶段末尾有一次阶段测验。另有先预测再运行、间隔复习和提示阶梯。站点用 [VitePress](https://vitepress.dev) 构建，静态发布到 GitHub Pages。

学习进度只存在你的浏览器里（`localStorage`），不上传到任何地方。

姊妹课程：[动手学 React](https://github.com/paddychenc75/hands-on-react)，同一套学习机制。

## 本地运行

需要 Node 24 以上（`.nvmrc` 是 24）。

```bash
npm install
npx playwright install chromium   # 第一次，浏览器测试用
npm run dev                       # 开发服务器（热更新）
npm run build                     # 构建到 course/.vitepress/dist
npm run preview                   # 预览构建结果
```

站点有 base 路径 `/hands-on-vue3/`（和 GitHub Pages 的项目站点一致），所以本地地址不是根路径：开发服务器是 `http://localhost:5173/hands-on-vue3/`，预览是 `http://localhost:4173/hands-on-vue3/`（端口以命令输出为准）。base 只在 `course/site.mjs` 定义一处。

## 检查和测试

```bash
npm run check      # 类型检查 + 内容校验 + 文档数字核对 + 单元测试，约 3 秒，每次提交前跑
npm test           # check + 构建 + 浏览器测试，约 9 分钟
npm run test:e2e -- 03-refs 04-computed   # 浏览器测试只测指定的章
```

`npm install` 会自动启用提交前钩子（提交前跑内容校验和文档数字核对，2 秒内；也可以手动 `node scripts/setup-hooks.mjs`）。每个命令何时用、多久跑完，见 [AGENTS.md](AGENTS.md) 的“命令”一节。

## 目录

- `course/chapters/`：章节 Markdown（`NN-id.md`，自测题内联在里面），`cheat.md` 是速查表
- `course/`：`exercises/`（练习判题数据）、`labs/`（实验台）、`figures/`（示意图）、`checks/`（阶段测验专用题）、`stages.ts`（阶段定义）、`site.mjs`（部署路径 base）、`content-parse.mjs`（章节解析）、`writing-terms.mjs`（写作规则用词表）、`glossary.md`（术语表页）、`engine/`（学习机制，纯逻辑在 `engine/logic/`）
- `course/.vitepress/`：站点配置、构建时抽取数据的插件、主题组件和样式
- `editor/`：练习编辑器（CodeMirror 6）
- `scripts/`：内容校验、文档数字核对、新建一章、浏览器测试入口、截图、启用钩子
- `tests/`：`unit/`（Vitest）、`site/`（Playwright）
- `docs/`：旧版单文件课程的审查报告，只作背景参考

## 加一章

```bash
npm run new-chapter -- <章id> --stage <1-6> --after <已有章id> --title "标题"
```

脚本会生成章节、练习和实验台测试数据的骨架，更新复习卡片键快照；插在中间时还会把后面的章改名、改章号、改引用。之后把“【待写】”占位换成内容，跑 `npm run check`。完整步骤、复习卡片键的规则、学习机制和写作规范都在 [AGENTS.md](AGENTS.md)；Markdown 的各种写法在 [course/AUTHORING.md](course/AUTHORING.md)。

## 部署到 GitHub Pages

1. 把仓库推到 GitHub，仓库名是 `hands-on-vue3`（换名字要同步改 `course/site.mjs` 里的 `BASE_PATH`）。
2. 在仓库 **Settings → Pages**，把 **Source** 设为 **GitHub Actions**。
3. 推送到 `main`。`.github/workflows/ci.yml` 先跑检查、构建和浏览器测试；全部通过后 `deploy.yml` 发布站点，地址是 `https://paddychenc75.github.io/hands-on-vue3/`。

Pull request 只跑 CI，不会部署。

## 许可证

本仓库有两种许可证：

- **代码**用 [MIT](LICENSE)：`course/engine/`、`course/.vitepress/`、`course/labs/`、`course/figures/`、`course/exercises/` 里的判题代码、`editor/`、`scripts/`、`tests/`、`.github/` 和各配置文件。
- **课程内容**用 [CC BY-NC-SA 4.0](LICENSE-CONTENT)：`course/chapters/`、`course/index.md`、`course/review.md`、`course/check/`、`course/AUTHORING.md`、`course/checks/questions.ts`、`course/stages.ts`、术语表和 `docs/`。你可以转载和改编，但要署名、不能商用，改编后的作品要用同样的许可证。

课文里的示例代码片段可以按 MIT 使用。

## 交给 AI 助手维护

项目规则全部在 [AGENTS.md](AGENTS.md)（Claude Code 通过 `CLAUDE.md` 导入它，Codex 等其他助手直接读它）：目录约定、命令表、加章步骤、改引擎的流程、学习机制和写作规范。
