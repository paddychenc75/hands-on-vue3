// 用法：node ex-test.js <file.html> [id ...]  每道练习：初始代码不通过，答案通过，wrong 变体不通过
const {chromium}=require('playwright'),path=require('path'),LIB=path.resolve('node_modules/vue/dist/vue.global.prod.js');
(async()=>{const f=process.argv[2]||'vue3-course.html',only=process.argv.slice(3);const b=await chromium.launch(),p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/*',r=>/cdn\.jsdelivr/.test(r.request().url())?r.fulfill({path:LIB,contentType:'text/javascript'}):r.continue());
await p.goto('file://'+path.resolve(f));await p.waitForTimeout(1200);
const ids=await p.evaluate(()=>[...document.querySelectorAll('.ex[data-ex]')].map(e=>e.dataset.ex));
const defs=await p.evaluate(()=>Object.keys(window.vue3deepEX||{}));
let bad=0;const missing=defs.filter(d=>!ids.includes(d)),nodef=ids.filter(i=>!defs.includes(i));
if(missing.length){console.log('FAIL 有定义但页面上没有位置：',missing.join(','));bad++}
if(nodef.length){console.log('FAIL 页面上有位置但没有定义：',nodef.join(','));bad++}
async function runWith(id,tpl,js){return p.evaluate(async([id,tpl,js])=>{const r=document.querySelector('.ex[data-ex="'+id+'"]');r.scrollIntoView();
 const t=r.querySelector('[data-k="tpl"]'),j=r.querySelector('[data-k="js"]');t.value=tpl;j.value=js;r.querySelector('[data-a="check"]').click();
 await new Promise(s=>setTimeout(s,900));const rs=[...r.querySelectorAll('.ex-res > div')];return {all:rs.some(d=>/全部通过/.test(d.textContent)),fails:rs.filter(d=>d.classList.contains('no')).map(d=>d.textContent).slice(0,2)}},[id,tpl,js])}
for(const id of (only.length?only:ids)){const ex=await p.evaluate(id=>{const e=window.vue3deepEX[id];return {tpl:e.tpl,js:e.js,solTpl:e.solTpl||e.tpl,solJs:e.solJs||e.js,wrong:(e.wrong||[]).map(w=>({tpl:w.tpl||e.solTpl||e.tpl,js:w.js||e.solJs||e.js,why:w.why||''})),title:e.title,nh:(e.hints||[]).length}},id);
 const s=await runWith(id,ex.tpl,ex.js),a=await runWith(id,ex.solTpl,ex.solJs);const ws=[];for(const w of ex.wrong)ws.push(await runWith(id,w.tpl,w.js));
 const ok=!s.all&&a.all&&ws.every(x=>!x.all);if(!ok)bad++;
 console.log((ok?'PASS ':'FAIL ')+id+' 「'+ex.title+'」 初始'+(s.all?'通过(错)':'不通过')+' 答案'+(a.all?'通过':'不通过(错) '+a.fails.join(' | '))+(ws.length?' wrong '+ws.map(x=>x.all?'通过(错)':'不通过').join(','):'')+(ex.nh?'':' [无 hints]'))}
console.log(errs.length?'页面错误：'+errs.slice(0,3).join(' | '):'无页面错误');console.log(bad?'有 '+bad+' 项失败':'全部通过');await b.close()})();
