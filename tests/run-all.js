// 依次运行全部测试。从项目根目录运行：npm test
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort();
let bad = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8', timeout: 20 * 60 * 1000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const fail = r.status !== 0 || /FAIL/.test(out);
  console.log((fail ? '✗ ' : '✓ ') + f + '  ' + (out.trim().split('\n').pop() || ''));
  if (fail) { bad++; console.log(out.split('\n').filter(l => /FAIL|Error/.test(l)).slice(0, 10).join('\n')); }
}
console.log(bad ? bad + ' 个测试文件失败' : '全部通过');
process.exit(bad ? 1 : 0);
