// 站点的部署路径（base）只在这里定义一处。配置（course/.vitepress/config.mts）、浏览器测试（tests/site/helpers.js）、
// 截图和构建脚本（scripts/）都从这里取。写成 .mjs，Node 脚本、CommonJS 的测试和 VitePress 配置都能直接 import / require。
//
// 部署到 GitHub Pages 的项目站点：https://paddychenc75.github.io/hands-on-vue3/ ，所以 base 是 /hands-on-vue3/（前后都有斜杠）。
// 换仓库名时只改这里。React 课程对应的是 /hands-on-react/。
export const BASE_PATH = '/hands-on-vue3/'

/** 不带结尾斜杠的写法：origin + BASE_NO_SLASH + '/chapters/…' 拼地址 */
export const BASE_NO_SLASH = BASE_PATH.replace(/\/$/, '')
