const {chromium}=require('playwright'),path=require('path'),LIB=path.resolve('node_modules/vue/dist/vue.global.prod.js');
(async()=>{const b=await chromium.launch();let bad=0;for(const width of [390,1280])for(const dark of [false,true]){const ctx=await b.newContext({viewport:{width,height:844},colorScheme:dark?'dark':'light'}),p=await ctx.newPage(),errs=[];
 p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
 await p.route('**/*',r=>{const u=r.request().url();if(/jsdelivr/.test(u))return r.fulfill({path:LIB,contentType:'text/javascript'});if(u.startsWith('http'))return r.abort();return r.continue()});
 await p.goto('file://'+path.resolve(process.argv[2]||'vue3-course.html'));await p.waitForTimeout(1000);await p.check('#deepToggle');
 for(const s of await p.$$('.pr-skip'))await s.click().catch(()=>{});
 for(const e of await p.$$('.lab,.ex')){await e.scrollIntoViewIfNeeded();await p.waitForTimeout(25)}
 await p.waitForTimeout(500);const sw=await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);
 const real=errs.filter(x=>!/net::|Failed to load/.test(x)),okk=!real.length&&sw[0]<=sw[1];if(!okk)bad++;console.log((okk?'PASS ':'FAIL ')+width,dark?'dark':'light','页面错误',real.length,real.slice(0,3).join(' | '),'横向宽度',sw.join('<='));await ctx.close()}await b.close();console.log(bad?bad+' 项失败':'合计 4 通过 4');process.exit(bad?1:0)})();
