/* 多条投递折叠块实拍（本地 file:// 或线上 TARGET）
   NODE_PATH=<node_modules> node .shot-acc.js
   VW=1440 OUT=<dir>/ */
const { chromium } = require('playwright-core');
const URL = process.env.TARGET || ('file://' + encodeURI('/Users/yangxin/WorkBuddy/2026-11-10-18-54-53/月贝招聘平台-需求梳理/融敢平台-角色版-v1.2.html'));
const OUT = process.env.OUT || '/Users/yangxin/WorkBuddy/2026-11-10-18-54-53/月贝招聘平台-需求梳理/截图-多重投递/';
const VW = parseInt(process.env.VW || '1440', 10);
const fs = require('fs');
if(!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: VW, height: 1000 } });
  await page.goto(URL); await page.waitForTimeout(600);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); enter('R01'); });

  /* 张建国：D1 售后运维（当前）+ D7 CNC操作工 */
  await page.evaluate(() => { openPerson('P1'); huSetTab('apply'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '01-两个需求-默认只展开当前.png' });

  await page.evaluate(() => { document.querySelectorAll('.main .acc-hd')[1].click(); });
  await page.waitForTimeout(260);
  await page.screenshot({ path: OUT + '02-两条都展开.png' });

  await page.evaluate(() => { document.querySelectorAll('.main .acc-hd')[1].click();
    document.querySelectorAll('.main .acc-hd')[0].click(); });
  await page.waitForTimeout(260);
  await page.screenshot({ path: OUT + '03-全部收起只看关键字段.png' });

  /* 只有一条投递的人（对照） */
  await page.evaluate(() => { const one = [...new Set(PERSONS.map(x => x.personId))]
    .find(id => appsOf(id).length === 1 && activeAppsOf(id).length === 1);
    openPerson(appsOf(one)[0].id); huSetTab('apply'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '04-只有一条投递.png' });

  const box = await page.evaluate(() => {
    const m = document.querySelector('.main');
    return { overX: m.scrollWidth - m.clientWidth,
      accs: document.querySelectorAll('.main .acc').length,
      open: document.querySelectorAll('.main .acc.open').length };
  });
  console.log(JSON.stringify(box));
  await browser.close();
})();
