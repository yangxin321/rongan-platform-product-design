/* =======================================================================
   .test-v15.js · 第三版执行清单（V3-01 ~ V3-06）
   -----------------------------------------------------------------------
   跑法：NODE_PATH=<node_modules> node .test-v15.js
         TARGET=http://106.3.136.150:8095/ node .test-v15.js
   断言只认用户能看见的东西：DOM 文本、表头、hash、按钮、表格行数。
   覆盖：招聘人员列表命名与操作 / 简历表格化 / 投递跟进表格与转交 /
         资料核实去大段说明 / 沟通记录去汇总卡与转交表 / 人才池加入需求
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
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch (e) { return { err: String(e.message || e).split('\n')[0] }; } };
  const A = v => Array.isArray(v) ? v : [];
  const hash = () => page.evaluate(() => location.hash);

  await page.goto(FILE); await page.waitForTimeout(500);
  await ev(() => { localStorage.clear(); sessionStorage.clear(); enter('R04'); });
  await page.waitForTimeout(200);

  /* ===================== V3-01 招聘人员列表 ===================== */
  const list = await ev(() => {
    if (typeof PM !== 'undefined') PM.open = {};
    go('persons');
    const m = document.querySelector('.main');
    const nav = Array.from(document.querySelectorAll('.nav-item')).map(x => x.innerText.replace(/\d+$/, '').trim());
    const h2 = (m.querySelector('h2') || {}).innerText || '';
    const ths = Array.from(m.querySelectorAll('.tbl-wrap thead th')).map(x => x.innerText.trim());
    const rows = Array.from(m.querySelectorAll('.tbl-wrap tbody tr'))
      .filter(tr => !tr.classList.contains('row-more'));
    const acts = rows[0] ? Array.from(rows[0].querySelectorAll('.acts .link')).map(x => x.innerText.trim()) : [];
    return { nav, h2, ths, acts, n: rows.length, hash: location.hash,
      body: m.innerText, per: (typeof LF !== 'undefined' && LF.persons) ? LF.persons.per : null };
  });
  ok('RG015-01 菜单与页面标题统一为「招聘人员列表」',
     A(list.nav).some(t => t.includes('招聘人员列表')) && list.h2 === '招聘人员列表'
     && !A(list.nav).some(t => /(^|[^招聘])人员列表$/.test(t)), JSON.stringify({ h2: list.h2, nav: list.nav }));

  ok('RG015-02 招聘人员列表不再挂「导出 / ＋加人」',
     !/导出|＋\s*加人/.test(list.body), '');

  ok('RG015-03 行操作只有「查看简历 / 投递跟进 / 更多」三项',
     A(list.acts).length === 3 && list.acts[0] === '查看简历'
     && list.acts[1] === '投递跟进' && /更多/.test(list.acts[2] || ''), JSON.stringify(list.acts));

  ok('RG015-04 演示评分只写在匹配列头，行内不重复',
     A(list.ths).some(t => /匹配档位[\s\S]*演示评分/.test(t)), JSON.stringify(list.ths));

  ok('RG015-05 默认每页 50 条，真分页',
     list.per === 50 && list.n > 0 && list.n <= 50, 'per=' + list.per + ' rows=' + list.n);

  /* 同一人两条投递：各自进各自的投递页（分两次点击，页面会重画，不能一次遍历）。
     用 R01 全量视图，避免 R04「只我名下」把另一条投递挡掉。 */
  await ev(() => { enter('R01'); go('persons'); });
  await page.waitForTimeout(250);
  const twoIds = await ev(() => {
    const byPid = {};
    PERSONS.forEach(p => { (byPid[p.personId] = byPid[p.personId] || []).push(p); });
    const pid = Object.keys(byPid).find(k => byPid[k].length > 1);
    return pid ? { pid, ids: byPid[pid].map(p => p.id) } : { none: true };
  });
  const linkOf = async (appId) => {
    const r = await ev((id) => {
      go('persons');
      const tr = Array.from(document.querySelectorAll('.tbl-wrap tbody tr'))
        .find(t => t.innerHTML.includes("huAppTo('" + id + "')"));
      if (!tr) return { err: 'no-row' };
      tr.querySelectorAll('.acts .link')[1].click();
      return { hash: location.hash };
    }, appId);
    await page.waitForTimeout(220);
    return r;
  };
  const l1 = twoIds.none ? { none: true } : await linkOf(twoIds.ids[0]);
  const l2 = twoIds.none ? { none: true } : await linkOf(twoIds.ids[1]);
  ok('RG015-06 同一人不同需求各自进对应投递（不合并、不串单）',
     twoIds.none || (l1.hash === '#person/' + twoIds.pid + '/apply/' + twoIds.ids[0]
       && l2.hash === '#person/' + twoIds.pid + '/apply/' + twoIds.ids[1]
       && l1.hash !== l2.hash), JSON.stringify({ l1, l2 }));

  await ev(() => { enter('R04'); go('persons'); });
  await page.waitForTimeout(250);

  /* ===================== V3-02 简历独立页 ===================== */
  const resume = await ev(() => {
    if (typeof PM !== 'undefined') PM.open = {};
    go('persons');
    const name = Array.from(document.querySelectorAll('.tbl-wrap tbody .arc-link')).find(x => x.innerText.includes('张建国'));
    name.click();
    return true;
  });
  await page.waitForTimeout(300);
  const res = await ev(() => {
    const m = document.querySelector('.main');
    const secs = Array.from(m.querySelectorAll('.sec')).map(s => ({
      t: (s.querySelector('.sec-t') || {}).innerText || '',
      tbl: s.querySelectorAll('.tbl-wrap table').length,
      kv: s.querySelectorAll('dl.kv').length }));
    return { hash: location.hash, secs, body: m.innerText,
      back: (m.querySelector('.pg-back') || {}).innerText || '',
      files: Array.from(m.querySelectorAll('.tbl-wrap tbody tr')).map(r => r.innerText) };
  });
  ok('RG015-07 简历页四段都用表格（字段表 / 记录表），不再用 dl 堆叠',
     ['基本资料', '求职意愿', '能力经历', '简历附件'].every(k => A(res.secs).some(s => s.t.startsWith(k) && s.tbl > 0 && s.kv === 0)),
     JSON.stringify(A(res.secs).map(s => s.t.slice(0, 6) + ':' + s.tbl + '/kv' + s.kv)));
  ok('RG015-08 简历附件一版一行，预览 / 下载 / 历史版本都在操作里',
     A(res.files).some(t => /预览/.test(t) && /下载/.test(t) && /历史版本/.test(t)), JSON.stringify(A(res.files).slice(0, 2)));
  ok('RG015-09 简历页返回入口叫「招聘人员列表」',
     /返回招聘人员列表/.test(res.back), res.back);

  /* ===================== V3-03 投递跟进 ===================== */
  await ev(() => huAppTo('P1'));
  await page.waitForTimeout(250);
  const app = await ev(() => {
    const m = document.querySelector('.main');
    const tops = Array.from(m.querySelectorAll('.arc-top .sm')).map(x => x.innerText.replace(/\n/g, ' ').trim());
    const steps = Array.from(m.querySelectorAll('.tbl-wrap')).map(w => ({
      ths: Array.from(w.querySelectorAll('thead th')).map(x => x.innerText.trim()),
      rows: Array.from(w.querySelectorAll('tbody tr')).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.innerText.replace(/\n+/g, ' ').trim())) }))
      .find(x => x.ths[0] === '环节');
    return { hash: location.hash, tops, steps, body: m.innerText };
  });
  ok('RG015-10 投递跟进页头显示人员/当前需求/岗位/客户/批次/当前阶段',
     ['人员', '当前需求', '岗位', '客户', '批次', '当前阶段'].every(k => A(app.tops).some(t => t.startsWith(k))),
     JSON.stringify(app.tops));
  ok('RG015-11 跟进环节是表格：环节 / 当前情况 / 已有记录或结果 / 操作',
     !!app.steps && JSON.stringify(app.steps.ths) === JSON.stringify(['环节', '当前情况', '已有记录或结果', '操作']),
     JSON.stringify(app.steps && app.steps.ths));
  ok('RG015-12 当前环节给按钮，未到的环节不给按钮',
     !!app.steps && app.steps.rows.some(r => /当前/.test(r[0]) && r[3] && !/还没到这一步/.test(r[3]))
     && app.steps.rows.some(r => /还没到这一步/.test(r[3])),
     JSON.stringify(app.steps && app.steps.rows.map(r => r[0] + '|' + r[3]).slice(0, 6)));

  /* 转交：只作用于这一条投递，并写进转交历史表 */
  const tr0 = await ev(() => {
    const b = Array.from(document.querySelectorAll('.main .btn')).find(x => /转交跟进/.test(x.innerText));
    if (!b) return { err: 'no-transfer-btn' };
    b.click();
    return { modal: !!document.querySelector('#modal.on'), fixed: (document.querySelector('#modal') || {}).innerText || '' };
  });
  await page.waitForTimeout(200);
  ok('RG015-13 「更多操作」里的转交跟进锁定这一条投递',
     tr0.modal && /只转这一条投递|只作用于这一条投递/.test(tr0.fixed), JSON.stringify(tr0).slice(0, 200));

  const tr1 = await ev(() => {
    const sel = document.querySelector('#trTo');
    if (sel) { sel.selectedIndex = 0; }
    Array.from(document.querySelectorAll('#modal .btn.pri')).pop().click();
    const head = Array.from(document.querySelectorAll('.main .sec-t')).find(x => /转交历史/.test(x.innerText));
    const sec = head ? head.closest('.sec') : null;
    const trs = sec ? Array.from(sec.querySelectorAll('.tbl-wrap thead th')).map(x => x.innerText.trim()) : [];
    const r0 = sec && sec.querySelector('.tbl-wrap tbody tr');
    return { ths: trs, row: r0 ? r0.innerText.replace(/\n+/g, ' ') : '',
      hash: location.hash };
  });
  await page.waitForTimeout(250);
  ok('RG015-14 转交历史是独立表格（时间/原/新/范围/原因），范围标明这一条投递',
     JSON.stringify(tr1.ths) === JSON.stringify(['时间', '原跟进人', '新跟进人', '转交范围', '原因'])
     && /只转这一条投递/.test(tr1.row), JSON.stringify(tr1).slice(0, 240));

  /* ===================== V3-04 资料核实 ===================== */
  await ev(() => huGo('verify', 'P1', 'D1'));
  await page.waitForTimeout(250);
  const ver = await ev(() => {
    const m = document.querySelector('.main');
    const w = m.querySelector('.tbl-wrap');
    return { ths: w ? Array.from(w.querySelectorAll('thead th')).map(x => x.innerText.trim()) : [],
      body: m.innerText, n: w ? w.querySelectorAll('tbody tr').length : 0 };
  });
  ok('RG015-15 资料核实表头六列齐全',
     JSON.stringify(ver.ths) === JSON.stringify(['核实项目', '岗位要求', '已有信息', '核实结果', '依据及时间', '操作'])
     && ver.n >= 3, JSON.stringify(ver.ths) + ' n=' + ver.n);
  ok('RG015-16 资料核实去掉顶部大段说明条',
     !/核实依据只记/.test(ver.body) && !/不会自动当作/.test(ver.body), '');

  const pick = await ev(() => {
    const byPid = {};
    PERSONS.filter(p => p.status === '跟进中').forEach(p => { (byPid[p.personId] = byPid[p.personId] || []).push(p); });
    const pid = Object.keys(byPid).find(k => byPid[k].length > 1);
    if (!pid) return { none: true };
    openArchive(pid, 'verify');
    const m = document.querySelector('.main');
    return { pid, body: m.innerText, hash: location.hash };
  });
  await page.waitForTimeout(300);
  ok('RG015-17 无需求上下文时先选一条投递，不随手取第一条判符合',
     pick.none || (/先选一条投递/.test(pick.body) && /按这个岗位核实/.test(pick.body)),
     JSON.stringify(pick).slice(0, 200));

  /* ===================== V3-05 沟通记录 ===================== */
  await ev(() => { HU.logsDm = null; huGo('logs', 'P1', 'D1'); });
  await page.waitForTimeout(250);
  const logs = await ev(() => {
    const m = document.querySelector('.main');
    const w = m.querySelector('.tbl-wrap');
    const sel = m.querySelector('.toolbar select');
    const ths = w ? Array.from(w.querySelectorAll('thead th')).map(x => x.innerText.trim()) : [];
    const rows = w ? Array.from(w.querySelectorAll('tbody tr')).map(tr => tr.innerText.replace(/\n+/g, ' ')) : [];
    return { hash: location.hash, ths, rows, pick: sel ? sel.value : '',
      tops: Array.from(m.querySelectorAll('.arc-top')).map(x => x.innerText.replace(/\n+/g, ' ')),
      body: m.innerText };
  });
  ok('RG015-18 沟通记录删除「共沟通/首次/最近/下次跟进」四个汇总块',
     !A(logs.tops).some(t => /共沟通|首次|最近|下次跟进/.test(t)), JSON.stringify(logs.tops));
  ok('RG015-19 沟通表七列按清单顺序',
     JSON.stringify(logs.ths) === JSON.stringify(['沟通时间', '关联需求或岗位', '沟通方式', '内容摘要', '记录人', '下次跟进', '操作']),
     JSON.stringify(logs.ths));
  ok('RG015-20 从投递进来默认筛选这一单，可切换全部',
     logs.pick === 'D1' && A(logs.rows).length > 0 && A(logs.rows).every(r => /售后运维工程师/.test(r)),
     'pick=' + logs.pick + ' n=' + A(logs.rows).length);

  const allLogs = await ev(() => {
    const sel = document.querySelector('.main .toolbar select');
    const before = document.querySelectorAll('.main .tbl-wrap tbody tr').length;
    sel.value = '__all'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    const after = document.querySelectorAll('.main .tbl-wrap tbody tr').length;
    return { before, after, value: sel.value };
  });
  await page.waitForTimeout(200);
  ok('RG015-21 切到「全部需求的沟通」后条数不少于只看这一单',
     allLogs.value === '__all' && allLogs.after >= allLogs.before,
     JSON.stringify(allLogs));

  const trLogs = await ev(() => {
    const sec = Array.from(document.querySelectorAll('.main .sec'))
      .find(s => /转交历史/.test((s.querySelector('.sec-t') || {}).innerText || ''));
    return sec ? Array.from(sec.querySelectorAll('.tbl-wrap thead th')).map(x => x.innerText.trim()) : [];
  });
  ok('RG015-22 沟通记录页的转交历史是表格，不与沟通内容混在一起',
     JSON.stringify(trLogs) === JSON.stringify(['时间', '原跟进人', '新跟进人', '转交范围', '原因']),
     JSON.stringify(trLogs));

  /* ===================== V3-06 人才池分工 ===================== */
  const pool = await ev(() => {
    go('pool');
    const rows = Array.from(document.querySelectorAll('.tbl-wrap tbody tr')).filter(tr => !tr.classList.contains('row-more'));
    const acts = rows[0] ? Array.from(rows[0].querySelectorAll('.acts .link')).map(x => x.innerText.trim()) : [];
    const h2 = (document.querySelector('.main h2') || {}).innerText || '';
    return { h2, acts, n: rows.length };
  });
  await page.waitForTimeout(200);
  ok('RG015-23 人才池仍是一人一档列表，操作衔接四个独立页面/动作',
     A(pool.acts).length === 4 && A(pool.acts).includes('查看简历')
     && A(pool.acts).includes('沟通记录') && A(pool.acts).includes('资料核实')
     && A(pool.acts).includes('加入需求'), JSON.stringify(pool.acts));

  const join = await ev(() => {
    Array.from(document.querySelectorAll('.tbl-wrap tbody tr .acts .link')).find(x => x.innerText.trim() === '加入需求').click();
    const modal = document.querySelector('#modal');
    const dm = modal.querySelector('#pkDm');
    const bs = modal.querySelector('#pkBatch');
    const opts = dm ? Array.from(dm.options).map(o => o.textContent) : [];
    const d0 = dm ? dm.value : '';
    if (dm) { dm.value = 'D1'; dm.dispatchEvent(new Event('change', { bubbles: true })); }
    const warn = (document.querySelector('#pkWarn') || {}).innerText || '';
    return { dm: !!dm, d0, opts: opts.length, batch: bs ? bs.innerText : '', warn };
  });
  await page.waitForTimeout(200);
  ok('RG015-24 加入需求必须先选目标需求，批次跟着需求走',
     join.dm && join.opts > 1 && /立讯售后-1113|自动建今日批次/.test(join.batch), JSON.stringify(join).slice(0, 240));
  ok('RG015-25 该人在目标需求已有投递时提示「已在跟进中」，不重复建档',
     /已在跟进中|已有进行中的投递/.test(join.warn), join.warn);

  ok('RG015-26 全程无页面报错', errs.length === 0, JSON.stringify(errs));

  console.log(checks.map(c => (c.pass ? 'PASS ' : 'FAIL ') + c.id + (c.extra && !c.pass ? ' | ' + c.extra : '')).join('\n'));
  console.log('\nTOTAL', checks.length, 'FAIL', checks.filter(c => !c.pass).length);
  console.log('ERRS', JSON.stringify(errs, null, 1));
  await browser.close();
  process.exit(checks.filter(c => !c.pass).length || errs.length ? 1 : 0);
})();
