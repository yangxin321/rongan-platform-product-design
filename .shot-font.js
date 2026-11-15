/* 字号调整后的线上实拍（8095）：给评审对照用
   NODE_PATH=<node_modules> node .shot-font.js */
const { chromium } = require('playwright-core');
const URL = process.env.TARGET || 'http://106.3.136.150:8095/';
const OUT = process.env.OUT || '/Users/yangxin/WorkBuddy/2026-11-10-18-54-53/月贝招聘平台-需求梳理/截图-字号/';
const PREFIX = process.env.PREFIX || '';
const VW = parseInt(process.env.VW || '1440', 10);

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: VW, height: 1000 } });
  await page.goto(URL); await page.waitForTimeout(600);

  /* 01 角色入口 */
  await page.screenshot({ path: OUT + PREFIX + '01-角色入口.png' });

  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); enter('R01'); });
  await page.waitForTimeout(300);

  const shots = [
    ['demands', '02-需求列表.png'],
    ['persons', '03-人员列表.png'],
    ['pool', '04-人才池.png'],
    ['custreq', '05-客户需求.png'],
    ['confirms', '06-客户确认单.png'],
    ['batches', '07-批次列表.png'],
  ];
  for (const [pg, name] of shots) {
    await page.evaluate(p => go(p), pg);
    await page.waitForTimeout(260);
    await page.screenshot({ path: OUT + PREFIX + name });
  }

  /* 08 需求详情（独立页） */
  await page.evaluate(() => { go('demands'); openDemand(DEMANDS[0].id); });
  await page.waitForTimeout(320);
  await page.screenshot({ path: OUT + PREFIX + '08-需求详情.png' });

  /* 09 人员档案 */
  await page.evaluate(() => { go('persons'); openPerson(PERSONS[0].id); });
  await page.waitForTimeout(320);
  await page.screenshot({ path: OUT + PREFIX + '09-人员档案.png' });

  /* 10 弹窗（新建需求） */
  await page.evaluate(() => { enter('R01'); go('demands'); });
  await page.waitForTimeout(200);
  const hasModal = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.main .btn')].find(e => /新建|加需求/.test(e.innerText));
    if (b) { b.click(); return true; }
    return false;
  });
  if (hasModal) {
    await page.waitForTimeout(320);
    await page.screenshot({ path: OUT + PREFIX + '10-弹窗.png' });
  }

  console.log('shots done', hasModal ? '' : '(无新建需求按钮，跳过弹窗)');
  await browser.close();
})();
