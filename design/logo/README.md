# 站点标志候选

站点现在用 A。三个都是本课程原创的图形（不是 Vue 官方标志），随课程内容以 CC BY-NC-SA 4.0 发布。

- `logo-a-blocks.svg`：V 形由两块面片拼成，顶上一块菱形落进缺口（拼积木）。**当前采用**。
- `logo-b-check.svg`：粗描边的 V，缺口里一个琥珀色对勾（练习通过）。
- `logo-c-steps.svg`：三条逐级变窄的圆角条叠成 V（台阶、六个阶段）。

## 换用 B 或 C

1. `cp design/logo/logo-b-check.svg course/public/favicon.svg`（favicon；`config.mts` 的 `head` 已引用它）。
2. 把 `course/.vitepress/theme/components/SiteLogo.vue` 里 `<svg>` 的内容换成对应文件里的图形：B 用一条 `stroke` 路径加一条对勾路径，C 用三个 `rect`。颜色类 `lg-a`、`lg-b`、`lg-c` 在 `style.css` 的 `.site-logo` 里（B 的 V 描边用 `stroke: var(--brand)`，对勾用 `stroke: var(--warn)`）。
