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
  await page.evaluate(() => closeAll());

  /* ---- 代登记 / 内部审核 全链（对应 RG-002 追加修订） ---- */
  await page.evaluate(() => { enter('R01'); go('confirms'); });
  await page.waitForTimeout(300);
  await shot('14b-confirms-with-reg');
  await page.evaluate(() => regDrawer('D7'));
  await page.waitForTimeout(400);
  await shot('15-reg-form');
  await page.evaluate(() => {
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.value=v; };
    set('rg_fbPerson','黄经理（领益智造·生产部）');
    set('rg_fbChannel','微信');
    set('rg_fbAt','2026-11-13 10:05');
    set('rg_fbContent','工价按 30-36 元/时；最晚报到日 12-01；其余按清单执行。');
    set('rg_fbAttach','微信截图 1 张（arch/2026-11-13-D7-01.png）');
    set('rg_regBy','金诚');
    set('rg_regAt','2026-11-13 11:20');
    regSave('D7','v1.1');
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => auditDrawer('D7'));
  await page.waitForTimeout(400);
  await shot('16-audit');
  await page.evaluate(() => auditAct('D7','pass'));
  await page.waitForTimeout(400);

  // 待内部审核 / 已退回 样本
  await page.evaluate(() => openDemand('D3','detail'));
  await page.waitForTimeout(400);
  await shot('17-demand-pending-audit');
  await page.evaluate(() => closeAll());
  await page.evaluate(() => openDemand('D4','detail'));
  await page.waitForTimeout(400);
  await shot('18-demand-rejected');
  await page.evaluate(() => closeAll());

  // 退回 → 补充 → 重新送审
  await page.evaluate(() => { auditDrawer('D3'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const n=document.getElementById('au_note'); if(n) n.value='反馈未落到具体日期，请补充客户原话截图'; auditAct('D3','back'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => regDrawer('D3'));
  await page.waitForTimeout(400);
  await shot('19-reg-resubmit');


  // 新建需求 → 只读链接：条件来自向导，不是「无要求」
  await page.evaluate(() => {
    enter('R01');
    ndEnter('SJ-DG-D3-L');
    const st = ndState();
    Object.assign(st, {client:'青岛思锐智能', project:'ALD 设备总装 2026Q4', people:'6', price:'38 元/时',
      city:'青岛', deadline:'2026-12-20', term:'3 个月'});
    ndPaint();
    st.draft[25] = ['配盘接线','通电测试','报警排查'];
    st.draft[26] = ['低压电工证'];
    st.draft[19] = '两班倒';
    st.draft[10] = '18-40';
    ndCreate();
    const id = DEMANDS[0].id;
    window.__SHOTND__ = id;
    const tok = (CLINKS.find(l=>l.demandId===id)||{}).tok;
    openCustLinkDemo(tok);
  });
  await page.waitForTimeout(600);
  await shot('20-newdemand-custlink');

  // 两轮退回 → 版本历史逐轮保留意见
  await page.evaluate(() => { exitCustLink(); enter('R01'); });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const id = window.__SHOTND__;
    regDrawer(id);
    const set = (k,v)=>{ const el=document.getElementById(k); if(el) el.value=v; };
    set('rg_fbPerson','李主管（思锐·生产部）'); set('rg_fbChannel','微信');
    set('rg_fbAt','2026-11-13 10:05');
    set('rg_fbContent','「技能按清单来，电工证必须有；班制两班倒。」');
    set('rg_fbAttach','微信截图 2 张（arch/2026-11-13-SR-01.png）');
    set('rg_regBy','金诚'); set('rg_regAt','2026-11-13 10:30');
    regSave(id,'v1.0');
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => auditDrawer(window.__SHOTND__));
  await page.waitForTimeout(300);
  await page.evaluate(() => { const n=document.getElementById('au_note');
    if(n) n.value='第一轮退回：反馈未落到具体倒班周期，且缺客户原话截图'; auditAct(window.__SHOTND__,'back'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const id = window.__SHOTND__;
    regDrawer(id);
    const set = (k,v)=>{ const el=document.getElementById(k); if(el) el.value=v; };
    set('rg_fbAt','2026-11-13 15:00');
    set('rg_fbContent','「两班倒，15 天倒一次；电工证必须有，其他按清单。」');
    set('rg_fbAttach','微信截图 3 张（arch/2026-11-13-SR-02.png）');
    set('rg_regAt','2026-11-13 15:20');
    regSave(id,'v1.0');
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => auditDrawer(window.__SHOTND__));
  await page.waitForTimeout(250);
  await page.evaluate(() => { const n=document.getElementById('au_note');
    if(n) n.value='第二轮退回：变更值仍未写死到具体条款，补充后重新送审'; auditAct(window.__SHOTND__,'back'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => openVers(window.__SHOTND__));
  await page.waitForTimeout(500);
  await shot('21-audit-history');

  console.log('ERRS', JSON.stringify(errs, null, 1));
  await browser.close();
})();
