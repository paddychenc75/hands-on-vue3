const {chromium}=require('playwright'),path=require('path'),LIB=path.resolve('node_modules/vue/dist/vue.global.prod.js');
(async()=>{const b=await chromium.launch(),R=[],ok=(c,m)=>{R.push(c);console.log((c?'PASS ':'FAIL ')+m)};
for(const width of [390,1280]){const ctx=await b.newContext({viewport:{width,height:844}}),p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('**/*',r=>/cdn\.jsdelivr/.test(r.request().url())?r.fulfill({path:LIB,contentType:'text/javascript'}):r.continue());
const url='file://'+path.resolve('vue3-course.html');await p.goto(url);await p.waitForTimeout(800);
const onChip=()=>p.evaluate(()=>{const a=document.querySelector('#tocList > li > a.on');return a&&a.getAttribute('href')});
// 用户截图的情形：第 4 章标题在目录下方
await p.mouse.wheel(0,10);
for(const [id,dy] of [['computed',0],['computed',300],['refs',600],['comm',40]]){
 await p.evaluate(([id,dy])=>{const s=document.getElementById(id);scrollTo({top:s.getBoundingClientRect().top+scrollY-(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navh'))||0)+dy,behavior:'instant'})},[id,dy]);
 await p.waitForTimeout(250);ok(await onChip()==='#'+id,width+` 章节 ${id}+${dy} 高亮 ${await onChip()}`)}
// 点击目录跳转后标题不被遮住
await p.click('#tocList a[href="#scheduler"]');await p.waitForTimeout(2500);
const hTop=await p.evaluate(()=>{const h=document.querySelector('#scheduler h2').getBoundingClientRect().top;return [Math.round(h),parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navh'))||0]});
ok(hTop[0]>=hTop[1]-30&&await onChip()==='#scheduler',width+' 目录跳转后标题可见 '+hTop+' '+await onChip());
// 小节已读：跳转不算；停留足够时间并看到末尾才算
await p.evaluate(()=>localStorage.removeItem('vue3deep:secRead'));
await p.click('#tocList a[href="#comm"]');await p.waitForTimeout(2500);
await p.evaluate(()=>{const h=[...document.querySelectorAll('#comm h3')][5];scrollTo({top:h.getBoundingClientRect().top+scrollY-vue3deepLine()+5,behavior:'instant'})});await p.waitForTimeout(3000);
let rd0=await p.evaluate(()=>JSON.parse(localStorage.getItem('vue3deep:secRead')||'{}'));
ok(!(rd0.comm||[]).length,width+' 跳转后不记已读 '+JSON.stringify(rd0));
await p.evaluate(()=>{const h=[...document.querySelectorAll('#computed h3')][1];scrollTo({top:h.getBoundingClientRect().top+scrollY-vue3deepLine()+5,behavior:'instant'})});
await p.mouse.move(300,500);await p.mouse.wheel(0,2);
const need=await p.evaluate(()=>{const h=[...document.querySelectorAll('#computed h3')][1];let n=0,el=h.nextElementSibling;while(el&&!el.matches('h3,.pitfalls,.selfcheck,.summary')){if(!el.matches('details.deep,.lab,.ex,script'))n+=el.textContent.replace(/\s+/g,'').length;el=el.nextElementSibling}return Math.max(8,Math.min(90,Math.round(n/20)))});
for(let t=0;t<need+1;t++){await p.waitForTimeout(1000);await p.mouse.wheel(0,width<900?12:18)}
await p.evaluate(()=>{const h=[...document.querySelectorAll('#computed h3')][2];scrollTo({top:h.getBoundingClientRect().top+scrollY-vue3deepLine()-200,behavior:'instant'})});await p.mouse.wheel(0,2);await p.waitForTimeout(1500);
const rd=await p.evaluate(()=>JSON.parse(localStorage.getItem('vue3deep:secRead')||'{}'));console.log(JSON.stringify(await p.evaluate(()=>{const d=vue3deepReadDebug();const hs=[...document.querySelectorAll("#computed h3")];return [d.DWELL,Object.keys(d.ENDSEEN),d.jumping,hs.map(h=>Math.round(h.getBoundingClientRect().top+scrollY))]})));
ok(rd.computed&&rd.computed.some(k=>/可写的 computed/.test(k)),width+' 停留 '+need+' 秒后记已读 '+JSON.stringify(rd.computed));
const txt=await p.textContent('#progTxt');ok(/已读 \d+ \/ \d+ 小节/.test(txt),width+' '+txt);
const cnt=await p.textContent('#tocList a[href="#computed"] .cnt');ok(/^\d\/4$/.test(cnt),width+' 章节小节计数 '+cnt);
await p.goto(url);await p.waitForTimeout(900);
ok(await p.evaluate(()=>[...document.querySelectorAll('#computed h3.read')].length)>=1,width+' 刷新后保留已读标记');
if(width>900){await p.evaluate(()=>{const s=document.getElementById('router');scrollTo({top:s.getBoundingClientRect().top+scrollY+400,behavior:'instant'})});await p.waitForTimeout(300);
 const subs=await p.evaluate(()=>[...document.querySelectorAll('#tocList li.open ol.subs a')].map(a=>a.textContent));ok(subs.length===7,'桌面目录展开当前章小节 '+subs.length+' '+subs[0]);}
ok(errs.length===0,width+' 无页面错误 '+errs.join('|'));await ctx.close()}
await b.close();console.log('合计',R.length,'通过',R.filter(Boolean).length)})();
