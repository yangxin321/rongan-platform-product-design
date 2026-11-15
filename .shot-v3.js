/* 第三版清单截图：招聘人员列表 / 简历 / 投递跟进 / 资料核实 / 沟通记录 / 人才池 / 加入需求 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const TARGET = process.env.TARGET || 'http://106.3.136.150:8095/';
const OUT = process.env.OUT || path.join(__dirname, '截图-v3');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1560, height: 1020 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(TARGET); await page.waitForTimeout(600);
  await page.evaluate(() => { localStorage.clear(); enter('R04'); });
  await page.waitForTimeout(300);

  const shot = async (name) => {
    await page.waitForTimeout(260);
    await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
    console.log('shot', name);
  };

  await page.evaluate(() => { go('persons'); });
  await shot('01-招聘人员列表');

  await page.evaluate(() => { openPerson('P1'); });
  await shot('02-查看简历');

  await page.evaluate(() => { huAppTo('P1'); });
  await shot('03-投递跟进');

  await page.evaluate(() => { huGo('verify', 'P1', 'D1'); });
  await shot('04-资料核实');

  await page.evaluate(() => { huGo('logs', 'P1', 'D1'); });
  await shot('05-沟通记录-只看这一单');

  await page.evaluate(() => { const s = document.querySelector('.main .toolbar select'); s.value = '__all'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await shot('06-沟通记录-全部需求');

  await page.evaluate(() => { go('pool'); });
  await shot('07-人才池列表');

  await page.evaluate(() => {
    const l = Array.from(document.querySelectorAll('.tbl-wrap tbody tr .acts .link')).find(x => x.innerText.trim() === '加入需求');
    l.click();
  });
  await shot('08-加入需求');

  console.log(JSON.stringify({ errs }, null, 1));
  await browser.close();
})();
