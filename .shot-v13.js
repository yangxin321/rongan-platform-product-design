/* 截图 25/26：第四轮 P2 修复的两个现场（线上 8095 实拍）
   NODE_PATH=<node_modules> node .shot-v13.js */
const { chromium } = require('playwright-core');
const URL = process.env.TARGET || 'http://106.3.136.150:8095/';
const OUT = '/Users/yangxin/WorkBuddy/2026-11-10-18-54-53/月贝招聘平台-需求梳理/截图-rg012/';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1560, height: 1020 } });
  await page.goto(URL); await page.waitForTimeout(500);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); enter('R01'); });

  /* 25：P1 档案 → D1 简历明细 → P2 档案 → 后退两次回到 P1 → 页面内返回落在人员列表 */
  await page.evaluate(() => { enter('R01'); go('persons'); });
  await page.waitForTimeout(250);
  await page.evaluate(() => document.querySelector('.main .tbl-wrap tbody tr [onclick*="openPerson"], .main .tbl-wrap tbody tr [onclick*="openHuman"]').click());
  await page.waitForTimeout(250);
  const pid1 = await page.evaluate(() => HU.pid);
  await page.evaluate(() => {
    huSetTab('apply');
    [...document.querySelectorAll('.main .arc-link')].find(el => /openDemand/.test(el.getAttribute('onclick') || '')).click();
  });
  await page.waitForTimeout(250);
  await page.evaluate(() => dmSetTab('resume'));
  await page.waitForTimeout(200);
  await page.evaluate(pid => {
    const cand = [...document.querySelectorAll('.main .tbl-wrap tbody tr [onclick*="openPerson"], .main .tbl-wrap tbody tr [onclick*="openHuman"]')];
    const pick = cand.find(el => !new RegExp("'" + pid + "'").test(el.getAttribute('onclick') || ''));
    pick.click();
  }, pid1);
  await page.waitForTimeout(250);
  await page.goBack(); await page.waitForTimeout(350);
  await page.goBack(); await page.waitForTimeout(350);
  await page.screenshot({ path: OUT + '25-连续后退回到更早的档案.png' });
  await page.evaluate(() => document.querySelector('.main .pg-back').click());
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '26-该档案返回落在人员列表.png' });

  /* 26 的第二幕：人员列表筛 D1 → 档案 → 需求列表筛招聘中 → 后退两次，人员列表仍是 D1 */
  await page.evaluate(() => { enter('R01'); go('persons'); });
  await page.waitForTimeout(250);
  await page.evaluate(() => setF('dm', DEMANDS[0].id));
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('.main .tbl-wrap tbody tr [onclick*="openPerson"]').click());
  await page.waitForTimeout(250);
  await page.evaluate(() => { go('demands'); setF('st', '招聘中'); });
  await page.waitForTimeout(250);
  await page.screenshot({ path: OUT + '27-需求列表筛招聘中.png' });
  await page.goBack(); await page.waitForTimeout(350);
  await page.goBack(); await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '28-后退回人员列表仍是D1筛选.png' });

  console.log('shots done');
  await browser.close();
})();
