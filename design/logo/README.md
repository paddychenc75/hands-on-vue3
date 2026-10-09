# 站点标志候选

站点现在用 D。四个都是本课程原创的图形（不是 Vue 官方标志），随课程内容以 CC BY-NC-SA 4.0 发布。

- `logo-a-blocks.svg`：V 形由两块面片拼成，顶上一块菱形落进缺口（拼积木）。设计审核认为最像官方标志的轮廓，不采用。
- `logo-b-check.svg`：粗描边的 V，缺口里一个琥珀色对勾（练习通过）。
- `logo-c-steps.svg`：三条逐级变窄的圆角条叠成 V（台阶、六个阶段）。
- `logo-d-check-v.svg`：对勾形的单笔 V（短左臂、长右臂），V 就是对勾。**当前采用**（设计审核的建议）。站点图标 `course/public/favicon.svg` 是它放在深色圆角方块上的 16px 友好版（纯色、笔画加粗）。

## 换用别的候选

1. 把候选的图形放到一块深色圆角方块上，存成 `course/public/favicon.svg`（`config.mts` 的 `head` 已引用它；要纯色、笔画不细于 2px）。
2. 把 `course/.vitepress/theme/components/SiteLogo.vue` 里 `<svg>` 的内容换成对应文件里的图形：颜色用 `var(--brand)`、`var(--teal)`、`var(--warn)`：A、C 用 `fill`，B 用 `stroke`；D 的渐变停靠点类 `lg-s1`、`lg-s2` 在 `style.css` 的 `.site-logo` 里。
