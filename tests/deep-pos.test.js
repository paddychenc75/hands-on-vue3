const {chromium}=require('playwright'),path=require('path'),LIB=path.resolve('node_modules/vue/dist/vue.global.prod.js');
(async()=>{const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage();
 await p.route('**/*',r=>/cdn\.jsdelivr/.test(r.request().url())?r.fulfill({path:LIB,contentType:'text/javascript'}):r.continue());
 const url='file://'+path.resolve('vue3-course.html');await p.goto(url);await p.waitForTimeout(1000);await p.mouse.wheel(0,10);
 await p.evaluate(()=>{const d=[...document.querySelectorAll('#computed details.deep')].pop();d.open=true;const pre=d.querySelector('p,pre,ol')||d;window.scrollTo({top:pre.getBoundingClientRect().top+scrollY-vue3deepLine()+40,behavior:'instant'})});
 await p.waitForTimeout(1200);const last=await p.evaluate(()=>JSON.parse(localStorage.getItem('vue3deep:last')));console.log(JSON.stringify(last));
 await p.goto(url);await p.waitForTimeout(1200);await p.click('#posToast .pri');await p.waitForTimeout(1600);
 const r=await p.evaluate(k=>{const el=document.getElementById('computed').querySelectorAll(vue3deepANCH)[k];return{open:el.closest('details.deep')?.open??el.open,dy:Math.round(vue3deepLine()-el.getBoundingClientRect().top)}},last.k);
 console.log((r.open&&Math.abs(r.dy-last.dy)<=4?'PASS':'FAIL')+' 深入内的位置：自动展开='+r.open+' 偏移 '+last.dy+' → '+r.dy);await b.close()})();
