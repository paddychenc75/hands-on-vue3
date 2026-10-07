const {chromium}=require('playwright'),path=require('path'),LIB=path.resolve('node_modules/vue/dist/vue.global.prod.js');
(async()=>{const b=await chromium.launch(),R=[];let ctx,p;const ok=(c,m)=>{R.push(c);console.log((c?'PASS ':'FAIL ')+m)};
const url='file://'+path.resolve('vue3-course.html');
for(const [rec,re] of [[{id:'computed',k:7,dy:30,h:'4.2 watch 和 watchEffect',t:Date.now()},/watch/],[{id:'refs',k:9,dy:10,h:'3.4 模板 ref：访问 DOM 元素',want:'lifecycle',t:Date.now()},/模板 ref/],[{id:'lifecycle',k:5,dy:10,h:'',t:Date.now()},null]]){
 ctx=await b.newContext({viewport:{width:390,height:844}});p=await ctx.newPage();await p.route('**/*',r=>/cdn\.jsdelivr/.test(r.request().url())?r.fulfill({path:LIB,contentType:'text/javascript'}):r.continue());await p.addInitScript(r=>{if(!sessionStorage.getItem('x')){localStorage.setItem('vue3deep:last',JSON.stringify(r));sessionStorage.setItem('x',1)}},rec);await p.goto(url);await p.waitForTimeout(1200);
 const txt=await p.textContent('#posToast').catch(()=>'');await p.click('#posToast .pri');await p.waitForTimeout(1600);
 const top=await p.evaluate(()=>{const y=vue3deepLine();const h=[...document.querySelectorAll('section.ch h3')].filter(e=>e.getBoundingClientRect().top<=y+2).pop();const s=[...document.querySelectorAll('section.ch')].find(s=>{const r=s.getBoundingClientRect();return r.top<=y+10&&r.bottom>y+10});return [s&&s.id,h&&h.textContent]});
 ok(top[0]===(rec.want||rec.id)&&(!re||re.test(top[1])),'旧记录 '+rec.h+' → '+top.join(' / ')+' 提示：'+txt);await ctx.close()}
await b.close();console.log('合计',R.length,'通过',R.filter(Boolean).length)})();
