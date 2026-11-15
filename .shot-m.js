/* 沟通记录页收成一张表 + 转交流水挪进转交弹窗：截图（线上默认） */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const TARGET = process.env.TARGET || 'http://106.3.136.150:8095/';
const OUT = process.env.OUT || path.join(__dirname, '截图-logs精简');

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

  /* 01 沟通记录：整页只有一张表 */
  await page.evaluate(() => { openPerson('P1'); huGo('logs', 'P1', 'D1'); });
  await shot('01-沟通记录-只有一张表');

  /* 02 表体：多行即多次沟通（按元素裁切，fullPage 会忽略滚动位置） */
  const tbl = await page.$('.hu-page .tbl-wrap');
  if (tbl) {
    await page.waitForTimeout(200);
    await tbl.screenshot({ path: path.join(OUT, '02-沟通记录-多行即多次沟通.png') });
    console.log('shot 02-沟通记录-多行即多次沟通');
  }

  /* 03 切到「全部需求的沟通」：跨投递合并仍是一张表 */
  await page.evaluate(() => { HU.logsDm = '*'; refreshTable(); });
  await shot('03-沟通记录-全部需求合并');

  /* 04 转交弹窗：流水跟着动作走 */
  await page.evaluate(() => { huGo('apply', 'P1', 'D1'); });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.main .btn')).find(x => x.innerText.trim() === '转交');
    if (b) b.click();
  });
  await shot('04-转交弹窗-带最近流水');

  /* 05 投递跟进页：仍是两段，没被这次改动带回来 */
  await page.evaluate(() => { closeAll(); });
  await shot('05-投递跟进页-仍是两段');

  console.log('ERRS', JSON.stringify(errs));
  await browser.close();
})();
