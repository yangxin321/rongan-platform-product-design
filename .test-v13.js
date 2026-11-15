/* =======================================================================
   .test-v13.js · RG-012（Issue #6）列表去卡片 + 需求详情独立页 + 地址路由
   -----------------------------------------------------------------------
   跑法：NODE_PATH=<node_modules> node .test-v13.js
         TARGET=http://106.3.136.150:8095/ node .test-v13.js     # 线上同跑（唯一入口，见 MEMORY）
   断言只认「用户能看见的东西」：DOM 文本、hash、有无 .drawer/.modal，
   不直接读内部变量（除了需要构造夹具时）。
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
  const txt = sel => page.evaluate(s => (document.querySelector(s) || {}).innerText || '', sel);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  /* 反向验证用：旧产物缺函数时返回错误对象，让断言变红而不是让脚本崩掉 */
  const ev2 = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { err: String(e.message||e).split('\n')[0] }; } };
  const hash = () => page.evaluate(() => location.hash);

  await page.goto(FILE); await page.waitForTimeout(500);
  await ev(() => { localStorage.clear(); sessionStorage.clear(); enter('R04'); });
  await page.waitForTimeout(200);

  /* ---------- AC-1：需求列表不再有顶部卡片 ---------- */
  const list = await ev(() => {
    go('demands');
    const m = document.querySelector('.main');
    return {
      stats: m.querySelectorAll('.stats .stat').length,
      strip: m.querySelectorAll('.td-strip').length,
      todoText: /我要干的事|系统提醒|需求总人数/.test(m.innerText),
      firstBlock: (m.querySelector('.page') || {}).children
        ? Array.from(m.querySelector('.page').children).slice(0, 4).map(x => x.className).join('|') : '',
      rows: m.querySelectorAll('.tbl-wrap tbody tr').length,
      hasToolbar: !!m.querySelector('.toolbar'),
      total: (m.querySelector('.toolbar .sm.mut') || {}).innerText || '',
      hash: location.hash,
    };
  });
  ok('RG012-01 需求列表无统计卡与待办块',
     list.stats === 0 && list.strip === 0 && !list.todoText, JSON.stringify(list));
  ok('RG012-02 工具栏之后直接是列表',
     /page-head/.test(list.firstBlock) && /toolbar/.test(list.firstBlock) && list.hasToolbar
     && list.rows > 0 && /\d+\s*条/.test(list.total), JSON.stringify(list));
  ok('RG012-03 列表页地址可定位', list.hash === '#demands', list.hash);

  /* ---------- AC-4：点岗位标题进独立详情页（不是弹窗/抽屉） ---------- */
  const opened = await ev(() => {
    const cells = Array.from(document.querySelectorAll('.tbl-wrap tbody tr'));
    const rowIdx = cells.findIndex(tr => tr.querySelector('.link-post'));
    const title = cells[rowIdx].querySelector('.link-post');
    const want = title.innerText.trim();
    title.click();
    return { want, pageAfter: S.page, hash: location.hash };
  });
  await page.waitForTimeout(300);
  const detail = await ev(() => {
    const m = document.querySelector('.main');
    const dr = document.getElementById('drawer');
    const mo = document.getElementById('modal');
    return {
      page: S.page, hash: location.hash,
      drawerOn: !!(dr && dr.classList.contains('on')),
      modalOn: !!(mo && mo.classList.contains('on')),
      tabs: Array.from(m.querySelectorAll('.arc-tab')).map(x => x.innerText.trim()),
      title: (m.querySelector('.page-head h2') || {}).innerText || '',
      hasNav: !!document.querySelector('.side'),
      hasBack: !!m.querySelector('.pg-back'),
      bodyLen: m.innerText.length,
    };
  });
  ok('RG012-04 岗位标题进入独立详情页',
     detail.page === 'demandDetail' && !detail.drawerOn && !detail.modalOn && detail.hasNav
     && detail.title === opened.want && detail.hasBack, JSON.stringify(detail));
  ok('RG012-05 详情页保留三页签',
     detail.tabs.length === 3 && detail.tabs.join(',').includes('需求明细')
     && detail.tabs.join(',').includes('简历明细') && detail.tabs.join(',').includes('招聘进度'),
     JSON.stringify(detail.tabs));
  ok('RG012-06 详情页地址带记录与页签',
     /^#demand\/[^/]+\/detail\?tab=detail$/.test(detail.hash), detail.hash);

  /* ---------- 页签切换写进地址，且内容真的换了 ---------- */
  const t1 = await ev(() => { const first = document.querySelector('.main').innerText; dmSetTab('resume'); return { before: first.slice(0, 200) }; });
  await page.waitForTimeout(250);
  const tabResume = await ev(() => {
    const m = document.querySelector('.main');
    return { hash: location.hash, text: m.innerText.slice(0, 400),
             onTab: (m.querySelector('.arc-tab.on') || {}).innerText || '',
             hasScope: /我的 \d+|全部 \d+/.test(m.innerText) };
  });
  ok('RG012-07 切到简历明细，地址同步', /tab=resume$/.test(tabResume.hash) && tabResume.onTab.includes('简历明细'), tabResume.hash);
  ok('RG012-08 简历明细内容与列表列一致', tabResume.hasScope && /技能|来源 \/ 批次/.test(tabResume.text), tabResume.text.slice(0, 120));

  const tabProg = await ev(() => { dmSetTab('progress'); return { hash: location.hash }; });
  await page.waitForTimeout(200);
  const progText = await txt('.main');
  ok('RG012-09 切到招聘进度，地址同步', /tab=progress$/.test(tabProg.hash) && progText.includes('人员漏斗'), tabProg.hash);

  /* ---------- AC-6：返回还原筛选 / 搜索 / 滚动 ---------- */
  const back = await ev(() => {
    go('demands');
    setQ('电工');                                  /* 搜索条件 */
    setF('st', '招聘中');                          /* 状态筛选 */
    const n1 = document.querySelectorAll('.tbl-wrap tbody tr').length;
    const first = document.querySelector('.link-post');
    const code = first ? first.innerText.trim() : '';
    first.click();                                  /* 进详情 */
    return { n1, code };
  });
  await page.waitForTimeout(300);
  const backState = await ev(() => {
    if(typeof dmBack !== 'function') return { noFn:true };   /* 旧版没有页面内返回，直接判红 */
    dmBack();
    const m = document.querySelector('.main');
    return {
      page: S.page, f: JSON.stringify(S.f), hash: location.hash,
      n2: m.querySelectorAll('.tbl-wrap tbody tr').length,
      q: (document.getElementById('q') || {}).value || '',
      hasCard: !!m.querySelector('.stats'),
    };
  });
  ok('RG012-10 页面内返回还原搜索与筛选',
     backState.page === 'demands' && backState.f.includes('电工') && backState.f.includes('招聘中')
     && backState.q === '电工' && backState.n2 === back.n1, JSON.stringify(backState));

  /* ---------- AC-7：刷新按地址定位（模拟直接带 hash 进入） ---------- */
  const fresh = await ev(() => { if(typeof onHashNav !== 'function') return { noFn:true };
    location.hash = '#demand/D3/detail?tab=progress'; onHashNav(); return {}; });
  await page.waitForTimeout(300);
  const freshState = await ev(() => {
    const m = document.querySelector('.main');
    if(typeof DM === 'undefined' || !DM) return { noFn:true };
    return { page: S.page, id: DM.id, tab: DM.tab,
             hasFunnel: m.innerText.includes('人员漏斗'),
             title: (m.querySelector('.page-head h2') || {}).innerText || '' };
  });
  ok('RG012-11 带地址刷新仍落在原记录页签',
     freshState.page === 'demandDetail' && freshState.id === 'D3' && freshState.tab === 'progress'
     && freshState.hasFunnel && freshState.title.length > 0, JSON.stringify(freshState));

  /* 浏览器后退：从详情页回到列表 */
  let popState = {};
  try {
    popState = await page.evaluate(async () => {
      history.back();
      await new Promise(r => setTimeout(r, 350));
      return { page: S.page, hash: location.hash };
    });
  } catch(e){ popState = { navErr: e.message.split('\n')[0] }; }
  ok('RG012-12 浏览器后退回到列表页',
     popState.page !== 'demandDetail' && !!popState.hash, JSON.stringify(popState));

  /* ---------- 无效 ID：明确提示，不静默跳到别的记录 ---------- */
  const bad = await ev(() => {
    openDemand('XQ-NOT-EXIST-999', 'detail');
    const m = document.querySelector('.main');
    return { text: m.innerText.slice(0, 300), hash: location.hash,
             hasBack: !!m.querySelector('.pg-back'),
             hasBtn: !!Array.from(m.querySelectorAll('button')).find(b => /返回需求列表/.test(b.innerText)) };
  });
  await page.waitForTimeout(200);
  ok('RG012-13 无效需求给出明确提示与返回入口',
     bad.text.includes('找不到这条需求') && bad.text.includes('XQ-NOT-EXIST-999')
     && bad.hasBtn && !bad.text.includes('人员漏斗'), JSON.stringify(bad));

  /* ---------- 能力未丢：三组待办仍在工作台 ---------- */
  const home = await ev(() => {
    enter('R04'); go('home');
    const m = document.querySelector('.main');
    return { text: m.innerText, hash: location.hash };
  });
  await page.waitForTimeout(200);
  ok('RG012-14 待办在独立工作台仍可达',
     /待面试/.test(home.text) && /入职跟进/.test(home.text) && /意向跟进/.test(home.text), home.hash);

  /* ---------- 其余两条共用列表（R01）不受影响 ---------- */
  const other = await ev(() => {
    enter('R01'); go('demands');
    const m = document.querySelector('.main');
    const r1 = { stats: m.querySelectorAll('.stats').length, rows: m.querySelectorAll('.tbl-wrap tbody tr').length };
    go('batches');
    const b = document.querySelector('.main');
    return { r1, batchRows: b.querySelectorAll('.tbl-wrap tbody tr').length, batchStats: b.querySelectorAll('.stats').length };
  });
  await page.waitForTimeout(150);
  ok('RG012-15 R01 需求列表同样无卡片且有数据',
     other.r1.stats === 0 && other.r1.rows > 0, JSON.stringify(other));

  /* ================= 第二批：其余列表页也只有记录 ================= */
  const batch2 = await ev(() => {
    enter('R01');
    const out = {};
    ['confirms','batches','pool','persons','std'].forEach(pg => {
      go(pg);
      const m = document.querySelector('.main'), p = m.querySelector('.page');
      out[pg] = {
        stats: m.querySelectorAll('.stats .stat').length,
        strip: m.querySelectorAll('.td-strip,.ch-strip').length,
        order: Array.from(p.children).slice(0,3).map(x=>(x.className||'').split(' ')[0]).join('|'),
        rows: m.querySelectorAll('.tbl-wrap tbody tr').length,
        hasFilter: !!m.querySelector('.toolbar select'),
      };
    });
    return out;
  });
  const cleanList = k => batch2[k].stats === 0 && batch2[k].strip === 0
    && /page-head/.test(batch2[k].order) && batch2[k].rows > 0;
  ok('RG012-17 客户确认无四张统计卡，工具栏直接接列表', cleanList('confirms') && batch2.confirms.hasFilter, JSON.stringify(batch2.confirms));
  ok('RG012-18 批次列表无统计卡与「今日来源合计」条', cleanList('batches'), JSON.stringify(batch2.batches));
  ok('RG012-19 人才池无统计卡', cleanList('pool'), JSON.stringify(batch2.pool));
  ok('RG012-20 人员列表无三态统计卡', cleanList('persons'), JSON.stringify(batch2.persons));
  ok('RG012-21 标准岗位列表复核无顶部卡（只更正核对表，不改代码）', cleanList('std'), JSON.stringify(batch2.std));

  /* 顶部卡的能力去向：筛选真的能筛 */
  const filt = await ev(() => {
    enter('R01');
    const out = {};
    go('confirms'); setF('cf','effective');
    out.confirms = { n: document.querySelectorAll('.tbl-wrap tbody tr').length,
      all: DEMANDS.filter(d=>isEffective(d)).length,
      total: (document.querySelector('.toolbar .sm.mut')||{}).innerText||'' };
    go('batches'); setF('day','today');
    out.batches = { n: document.querySelectorAll('.tbl-wrap tbody tr').length,
      todayN: BATCHES.filter(b=>b.date===TODAY).length,
      todayOnly: Array.from(document.querySelectorAll('.tbl-wrap tbody tr'))
        .every(tr => tr.innerText.includes('今天')) };
    go('pool'); setF('st','full');
    out.pool = { n: document.querySelectorAll('.tbl-wrap tbody tr').length,
      fullN: PEOPLE.filter(p=>p.complete>=85).length,
      allFull: Array.from(document.querySelectorAll('.tbl-wrap tbody tr'))
        .every(tr => { const m = tr.innerText.match(/(\d+)%/); return m && +m[1] >= 85; }) };
    go('persons'); setF('ng','itv');
    out.persons = { n: document.querySelectorAll('.tbl-wrap tbody tr').length,
      groupN: PERSONS.filter(p=>['待面试','面试通过'].includes(p.node)).length };
    enter('R02'); go('interviews'); setF('res','fail');
    out.itv = { n: document.querySelectorAll('.tbl-wrap tbody tr').length,
      failN: PERSONS.filter(p=>p.itvFail).length,
      allFail: Array.from(document.querySelectorAll('.tbl-wrap tbody tr')).every(tr=>tr.innerText.includes('未通过')) };
    return out;
  });
  ok('RG012-22 客户确认：已生效筛选与原统计卡同数',
     filt.confirms.n === filt.confirms.all && filt.confirms.n > 0 && /共 \d+ 份/.test(filt.confirms.total), JSON.stringify(filt.confirms));
  ok('RG012-23 批次：今日筛选与原「今日批次」同数',
     filt.batches.n === filt.batches.todayN && filt.batches.n > 0 && filt.batches.todayOnly, JSON.stringify(filt.batches));
  ok('RG012-24 人才池：资料完整筛选与原卡同数',
     filt.pool.n === filt.pool.fullN && filt.pool.n > 0 && filt.pool.allFull, JSON.stringify(filt.pool));
  ok('RG012-25 人员：待面试按组筛，数字与列表一致（含面试通过）',
     filt.persons.n === filt.persons.groupN && filt.persons.n > 0, JSON.stringify(filt.persons));
  ok('RG012-26 面试：未通过筛选与原卡同数',
     filt.itv.n === filt.itv.failN && filt.itv.n > 0 && filt.itv.allFail, JSON.stringify(filt.itv));

  /* ================= 客户需求确认：卡片墙 → 一张需求条目表 ================= */
  const cr = await ev(() => {
    enter('R01'); go('custreq');
    const m = document.querySelector('.main');
    const th = Array.from(m.querySelectorAll('.tbl-wrap thead th')).map(x=>x.innerText.trim());
    const firstRow = m.querySelector('.tbl-wrap tbody tr');
    return { stats: m.querySelectorAll('.stats .stat').length,
      ccGrid: m.querySelectorAll('.cc-grid').length,
      ccItem: m.querySelectorAll('.cc-item').length,
      dimblk: m.querySelectorAll('.dimblk').length,
      th, rows: m.querySelectorAll('.tbl-wrap tbody tr').length,
      hasLink: !!(firstRow && /查看原文/.test(firstRow.innerText)),
      hash: location.hash, text: m.innerText.slice(0,120) };
  });
  ok('RG012-27 客户需求确认＝一张需求条目表，无四卡无双栏卡片墙',
     cr.stats === 0 && cr.ccGrid === 0 && cr.ccItem === 0 && cr.dimblk === 0 && cr.rows > 0
     && ['需求项','客户原话摘要','整理后的条件','待确认内容','确认状态'].every(h=>cr.th.some(t=>t.includes(h))),
     JSON.stringify(cr));
  ok('RG012-28 每行都能进原文', cr.hasLink && cr.hash === '#custreq', JSON.stringify(cr));

  const raw = await ev(() => {
    const tr = document.querySelector('.tbl-wrap tbody tr');
    const a = tr ? Array.from(tr.querySelectorAll('.link')).find(x=>/查看原文/.test(x.innerText)) : null;
    if(!a) return { noLink:true, hash: location.hash };   /* 旧产物：卡片墙里没有这个入口 */
    a.click();
    const m = document.querySelector('.main');
    return { page: S.page, hash: location.hash,
      drawer: !!document.querySelector('#drawer.on'),
      modal: !!document.querySelector('#modal.on'),
      hasSegTable: !!Array.from(m.querySelectorAll('th')).find(x=>/与本项关系/.test(x.innerText)),
      hasInput: !!m.querySelector('textarea'),
      hasBack: !!m.querySelector('.pg-back') };
  });
  await page.waitForTimeout(250);
  ok('RG012-29 查看原文进独立页（无抽屉、无弹窗，带回填入口）',
     /^#custreq\/[^/]+\/raw\?item=/.test(raw.hash) && !raw.drawer && !raw.modal
     && raw.hasSegTable && raw.hasBack, JSON.stringify(raw));

  const rawBack = await ev2(() => { crBack();
    return { page: S.page, hash: location.hash, stats: document.querySelectorAll('.main .stats .stat').length }; });
  await page.waitForTimeout(200);
  ok('RG012-30 原文页返回仍在客户需求列表', rawBack.page === 'custreq' && rawBack.hash === '#custreq', JSON.stringify(rawBack));

  /* ================= 档案：抽屉 → 独立页，名单不叠弹窗 ================= */
  const arch = await ev(() => {
    enter('R01'); go('persons');
    const link = document.querySelector('.tbl-wrap tbody tr .arc-link');
    const want = link.innerText.trim();
    link.click();
    const m = document.querySelector('.main');
    return { want, page: S.page, hash: location.hash,
      drawer: !!document.querySelector('#drawer.on'),
      modal: !!document.querySelector('#modal.on'),
      tabs: Array.from(m.querySelectorAll('.arc-tab')).map(x=>x.innerText.trim()),
      hasNav: !!document.querySelector('.side'),
      title: (m.querySelector('.page-head h2')||{}).innerText||'',
      hasBack: !!m.querySelector('.pg-back') };
  });
  await page.waitForTimeout(300);
  ok('RG012-31 名单点人名进档案独立页，不再开抽屉',
     arch.page === 'personDetail' && !arch.drawer && !arch.modal && arch.hasNav
     && arch.hasBack && arch.title === arch.want && /^#person\/[^/]+\/detail\?tab=/.test(arch.hash),
     JSON.stringify(arch));
  ok('RG012-32 档案页五页签（核实依据不再是悬空引用）',
     arch.tabs.length === 5 && arch.tabs.join(',').includes('核实依据'), JSON.stringify(arch.tabs));

  const archTab = await ev(() => { huSetTab('apply');
    return { hash: location.hash, on: (document.querySelector('.arc-tab.on')||{}).innerText||'',
             drawer: !!document.querySelector('#drawer.on') }; });
  await page.waitForTimeout(250);
  ok('RG012-33 档案页签写进地址（英文稳定键）', /tab=apply$/.test(archTab.hash) && archTab.on.includes('本次投递'), archTab.hash);

  const archBack = await ev2(() => { huBack();
    return { page: S.page, hash: location.hash, rows: document.querySelectorAll('.tbl-wrap tbody tr').length }; });
  await page.waitForTimeout(200);
  ok('RG012-34 档案页返回回到人员列表', archBack.page === 'persons' && archBack.rows > 0, JSON.stringify(archBack));

  /* 弹窗里点人名：先关弹窗再进页，不许弹窗上叠一层 */
  const fromModal = await ev(() => {
    enter('R04'); go('batches');
    const bid = BATCHES[0].id;
    openBatch(bid);                                  /* 抽屉里列本批人员 */
    const row = document.querySelector('#drawer [onclick*="openPerson"]');
    if(!row) return { skip:true, why:'drawer 里没有人员行' };
    row.click();
    return { skip:false, page: S.page, hash: location.hash,
      drawer: !!document.querySelector('#drawer.on'),
      modal: !!document.querySelector('#modal.on') };
  });
  await page.waitForTimeout(250);
  ok('RG012-35 名单/抽屉里点人名：抽屉关掉再进页，不叠加',
     !fromModal.skip && fromModal.page === 'personDetail' && !fromModal.drawer && !fromModal.modal,
     JSON.stringify(fromModal));

  /* R1-3：已生效且没有待处理版本时，不再给「代登记」入口 */
  const r13 = await ev(() => {
    enter('R01');
    const d = DEMANDS.find(x => activeVer(x) && !pendingVer(x));
    if(!d) return { noDemand:true };
    openConfirm(d.id);
    const dr = document.querySelector('#drawer');
    const btns = Array.from(dr.querySelectorAll('button')).map(b=>b.innerText.trim());
    const txt = dr.innerText;
    closeAll();
    return { id:d.id, btns,
      hasReg: btns.some(t=>/代登记/.test(t)),
      hasChange: btns.some(t=>/标记条件已变更/.test(t)),
      saysNoRepeat: /不对生效版本重复登记送审|不再对生效版本重复登记送审/.test(txt) };
  });
  ok('RG012-36 已生效且无待处理版本：不给重复登记送审入口（R1-3）',
     !r13.noDemand && !r13.hasReg && r13.hasChange && r13.saysNoRepeat, JSON.stringify(r13));

  /* 全页渲染无错（详情页在路由里，需单独过一遍） */
  const pages = ['demands','batches','persons','pool','logs','custreq','confirms','clinks','dicts','factors','std','dash','conversion','perms','home'];
  let renderErr = '';
  for (const role of ['R01','R04']) {
    await ev(r => enter(r), role);
    for (const pg of pages) {
      try { await ev(p => go(p), pg); await page.waitForTimeout(40); }
      catch (e) { renderErr += role + '/' + pg + ':' + e.message + ' '; }
    }
  }
  ok('RG012-16 页面切换无报错', renderErr === '', renderErr);

  console.log(checks.map(c => (c.pass ? 'PASS ' : 'FAIL ') + c.id + (c.extra && !c.pass ? ' | ' + c.extra : '')).join('\n'));
  console.log('\nTOTAL', checks.length, 'FAIL', checks.filter(c => !c.pass).length);
  console.log('ERRS', JSON.stringify(errs, null, 1));
  await browser.close();
  process.exit(checks.filter(c => !c.pass).length || errs.length ? 1 : 0);
})();
