/* =======================================================================
   .test-v14.js · 人员页面拆分（第二轮讨论稿）
   -----------------------------------------------------------------------
   跑法：NODE_PATH=<node_modules> node .test-v14.js
         TARGET=http://106.3.136.150:8095/ node .test-v14.js
   断言只认用户能看见的东西：DOM 文本、hash、表格行、按钮。
   覆盖：人员列表三入口 / 查看简历 / 人才画像 / 投递跟进 / 沟通记录 / 资料核实
         五页各自可寻址、刷新恢复、旧地址兼容、返回来源。
   ======================================================================= */
const { chromium } = require('playwright-core');
const FILE = process.env.TARGET || ('file://' + encodeURI('/Users/yangxin/WorkBuddy/2026-11-10-18-54-53/月贝招聘平台-需求梳理/融敢平台-角色版-v1.2.html'));

const checks = [];
const ok = (id, cond, extra) => checks.push({ id, pass: !!cond, extra: extra || '' });

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1560, height: 1020 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) errs.push('CONSOLE: ' + m.text()); });
  /* 反向验证用：旧产物没有 PM / huGo 时返回错误对象，让断言变红而不是整脚本崩掉 */
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch (e) { return { err: String(e.message || e).split('\n')[0] }; } };
  const ev2 = ev;
  const A = v => Array.isArray(v) ? v : [];
  const txt = sel => page.evaluate(s => (document.querySelector(s) || {}).innerText || '', sel);
  const hash = () => page.evaluate(() => location.hash);
  const main = () => txt('.main');

  await page.goto(FILE); await page.waitForTimeout(500);
  await ev(() => { localStorage.clear(); sessionStorage.clear(); enter('R04'); });
  await page.waitForTimeout(200);

  /* ---------- 1. 人员列表：不再有导出/加人，三入口 + 跟进筛选 ---------- */
  await ev(() => { if(typeof PM !== 'undefined') PM.open = {}; go('persons'); });
  await page.waitForTimeout(200);

  const head = await ev(() => {
    const m = document.querySelector('.main');
    const btns = Array.from(m.querySelectorAll('.page-head .btn, .page-head button')).map(b => b.innerText.trim());
    const opts = Array.from(m.querySelectorAll('.toolbar select option')).map(o => o.innerText.trim());
    const ths = Array.from(m.querySelectorAll('.tbl-wrap thead th')).map(x => x.innerText.trim());
    const row0 = m.querySelector('.tbl-wrap tbody tr');
    const acts = row0 ? Array.from(row0.querySelectorAll('.acts .link')).map(x => x.innerText.trim()) : [];
    return { btns, opts, ths, acts, body: m.innerText, hash: location.hash };
  });
  ok('RG014-01 人员列表不再挂「导出 / ＋加人」',
     !A(head.btns).some(t => /导出|加人/.test(t)) && !/＋\s*加人/.test(head.body),
     JSON.stringify(head.btns));
  ok('RG014-02 人员列表有「今天待跟进 / 已逾期」筛选',
     A(head.opts).includes('今天待跟进') && A(head.opts).includes('已逾期'), JSON.stringify(A(head.opts).slice(0, 6)));
  ok('RG014-03 人员列表行内操作收敛为「查看简历 / 投递跟进 / 更多」',
     A(head.acts).length === 3 && head.acts[0] === '查看简历' && head.acts[1] === '投递跟进' && /更多/.test(head.acts[2]||''),
     JSON.stringify(head.acts));
  ok('RG014-04 演示评分只在匹配列说明一次，行内不重复',
     A(head.ths).some(t => /匹配档位[\s\S]*演示评分/.test(t)) && !/(^|\n)演示评分/.test(head.body),
     JSON.stringify(head.ths));

  const fu = await ev(() => {
    const sel = Array.from(document.querySelectorAll('.toolbar select'))
      .find(s => Array.from(s.options).some(o => o.innerText.trim() === '已逾期'));
    sel.value = 'late'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    const rows = Array.from(document.querySelectorAll('.tbl-wrap tbody tr'));
    const st = rows.map(tr => (tr.innerText.match(/跟进中|已入职|无意向|已淘汰|已结束/) || [''])[0]);
    return { n: rows.length, st: Array.from(new Set(st)), body: document.querySelector('.main').innerText };
  });
  await page.waitForTimeout(150);
  ok('RG014-05 「已逾期」只筛还在跟的人，已入职/已结束不进入',
     fu.n > 0 && fu.st.every(s => s === '跟进中'), JSON.stringify(fu.st) + ' n=' + fu.n);

  await ev(() => { S.f.fu = ''; refreshTable(); if(typeof PM !== 'undefined') PM.open = {}; });
  await page.waitForTimeout(150);

  /* ---------- 2. 更多：只在行内展开，不改地址 ---------- */
  const more = await ev(() => {
    const b = Array.from(document.querySelectorAll('.acts .link')).find(x => /更多/.test(x.innerText));
    b.click();
    return { hash: location.hash, moreRows: document.querySelectorAll('.row-more').length,
      links: Array.from(document.querySelectorAll('.row-more .link')).map(x => x.innerText.trim()),
      drawer: !!document.querySelector('#drawer.on'), modal: !!document.querySelector('#modal.on') };
  });
  await page.waitForTimeout(200);
  ok('RG014-06 「更多」只在本行展开，地址仍是人员列表',
     more.hash === '#persons' && more.moreRows === 1 && !more.drawer && !more.modal,
     JSON.stringify(more));
  ok('RG014-07 「更多」里是人才画像 / 沟通记录 / 资料核实三个入口',
     A(more.links).includes('人才画像') && A(more.links).includes('沟通记录') && A(more.links).includes('资料核实'),
     JSON.stringify(more.links));

  /* ---------- 3. 查看简历：只放简历 ---------- */
  const res = await ev(() => {
    if(typeof PM !== 'undefined') PM.open = {};
    const name = Array.from(document.querySelectorAll('.tbl-wrap tbody .arc-link')).find(x => x.innerText.includes('张建国'));
    name.click();
    return true;
  });
  await page.waitForTimeout(300);
  const resume = await ev(() => {
    const m = document.querySelector('.main');
    return { hash: location.hash, t: m.innerText, tabs: m.querySelectorAll('.arc-tab').length };
  });
  ok('RG014-08 点姓名进「查看简历」独立页',
     resume.hash === '#person/PE001/resume' && /查看简历|张建国/.test(resume.t) && resume.tabs === 0,
     resume.hash);
  ok('RG014-09 简历页只放基本资料/求职意愿/能力经历/附件',
     ['基本资料', '求职意愿', '能力经历', '简历附件'].every(k => resume.t.includes(k)), '');
  ok('RG014-10 简历页不承载建档/上传/转交记录',
     !/建档时间|建档人|上传履历|转交记录/.test(resume.t), '');

  /* ---------- 4. 画像：表格，不新增指标 ---------- */
  await ev(() => huGo('profile'));
  await page.waitForTimeout(250);
  const prof = await ev(() => {
    const m = document.querySelector('.main');
    const rows = Array.from(m.querySelectorAll('.tbl-wrap tbody tr')).map(tr => tr.querySelector('td') ? tr.querySelector('td').innerText.trim().split('\n')[0] : '');
    return { hash: location.hash, rows, t: m.innerText, tbl: m.querySelectorAll('.tbl-wrap table').length,
      tabs: m.querySelectorAll('.arc-tab').length };
  });
  ok('RG014-11 人才画像是独立页 + 表格逐行',
     prof.hash === '#person/PE001/profile' && prof.tbl > 0 && A(prof.rows).length >= 5 && prof.tabs === 0,
     prof.hash + ' rows=' + prof.rows.length);
  ok('RG014-12 画像沿用已有五项，不扩充新指标',
     ['稳定性', '求职意向', '履约情况', '岗位适配', '风险提示'].every(k => A(prof.rows).some(r => r.includes(k)))
     && A(prof.rows).length === 5, JSON.stringify(A(prof.rows)));

  /* ---------- 5. 投递跟进：一条投递一个页 ---------- */
  await ev(() => huAppTo('P1'));
  await page.waitForTimeout(250);
  const app = await ev(() => {
    const m = document.querySelector('.main');
    return { hash: location.hash, t: m.innerText };
  });
  ok('RG014-13 「投递跟进」进这一单的独立页',
     app.hash === '#person/PE001/apply/P1' && /跟进环节/.test(app.t) && /售后运维工程师/.test(app.t),
     app.hash);
  ok('RG014-14 投递跟进页仍是原流程（联系/补全/面试/入职/建档可找到）',
     ['记录联系', '补全', '面试', '入职', '建档'].every(k => app.t.includes(k)), '');

  const other = await ev(() => {
    const l = Array.from(document.querySelectorAll('.main .link')).find(x => x.innerText.trim() === '看这一单');
    if (!l) return { none: true };
    l.click();
    return { none: false };
  });
  await page.waitForTimeout(250);
  const otherHash = await hash();
  ok('RG014-15 页面里能切到「其他投递」，且地址跟着换',
     other.none || (/^#person\/PE001\/apply\/P\d+$/.test(otherHash) && otherHash !== '#person/PE001/apply/P1'),
     otherHash);

  /* ---------- 6. 沟通记录：跨投递合并 + 档案记录 ---------- */
  await ev(() => huGo('logs', 'P1', 'D1'));
  await page.waitForTimeout(250);
  const logs = await ev(() => {
    const m = document.querySelector('.main');
    const ths = Array.from(m.querySelectorAll('.tbl-wrap thead th')).map(x => x.innerText.trim());
    return { hash: location.hash, t: m.innerText, ths,
      add: Array.from(m.querySelectorAll('.btn, .link')).some(b => /新增沟通记录/.test(b.innerText)) };
  });
  ok('RG014-16 沟通记录是独立页，关联需求写在列里',
     logs.hash === '#person/PE001/logs' && A(logs.ths).includes('关联需求或岗位'), JSON.stringify(A(logs.ths)));
  ok('RG014-17 沟通记录页能新增，且档案记录（建档/上传/转交）在这里',
     logs.add && /档案记录/.test(logs.t) && /建档时间/.test(logs.t) && /上传履历|转交记录/.test(logs.t), '');

  /* ---------- 7. 资料核实：按岗位对照 ---------- */
  await ev(() => huGo('verify', 'P1', 'D1'));
  await page.waitForTimeout(250);
  const ver = await ev(() => {
    const m = document.querySelector('.main');
    const ths = Array.from(m.querySelectorAll('.tbl-wrap thead th')).map(x => x.innerText.trim());
    return { hash: location.hash, t: m.innerText, ths };
  });
  ok('RG014-18 资料核实是独立页，带当前需求上下文',
     ver.hash === '#person/PE001/verify?demand=D1' && /当前需求/.test(ver.t) && /核实项目/.test(ver.t),
     ver.hash);
  ok('RG014-19 资料核实逐项对照（证书/城市/到岗/夜班 + 依据）',
     ['作业证书', '愿意工作城市', '可到岗日期', '夜班意愿'].every(k => ver.t.includes(k))
     && A(ver.ths).includes('依据及时间'), JSON.stringify(A(ver.ths)));

  const pick = await ev(() => {
    HU.pid = 'PE001'; HU.appId = 'P2'; HU.demandId = null;
    HU.view = 'verify'; render();
    return { t: document.querySelector('.main').innerText, hash: location.hash };
  });
  await page.waitForTimeout(200);
  ok('RG014-20 多投递且未指定需求时，先让人选投递再核实',
     /先选一条投递/.test(pick.t), pick.hash);

  /* ---------- 8. 刷新恢复 + 旧地址兼容 ---------- */
  await ev(() => huGo('profile'));
  await page.waitForTimeout(200);
  await page.reload(); await page.waitForTimeout(600);
  const afterReload = await ev(() => ({ hash: location.hash, t: (document.querySelector('.main') || {}).innerText || '', page: typeof S !== 'undefined' ? S.page : '' }));
  ok('RG014-21 刷新后仍停在同一个人同一页',
     afterReload.hash === '#person/PE001/profile' && /人才画像/.test(afterReload.t) && afterReload.page === 'personDetail',
     afterReload.hash + ' page=' + afterReload.page);

  const oldMap = [];
  for (const [tab, want] of [['portrait', '#person/PE001/profile'], ['talk', '#person/PE001/logs'], ['resume', '#person/PE001/resume']]) {
    await page.evaluate(t => { location.hash = '#person/PE001/detail?tab=' + t; }, tab);
    await page.waitForTimeout(250);
    oldMap.push([tab, await hash(), want]);
  }
  ok('RG014-22 旧地址 detail?tab=portrait/talk/resume 仍打得开',
     A(oldMap).every(([t, got, want]) => got === want), JSON.stringify(oldMap));

  await page.evaluate(() => { location.hash = '#person/PE001/detail?tab=verify'; });
  await page.waitForTimeout(250);
  const oldVerify = await hash();
  ok('RG014-23 旧地址 tab=verify 落到资料核实并带需求',
     /^#person\/PE001\/verify\?demand=D\d+$/.test(oldVerify), oldVerify);

  /* ---------- 9. 三个范围的操作一致（人员列表 / 需求简历明细 / 批次人员） ---------- */
  const scopes = await ev(() => {
    const pick = (fn) => {
      fn();
      const tr = document.querySelector('.tbl-wrap tbody tr');
      return tr ? Array.from(tr.querySelectorAll('.acts .link')).map(x => x.innerText.replace(/[▾▴]/g, '').trim()) : [];
    };
    return {
      persons: pick(() => go('persons')),
      demand: pick(() => openDemand('D1', 'resume')),
      batch: pick(() => openBatchPersons('B1')),
      demandHash: location.hash,
    };
  });
  await page.waitForTimeout(250);
  const same = a => a.length === 3 && a[0] === '查看简历' && a[1] === '投递跟进' && /更多/.test(a[2]);
  ok('RG014-24 三个范围复用同一组人员操作',
     same(A(scopes.persons)) && same(A(scopes.demand)) && same(A(scopes.batch)), JSON.stringify(scopes));

  /* ---------- 10. 返回来源：进哪来回哪 ---------- */
  const backDemand = await ev(() => {
    openDemand('D1', 'resume');
    const tr = document.querySelector('.tbl-wrap tbody tr');
    tr.querySelector('.acts .link').click();          /* 查看简历 */
    return { hash: location.hash };
  });
  await page.waitForTimeout(300);
  const backText = await txt('.main .pg-back').catch(() => '');
  const inResume = await hash();
  await ev(() => { const b = document.querySelector('.main .pg-back'); if (b) b.click(); });
  await page.waitForTimeout(300);
  const backTo = await hash();
  ok('RG014-25 从需求简历明细进简历页，返回回到这条需求',
     /^#person\/PE\d+\/resume$/.test(inResume) && /返回/.test(backText) && backTo.startsWith('#demand/D1'),
     inResume + ' → ' + backTo + ' | ' + backText);

  const backBatch = await ev(() => {
    openBatchPersons('B1');
    document.querySelector('.tbl-wrap tbody tr .acts .link').click();
    return { hash: location.hash };
  });
  await page.waitForTimeout(300);
  await ev(() => { const b = document.querySelector('.main .pg-back'); if (b) b.click(); });
  await page.waitForTimeout(300);
  const backBatchHash = await hash();
  ok('RG014-26 从批次人员进简历页，返回回到这一批',
     backBatchHash === '#batch/B1/persons', backBatch.hash + ' → ' + backBatchHash);

  /* ---------- 11. 全页无错 ---------- */
  ok('RG014-27 全程无页面报错', errs.length === 0, JSON.stringify(errs));

  console.log(checks.map(c => (c.pass ? 'PASS ' : 'FAIL ') + c.id + (c.extra && !c.pass ? ' | ' + c.extra : '')).join('\n'));
  console.log('\nTOTAL', checks.length, 'FAIL', checks.filter(c => !c.pass).length);
  console.log('ERRS', JSON.stringify(errs, null, 1));
  await browser.close();
  process.exit(checks.filter(c => !c.pass).length || errs.length ? 1 : 0);
})();
