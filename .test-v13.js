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
  const A = v => Array.isArray(v) ? v : [];      /* 反向验证时字段可能缺失，别让脚本崩 */

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
             hasSearch: !!m.querySelector('#lf-q'),
             hasNode: [...m.querySelectorAll('.toolbar select')].some(x => /全部阶段/.test(x.innerText)),
             hasSt: [...m.querySelectorAll('.toolbar select')].some(x => /全部结果/.test(x.innerText)) };
  });
  ok('RG012-07 切到简历明细，地址同步', /tab=resume$/.test(tabResume.hash) && tabResume.onTab.includes('简历明细'), tabResume.hash);
  ok('RG012-08 简历明细是完整列表：有搜索与阶段/结果筛选，列含技能与来源批次',
     tabResume.hasSearch && tabResume.hasNode && tabResume.hasSt && /技能/.test(tabResume.text) && /来源 \/ 批次/.test(tabResume.text),
     tabResume.text.slice(0, 120));

  const tabProg = await ev(() => { dmSetTab('progress'); return { hash: location.hash }; });
  await page.waitForTimeout(200);
  const progText = await txt('.main');
  ok('RG012-09 切到招聘进度，地址同步', /tab=progress$/.test(tabProg.hash) && progText.includes('我的目标') && progText.includes('我的批次'), tabProg.hash);

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
             hasMine: m.innerText.includes('我的目标'),
             title: (m.querySelector('.page-head h2') || {}).innerText || '' };
  });
  ok('RG012-11 带地址刷新仍落在原记录页签',
     freshState.page === 'demandDetail' && freshState.id === 'D3' && freshState.tab === 'progress'
     && freshState.hasMine && freshState.title.length > 0, JSON.stringify(freshState));

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
      links: m.querySelectorAll('.hu-links .link').length,
      body: m.innerText,
      hasNav: !!document.querySelector('.side'),
      title: (m.querySelector('.page-head h2')||{}).innerText||'',
      hasBack: !!m.querySelector('.pg-back') };
  });
  await page.waitForTimeout(300);
  ok('RG012-31 名单点人名进档案独立页，不再开抽屉',
     arch.page === 'personDetail' && !arch.drawer && !arch.modal && arch.hasNav
     && arch.hasBack && arch.title === arch.want
     && /^#person\/[^/]+\/(resume|profile|logs|verify|apply)/.test(arch.hash),
     JSON.stringify(arch));
  /* 第八批：五个页签拆成五个独立页面（各自地址），页头下只留一行文字链接。
     要验的是「五个业务页都还找得到、核实不再悬空」，不是页签栏还在。 */
  ok('RG012-32 档案页拆成五页后五个入口都在（核实依据不再是悬空引用）',
     arch.tabs.length === 0 && arch.links === 4
     && ['人才画像','投递跟进','沟通记录','资料核实'].every(n => arch.body.includes(n))
     && arch.title === arch.want,
     JSON.stringify({tabs:arch.tabs, links:arch.links, title:arch.title}));

  const archTab = await ev(() => { huSetTab('apply');
    return { hash: location.hash, tabs: document.querySelectorAll('.arc-tab').length,
             body: (document.querySelector('.main')||{}).innerText||'' }; });
  await page.waitForTimeout(250);
  ok('RG012-33 档案子页写进地址（英文稳定键）',
     /\/apply\/P\d+$/.test(archTab.hash) && archTab.tabs === 0 && archTab.body.includes('跟进环节'),
     archTab.hash);

  const archBack = await ev2(() => { huBack();
    return { page: S.page, hash: location.hash, rows: document.querySelectorAll('.tbl-wrap tbody tr').length }; });
  await page.waitForTimeout(200);
  ok('RG012-34 档案页返回回到人员列表', archBack.page === 'persons' && archBack.rows > 0, JSON.stringify(archBack));

  /* 批次人员是整页：点批次名进 #batch/<id>/persons，页内点人名进档案，抽屉与弹窗都不出现 */
  const fromBatch = await ev(() => {
    enter('R04'); go('batches');
    const bid = BATCHES[0].id;
    openBatch(bid);
    const inPage = { page: S.page, hash: location.hash,
      drawer: !!document.querySelector('#drawer.on'),
      rows: document.querySelectorAll('.main .tbl-wrap tbody tr').length,
      hasSearch: !!document.querySelector('.main #lf-q') };
    const row = document.querySelector('.main .tbl-wrap tbody tr [onclick*="openPerson"], .main .tbl-wrap tbody tr [onclick*="openHuman"]');
    if(!row) return { skip:true, why:'批次人员页没有人员行', inPage };
    row.click();
    return { skip:false, inPage, page: S.page, hash: location.hash,
      drawer: !!document.querySelector('#drawer.on'),
      modal: !!document.querySelector('#modal.on') };
  });
  await page.waitForTimeout(250);
  ok('RG012-35 批次人员是整页不是抽屉：页内点人名进档案，抽屉/弹窗都不出现',
     !fromBatch.skip && fromBatch.inPage.page === 'batchPersons'
     && /^#batch\/[^/]+\/persons$/.test(fromBatch.inPage.hash)
     && fromBatch.inPage.rows > 0 && fromBatch.inPage.hasSearch && !fromBatch.inPage.drawer
     && fromBatch.page === 'personDetail' && !fromBatch.drawer && !fromBatch.modal,
     JSON.stringify(fromBatch));

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

  /* ---------- Codex 复审 P2 四条（地址路由回归） ---------- */

  /* 37：列表滚下去 → 进详情 → 浏览器后退，必须回到原滚动位置（不是顶部） */
  await ev(() => { enter('R01'); go('persons'); });
  await page.waitForTimeout(200);
  const sc0 = await ev(() => {
    const m = document.getElementById('main');
    m.scrollTop = 520;
    return m.scrollTop;
  });
  await ev(() => {
    const l = document.querySelector('.main .tbl-wrap tbody tr [onclick*="openPerson"], .main .tbl-wrap tbody tr .arc-link');
    l.click();
  });
  await page.waitForTimeout(300);
  const scIn = await ev(() => ({ page: S.page, sc: document.getElementById('main').scrollTop }));
  await page.goBack(); await page.waitForTimeout(400);
  const scBack = await ev(() => ({ page: S.page, hash: location.hash, sc: document.getElementById('main').scrollTop }));
  ok('RG012-37 浏览器后退还原列表滚动位置',
     sc0 > 400 && scIn.page === 'personDetail' && scBack.page === 'persons'
     && scBack.hash === '#persons' && scBack.sc > 400,
     JSON.stringify({ sc0, scIn, scBack }));

  /* 38：切角色不继承上一个角色的地址（R01 的 #demands 不能把 E01 顶到「暂未开放」） */
  await ev(() => { enter('R01'); go('demands'); });
  await page.waitForTimeout(200);
  await ev(() => document.querySelector('.side-role button').click());   /* 切换 */
  await page.waitForTimeout(200);
  const landing = await ev(() => ({ role: S.role, hasCards: !!document.querySelector('.roles') }));
  await ev(() => document.querySelector('[onclick*="enter(\'E01\')"]').click());
  await page.waitForTimeout(300);
  const switched = await ev(() => {
    const m = document.querySelector('.main');
    return { role: S.role, page: S.page, hash: location.hash,
      open: /该页面暂未开放/.test(m.innerText), first: m.innerText.slice(0, 40) };
  });
  ok('RG012-38 切换角色后落在新角色默认页，不继承旧地址',
     landing.role === null && landing.hasCards
     && switched.role === 'E01' && switched.page === 'jobs'
     && switched.hash === '#jobs' && !switched.open,
     JSON.stringify({ landing, switched }));

  /* 39：同一人多条投递，刷新（重新解析地址）不能把「本次投递」换成另一单 */
  const appCtx = await ev2(() => {
    const pair = [...new Set(PERSONS.map(x => x.personId))]
      .map(id => ({ pid: id, aps: appsOf(id) })).filter(x => x.aps.length > 1)[0];
    const wantApp = pair.aps[1], other = pair.aps[0];
    const wantPost = D(wantApp.demandId).post, otherPost = D(other.demandId).post;
    enter('R01');
    openPerson(wantApp.id);            /* 第二条投递（P42 / D7） */
    huSetTab('apply');
    const bodyNow = () => (document.querySelector('.main .arc-top') || {}).innerText || '';
    const before = bodyNow();
    const hashBefore = location.hash;
    /* 模拟刷新 / 新标签页打开地址：清掉内存态，只按地址恢复 */
    HU.appId = null; HU.view = 'resume'; HU.demandId = null;
    applyHash(); render();
    const after = bodyNow();
    return { wantApp: wantApp.id, wantPost, otherPost, hashBefore, hashAfter: location.hash,
      appId: HU.appId, page: S.page,
      beforeOk: before.includes(wantPost), afterOk: after.includes(wantPost),
      afterWrong: wantPost !== otherPost && after.includes(otherPost) };
  });
  ok('RG012-39 档案投递标识写进地址，重新解析后仍是同一单',
     !appCtx.err && /\/apply\/P\d+$/.test(appCtx.hashBefore) && appCtx.appId === appCtx.wantApp
     && appCtx.beforeOk && appCtx.afterOk && !appCtx.afterWrong,
     JSON.stringify(appCtx));

  /* 40：只读确认单地址可独立打开（新标签页 / 刷新），不落到角色首页 */
  const custUrl = FILE.split('#')[0] + '#cust=LK-D1-V11';
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await p2.goto(custUrl); await p2.waitForTimeout(500);
    const cust = await p2.evaluate(() => {
      const t = document.getElementById('root').innerText;
      return { doc: /需求确认单/.test(t), readonly: /只读/.test(t),
        landing: /选择你的角色/.test(t), noNav: !document.querySelector('.side') };
    });
    ok('RG012-40 只读确认单地址独立打开（不先落角色首页）',
       cust.doc && cust.readonly && !cust.landing && cust.noNav, JSON.stringify(cust));
  } catch (e) {
    ok('RG012-40 只读确认单地址独立打开（不先落角色首页）', false, String(e.message || e));
  } finally { await p2.close(); }
  await ev(() => { enter('R01'); });

  /* 41：从档案页「这一单」进需求详情，页面内返回要还原完整记录地址（不是 #personDetail） */
  const backFull = await ev2(() => {
    enter('R01');
    openPerson('P42'); huSetTab('apply');
    const fromHash = location.hash;
    const link = [...document.querySelectorAll('.main .arc-link')]
      .find(el => /openDemand/.test(el.getAttribute('onclick') || ''));
    if(!link) return { err:'档案投递页没有可点的岗位名' };
    const post = link.innerText.trim();
    link.click();
    const onDemand = { page: S.page, hash: location.hash };
    document.querySelector('.main .pg-back').click();      /* 页面内返回 */
    const after = location.hash;
    /* 刷新：只按地址恢复，模拟新标签页 */
    const okHash = applyHash(); render();
    const body = document.querySelector('.main').innerText;
    return { fromHash, post, onDemand, after, page: S.page, okHash,
      hitPerson: /张建国/.test(body), missing: /找不到该人员|该页面暂未开放/.test(body) };
  });
  ok('RG012-41 从档案进需求详情后返回，恢复的是完整档案地址',
     !backFull.err && backFull.onDemand.page === 'demandDetail'
     && /^#person\/PE001\/apply\/P42/.test(backFull.after)
     && backFull.page === 'personDetail' && backFull.hitPerson && !backFull.missing,
     JSON.stringify(backFull));

  /* 42：同一记录第二次进入，返回上下文要按「本次来源」更新，不能沿用第一次。
     必须走浏览器后退（popstate）才会留下 DM.id —— 页面内返回会把 DM.id 清掉，测不出这条。 */
  const ctx1 = await ev2(() => {
    enter('R04'); go('demands');
    setF('q', '电工');                       /* 第一次来源：筛选「电工」 */
    openDemand(DEMANDS[0].id);
    return { did: DEMANDS[0].id, firstCtx: DM.back ? DM.back.f.q : null, hash: location.hash };
  });
  await page.goBack(); await page.waitForTimeout(350);
  const ctx2 = await ev2(() => ({ page: S.page, dmId: DM.id, q: S.f.q }));
  const ctx3 = await ev2(did => {
    setF('q', '焊工');                       /* 第二次来源：筛选改成「焊工」 */
    openDemand(did);                         /* 再进同一条需求：按记录 ID 进，不依赖上一次残留 */
    return { usedQ: DM.back ? DM.back.f.q : null };
  }, ctx1.did);
  await ev2(() => dmBack());
  const ctx4 = await ev2(() => ({ afterQ: S.f.q }));
  ok('RG012-42 浏览器后退后二次进入同一记录，返回用本次来源的筛选',
     !ctx1.err && ctx1.firstCtx === '电工' && ctx2.page === 'demands' && ctx2.q === '电工'
     && ctx3.usedQ === '焊工' && ctx4.afterQ === '焊工',
     JSON.stringify({ ctx1, ctx2, ctx3, ctx4 }));
  /* 后退回列表后不能残留上一条详情记录（残留 DM.id 正是「二次进入沿用旧上下文」的老病根） */
  ok('RG012-42b 后退回列表后不残留详情记录', ctx2.dmId === null, JSON.stringify(ctx2));

  /* 43：D1 简历明细 → 档案 → 「这一单」回 D1 → 连续两次返回，第二次不能是「找不到这条需求」 */
  const chain = await ev2(() => {
    enter('R01'); go('demands');
    openDemand(DEMANDS[0].id, 'resume');
    const d1 = DM.id;
    /* 简历明细点人名进档案 */
    const nameLink = document.querySelector('.main .tbl-wrap tbody tr [onclick*="openHuman"], .main .tbl-wrap tbody tr [onclick*="openPerson"]');
    if(!nameLink) return { err:'简历明细没有可点的人名' };
    nameLink.click();
    const inPerson = { page: S.page, pid: HU.pid };
    huSetTab('apply');
    /* 本次投递点「这一单」回需求 */
    const postLink = [...document.querySelectorAll('.main .arc-link')]
      .find(el => /openDemand/.test(el.getAttribute('onclick') || ''));
    if(!postLink) return { err:'档案投递页没有可点的岗位名' };
    postLink.click();
    const inDemand2 = { page: S.page, dm: DM.id, hash: location.hash };
    document.querySelector('.main .pg-back').click();     /* 第一次返回 → 档案 */
    const back1 = { page: S.page, hash: location.hash };
    document.querySelector('.main .pg-back').click();     /* 第二次返回 → 应回到 D1 简历明细 */
    const back2 = { page: S.page, hash: location.hash, dm: DM.id, tab: DM.tab };
    const body = document.querySelector('.main').innerText;
    return { d1, inPerson, inDemand2, back1, back2,
      missing: /找不到这条需求|找不到该需求|该页面暂未开放/.test(body) };
  });
  ok('RG012-43 需求→档案→需求 连续两次返回，第二次仍回到原需求',
     !chain.err && chain.inDemand2.dm === chain.d1
     && chain.back1.page === 'personDetail'
     && chain.back2.page === 'demandDetail' && chain.back2.dm === chain.d1
     && chain.back2.hash === `#demand/${chain.d1}/detail?tab=resume` && !chain.missing,
     JSON.stringify(chain));

  /* 44：列表滚 500 → 进档案 → 后退 → 滚到 700 → 前进 → 再后退，应恢复 700 而不是 500 */
  await ev(() => { enter('R01'); go('persons'); });
  await page.waitForTimeout(250);
  await ev(() => { document.getElementById('main').scrollTop = 500; });
  await ev(() => { document.querySelector('.main .tbl-wrap tbody tr [onclick*="openPerson"]').click(); });
  await page.waitForTimeout(300);
  await page.goBack(); await page.waitForTimeout(400);
  const s1 = await ev(() => ({ page: S.page, sc: document.getElementById('main').scrollTop }));
  await ev(() => { document.getElementById('main').scrollTop = 700; });
  await page.goForward(); await page.waitForTimeout(400);
  const s2 = await ev(() => ({ page: S.page }));
  await page.goBack(); await page.waitForTimeout(450);
  const s3 = await ev(() => ({ page: S.page, sc: document.getElementById('main').scrollTop }));
  ok('RG012-44 前进后退后再回来，恢复的是最近一次离开的滚动位置',
     s1.page === 'persons' && Math.abs(s1.sc - 500) < 40
     && s2.page === 'personDetail'
     && s3.page === 'persons' && Math.abs(s3.sc - 700) < 40,
     JSON.stringify({ s1, s2, s3 }));

  /* 45：P1 档案 → D1 简历明细 → P2 档案 → 浏览器连续后退两次回到 P1 → 点页面内返回。
     期望回到「P1 是从人员列表进来的那条历史」，不能沿用 P2 的返回链又弹回 D1。 */
  await ev(() => { enter('R01'); go('persons'); });
  await page.waitForTimeout(250);
  const h45a = await ev2(() => {
    const link = document.querySelector('.main .tbl-wrap tbody tr [onclick*="openPerson"], .main .tbl-wrap tbody tr [onclick*="openHuman"]');
    if(!link) return { err:'人员列表没有可点的人名' };
    link.click();
    return { page: S.page, pid: HU.pid, hash: location.hash };
  });
  await page.waitForTimeout(200);
  const h45b = await ev2(() => {
    huSetTab('apply');
    const post = [...document.querySelectorAll('.main .arc-link')]
      .find(el => /openDemand/.test(el.getAttribute('onclick') || ''));
    if(!post) return { err:'档案投递页没有可点的岗位名' };
    post.click();
    const onDemand = { page: S.page, dm: DM.id, hash: location.hash };
    dmSetTab('resume');
    const pid1 = HU.pid || null;   /* D1 之前那个人的 id 已被 openHuman 覆盖前先留着 */
    return { onDemand, pid1 };
  });
  await page.waitForTimeout(200);
  const h45c = await ev2(pid1 => {
    /* 第八批：简历明细里点人名走 openHuman('PE...')，人员列表走 openPerson('P...')。
       两种 onclick 都要认：openHuman 第一个参数就是人员编号，openPerson 是投递编号。 */
    const cand = [...document.querySelectorAll('.main .tbl-wrap tbody tr [onclick*="openHuman"], .main .tbl-wrap tbody tr [onclick*="openPerson"]')];
    const pick = cand.find(el => {
      const m = (el.getAttribute('onclick') || '').match(/open(Person|Human)\('([^']+)'/);
      if(!m) return false;
      const pid = m[1] === 'Human' ? m[2] : ((P(m[2])||{}).personId);
      return pid && pid !== pid1;
    });
    if(!pick) return { err:'简历明细里没有第二个人可点' };
    pick.click();
    return { page: S.page, pid: HU.pid, hash: location.hash, back: HU.back ? HU.back.page : null };
  }, h45a.pid);
  await page.waitForTimeout(250);
  await page.goBack(); await page.waitForTimeout(350);
  const h45d = await ev2(() => ({ page: S.page, dm: DM.id }));
  await page.goBack(); await page.waitForTimeout(350);
  const h45e = await ev2(() => ({ page: S.page, pid: HU.pid,
    backPage: HU.back ? HU.back.page : null, hash: location.hash }));
  const h45f = await ev2(() => {
    document.querySelector('.main .pg-back').click();      /* 页面内返回 */
    const body = document.querySelector('.main').innerText;
    return { page: S.page, pid: HU.pid, hash: location.hash, hasList: !!document.querySelector('.main .tbl-wrap'),
      rows: document.querySelectorAll('.main .tbl-wrap tbody tr').length };
  });
  ok('RG012-45 连续后退回到更早的那份档案，页面内返回回到人员列表（不串用后一次的返回链）',
     !h45a.err && !h45b.err && !h45c.err && h45a.page === 'personDetail'
     && h45c.page === 'personDetail' && h45c.pid !== h45a.pid
     && h45d.page === 'demandDetail' && h45e.page === 'personDetail' && h45e.pid === h45a.pid
     && h45e.backPage === 'persons'
     && h45f.page === 'persons' && h45f.hash === '#persons' && h45f.hasList && h45f.rows > 0,
     JSON.stringify({ h45a, h45b, h45c, h45d, h45e, h45f }));

  /* 46：人员列表筛 D1 → 进档案 → 侧栏切需求列表筛「招聘中」→ 浏览器后退两次回人员列表。
     历史条目各自带筛选，人员列表要恢复 D1 那份，不能读到需求列表的 st:'招聘中' 变空表。 */
  await ev(() => { enter('R01'); go('persons'); });
  await page.waitForTimeout(250);
  const h46a = await ev2(() => {
    const dm = DEMANDS[0].id;
    setF('dm', dm);
    return { dm, rows: document.querySelectorAll('.main .tbl-wrap tbody tr').length, hash: location.hash };
  });
  await page.waitForTimeout(150);
  await ev(() => { document.querySelector('.main .tbl-wrap tbody tr [onclick*="openPerson"], .main .tbl-wrap tbody tr [onclick*="openHuman"]').click(); });
  await page.waitForTimeout(250);
  const h46b = await ev2(() => {
    go('demands');                                   /* 侧栏点需求列表 */
    setF('st', '招聘中');                            /* 需求列表自己的筛选 */
    return { page: S.page, st: S.f.st, dm: S.f.dm || '', hash: location.hash };
  });
  await page.waitForTimeout(200);
  await page.goBack(); await page.waitForTimeout(350);
  const h46c = await ev2(() => ({ page: S.page, hash: location.hash }));
  await page.goBack(); await page.waitForTimeout(400);
  const h46d = await ev2(() => {
    const body = document.querySelector('.main').innerText;
    const sel = [...document.querySelectorAll('.main .toolbar select')];
    /* 第八批在工具栏最前面加了「全部跟进」，「需求」下拉不再是第 3 个 ——
       按选项里有没有需求名来认，不按位置认。 */
    const dmSel = sel.find(s => [...s.options].some(o => o.value === DEMANDS[0].id));
    return { page: S.page, hash: location.hash, dm: S.f.dm || '', st: S.f.st || '',
      rows: document.querySelectorAll('.main .tbl-wrap tbody tr').length,
      empty: /没有匹配的数据/.test(body),
      selDm: dmSel ? dmSel.value : '', inText: /人员列表/.test(body) };
  });
  ok('RG012-46 浏览器退回人员列表，恢复该列表自己的筛选（不串用需求列表的筛选）',
     !h46a.err && !h46b.err && h46a.rows > 0
     && h46b.page === 'demands' && h46b.st === '招聘中'
     && h46c.page === 'personDetail'
     && h46d.page === 'persons' && h46d.hash === '#persons'
     && h46d.dm === h46a.dm && h46d.st === '' && !h46d.empty && h46d.rows > 0
     && h46d.selDm === h46a.dm && h46d.inText,
     JSON.stringify({ h46a, h46b, h46c, h46d }));

  /* 47：一个人投多个需求 —— 第八批把「档案里五页签 + 多单折叠」改成
     「一条投递一个页面」：多单在人员列表各占一行（姓名旁标「同投 N」），
     投递跟进页里用「这个人的其他投递」切换，切换时地址跟着换。
     原来验的是折叠交互，现在验的是「多单一条都不少、切过去还是同一单」。 */
  const multi = await ev2(() => {
    const pair = [...new Set(PERSONS.map(x => x.personId))]
      .map(id => ({ pid: id, aps: appsOf(id) })).filter(x => x.aps.length > 1)[0];
    if(!pair) return { err: '没有多条投递的人' };
    enter('R01');
    HU.open = null;
    const name = PERSONS.find(x => x.id === pair.aps[0].id).name;
    go('persons');
    setF('q', name);
    const rows = [...document.querySelectorAll('.main .tbl-wrap tbody tr')];
    const n = rows.length, sameBadge = rows.some(r => /同投/.test(r.innerText));
    openPerson(pair.aps[0].id);
    huSetTab('apply');
    const h1 = location.hash, a1 = HU.appId;
    /* 2026-11-15 第十一批：投递跟进页的「其他投递」块已去掉 ——
       同一人多个需求在招聘人员列表各占一行，切另一单就从那一行的「投递跟进」进。
       所以这里验的是同一条业务能力：多单一处不少、切过去还是同一单、地址跟着换。 */
    go('persons');
    setF('q', name);
    const rows2 = [...document.querySelectorAll('.main .tbl-wrap tbody tr')]
      .filter(tr => !tr.classList.contains('row-more'));
    const btnOf = r => [...r.querySelectorAll('.acts .link')].find(l => l.innerText.trim() === '投递跟进');
    const b1 = rows2[1] ? btnOf(rows2[1]) : null;
    if(!b1) return { err: '同投的第二行没有「投递跟进」入口', n, n2: rows2.length, sameBadge, h1, a1 };
    b1.click();
    return { n, want: pair.aps.length, sameBadge, h1, a1, h2: location.hash, a2: HU.appId,
      page2: S.page, pidNow: HU.pid, pid: pair.pid };
  });
  ok('RG012-47 一人多单一条不少，且能从列表切到另一单（地址跟随）',
     !multi.err && multi.n === multi.want && multi.want >= 2 && multi.sameBadge
     && /\/apply\/P\d+$/.test(multi.h1) && multi.a1
     && multi.h2 !== multi.h1 && multi.a2 && multi.a2 !== multi.a1
     && multi.page2 === 'personDetail' && multi.pidNow === multi.pid,
     JSON.stringify(multi));

  /* 48~52：需求明细只展开「最新一版要什么样的人」；每个版本改了什么进独立历史页。
     旧版这一页把三件事挤一屏（①标准岗位标准 ②要素与标准值三栏表 ③人/时间/钱 ④客户与项目），
     所以反向验证的抓手就是这两句标题必须消失、历史页必须能独立寻址。 */
  await ev(() => { enter('R01'); openDemand('D1', 'detail'); });
  await page.waitForTimeout(250);
  const dmLatest = await ev2(() => {
    const m = document.querySelector('.main'), t = m.innerText;
    return {
      hash: location.hash, page: S.page,
      verBadge: (m.querySelector('.ver-line .b.g') || {}).innerText || '',
      whoCnt: (m.querySelector('.sec-t') || {}).innerText || '',
      hasWho: /要什么样的人/.test(t),
      hasMoney: /人 \/ 时间 \/ 钱/.test(t),
      rows: m.querySelectorAll('.req-dl > div').length,
      money: m.querySelectorAll('.req-money > div').length,
      oldStd: /① 标准岗位标准/.test(t),
      oldTri: /② 要素与标准值/.test(t),
      oldTbl: m.querySelectorAll('.el-dom').length,
    };
  });
  ok('RG012-48 需求明细只放最新一版：版本号 +「要什么样的人」+「人/时间/钱」，旧的三段说明与三栏表消失',
     !dmLatest.err && dmLatest.page === 'demandDetail'
     && /生效 v\d+\.\d+/.test(dmLatest.verBadge)
     && dmLatest.hasWho && dmLatest.hasMoney
     && dmLatest.rows > 0 && dmLatest.money >= 6
     && !dmLatest.oldStd && !dmLatest.oldTri && dmLatest.oldTbl === 0,
     JSON.stringify(dmLatest));

  const hist = await ev2(() => {
    openVers('D1');
    const m = document.querySelector('.main');
    const accs = [...m.querySelectorAll('.acc')];
    const vs = versOf(D('D1'));
    return {
      hash: location.hash, page: S.page, sub: DM.sub,
      drawerOn: !!document.querySelector('#drawer.on'),
      n: accs.length, want: vs.length,
      vers: accs.map(a => a.dataset.ver),
      open: accs.filter(a => a.classList.contains('open')).map(a => a.dataset.ver),
      newest: (vs[vs.length - 1] || {}).v, act: (activeVer(D('D1')) || {}).v,
      title: (m.querySelector('.page-head h2') || {}).innerText || '',
      firstBody: (accs[0] || {}).innerText || '',
    };
  });
  ok('RG012-49 变更历史是独立地址页 #demand/<id>/history：一版一块，默认只展开最新/生效版，抽屉不再出现',
     !hist.err && hist.page === 'demandDetail' && hist.hash === '#demand/D1/history'
     && hist.sub === 'history' && !hist.drawerOn
     && hist.n === hist.want && hist.n >= 2
     && hist.open.includes(hist.newest) && hist.open.length <= 2
     && hist.open.length < hist.n
     && /变更历史 ·/.test(hist.title) && /旧值/.test(hist.firstBody),
     JSON.stringify(hist));

  const fold = await ev2(() => {
    const cnt = () => document.querySelectorAll('.main .acc.open').length;
    const hd = v => document.querySelector('.main .acc[data-ver="' + v + '"] .acc-hd');
    const before = cnt();
    hd('v1.1').click();                       /* 收起当前版 */
    const after_hide = cnt();
    render();                                 /* 重画：不能自己弹回来 */
    const after_render = cnt();
    hd('v1.0').click();                       /* 展开旧版 */
    const after_show = cnt();
    return { before, after_hide, after_render, after_show };
  });
  ok('RG012-50 历史页每版可独立折叠，重画不回弹', 
     !fold.err && fold.before === 1 && fold.after_hide === 0
     && fold.after_render === 0 && fold.after_show === 1,
     JSON.stringify(fold));

  await page.reload(); await page.waitForTimeout(450);
  const rel = await ev2(() => ({
    hash: location.hash, page: S.page, dm: DM && DM.id, sub: DM && DM.sub,
    n: document.querySelectorAll('.main .acc').length,
    open: [...document.querySelectorAll('.main .acc.open')].map(a => a.dataset.ver),
  }));
  ok('RG012-51 刷新后仍停在这条需求的变更历史（地址可寻址，不落回明细）',
     !rel.err && rel.hash === '#demand/D1/history' && rel.page === 'demandDetail'
     && rel.dm === 'D1' && rel.sub === 'history' && rel.n >= 2 && rel.open.length <= 2,
     JSON.stringify(rel));

  const ed = await ev2(() => {
    dmHistoryBack();                            /* 回明细 */
    const cnt = () => document.querySelectorAll('.main .ed-in').length;
    const n0 = cnt();
    dmToggleEdit();
    const n1 = cnt();
    const btn1 = [...document.querySelectorAll('.main .ver-line .btn')].map(b => b.innerText.trim());
    dmToggleEdit();
    const n2 = cnt();
    return { n0, n1, n2, btn1, hash: location.hash };
  });
  ok('RG012-52「编辑这一单」把当前值切成输入框，再点一次收起，地址回到明细',
     !ed.err && ed.n0 === 0 && ed.n1 > 0 && ed.n2 === 0
     && ed.btn1.includes('完成编辑') && /\/detail\?tab=detail$/.test(ed.hash || ''),
     JSON.stringify(ed));

  /* 53~55：简历明细只留「当前招聘人员自己的简历」。
     原实现筛选用 p.owner、显示用档案跟进人，演示数据里同一单 owner 是常量，
     于是「我的 8 / 全部 8」、可每行跟进人却是陈曦 / 王浩 —— 专员在自己那一栏看到同事的人。 */
  const rr = await ev2(() => {
    enter('R04');
    openDemand('D1', 'resume');
    const m = document.querySelector('.main');
    const th = [...m.querySelectorAll('.tbl-wrap thead th')].map(x => x.innerText.trim());
    const fi = th.indexOf('当前跟进人');
    const rows = [...m.querySelectorAll('.tbl-wrap tbody tr')];
    return {
      me: S.who,
      chips: [...m.querySelectorAll('.chip')].map(c => c.innerText.trim()),
      n: rows.length, all: personsOf('D1').length, mine: dmMine('D1').length,
      followers: [...new Set(rows.map(t => t.children[fi].innerText.trim()))],
      tabBadge: (m.querySelector('.arc-tab.on .vis') || {}).innerText || '',
      /* 第七批：范围解释、列一致性说明、底部来源汇总、技术地址标签都从页面上拿掉 */
      foot: /人从哪来|全单 \d+ 人在投|列与人员列表完全一致|「我的」= 我当前跟进的人/.test(m.innerText),
      dupText: /人从哪来|#demand\//.test(m.innerText),
    };
  });
  ok('RG012-53 R04 简历明细只列自己当前跟进的人：连「我的/全部」切换都不给，也没有重复说明',
     !rr.err && rr.n === rr.mine && rr.mine > 0 && rr.mine < rr.all
     && rr.followers.length === 1 && rr.followers[0] === rr.me
     && rr.chips.length === 0
     && rr.tabBadge === String(rr.mine)
     && !rr.dupText && !rr.foot, JSON.stringify(rr));

  const r01r = await ev2(() => {
    enter('R01');
    openDemand('D1', 'resume');
    const m = () => document.querySelector('.main');
    const chips = [...m().querySelectorAll('.chip')].map(c => c.innerText.trim());
    const nAll = m().querySelectorAll('.tbl-wrap tbody tr').length;   /* 管理层默认看全单 */
    dmSetScope('mine');
    const nMine = m().querySelectorAll('.tbl-wrap tbody tr').length;  /* 总经理不跟人，我的 = 0 */
    dmSetScope('all');
    const back = m().querySelectorAll('.tbl-wrap tbody tr').length;
    const all = personsOf('D1').length;
    return { chips, nAll, nMine, back, all };
  });
  ok('RG012-54 管理层（R01）保留「我的 / 全部」两档，默认全单，切到「我的」只剩自己跟的人',
     !r01r.err && r01r.chips.length === 2
     && r01r.chips.some(c => /^全部 \d+$/.test(c)) && r01r.chips.some(c => /^我的 \d+$/.test(c))
     && r01r.nAll === r01r.all && r01r.nMine < r01r.nAll && r01r.back === r01r.all,
     JSON.stringify(r01r));

  const sameRoster = await ev2(() => {
    enter('R04');
    const me = S.who;
    const others = personsOf('D1').filter(p => dmWhoFollows(p) !== me);
    go('persons');
    /* 只取姓名链接的文字：第一格里还有「男 · 34岁」与电话，innerText 会连在一起 */
    const names = [...document.querySelectorAll('.tbl-wrap tbody tr')]
      .map(t => (t.querySelector('.arc-link') || {}).innerText || '').map(x => x.trim());
    const leaked = others.filter(p => names.includes(p.name.trim())).map(p => p.name);
    openDemand('D1', 'resume');
    const dmNames = [...document.querySelectorAll('.main .tbl-wrap tbody tr')]
      .map(t => (t.querySelector('.arc-link') || {}).innerText || '').map(x => x.trim());
    const mineNames = dmMine('D1').map(p => p.name.trim());
    return { othersN: others.length, leaked, dmNames,
      missing: mineNames.filter(n => !dmNames.includes(n)),
      inPersonList: mineNames.filter(n => names.includes(n)).length, mineN: mineNames.length };
  });
  ok('RG012-55 人员列表与简历明细同一口径：同事跟进的人两边都不出现，我的两页都在',
     !sameRoster.err && sameRoster.othersN > 0 && sameRoster.leaked.length === 0
     && sameRoster.missing.length === 0 && sameRoster.inPersonList === sameRoster.mineN,
     JSON.stringify(sameRoster));


  /* =====================================================================
     第七批（2026-11-15）· 融敢招聘平台原型修改需求（6 项）
     ---------------------------------------------------------------------
     01 需求列表突出本人任务 · 02 简历明细只留本人 + 真分页 · 03 招聘进度只留本人
     04 批次列表跟进/收集状态 · 05 批次人员整页 · 06 公共操作统一
     断言只读用户能看见的 DOM：列头、单元格文字、按钮顺序、地址、页码。
     ===================================================================== */

  /* ---------- 01 需求列表：只讲我自己的目标与简历 ---------- */
  const myDemand = await ev2(() => {
    enter('R04'); go('demands');
    const m = document.querySelector('.main');
    const th = [...m.querySelectorAll('.tbl-wrap thead th')].map(x => x.innerText.trim());
    const row = [...m.querySelectorAll('.tbl-wrap tbody tr')].find(tr => /售后运维/.test(tr.innerText));
    const t = row ? row.innerText : '';
    const a = allocOf('D1').find(x => x.staff === S.who);
    return { th, text: t, mine: dmMine('D1').length,
      qty: a.qty, hired: a.hired, left: a.qty - a.hired,
      head: D('D1').head,
      hasWhole: /整单|分摊|未分配/.test(t), hasAlloc: /分配/.test(t) };
  });
  ok('RG012-56 R04 需求列表只列本人目标/已入职/缺口/简历，不出现整单与其他专员分配',
     !myDemand.err
     && myDemand.th.join(',') === '需求 / 岗位,项目,我的目标,我的简历,最迟到岗,客户确认,状态,操作'
     && myDemand.text.includes(String(myDemand.qty) + ' 人')
     && myDemand.text.includes('已入职 ' + myDemand.hired)
     && myDemand.text.includes('缺口 ' + myDemand.left)
     && myDemand.text.includes(myDemand.mine + ' 份')
     && !myDemand.hasWhole && !myDemand.hasAlloc,
     JSON.stringify(myDemand));

  /* ---------- 06 公共操作三件套：顺序固定 ---------- */
  const acts = await ev2(() => {
    enter('R04'); go('demands');
    const row = [...document.querySelectorAll('.tbl-wrap tbody tr')].find(tr => /售后运维/.test(tr.innerText));
    const links = [...row.querySelectorAll('.acts .link')].map(x => x.innerText.trim());
    const view = [...row.querySelectorAll('.acts .link')].find(x => x.innerText.trim() === '查看简历');
    view.click();
    return { links, page: S.page, hash: location.hash };
  });
  ok('RG012-57 需求列表公共操作固定为「查看简历 / 传简历 / 人才库找人」，查看简历直达本人简历明细',
     !acts.err && acts.links.length === 3
     && acts.links[0] === '查看简历' && acts.links[1] === '传简历' && acts.links[2] === '人才库找人'
     && acts.page === 'demandDetail' && /tab=resume$/.test(acts.hash),
     JSON.stringify(acts));

  /* ---------- 06 人才库找人：带需求与岗位条件进完整筛选页 ---------- */
  const poolFor = await ev2(() => {
    enter('R04'); go('demands');
    const row = [...document.querySelectorAll('.tbl-wrap tbody tr')].find(tr => /售后运维/.test(tr.innerText));
    [...row.querySelectorAll('.acts .link')].find(x => x.innerText.trim() === '人才库找人').click();
    const m = document.querySelector('.main');
    const t = m.innerText;
    const stSel = [...m.querySelectorAll('.toolbar select')].map(x => x.value);
    openModal(poolPickBatch('PE001', S.f.for));
    /* 第九批：加入需求必须先选目标需求，再落批次 —— 默认需求就是进来的这一单 */
    const dmSel = (document.querySelector('#modal #pkDm') || {}).value || '';
    const batchSel = (document.querySelector('#modal #pkBatch') || {}).innerText || '';
    closeAll();
    return { page: S.page, hash: location.hash, forD: S.f.for,
      banner: /正在为「售后运维工程师」找人/.test(t) && /岗位条件/.test(t),
      hasCond: t.includes('能接受客户现场驻场'),
      freeOnly: stSel.includes('free'),
      pickFirst: dmSel === 'D1',
      batchFirst: /立讯售后-1113/.test(batchSel) };
  });
  ok('RG012-58 人才库找人进完整筛选页：带入需求与岗位条件，加入需求默认选这一单',
     !poolFor.err && poolFor.page === 'pool' && poolFor.hash === '#pool'
     && poolFor.forD === 'D1' && poolFor.banner && poolFor.hasCond
     && poolFor.freeOnly && poolFor.pickFirst && poolFor.batchFirst,
     JSON.stringify(poolFor));

  /* ---------- 02 简历明细：没有范围切换、没有技术地址、有真分页 ---------- */
  const resumeUi = await ev2(() => {
    enter('R04'); openDemand('D1', 'resume');
    const m = document.querySelector('.main');
    const t = m.innerText;
    const pg = m.querySelector('.pager');
    return { chips: [...m.querySelectorAll('.chip')].map(c => c.innerText.trim()),
      tech: /#demand\//.test(t),
      pager: pg ? pg.innerText.replace(/\s+/g, ' ') : '',
      hasPrev: /上一页/.test(pg ? pg.innerText : ''),
      hasNext: /下一页/.test(pg ? pg.innerText : ''),
      per: pg ? (pg.querySelector('select') || {}).value : '',
      rows: m.querySelectorAll('.tbl-wrap tbody tr').length,
      mine: dmMine('D1').length };
  });
  ok('RG012-59 简历明细没有「我的/全部」切换与技术地址，默认 50 条一页且有上一页/下一页',
     !resumeUi.err && resumeUi.chips.length === 0 && !resumeUi.tech
     && /\u5171 \d+ 人/.test(resumeUi.pager) && resumeUi.hasPrev && resumeUi.hasNext
     && resumeUi.per === '50' && resumeUi.rows === resumeUi.mine,
     JSON.stringify(resumeUi));

  /* ---------- 真分页：不是画个「1」，而是真的切页 ---------- */
  const paging = await ev2(() => {
    enter('R01'); go('persons');          /* 管理层看全量，人够多才能切到第 2 页 */
    const m = () => document.querySelector('.main');
    const total = m().querySelectorAll('.tbl-wrap tbody tr').length;
    const p1 = m().querySelector('.pager').innerText.replace(/\s+/g, ' ');
    lfSet('persons', 'per', 20);
    const n1 = m().querySelectorAll('.tbl-wrap tbody tr').length;
    pgGo('persons', 2);
    const n2 = m().querySelectorAll('.tbl-wrap tbody tr').length;
    const on2 = (m().querySelector('.pg.on') || {}).innerText || '';
    pgGo('persons', 99);                                  /* 越界要收敛到最后一页 */
    const onLast = (m().querySelector('.pg.on') || {}).innerText || '';
    const nLast = m().querySelectorAll('.tbl-wrap tbody tr').length;
    const tp = Math.ceil(total / 20);
    lfSet('persons', 'per', 50);
    return { total, p1, n1, n2, nLast, on2, onLast, tp, back: m().querySelectorAll('.tbl-wrap tbody tr').length };
  });
  ok('RG012-60 分页是真的切页：20 条一页时第一页 20 行、下一页换成剩下的、越界收敛到末页',
     !paging.err && paging.total > 20 && paging.n1 === 20 && paging.n2 === 20
     && paging.nLast === paging.total - 40 && paging.on2 === '2'
     && paging.onLast === String(paging.tp) && paging.back === paging.total
     && /\u5171 \d+ 人/.test(paging.p1),
     JSON.stringify(paging));

  /* ---------- 03 招聘进度：只留本人目标与本人批次 ---------- */
  const prog = await ev2(() => {
    enter('R04'); openDemand('D1', 'progress');
    const m = document.querySelector('.main'), t = m.innerText;
    const mineB = BATCHES.filter(b => b.demandId === 'D1' && b.owner === S.who).map(b => b.code);
    const shown = mineB.filter(c => t.includes(c));
    return { t: t.slice(0, 600),
      hasMineGoal: /我的目标/.test(t), hasMineBatch: /我的批次/.test(t),
      hasFunnel: /人员漏斗/.test(t), hasAlloc: /分配情况/.test(t), hasSum: /合计/.test(t),
      others: /陈曦|王浩/.test(t), mineN: mineB.length, shownN: shown.length,
      nums: [String(dmMyTask(D('D1')).qty), String(dmMyTask(D('D1')).hired), String(dmMyTask(D('D1')).left)]
        .every(x => t.includes(x + ' 人')) };
  });
  ok('RG012-61 招聘专员进度页只给本人目标与本人批次：没有分配表、跨专员合计、整单漏斗',
     !prog.err && prog.hasMineGoal && prog.hasMineBatch && prog.nums
     && !prog.hasFunnel && !prog.hasAlloc && !prog.hasSum && !prog.others
     && prog.mineN > 0 && prog.shownN === prog.mineN,
     JSON.stringify(prog));

  /* ---------- 04 批次列表：跟进与收集状态说清楚 ---------- */
  const batchList = await ev2(() => {
    enter('R04'); go('batches');
    const m = document.querySelector('.main');
    const th = [...m.querySelectorAll('.tbl-wrap thead th')].map(x => x.innerText.trim());
    const t = m.innerText;
    const dates = [...m.querySelectorAll('.tbl-wrap tbody tr')]
      .map(tr => (tr.innerText.match(/2026-\d\d-\d\d/) || [''])[0]);
    const sorted = dates.every((d, i) => i === 0 || dates[i - 1] >= d);
    const rowT = m.querySelector('.tbl-wrap tbody tr').innerText;
    const b = BATCHES.find(x => rowT.includes(x.code));
    return { th, sorted, hasTouched: /已联系 \d+ · 待联系 \d+/.test(t),
      hasResult: /跟进结果/.test(t), oldWin: /战果/.test(t),
      hasFiled: /已建档 \d+ 人/.test(t), dmFilter: [...m.querySelectorAll('.toolbar select')]
        .some(x => /全部需求/.test(x.innerText)),
      ownerCol: th.includes('负责人'),
      cap: b ? batchUploaded(b) : 0, filed: b ? batchFiled(b) : 0,
      rowT: rowT.replace(/\s+/g, ' ') };
  });
  ok('RG012-62 批次列表只列本人批次：无负责人列、有需求筛选、日期倒序、说清已联系/待联系与跟进结果',
     !batchList.err && !batchList.ownerCol && batchList.dmFilter && batchList.sorted
     && batchList.hasTouched && batchList.hasResult && !batchList.oldWin
     && batchList.hasFiled && batchList.cap > 0,
     JSON.stringify(batchList));

  /* ---------- 05 批次人员：整页 + 三重收窄 ---------- */
  const batchPage = await ev2(() => {
    enter('R04'); go('batches');
    openBatchPersons('B1');
    const m = document.querySelector('.main'), t = m.innerText;
    const names = [...m.querySelectorAll('.tbl-wrap tbody tr .arc-link')].map(x => x.innerText.trim());
    const inB = PERSONS.filter(p => p.batchId === 'B1' && p.demandId === 'D1');
    const others = inB.filter(p => dmWhoFollows(p) !== S.who).map(p => p.name);
    return { page: S.page, hash: location.hash,
      rows: names.length, mine: inB.filter(p => dmWhoFollows(p) === S.who).length,
      leaked: others.filter(n => names.includes(n)),
      drawer: !!document.querySelector('#drawer.on'),
      explain: /新增 \d+ 份/.test(t) && /已建档 \d+ 人/.test(t) && /为什么/.test(t),
      hasSearch: !!m.querySelector('#lf-q'),
      hasNode: [...m.querySelectorAll('.toolbar select')].some(x => /全部阶段/.test(x.innerText)) };
  });
  ok('RG012-63 批次人员是整页 #batch/<id>/persons：只列本批 + 本需求 + 本人，并解释「份」与「人」的口径',
     !batchPage.err && batchPage.page === 'batchPersons'
     && /^#batch\/B1\/persons$/.test(batchPage.hash)
     && batchPage.rows === batchPage.mine && batchPage.mine > 0
     && batchPage.leaked.length === 0 && !batchPage.drawer
     && batchPage.explain && batchPage.hasSearch && batchPage.hasNode,
     JSON.stringify(batchPage));

  /* ---------- 04 已关闭批次：不再收新简历，入口改成「新增到今日批次」 ---------- */
  const closed = await ev2(() => {
    enter('R04'); go('batches');
    const row = [...document.querySelectorAll('.tbl-wrap tbody tr')]
      .find(tr => tr.innerText.includes('立讯售后-1112'));   /* B4 已关闭 */
    const links = [...row.querySelectorAll('.acts .link')].map(x => x.innerText.trim());
    openBatchPersons('B4');
    const page = document.querySelector('.main').innerText;
    return { links, closedTag: /已关闭/.test(page),
      noUpload: !links.includes('传简历') && /新增到今日批次/.test(links.join(',')),
      pageHint: /不再收新简历/.test(page) };
  });
  ok('RG012-64 已关闭批次不给上传入口（改「新增到今日批次」），页面说明跟进不结束',
     !closed.err && closed.closedTag && closed.noUpload && closed.pageHint,
     JSON.stringify(closed));

  /* ---------- 06 批次列表去掉顶部三按钮与「AI匹配」入口 ----------
     第九批：顶部「从人才池捞人 / 传简历建批次 / 补建批次」三个按钮删掉
     （批次不在这儿起头），行内也不再给「AI匹配」入口。留着的是查看简历 / 传简历 / 人才库找人。 */
  const aiName = await ev2(() => {
    enter('R04'); go('batches');
    const m = document.querySelector('.main');
    const t = m.innerText;
    const btns = [...m.querySelectorAll('.page-head .btn, .page-head button')].map(b => b.innerText.trim());
    const row = [...m.querySelectorAll('.tbl-wrap tbody tr')].find(tr => /进行中/.test(tr.innerText));
    const links = row ? [...row.querySelectorAll('.acts .link')].map(x => x.innerText.trim()) : [];
    return { old: /AI 打分|AI打分/.test(t), ai: /AI匹配|AI 匹配/.test(t), btns, links,
      noCreate: !/传简历建批次|补建批次|从人才池捞人/.test(t.split('\n').slice(0,8).join('\n')) };
  });
  ok('RG012-65 批次列表不再有「AI匹配」入口，顶部也不再挂建批三个按钮',
     !aiName.err && !aiName.old && !aiName.ai
     && aiName.btns.length === 0
     && A(aiName.links).length === 3 && aiName.links[0] === '查看简历'
     && aiName.links[1] === '传简历' && aiName.links[2] === '人才库找人',
     JSON.stringify(aiName));

  /* ---------- 补充：口径标注（第七批自测反馈修正） ---------- */
  const srcLabel = await ev2(() => {
    enter('R04'); go('batches');
    const rows = [...document.querySelectorAll('.tbl-wrap tbody tr')];
    const withFiled = rows.find(tr => /已建档 [1-9]/.test(tr.innerText));
    const noFiled   = rows.find(tr => /已建档 0 人/.test(tr.innerText));
    const all = rows.map(tr => tr.innerText).join('\n');
    return {
      old: /含去重/.test(all),
      filedLabeled: !!withFiled && /已建档 \d+ 人：/.test(withFiled.innerText),
      capLabeled: !!noFiled && /份来源：/.test(noFiled.innerText),
    };
  });
  ok('RG012-66 来源构成说清在数「份」还是「人」，不再用「含去重」糊过去',
     !srcLabel.err && !srcLabel.old && srcLabel.filedLabeled && srcLabel.capLabeled,
     JSON.stringify(srcLabel));

  const headMine = await ev2(() => {
    enter('R04'); openDemand('D1', 'resume');
    const t = document.querySelector('.arc-top').innerText;
    const listTotal = (document.querySelector('.tbl-wrap') ? document.querySelector('.main').innerText : '');
    return { top: t.replace(/\n/g, ' '), okTarget: /我的目标 \d+ 人/.test(t),
      okHired: /已入职 \d+/.test(t), okWhole: /整单/.test(t) };
  });
  ok('RG012-67 需求详情头部把「我的目标／已入职／缺口」写全，不与简历条数混读',
     !headMine.err && headMine.okTarget && headMine.okHired && headMine.okWhole,
     JSON.stringify(headMine));

  const batchHead = await ev2(() => {
    enter('R04'); openBatchPersons('B1');
    const t = document.querySelector('.arc-top').innerText.replace(/\n/g, ' ');
    return { t, labeled: /已建档 \d+ 人的来源：|份来源：/.test(t), noOld: !/含去重/.test(t) };
  });
  ok('RG012-68 批次人员页头部同样标注来源口径',
     !batchHead.err && batchHead.labeled && batchHead.noOld, JSON.stringify(batchHead));

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
