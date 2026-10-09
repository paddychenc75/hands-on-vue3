# 动手学 Vue 3

中文交互式 Vue 3 课程：42 章，6 个阶段（入门、进阶、生态与实战、响应式原理、渲染原理、架构与工程），其中六章是选读，四章是动手做的项目章，外加一页速查表。每章有讲解、可运行的实验台、自动判分的练习和章内自测，每个阶段末尾有一次阶段测验。另有先预测再运行、间隔复习和提示阶梯。站点用 [VitePress](https://vitepress.dev) 构建，静态发布到 GitHub Pages。

学习进度默认只存在你的浏览器里（`localStorage`），不上传到任何地方。想在手机和电脑之间接着学，可以开启可选的跨设备同步（见下面“跨设备同步进度”），也可以用不需要账号的导出 / 导入文件。

姊妹课程：[动手学 React](https://github.com/paddychenc75/hands-on-react)，同一套学习机制。

## 跨设备同步进度（可选）

在站点的“课程地图”页，找到“换设备也能接着学”下面的“跨设备同步”，点开它。有两种办法，都是可选的：不开启就什么都不会发送。

**办法一：用你自己的 GitHub 账号同步。**进度会存进你账号下的一个私密 Gist（本站没有服务器，看不到你的数据）。

1. 点面板里的“创建令牌”链接。它会在新标签页打开 GitHub 的创建页面。需要先登录 GitHub，页面是英文的。名称和权限已经填好，权限只勾了 gist（以 GitHub 页面显示为准）。
2. 在 GitHub 页面最下面点“Generate token”。复制以 `ghp_` 开头的那串字符。它只显示一次，离开那一页就再也看不到了；想在别的设备上用同一个，现在就存进密码管理器。
3. 回到本站，把令牌粘贴进输入框，点“开启同步”。站点会先检查令牌能不能用，再做第一次同步，并告诉你结果。

几点说明：

- **只勾 gist 权限，别的都不要勾。**即使令牌泄露，对方也只能动你的 Gist，碰不到你的代码仓库。
- **过期时间：**GitHub 默认 30 天（以 GitHub 页面显示为准）。过期后同步会停，站点会提示你重新创建令牌。你可以选更长，或者选不过期。
- **在另一台设备上：**打开本站，把这三步再做一遍，新建一个令牌（旧令牌事后看不到，不用去找；存了旧令牌的话直接重复第 3 步粘贴它也行）。两个令牌只要来自同一个 GitHub 账号，用的就是同一份进度。在手机上打开时，面板顶部会直接给出“去 GitHub 新建令牌”的按钮。开启时站点会在你的账号里找已有的同步文件 `hands-on-vue3-progress.json`，找到就接着用同一份。个别令牌列不出私密 Gist，找不到时，展开“手动填 Gist”，填第一台设备上显示的 Gist 链接或编号。
- 令牌只存在这台设备的浏览器里，只会发给 GitHub。公用电脑上用完，请点“断开同步”。

**办法二：导出 / 导入文件。**不需要账号。在一台设备上点“导出进度文件”，在另一台设备上点“选择要导入的文件”，选“与本机进度合并”。导出的文件里没有令牌。

两台设备各学各的也没关系：同步时按字段合并，谁学的内容都不会丢。开启同步后，在一台设备上把一章改回未完成，可能被另一台设备的已完成带回来。覆盖本机进度之前，站点会先备份，面板里可以恢复。规则和实现见 [AGENTS.md](AGENTS.md) 的“进度同步”一节。

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
- `course/`：`exercises/`（练习判题数据）、`labs/`（实验台）、`figures/`（示意图）、`checks/`（阶段测验专用题）、`stages.ts`（阶段定义）、`site.mjs`（部署路径 base）、`content-parse.mjs`（章节解析）、`writing-terms.mjs`（写作规则用词表）、`learning-paths.mjs`（首页的三条学习路线）、`mini/`（迷你 Vue 零件库，原理阶段的练习和实验台共用）、`glossary.md`（术语表页）、`engine/`（学习机制，纯逻辑在 `engine/logic/`）
- `course/.vitepress/`：站点配置、构建时抽取数据的插件、主题组件和样式
- `editor/`：练习编辑器（CodeMirror 6）
- `scripts/`：内容校验、文档数字核对、新建一章、浏览器测试入口、截图、启用钩子
- `tests/`：`unit/`（Vitest）、`site/`（Playwright）
- `docs/`：旧版单文件课程的审查报告，只作背景参考

## 加一章

```bash
npm run new-chapter -- <章id> --stage <1-6> --after <已有章id> --title "标题"
```

脚本会生成章节、练习和实验台测试数据的骨架，更新复习卡片键快照；插在中间时还会把后面的章改名、改章号、改引用；`npm run move-chapter` 用同样的办法移动一章的位置或阶段，`npm run reorder-chapters` 一次重排所有章。之后把“【待写】”占位换成内容，跑 `npm run check`。完整步骤、复习卡片键的规则、学习机制和写作规范都在 [AGENTS.md](AGENTS.md)；Markdown 的各种写法在 [course/AUTHORING.md](course/AUTHORING.md)。

## 部署到 GitHub Pages

1. 把仓库推到 GitHub，仓库名是 `hands-on-vue3`（换名字要同步改 `course/site.mjs` 里的 `BASE_PATH`）。
2. 在仓库 **Settings → Pages**，把 **Source** 设为 **GitHub Actions**。
3. 推送到 `main`。`.github/workflows/ci.yml` 先跑检查、构建和浏览器测试；全部通过后 `deploy.yml` 发布站点，地址是 `https://paddychenc75.github.io/hands-on-vue3/`。

Pull request 只跑 CI，不会部署。

## 许可证

本仓库有两种许可证：

- **代码**用 [MIT](LICENSE)：`course/engine/`、`course/.vitepress/`、`course/labs/`、`course/figures/`、`course/exercises/` 里的判题代码、`editor/`、`scripts/`、`tests/`、`.github/` 和各配置文件。
- **课程内容**用 [CC BY-NC-SA 4.0](LICENSE-CONTENT)：`course/chapters/`、`course/index.md`、`course/review.md`、`course/check/`、`course/AUTHORING.md`、`course/checks/questions.ts`、`course/stages.ts`、术语表和 `docs/`。你可以转载和改编，但要署名、不能商用，改编后的作品要用同样的许可证。
- **站点标志**（顶栏和站点图标，`design/logo/` 里有候选）是本课程原创的图形，随课程内容以 CC BY-NC-SA 4.0 发布。个人学习用的开源课程，与 Vue 官方无关。

课文里的示例代码片段可以按 MIT 使用。

## 交给 AI 助手维护

项目规则全部在 [AGENTS.md](AGENTS.md)（Claude Code 通过 `CLAUDE.md` 导入它，Codex 等其他助手直接读它）：目录约定、命令表、加章步骤、改引擎的流程、学习机制和写作规范。
