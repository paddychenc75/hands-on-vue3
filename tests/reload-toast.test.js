const {chromium}=require('playwright'),path=require('path'),LIB=path.resolve('node_modules/vue/dist/vue.global.prod.js');
(async()=>{const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage();
await p.route('**/*',r=>/cdn\.jsdelivr/.test(r.request().url())?r.fulfill({path:LIB,contentType:'text/javascript'}):r.continue());
await p.goto('file://'+path.resolve('vue3-course.html'));await p.waitForTimeout(800);await p.mouse.wheel(0,10);
await p.evaluate(()=>{const h=document.querySelector('#router h3');scrollTo({top:h.getBoundingClientRect().top+scrollY+300,behavior:'instant'})});await p.waitForTimeout(1200);
await p.reload();await p.waitForTimeout(1500);const t=await p.textContent('#posToast').catch(()=>null);
console.log((t&&/第 19 章/.test(t)?'PASS':'FAIL')+' 刷新后显示提示：'+t+' scrollY='+await p.evaluate(()=>scrollY));
await p.click('#posToast .pri');await p.waitForTimeout(1600);console.log(await p.evaluate(()=>document.querySelector('#tocList > li > a.on').textContent));await b.close()})();
