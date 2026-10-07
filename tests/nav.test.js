const {chromium}=require('playwright'),path=require('path'),LIB=path.resolve('node_modules/vue/dist/vue.global.prod.js');
(async()=>{const b=await chromium.launch(),R=[],ok=(c,m)=>{R.push(c);console.log((c?'PASS ':'FAIL ')+m)};
 for(const width of [390,1280]){
 const ctx=await b.newContext({viewport:{width,height:844}}),p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route('**/*',r=>/cdn\.jsdelivr/.test(r.request().url())?r.fulfill({path:LIB,contentType:'text/javascript'}):r.continue());
 const url='file://'+path.resolve('vue3-course.html');await p.goto(url);await p.waitForTimeout(1200);
 // titles consistent
 const bad=await p.evaluate(()=>[...document.querySelectorAll('section.ch')].filter(s=>{const h=s.querySelector('h2');return h&&!(h.textContent===s.dataset.title||h.textContent.startsWith(s.dataset.title+'：'))}).map(s=>s.id));
 ok(bad.length===0,width+' h2 与目录标题一致 '+bad);
 ok(!(await p.isVisible('#posToast')),width+' 首次打开无提示');
 // user scrolls to computed 4.2 area
 await p.mouse.wheel(0,10);await p.evaluate(()=>{const h=[...document.querySelectorAll('#computed h3')].find(h=>/watch/.test(h.textContent));window.scrollTo({top:h.getBoundingClientRect().top+scrollY-vue3deepLine()+120,behavior:'instant'})});
 await p.waitForTimeout(1200);const last=await p.evaluate(()=>JSON.parse(localStorage.getItem('vue3deep:last')));
 ok(last&&last.id==='computed'&&last.k>=0&&/4\.3 watch/.test(last.h),width+' 记录位置：'+JSON.stringify(last));
 const y0=await p.evaluate(()=>scrollY);
 await p.goto(url);await p.waitForTimeout(1500);
 ok(await p.isVisible('#posToast'),width+' 重新打开显示提示：'+(await p.textContent('#posToast').catch(()=>'')));
 const last2=await p.evaluate(()=>JSON.parse(localStorage.getItem('vue3deep:last')));ok(last2.k===last.k&&last2.id===last.id,width+' 打开页面不覆盖记录');
 await p.click('#posToast .pri');await p.waitForTimeout(1600);const y1=await p.evaluate(()=>scrollY);
 const now=await p.evaluate((k)=>{const sec=document.getElementById('computed'),el=sec.querySelectorAll(vue3deepANCH)[k];return Math.round(vue3deepLine()-el.getBoundingClientRect().top)},last.k).catch(e=>null);
 ok(now!==null&&Math.abs(now-last.dy)<=4,width+` 回到原位：同一锚点偏移 ${last.dy} → ${now}（页面 y ${y0} → ${y1}，差值来自上方实验台挂载）`);
 // resume banner
 await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(300);ok(/上次停在：第 4 章 计算属性与侦听器/.test(await p.textContent('#resume')),width+' 首页横幅：'+await p.textContent('#resumeTxt'));
 // old string format
 await p.evaluate(()=>localStorage.setItem('vue3deep:last','"comm"'));await p.goto(url);await p.waitForTimeout(1300);ok(/第 5 章/.test(await p.textContent('#posToast')),width+' 兼容旧数据');
 ok(errs.length===0,width+' 无页面错误 '+errs.slice(0,3).join('|'));await ctx.close()}
 await b.close();console.log('合计',R.length,'通过',R.filter(Boolean).length)})();
