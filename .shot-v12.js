const { chromium } = require('playwright-core');
const path = require('path');

const FILE = 'file://' + encodeURI('/Users/yangxin/WorkBuddy/2026-11-10-18-54-53/月贝招聘平台-需求梳理/融敢平台-角色版-v1.2.html');
const OUT = '/Users/yangxin/WorkBuddy/2026-11-10-18-54-53/月贝招聘平台-需求梳理/截图-v1.2';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1560, height: 1000 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) errs.push('CONSOLE: ' + m.text()); });

  const shot = async (name) => {
    await page.waitForTimeout(320);
    await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });
  };

  await page.goto(FILE);
  await page.waitForTimeout(500);
  await shot('01-landing');

  // R01
  await page.evaluate(() => { localStorage.clear(); enter('R01'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => go('confirms'));
  await page.waitForTimeout(400);
  await shot('02-r01-confirms');

  await page.evaluate(() => openConfirm('D1'));
  await page.waitForTimeout(500);
  await shot('03-confirm-drawer');
  await page.evaluate(() => closeAll());

  await page.evaluate(() => go('clinks'));
  await page.waitForTimeout(400);
  await shot('04-clinks');

  // 只读确认单
  await page.evaluate(() => openCustLinkDemo('LK-D8-V10'));
  await page.waitForTimeout(400);
  await shot('05-custlink');
  await page.evaluate(() => openCustLinkDemo('LK-D6-V10'));
  await page.waitForTimeout(300);
  await shot('06-custlink-expired');
  await page.evaluate(() => exitCustLink());
  await page.waitForTimeout(200);

  // 版本抽屉
  await page.evaluate(() => { enter('R01'); go('confirms'); openVers('D7'); });
  await page.waitForTimeout(400);
  await shot('07-versions');
  await page.evaluate(() => closeAll());

  // R04 人员列表 -> 人详情 -> 核实依据
  await page.evaluate(() => { enter('R04'); go('persons'); });
  await page.waitForTimeout(400);
  await shot('08-r04-persons');
  await page.evaluate(() => openPerson('P1'));
  await page.waitForTimeout(400);
  await page.evaluate(() => huSetTab('verify'));
  await page.waitForTimeout(400);
  await shot('09-hu-verify');
  await page.evaluate(() => closeAll());

  // AI 匹配
  await page.evaluate(() => { enter('R04'); go('batches'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => runMatch('B1', 'demand'));
  await page.waitForTimeout(500);
  await shot('10-match');
  await page.evaluate(() => closeAll());

  await page.evaluate(() => openMatchDetail(PERSONS.find(x=>x.name==='赵鹏').id, 'D1'));
  await page.waitForTimeout(400);
  await shot('11-match-detail');

  await page.evaluate(() => closeAll());
  await page.evaluate(() => { enter('R04'); openDemand('D8','detail'); });
  await page.waitForTimeout(400);
  await shot('12-demand-not-effective');
  await page.evaluate(() => closeAll());
  await page.evaluate(() => openDemand('D7','detail'));
  await page.waitForTimeout(400);
  await shot('13-demand-pending-ver');
  await page.evaluate(() => closeAll());
  await page.evaluate(() => { enter('R01'); go('confirms'); openConfirm('D7'); });
  await page.waitForTimeout(400);
  await shot('14-confirm-pending');

  console.log('ERRS', JSON.stringify(errs, null, 1));
  await browser.close();
})();
