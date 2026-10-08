// npm install 之后自动运行（package.json 的 prepare）：让 git 使用 .githooks/ 里的提交前钩子。
// 不需要额外依赖。在 CI 里、没有 .git 目录（例如从压缩包解开）、或没有 git 命令时什么也不做，永远不会让 npm ci 失败。
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
if (process.env.CI || !fs.existsSync(path.join(root, '.git'))) process.exit(0)
try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: root, stdio: 'ignore' })
} catch {
  // 没有 git 或设置失败：不影响安装
}
