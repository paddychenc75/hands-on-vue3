const {chromium}=require('playwright'),path=require('path'),LIB=path.resolve('node_modules/vue/dist/vue.global.prod.js');
(async()=>{const b=await chromium.launch(),R=[];const ok=(c,m)=>{R.push(c);console.log((c?'PASS ':'FAIL ')+m)};
for(const width of [1280,390]){
const ctx=await b.newContext({viewport:{width,height:900}}),p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/Failed to load resource/.test(m.text())&&errs.push(m.text()));
await p.route('**/*',r=>/cdn\.jsdelivr/.test(r.request().url())?r.fulfill({path:LIB,contentType:'text/javascript'}):r.continue());
await p.goto('file://'+path.resolve('vue3-course.html'));await p.waitForTimeout(1000);
const X='[data-ex="phenoFilter"]';
await p.$eval(X,e=>e.scrollIntoView());await p.waitForTimeout(800);
ok(await p.$$eval(X+' .ed.cm-on',x=>x.length)===2,width+' 两个编辑器换成 CodeMirror');
ok(await p.evaluate(()=>document.querySelectorAll('.ed.cm-on').length)<30,width+' 只升级可视区域附近的编辑器 '+await p.evaluate(()=>document.querySelectorAll('.ed.cm-on').length));
const C=X+' .ed:has(textarea[data-k="js"]) .cm-content';const ta=()=>p.$eval(X+' textarea[data-k="js"]',e=>e.value);
await p.click(C);await p.keyboard.press('Control+a');await p.keyboard.press('Delete');
await p.keyboard.type('function f(');ok(await ta()==='function f()',width+' 括号配对并写回文本框 '+JSON.stringify(await ta()));
await p.keyboard.type(') {');await p.keyboard.press('Enter');ok(/function f\(\) \{\n  \n\}/.test(await ta()),width+' 回车缩进 '+JSON.stringify(await ta()));
await p.keyboard.type('comp');await p.waitForTimeout(400);const opts=await p.$$eval('.cm-tooltip-autocomplete li',x=>x.map(e=>e.textContent));ok(opts.some(o=>/computed/.test(o)),width+' 补全出现 computed '+opts.slice(0,4));
await p.keyboard.press('Enter');ok(/computed/.test(await ta()),width+' 选择补全 '+JSON.stringify(await ta()));
await p.keyboard.press('Control+z');await p.waitForTimeout(100);ok(!/computed/.test(await ta()),width+' 撤销');
await p.keyboard.press('Control+/');ok(/\/\/ /.test(await ta()),width+' 注释 '+JSON.stringify(await ta()));
// 重置和看答案同步到编辑器
await p.click(X+' [data-a="reset"]');await p.waitForTimeout(300);
const same=await p.$eval(X+' textarea[data-k="js"]',t=>t._cm.value===t.value&&/const tasks/.test(t.value));ok(same,width+' 重置后编辑器显示初始代码 '+await p.$eval(X+' textarea[data-k="js"]',t=>JSON.stringify([t.value.length,t._cm.value.length,t._cm.value===t.value,/const tasks/.test(t.value)])));
// 出错行
await p.click(C);await p.keyboard.press('Control+a');await p.keyboard.type('const a = 1\nnull.x\nreturn {}');
await p.click(X+' [data-a="run"]');await p.waitForTimeout(500);
ok(await p.$$eval(X+' .cm-badLine',x=>x.length)===1,width+' 出错行标红');
await p.click(X+' .ex-err');ok(await p.evaluate(()=>document.activeElement.classList.contains('cm-content')),width+' 点击错误后编辑器获得焦点');
await p.keyboard.type('x');ok(await p.$$eval(X+' .cm-badLine',x=>x.length)===0,width+' 修改后去掉标记');
// Ctrl+Enter 运行并检查
await p.click(X+' [data-a="reset"]');await p.click(C);await p.keyboard.press('Control+Enter');await p.waitForTimeout(800);ok(/✗|✓/.test(await p.textContent(X+' .ex-res')),width+' Ctrl+Enter 运行并检查');
// Esc + Tab 离开
await p.click(C);await p.keyboard.press('Escape');await p.keyboard.press('Tab');ok(!(await p.evaluate(()=>document.activeElement.closest('.cm-editor'))),width+' Esc 后 Tab 离开编辑器');
// 模板高亮：指令值按 JS
const tk=await p.$$eval(X+' .ed:has(textarea[data-k="tpl"]) .cm-line span',x=>x.length);ok(tk>10,width+' 模板有高亮 '+tk);
const fs=await p.$eval(X+' .cm-content',e=>getComputedStyle(e).fontSize);ok(width<900?fs==='16px':fs==='13px',width+' 字号 '+fs);
await p.$eval(X,e=>e.scrollIntoView());await p.waitForTimeout(200);await p.screenshot({path:'cm-'+width+'.png'});
ok(!errs.length,width+' 无页面错误 '+errs.join('|'));await ctx.close()}
console.log('合计',R.length,'通过',R.filter(Boolean).length);await b.close()})();
