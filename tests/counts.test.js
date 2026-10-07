const {chromium}=require('playwright'),path=require('path'),LIB=path.resolve('node_modules/vue/dist/vue.global.prod.js');
(async()=>{const b=await chromium.launch(),R=[];const ok=(c,m)=>{R.push(c);console.log((c?'PASS ':'FAIL ')+m)};
const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
await p.route('**/*',r=>/cdn\.jsdelivr/.test(r.request().url())?r.fulfill({path:LIB,contentType:'text/javascript'}):r.continue());
await p.addInitScript(()=>{if(!sessionStorage.x){localStorage.setItem('vue3deep:done',JSON.stringify({template:true}));sessionStorage.x=1}});
await p.goto('file://'+path.resolve('vue3-course.html'));await p.waitForTimeout(1000);
const r=await p.evaluate(()=>[...document.querySelectorAll('#tocList a .cnt')].slice(0,4).map(e=>e.textContent).concat(document.querySelector('[data-grp="1"]').textContent,document.querySelector('#progTxt').textContent));
ok(r[1]==='✓','标记为已完成的章显示 ✓ '+r[1]);ok(r[0]==='0/4','未完成的章显示已读小节数 '+r[0]);ok(r[4]==='1/4 章','阶段显示已完成章数 '+r[4]);ok(/已完成 1 \/ \d+ 章 · 已读 6 \//.test(r[5]),'已完成章的小节计入已读 '+r[5]);console.log('合计',R.length,'通过',R.filter(Boolean).length);
await b.close()})();
