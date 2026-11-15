/* 人员五页拆分实拍（本地 file:// 或线上 TARGET）
   NODE_PATH=<node_modules> node .shot-person5.js */
const { chromium } = require('playwright-core');
const URL = process.env.TARGET || ('file://' + encodeURI('/Users/yangxin/WorkBuddy/2026-11-10-18-54-53/月贝招聘平台-需求梳理/融敢平台-角色版-v1.2.html'));
const OUT = process.env.OUT || '/Users/yangxin/WorkBuddy/2026-11-10-18-54-53/月贝招聘平台-需求梳理/截图-person5/';
const fs = require('fs');
if(!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1560, height: 1020 } });
  await page.goto(URL); await page.waitForTimeout(700);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); enter('R04'); });
  await page.waitForTimeout(250);

  /* 01 人员列表：三入口 + 跟进筛选 */
  await page.evaluate(() => { if(typeof PM!=='undefined') PM.open={}; go('persons'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '01-人员列表-三入口与跟进筛选.png' });

  /* 02 更多：行内展开，地址不动 */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.acts .link')].find(x => /更多/.test(x.innerText));
    b.click();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '02-更多-行内展开三个入口.png' });

  /* 03 已逾期筛选 */
  await page.evaluate(() => {
    if(typeof PM!=='undefined') PM.open={};
    const sel = [...document.querySelectorAll('.toolbar select')]
      .find(s => [...s.options].some(o => o.innerText.trim() === '已逾期'));
    sel.value = 'late'; sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '03-已逾期-只筛跟进中.png' });

  /* 04 查看简历 */
  await page.evaluate(() => { S.f.fu=''; refreshTable(); openPerson('PE001'); });
  await page.waitForTimeout(350);
  await page.screenshot({ path: OUT + '04-查看简历-独立页.png' });

  /* 05 人才画像 */
  await page.evaluate(() => huGo('profile'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '05-人才画像-表格逐行.png' });

  /* 06 投递跟进 */
  await page.evaluate(() => huAppTo('P1'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '06-投递跟进-一条投递一页.png' });

  /* 07 沟通记录 */
  await page.evaluate(() => huGo('logs', 'P1', 'D1'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '07-沟通记录-跨投递合并加档案记录.png' });

  /* 08 资料核实 */
  await page.evaluate(() => huGo('verify', 'P1', 'D1'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '08-资料核实-按岗位逐项.png' });

  /* 09 需求简历明细：同一组操作 */
  await page.evaluate(() => openDemand('D1', 'resume'));
  await page.waitForTimeout(350);
  await page.screenshot({ path: OUT + '09-需求简历明细-同一组操作.png' });

  /* 10 批次人员：同一组操作 */
  await page.evaluate(() => openBatchPersons('B1'));
  await page.waitForTimeout(350);
  await page.screenshot({ path: OUT + '10-批次人员-同一组操作.png' });

  const box = await page.evaluate(() => {
    const m = document.querySelector('.main');
    return { overX: m.scrollWidth - m.clientWidth, hash: location.hash };
  });
  console.log(JSON.stringify(box));
  await browser.close();
})();
