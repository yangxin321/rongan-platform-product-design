const { chromium } = require('playwright-core');
const URL='http://106.3.136.150:8095/';
const OUT='/Users/yangxin/WorkBuddy/2026-11-10-18-54-53/月贝招聘平台-需求梳理/截图-批次简化/';
const fs=require('fs'); if(!fs.existsSync(OUT)) fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const p=await b.newPage({viewport:{width:1560,height:1020}});
 await p.goto(URL); await p.waitForTimeout(700);
 await p.evaluate(()=>{localStorage.clear();sessionStorage.clear();enter('R04');});
 await p.evaluate(()=>go('batches')); await p.waitForTimeout(400);
 await p.screenshot({path:OUT+'01-批次列表-无顶部三按钮无AI匹配.png'});
 console.log(await p.evaluate(()=>{
   const m=document.querySelector('.main');
   const btns=[...m.querySelectorAll('.page-head .btn, .page-head button')].map(x=>x.innerText.trim());
   const row=m.querySelector('.tbl-wrap tbody tr');
   return JSON.stringify({btns, links:[...row.querySelectorAll('.acts .link')].map(x=>x.innerText.trim()),
     overX:m.scrollWidth-m.clientWidth});
 }));
 await b.close();
})();
