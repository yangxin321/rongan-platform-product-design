/* 候选人基本信息截图：简历页基本资料 / 求职意愿 / 招聘人员列表 / 学历筛选 / 资料核实对照 / 人才池 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const TARGET = process.env.TARGET || 'http://106.3.136.150:8095/';
const OUT = process.env.OUT || path.join(__dirname, '截图-j');

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

  /* 01 简历页：基本资料（学历 / 院校 / 专业 / 年限 / 微信 / 邮箱） */
  await page.evaluate(() => { openPerson('P1'); });
  await shot('01-查看简历-基本资料');

  /* 02 求职意愿首行「意向岗位」 */
  await page.evaluate(() => {
    const sec = Array.from(document.querySelectorAll('.hu-page .sec')).find(s => s.innerText.startsWith('求职意愿'));
    if (sec) sec.scrollIntoView({ block: 'center' });
  });
  await shot('02-查看简历-意向岗位');

  /* 03 招聘人员列表：年限 / 学历列 + 学历 / 年限筛选 */
  await page.evaluate(() => { go('persons'); });
  await shot('03-招聘人员列表-年限学历列');

  /* 04 选「大专」后列表只剩大专 */
  await page.evaluate(() => {
    const sel = Array.from(document.querySelectorAll('.toolbar select')).find(s => s.options[0].text.includes('全部学历'));
    sel.value = '大专'; sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await shot('04-招聘人员列表-按学历筛选');

  /* 05 选「10 年以上」 */
  await page.evaluate(() => {
    go('persons'); S.f.edu = ''; S.f.yr = ''; refreshTable();
    const sel = Array.from(document.querySelectorAll('.toolbar select')).find(s => s.options[0].text.includes('全部年限'));
    sel.value = '10'; sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await shot('05-招聘人员列表-按年限筛选');

  /* 06 资料核实：仍然只核证书 / 城市 / 到岗 / 夜班，没有学历行 */
  await page.evaluate(() => { S.f.edu = ''; S.f.yr = ''; go('persons'); openPerson('P1'); huGo('verify', 'P1', 'D1'); });
  await shot('06-资料核实-不含学历字段');

  /* 07 人才池：一人一档带年限 / 学历 / 意向 */
  await page.evaluate(() => { go('pool'); });
  await shot('07-人才池列表');

  /* 08 需求简历明细：同样有年限 / 学历列 */
  await page.evaluate(() => { openDemand('D1', 'resume'); });
  await shot('08-需求简历明细');

  console.log('ERRS', JSON.stringify(errs));
  await browser.close();
})();
