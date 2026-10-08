// 在 Node 里读 TypeScript 数据文件（course/stages.ts、checks/questions.ts、exercises/*.ts）。
// 这些文件里有无扩展名的相对 import（'./types'），Node 自带的类型剥离读不了，所以用仓库已有的 esbuild 打成一个 ESM 字符串再 import。
// vue 在练习的检查函数里才会用到，这里只读数据，用空桩替换，避免真的加载 Vue。
import esbuild from 'esbuild';

const stubVue = {
  name: 'stub-vue',
  setup(build) {
    build.onResolve({ filter: /^vue$/ }, () => ({ path: 'vue', namespace: 'stub-vue' }));
    build.onLoad({ filter: /.*/, namespace: 'stub-vue' }, () => ({
      contents: 'module.exports = new Proxy({}, { get: () => () => {} })',
      loader: 'js',
    }));
  },
};

/** 把一个 .ts 入口打成 ESM 并 import，返回模块的导出 */
export async function loadTs(entry) {
  const r = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    logLevel: 'silent',
    plugins: [stubVue],
  });
  const code = r.outputFiles[0].text;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
