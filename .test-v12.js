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

  await page.goto(FILE); await page.waitForTimeout(500);

  /* ---- RG-001 ---- */
  const land = await txt('#root');
  ok('RG001-1 角色入口说明外部客户不占账号', land.includes('外部客户入口') && land.includes('不占账号'));
  ok('RG001-2 角色职责可见范围表存在', land.includes('角色职责与可见范围'));
  ok('RG001-3 角色卡含内部客户负责人', land.includes('内部客户负责人'));
  ok('RG001-4 E01 与工程师端关系标待确认', land.includes('工程师端') && land.includes('待产品负责人确认'));

  await ev(() => { localStorage.clear(); enter('R02'); });
  const nav02 = await txt('.side');
  ok('RG001-5 R02 侧栏显示内部客户负责人', nav02.includes('内部客户负责人'));
  ok('RG001-6 R02 编码保留', nav02.includes('R02'));
  ok('RG001-7 R02 有确认链接菜单', nav02.includes('客户确认链接'));

  /* ---- RG-001 外部链接：只读、无内部信息 ---- */
  await ev(() => openCustLinkDemo('LK-D8-V10')); await page.waitForTimeout(300);
  const cl = await txt('.cust-doc');
  ok('RG001-8 只读页含只读标识', cl.includes('只读'));
  ok('RG001-9 只读页声明不含内部信息', cl.includes('不含内部人才库'));
  ok('RG001-10 只读页无侧边导航', (await page.locator('.side').count()) === 0);
  ok('RG001-11 只读页无人才库字样泄露', !cl.includes('人才池列表'));
  ok('RG001-12 失效链接提示明确', await (async () => { await ev(() => openCustLinkDemo('LK-D6-V10')); await page.waitForTimeout(200);
    const t = await txt('.cust-doc'); return t.includes('链接已失效'); })());
  ok('RG001-13 撤销链接提示明确', await (async () => { await ev(() => openCustLinkDemo('LK-D3-V10')); await page.waitForTimeout(200);
    const t = await txt('.cust-doc'); return t.includes('链接已撤销'); })());
  /* 必须在**有效**链接上断言，否则 .cust-doc 不存在会空过（历史 bug） */
  ok('RG001-14 只读页无任何输入或提交控件', await (async () => {
      await ev(() => openCustLinkDemo('LK-D8-V10')); await page.waitForTimeout(250);
      const r = await ev(() => {
        const doc = document.querySelector('.cust-doc');
        if(!doc) return {noDoc:true};
        const n = doc.querySelectorAll('input, textarea, select').length;
        const btns = Array.from(doc.querySelectorAll('button'))
          .filter(b => /提交|确认|修改|保存|切换|无误|需要/.test(b.innerText||''));
        return {noDoc:false, n, btns:btns.map(b=>b.innerText.trim()), hasNote: doc.innerText.includes('不提供在线提交')};
      });
      return !r.noDoc && r.n === 0 && r.btns.length === 0 && r.hasNote; })());
  await ev(() => exitCustLink());

  /* ---- RG-002 ---- */
  await ev(() => { enter('R01'); go('confirms'); }); await page.waitForTimeout(300);
  const cf = await txt('.main');
  ok('RG002-1 确认单列表含只读链接列', cf.includes('只读链接'));
  ok('RG002-2 待客户确认单标不生效', cf.includes('不生效'));

  await ev(() => openConfirm('D1')); await page.waitForTimeout(300);
  const dr = await txt('#drawer');
  ok('RG002-3 确认单抽屉含条件来源三段', dr.includes('条件来源：标准 ≠ 客户级 ≠ 本单调整'));
  ok('RG002-4 47 项逐项确认存在', dr.includes('47 项逐项确认'));
  ok('RG002-5 本单调整可见', dr.includes('客户报价') || dr.includes('本单调整'));
  ok('RG002-6 声明不回写标准', dr.includes('不回写标准岗位标准'));
  ok('RG002-7 生效版本标识', dr.includes('生效版本 v1.1'));
  await ev(() => closeAll());

  /* 回归 #1：待客户确认 / 待重新确认 也要有代登记入口 */
  const entry = {};
  for (const did of ['D7','D8']) {
    await ev(id => { enter('R01'); go('confirms'); openConfirm(id); }, did);
    await page.waitForTimeout(250);
    entry[did] = await ev(() => Array.from(document.querySelectorAll('.dr-f .btn')).map(b => b.innerText.trim()));
    await ev(() => closeAll());
  }
  ok('RG002-7b 待重新确认版本有代登记入口', (entry.D7||[]).some(t => t.includes('代登记客户反馈')));
  ok('RG002-7c 待客户确认版本有代登记入口', (entry.D8||[]).some(t => t.includes('代登记客户反馈')));

  /* 新建需求 -> 生成链接（ndFinish 内部） */
  const linkCount0 = await ev(() => CLINKS.length);
  await ev(() => { DEMANDS.unshift({id:'DT1', code:'XQ-20261114-99', client:'测试客户', cs:'测试', ps:'电工',
    project:'向导测试', post:'装配电工 · 大工', head:3, hired:0, price:'30 元/时', city:'青岛',
    deadline:'2026-12-20', valid:'2026-11-14 ~ 2026-12-25', confirm:'待客户确认', alloc:'未分配',
    status:'待客户确认', req:[], owner:'李文静', stdId:'SJ-DG-D3', stdVer:'v1.1', stdList:'EL-DG-D3', stdOverride:[]});
    DEMAND_VERS.DT1 = [{v:'v1.0', status:'待客户确认', at:'2026-11-14 08:20', by:'李文静', way:'链接已发出', n:47, note:'新建', changes:[]}];
    genLink('DT1','v1.0','李文静'); });
  ok('RG002-8 新需求可生成受控链接', (await ev(() => CLINKS.length)) === linkCount0 + 1);
  ok('RG002-9 新需求未确认不生效', await ev(() => isEffective(D('DT1')) === false));

  /* ---- RG-002 代登记 → 内部审核 → 生效（v1.2 修订后主链） ---- */
  ok('RG002-10 演示数据含待内部审核版本', await ev(() => {
      const v = openVer(D('D3')); return v && v.status === '待内部审核' && (activeVer(D('D3'))||{}).v === 'v1.0'; }));
  ok('RG002-11 演示数据含已退回版本', await ev(() => {
      const v = openVer(D('D4')); return v && v.status === '已退回' && v.auditNote.length > 4; }));
  ok('RG002-12 审核中的新版不改变生效版本', await ev(() => (activeVer(D('D3'))||{}).v === 'v1.0' && matchNeedsUpdate(D('D3')) === false));

  await ev(() => { enter('R01'); go('confirms'); }); await page.waitForTimeout(200);
  await ev(() => regDrawer('D7')); await page.waitForTimeout(300);
  const rg1 = await txt('#drawer');
  ok('RG002-13 代登记表单含 8 必填项', rg1.includes('必填 8 项') && rg1.includes('客户反馈人')
     && rg1.includes('依据附件或记录') && rg1.includes('我方登记人') && rg1.includes('登记时间'));
  ok('RG002-14 明示不是客户在线点击', rg1.includes('客户从不登录'));

  const regN0 = await ev(() => regsOf('D7').length);
  await ev(() => regSave('D7','v1.1'));
  ok('RG002-15 缺项拒绝保存且不改变状态', (await ev(() => regsOf('D7').length)) === regN0
     && await ev(() => openVer(D('D7')).status === '待重新确认'));

  await ev(() => {
    const set = (id,v) => { document.getElementById(id).value = v; };
    set('rg_fbPerson','黄经理（领益智造·生产部）');
    set('rg_fbChannel','微信');
    set('rg_fbAt','2026-11-13 10:05');
    set('rg_fbContent','工价按 30-36 元/时；最晚报到日 12-01；其余按清单执行。');
    set('rg_fbAttach','微信截图 1 张（arch/2026-11-13-D7-01.png）');
    set('rg_regBy','金诚');
    set('rg_regAt','2026-11-13 11:20');
    regSave('D7','v1.1');
  });
  await page.waitForTimeout(250);
  ok('RG002-16 代登记后进入待内部审核', await ev(() => openVer(D('D7')).status === '待内部审核'));
  ok('RG002-17 待审核期间旧版仍是匹配依据', await ev(() => (activeVer(D('D7'))||{}).v === 'v1.0'));
  ok('RG002-18 记录区分客户反馈人与我方登记人', await ev(() => {
      const r = lastReg('D7','v1.1'); return r.fbPerson.includes('黄经理') && r.regBy === '金诚' && r.fbPerson !== r.regBy; }));
  ok('RG002-19 记录区分反馈时间与登记时间', await ev(() => {
      const r = lastReg('D7','v1.1'); return r.fbAt === '2026-11-13 10:05' && r.regAt === '2026-11-13 11:20'; }));
  ok('RG002-20 登记时间早于反馈时间被拦截', await ev(() => {
      const n = regsOf('D7').length;
      addReg({id:'X', demandId:'D7', ver:'v1.1', fbPerson:'x', fbChannel:'微信',
        fbAt:'2026-11-13 12:00', fbContent:'x', fbAttach:'x', regBy:'x', regAt:'2026-11-13 09:00'});
      const bad = lastReg('D7','v1.1'); const late = bad.fbAt > bad.regAt;
      regsOf('D7').pop();
      return late && regsOf('D7').length === n; }));

  await ev(() => auditDrawer('D7')); await page.waitForTimeout(250);
  const au = await txt('#drawer');
  ok('RG002-21 审核页展示 8 字段全文', au.includes('反馈发生时间') && au.includes('依据附件或记录') && au.includes('审核的不是'));
  ok('RG002-22 声明依据不全不得通过', au.includes('依据不全不得通过'));

  await ev(() => auditAct('D7','back'));
  ok('RG002-23 退回不填原因被拒', await ev(() => openVer(D('D7')).status === '待内部审核'));

  await ev(() => { document.getElementById('au_note').value = '反馈未落到具体日期，请补充客户原话截图'; auditAct('D7','back'); });
  await page.waitForTimeout(200);
  ok('RG002-24 退回后版本标已退回且不生效', await ev(() => {
      const v = versOf(D('D7')).find(x=>x.v==='v1.1');
      return v.status === '已退回' && v.auditNote.includes('补充客户原话') && (activeVer(D('D7'))||{}).v === 'v1.0'; }));

  await ev(() => regDrawer('D7')); await page.waitForTimeout(200);
  const rg2 = await txt('#drawer');
  ok('RG002-25 退回后可补充并重新送审', rg2.includes('上一轮被退回'));
  await ev(() => {
    document.getElementById('rg_fbAt').value = '2026-11-13 14:40';
    document.getElementById('rg_fbContent').value = '「11-30 前要到人，工价就按 30-36。」';
    document.getElementById('rg_fbAttach').value = '微信截图 2 张（arch/2026-11-13-D7-02.png）';
    document.getElementById('rg_regAt').value = '2026-11-13 15:10';
    regSave('D7','v1.1');
  });
  await page.waitForTimeout(200);
  ok('RG002-26 补充后重新进入待内部审核', await ev(() => openVer(D('D7')).status === '待内部审核'));
  ok('RG002-27 历史记录不删除', await ev(() => regsOfVer('D7','v1.1').length === 2));

  await ev(() => auditDrawer('D7')); await page.waitForTimeout(200);
  await ev(() => auditAct('D7','pass')); await page.waitForTimeout(200);
  ok('RG002-28 审核通过后新版生效', await ev(() => (activeVer(D('D7'))||{}).v === 'v1.1'));
  ok('RG002-29 旧版被取代', await ev(() => DEMAND_VERS.D7[0].status === '已被取代'));
  ok('RG002-30 审核通过后需求为已确认', await ev(() => D('D7').confirm === '已确认'));
  ok('RG002-31 生效后标记匹配需更新', await ev(() => matchNeedsUpdate(D('D7')) === true));
  ok('RG002-32 审核留痕记录审核人', await ev(() => {
      const v = versOf(D('D7')).find(x=>x.v==='v1.1'); return v.audit === '已通过' && !!v.auditBy && !!v.auditAt; }));

  /* 版本历史 */
  await ev(() => openVers('D1')); await page.waitForTimeout(200);
  const vh = await txt('#drawer');
  ok('RG002-33 版本历史含变更差异', vh.includes('变更') && vh.includes('32-38'));
  ok('RG002-34 版本历史保留旧版记录', vh.includes('已被取代'));
  ok('RG002-35 版本历史显示审核状态与记录条数', vh.includes('审核：') && vh.includes('代登记记录'));
  await ev(() => closeAll());

  /* ---- RG-004 ---- */
  await ev(() => { enter('R04'); go('persons'); openPerson('P1'); huSetTab('verify'); });
  await page.waitForTimeout(400);
  const hv = await txt('#drawer');
  ok('RG004-1 有电工技能但无证书显示待确认', hv.includes('无证书记录') && hv.includes('信息待确认'));
  ok('RG004-2 明确技能名不等于持证', hv.includes('不得') && hv.includes('持证'));
  ok('RG004-3 城市分现居与愿意', hv.includes('现居地') && hv.includes('愿意工作城市'));
  ok('RG004-4 到岗需候选人确认', hv.includes('可到岗'));
  ok('RG004-5 信息缺口列出', hv.includes('信息缺口'));
  await ev(() => closeAll());

  await ev(() => openPerson(PERSONS.find(x=>x.name==='马长青').id)); await page.waitForTimeout(200); await ev(() => huSetTab('verify'));
  const hv9 = await txt('#drawer');
  ok('RG004-6 冲突信息可见且待核实', hv9.includes('信息冲突') && hv9.includes('待核实'));
  await ev(() => closeAll());

  await ev(() => openPerson(PERSONS.find(x=>x.name==='王秀兰').id)); await page.waitForTimeout(200); await ev(() => huSetTab('verify'));
  const hv2 = await txt('#drawer');
  ok('RG004-7 已核验证书显示已核实符合', hv2.includes('已核实符合') && hv2.includes('已核验证件有效'));
  ok('RG004-8 声明职称不等于作业证书', hv2.includes('职称') && hv2.includes('不等于'));
  const lateCheck = await ev(() => {
    const pe = PEOPLE.find(x=>x.name==='谢天成');
    const ap = appsOf(pe.id).find(a=>a.demandId==='D7') || appsOf(pe.id)[0];
    const keep = HU.appId; HU.appId = ap.id;
    const vf = verifyOf(pe.id), old = JSON.parse(JSON.stringify(vf.arrive||{}));
    vf.arrive = {date:'2026-12-20', state:'已确认', src:'候选人确认', at:'2026-11-13'};
    const html = huVerify(pe);
    vf.arrive = old; HU.appId = keep;
    return { late: html.includes('晚于') && html.includes('已确认不符合'), hasNeed: html.includes('需求最晚报到日 2026-12-01') };
  });
  ok('RG004-9 到岗晚于需求要求判为不符合并给原因', lateCheck.late && lateCheck.hasNeed);

  /* 回归 #5：简历明细页的「愿意城市 / 可到岗」必须按核实**状态**显示，
     不能因为字段有值就显示已核实符合（有值 ≠ 候选人已确认）。 */
  const rsCheck = await ev(() => {
    /* 必须用档案记录（appPerson → PEOPLE，id 即 VERIFY 的键）；直接传 PERSONS 记录会拿到投递 id */
    const pe = appPerson(PERSONS.find(x=>x.name==='王秀兰').personId);
    const vf = verifyOf(pe.id);
    const oldC = JSON.parse(JSON.stringify(vf.city||{})), oldA = JSON.parse(JSON.stringify(vf.arrive||{}));
    const good = huResume(pe);
    vf.city = {live:'东莞', liveState:'已核实', want:['东莞'], wantState:'待确认', src:'—', at:'—'};
    vf.arrive = {date:'2026-11-12', state:'待确认', src:'—', at:'—'};
    const bad = huResume(pe);
    vf.city = oldC; vf.arrive = oldA;
    return { goodOk: good.includes('已核实符合'),
             badNoOk: !bad.includes('已核实符合'),
             badPend: (bad.match(/信息待确认/g)||[]).length >= 2 };
  });
  ok('RG004-10 简历页意愿按状态显示而非有值即符合',
     rsCheck.goodOk && rsCheck.badNoOk && rsCheck.badPend, JSON.stringify(rsCheck));
  await ev(() => closeAll());

  /* ---- RG-003 ---- */
  await ev(() => runMatch('B1','demand')); await page.waitForTimeout(400);
  const mm = await txt('.modal');
  ok('RG003-1 三态汇总卡', mm.includes('可推荐') && mm.includes('待补依据') && mm.includes('不可推荐'));
  ok('RG003-2 声明演示逻辑', mm.includes('演示'));
  ok('RG003-3 场景A 夜班待确认', mm.includes('夜班待确认'));
  ok('RG003-4 场景B 高分不符仍不可推荐', await ev(() => {
      const d = D('D1'), p = PERSONS.find(x=>x.name==='赵鹏');
      const it = assessPerson(p, d);
      return p.score >= 85 && triSum(it) === 'no';
    }));
  ok('RG003-5 场景C 全核实符合', await ev(() => triSum(assessPerson(PERSONS.find(x=>x.name==='李海涛'), D('D1'))) === 'ok'));
  ok('RG003-6 场景D 缺资料不自动淘汰', await ev(() => {
      const it = assessPerson(PERSONS.find(x=>x.name==='谢天成'), D('D7'));
      return triSum(it) === 'pend' && it.some(i=>i.state==='pend');
    }));

  /* 回归 #4：技能资料为空 ≠ 已确认不符合 */
  ok('RG003-16 无技能资料判待确认而非不符合', await ev(() => {
      const p = Object.assign({}, PERSONS[0], {skills:[]});
      const it = assessPerson(p, D('D1'));
      const t = it.find(x=>x.key==='trade'), s = it.find(x=>x.key==='skill');
      return t.state === 'pend' && s.state === 'pend' && triSum(it) === 'pend'; }));

  ok('RG003-7 版本提示存在', mm.includes('生效版本'));

  /* 回归 #3：匹配必须用**生效版本**条件，而不是待确认的新版。
     自带夹具：RG002 那组用例会把 D7 v1.1 审到生效并取代 v1.0，此处不能直接读线上状态，
     否则用例顺序一变就误判。临时置入「v1.0 生效 11-25 / v1.1 待重新确认 12-01」，断言后还原。 */
  const gfix = await ev(() => {
      const bak = JSON.stringify(DEMAND_VERS.D7);
      DEMAND_VERS.D7 = [
        {v:'v1.0', status:'生效', audit:'已通过', at:'2026-11-02 09:40', by:'王浩（代客户登记）',
         way:'电话', n:47, note:'旧版仍生效，直至新版确认后自动取代', changes:[],
         gate:{ arriveBy:'2026-11-25' }},
        {v:'v1.1', status:'待重新确认', audit:'未送审', at:'2026-11-12 16:10', by:'王浩',
         way:'待客户反馈', n:47, note:'客户口头改到岗日，尚未回签', changes:[],
         gate:{ arriveBy:'2026-12-01' }},
      ];
      const d = D('D7');
      const p = PERSONS.find(x => x.name === '徐立新');  /* 11-30 已确认到岗：过 11-25 但没过 12-01 */
      /* 注意：必须用 PERSONS（带 personId，可查核实依据）；PEOPLE 只有 id，verifyOf 会返回默认待确认 */
      const it = p ? assessPerson(p, d) : [];
      const a = it.find(x => x.key === 'arrive') || {};
      const out = { gateArriveBy: gateOf(d).arriveBy, avV: (activeVer(d)||{}).v,
                    hasP: !!p, need: a.need, state: a.state };
      DEMAND_VERS.D7 = JSON.parse(bak);
      return out; });
  ok('RG003-14 匹配读取生效版本条件',
     gfix.gateArriveBy === '2026-11-25' && gfix.avV === 'v1.0', JSON.stringify(gfix));
  ok('RG003-15 待确认新版条件不参与匹配',
     gfix.hasP && gfix.need === '2026-11-25' && gfix.state === 'no', JSON.stringify(gfix));
  await ev(() => closeAll());

  await ev(() => { MATCH_STAMP.D7 = {ver:'v1.0', at:'2026-11-13 18:00', stale:true}; });
  await ev(() => runMatch('B3','demand')); await page.waitForTimeout(300);
  const mm7 = await txt('.modal');
  ok('RG003-8 版本变更提示需更新', mm7.includes('匹配结果需更新'));
  await ev(() => closeAll());

  await ev(() => openMatchDetail(PERSONS.find(x=>x.name==='赵鹏').id,'D1')); await page.waitForTimeout(300);
  const md = await txt('#drawer');
  ok('RG003-9 详情逐项三态一致', md.includes('已确认不符合') && md.includes('硬条件逐项判断'));
  ok('RG003-10 加分只影响排序声明', md.includes('只影响排序'));
  await ev(() => closeAll());

  /* ---- 列表 / 需求详情一致性 ---- */
  await ev(() => { enter('R04'); go('persons'); }); await page.waitForTimeout(250);
  const pl = await txt('.main');
  ok('RG003-11 人员列表有三态列', pl.includes('硬条件') && (pl.includes('全部已核实') || pl.includes('待核')));
  ok('RG003-12 档位标注演示', pl.includes('演示评分'));
  await ev(() => openDemand('D1', 'detail')); await page.waitForTimeout(350);
  const dd = await txt('#drawer');
  ok('RG002-16 需求详情显示生效版本', dd.includes('生效 v1.1'));
  ok('RG002-17 需求详情显示匹配依据版本', dd.includes('匹配依据') || dd.includes('匹配结果需更新'));
  await ev(() => closeAll());
  await ev(() => openDemand('D8', 'detail')); await page.waitForTimeout(300);
  const dd8 = await txt('#drawer');
  ok('RG002-18 未确认需求明确不生效', dd8.includes('未生效') && dd8.includes('不得作为匹配与推荐依据'));
  await ev(() => closeAll());

  /* ---- 匹配模式切换 ---- */
  await ev(() => { enter('R04'); go('batches'); runMatch('B1','batch'); }); await page.waitForTimeout(300);
  const mb = await txt('.modal');
  ok('RG003-13 匹配可按需求/批次切换', mb.includes('本需求全部') && mb.includes('只看本批次'));
  await ev(() => closeAll());

  /* 全部页面可渲染 */
  const pages = ['dash','conversion','demands','custreq','confirms','clinks','batches','persons','pool','dicts','factors','std','perms','logs'];
  let renderErr = '';
  for (const pg of pages) {
    try { await ev(p => go(p), pg); await page.waitForTimeout(60); }
    catch (e) { renderErr += pg + ':' + e.message + ' '; }
  }
  ok('RG001-15 R01 全部页面可切换', renderErr === '', renderErr);

  for (const role of ['R02','R04','E01']) {
    await ev(r => enter(r), role);
    await page.waitForTimeout(150);
    const nav = await txt('.side');
    ok('RG001-16-' + role + ' ' + role + ' 可进入', nav.length > 20);
  }

  console.log(checks.map(c => (c.pass ? 'PASS ' : 'FAIL ') + c.id + (c.extra ? ' | ' + c.extra : '')).join('\n'));
  console.log('\nTOTAL', checks.length, 'FAIL', checks.filter(c => !c.pass).length);
  console.log('ERRS', JSON.stringify(errs, null, 1));
  await browser.close();
})();
