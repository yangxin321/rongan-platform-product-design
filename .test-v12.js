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
  await ev(() => openCustLinkDemo('LK-D8-V20')); await page.waitForTimeout(300);
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
      await ev(() => openCustLinkDemo('LK-D8-V20')); await page.waitForTimeout(250);
      const r = await ev(() => {
        const doc = document.querySelector('.cust-doc');
        if(!doc) return {noDoc:true};
        const n = doc.querySelectorAll('input, textarea, select').length;
        const btns = Array.from(doc.querySelectorAll('button'))
          .filter(b => /提交|确认|修改|保存|切换|无误|需要/.test(b.innerText||''));
        return {noDoc:false, n, btns:btns.map(b=>b.innerText.trim()), hasNote: doc.innerText.includes('不提供在线提交')};
      });
      return !r.noDoc && r.n === 0 && r.btns.length === 0 && r.hasNote; })());
  /* 回归第二轮 ③：状态写「有效」但有效期已过，打开必须拒绝（列表与打开同一判断） */
  ok('RG001-17 有效状态但已过有效期仍被拒绝', await (async () => {
      await ev(() => openCustLinkDemo('LK-D8-V10')); await page.waitForTimeout(250);
      const r = await ev(() => {
        const doc = document.querySelector('.cust-doc');
        return {hasDoc: !!doc, t: doc ? doc.innerText : '',
                listSays: linkExpired(linkOf('LK-D8-V10')),
                payload: custLinkPayload('LK-D8-V10')};
      });
      return r.hasDoc && /链接已失效|已过期/.test(r.t) && r.listSays === true
        && r.payload.ok === false && r.payload.code === 'EXPIRED'; })());
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

  /* ---- 第三轮 ⑨：新建需求必须当场生成条件快照 ---- */
  const ndres = await ev(() => {
    enter('R01');
    ndEnter('SJ-DG-D3-L');
    const st = ndState();
    Object.assign(st, {client:'快照测试客户', project:'快照测试项目', people:'4', price:'35 元/时',
      city:'青岛', deadline:'2026-12-20', term:'3 个月'});
    ndPaint();
    st.draft[25] = ['配盘接线','通电测试'];
    st.draft[26] = ['低压电工证'];
    st.draft[19] = '两班倒';
    st.draft[10] = '18-40';
    st.draft[11] = '男女不限';
    ndCreate();
    const d = DEMANDS[0], g = DEMAND_GATE[d.id] || {};
    const v0 = (DEMAND_VERS[d.id]||[])[0] || {};
    const l = CLINKS.find(x=>x.demandId===d.id) || {};
    const pay = custLinkPayload(l.tok);
    window.__NDT__ = {id:d.id, tok:l.tok};
    return {id:d.id, skill:g.skill||[], cert:g.cert||[], night:g.night, age:g.age, arrive:g.arriveBy,
      verSkill:((v0.gate||{}).skill)||[], ok:pay.ok, pgSkill:((pay.gate||{}).skill)||[]};
  });
  ok('RG002-36 新建需求当场生成条件快照', ndres.skill.includes('配盘接线') && ndres.cert.includes('低压电工证')
    && ndres.night === '需要' && ndres.arrive === '2026-12-20' && String(ndres.age) === '18,40',
    JSON.stringify(ndres));
  ok('RG002-37 版本与只读链接读同一份快照', ndres.verSkill.includes('配盘接线') && ndres.ok && ndres.pgSkill.includes('配盘接线'));
  await ev(() => openCustLinkDemo(window.__NDT__.tok)); await page.waitForTimeout(300);
  const ndpg = await txt('.cust-doc');
  ok('RG002-38 新建需求只读页显示实际条件而非无要求',
    ndpg.includes('配盘接线') && ndpg.includes('低压电工证'));
  await ev(() => { const id = window.__NDT__.id;
    const i = DEMANDS.findIndex(x=>x.id===id); if(i>=0) DEMANDS.splice(i,1);
    delete DEMAND_VERS[id]; delete DEMAND_GATE[id]; delete MATCH_STAMP[id];
    for(let k=CLINKS.length-1;k>=0;k--) if(CLINKS[k].demandId===id) CLINKS.splice(k,1);
    exitCustLink(); enter('R01'); });
  await page.waitForTimeout(150);

  /* ---- 第三轮 ⑩：退回意见按轮次保留，不覆盖 ---- */
  const hist = await ev(() => {
    DEMANDS.unshift({id:'DZ', code:'XQ-DZ', client:'测试客户', cs:'测试', ps:'电工', project:'测试项目',
      post:'装配电工 · 组长', head:2, hired:0, price:'35 元/时', city:'青岛', deadline:'2026-12-20',
      valid:'2026-12-20 ~ 待定', confirm:'已确认', alloc:'未分配', status:'招聘中', pinned:false, req:[],
      owner:'李文静', stdId:'SJ-DG-D3-L', stdVer:'v1.0', stdList:'EL-DG-D3', stdOverride:[]});
    DEMAND_VERS.DZ = [{v:'v1.0', status:'生效', audit:'已通过', at:'2026-11-01 09:00', by:'金诚', way:'微信',
      n:47, note:'首版', changes:[], audits:[]}];
    MATCH_STAMP.DZ = {ver:'v1.0', at:'2026-11-01 09:00', stale:false};
    DEMAND_VERS.DZ.push({v:'v1.1', status:'待内部审核', audit:'待审核', at:'2026-11-13 10:30', by:'金诚', way:'微信',
      n:47, note:'客户改到岗日', audits:[], changes:[{f:'最晚报到日', from:'2026-12-20', to:'2026-12-15'}],
      gate:{arriveBy:'2026-12-15'}});
    REGS.DZ = [];
    addReg({id:newRegId(), demandId:'DZ', ver:'v1.1', fbPerson:'张工', fbChannel:'微信', fbAt:'2026-11-13 10:05',
      fbContent:'改到 12-15', fbAttach:'微信截图 1 张', regBy:'金诚', regAt:'2026-11-13 10:30', audit:'待审核'});
    auditDrawer('DZ');
    document.getElementById('au_note').value = '第一轮退回：缺客户原话截图';
    auditAct('DZ','back');
    regDrawer('DZ');
    document.getElementById('rg_fbAt').value = '2026-11-13 15:00';
    document.getElementById('rg_fbAttach').value = '微信截图 2 张（补充原话）';
    document.getElementById('rg_regAt').value = '2026-11-13 15:20';
    regSave('DZ','v1.1');
    auditDrawer('DZ');
    document.getElementById('au_note').value = '第二轮退回：变更值未写死';
    auditAct('DZ','back');
    const v = versOf(D('DZ')).find(x=>x.v==='v1.1');
    const regs = regsOfVer('DZ','v1.1');
    return {n:(v.audits||[]).length, notes:(v.audits||[]).map(a=>a.note).join(' || '),
      regN:regs.length, regAudit:regs.map(r=>r.audit)};
  });
  ok('RG002-39 两轮退回意见都保留', hist.n === 2 && hist.notes.includes('第一轮') && hist.notes.includes('第二轮'),
    JSON.stringify(hist));
  ok('RG002-40 审核结论回写代登记记录', hist.regN === 2 && hist.regAudit.every(a=>a === '已退回'));

  await ev(() => openVers('DZ')); await page.waitForTimeout(250);
  const dzv = await txt('#drawer');
  ok('RG002-41 版本历史逐轮展示审核记录',
    dzv.includes('审核记录') && dzv.includes('第一轮退回') && dzv.includes('第二轮退回'));

  /* ---- 第三轮 ⑪：两个时间按值比，不按字符串比 ---- */
  const ord1 = await ev(() => {
    const n0 = regsOfVer('DZ','v1.1').length;
    regDrawer('DZ');
    document.getElementById('rg_fbAt').value = '2026-11-13 10:05';
    document.getElementById('rg_regAt').value = '2026-11-13 9:00';
    regSave('DZ','v1.1');
    const err = (document.getElementById('rg_err')||{}).innerText || '';
    return {n0, n1:regsOfVer('DZ','v1.1').length, err, strCmp:('2026-11-13 10:05' > '2026-11-13 9:00')};
  });
  ok('RG002-42 登记时间早于反馈按时间值拒绝（字符串比较会放过）',
    ord1.n1 === ord1.n0 && ord1.err.includes('早于') && ord1.strCmp === false, JSON.stringify(ord1));

  const ord2 = await ev(() => {
    const n0 = regsOfVer('DZ','v1.1').length;
    regDrawer('DZ');
    document.getElementById('rg_fbAt').value = '2026/11/13 10:05';
    document.getElementById('rg_regAt').value = '2026-11-13 11:00';
    regSave('DZ','v1.1');
    const err = (document.getElementById('rg_err')||{}).innerText || '';
    return {n0, n1:regsOfVer('DZ','v1.1').length, err};
  });
  ok('RG002-43 时间格式不合法被拒', ord2.n1 === ord2.n0 && ord2.err.includes('格式'), JSON.stringify(ord2));

  await ev(() => { const i = DEMANDS.findIndex(x=>x.id==='DZ'); if(i>=0) DEMANDS.splice(i,1);
    delete DEMAND_VERS.DZ; delete MATCH_STAMP.DZ; delete REGS.DZ; closeAll(); });
  await page.waitForTimeout(150);

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

  /* 回归第二轮 ①：需求没有生效版本时，推荐入口必须被门控（不能又提示禁止、又提示推荐成功） */
  const recGate = await ev(() => {
    const d = D('D8');                       /* D8 = 待客户确认，无生效版本 */
    const before = !!activeVer(d);
    runMatch('B9','demand');
    const m = document.querySelector('.modal');
    const t = m ? m.innerText : '';
    const btns = Array.from((m||document).querySelectorAll('button')).map(b=>b.innerText.trim());
    const canClickRec = btns.some(b=>/加入优先跟进/.test(b));
    const cardOk = (t.match(/可推荐\s*\n?\s*(\d+)/)||[])[1];
    closeAll();
    return {before, hasBlockBtn: btns.some(b=>/不可推荐（需求未生效）/.test(b)),
            canClickRec, cardOk, t};
  });
  ok('RG003-17 无生效版本时推荐入口被门控',
     recGate.before === false && recGate.hasBlockBtn && !recGate.canClickRec && recGate.cardOk === '0',
     JSON.stringify({before:recGate.before, block:recGate.hasBlockBtn, clickable:recGate.canClickRec, card:recGate.cardOk}));

  /* 回归第二轮 ②：版本自带条件快照，审核通过后匹配必须按新版条件（D3 11-30 → 11-28） */
  const d3gate = await ev(() => {
    const d = D('D3');
    /* 审核会改 DEMAND_VERS / d.confirm / MATCH_STAMP 三处，全部备份还原，避免污染后续断言 */
    const bak = JSON.stringify(DEMAND_VERS.D3), bakConfirm = d.confirm,
          bakStamp = JSON.stringify(MATCH_STAMP.D3 || null);
    const arrBefore = gateOf(d).arriveBy;
    auditDrawer('D3'); auditAct('D3','pass');
    const avV = (activeVer(d)||{}).v;
    const arrAfter = gateOf(d).arriveBy;
    const ver = versOf(d).find(v=>v.v==='v1.1') || {};
    DEMAND_VERS.D3 = JSON.parse(bak); d.confirm = bakConfirm;
    if(bakStamp) MATCH_STAMP.D3 = JSON.parse(bakStamp); else delete MATCH_STAMP.D3;
    closeAll();
    return {arrBefore, avV, arrAfter, hasGate: !!ver.gate, confirmRestored: d.confirm === bakConfirm};
  });
  ok('RG003-18 审核通过后匹配改用新版条件',
     d3gate.arrBefore === '2026-11-30' && d3gate.avV === 'v1.1' && d3gate.arrAfter === '2026-11-28'
     && d3gate.hasGate && d3gate.confirmRestored,
     JSON.stringify(d3gate));

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
  ok('RG002-49 需求详情显示生效版本', dd.includes('生效 v1.1'));
  ok('RG002-50 需求详情显示匹配依据版本', dd.includes('匹配依据') || dd.includes('匹配结果需更新'));
  await ev(() => closeAll());
  await ev(() => openDemand('D8', 'detail')); await page.waitForTimeout(300);
  const dd8 = await txt('#drawer');
  ok('RG002-51 未确认需求明确不生效', dd8.includes('未生效') && dd8.includes('不得作为匹配与推荐依据'));
  await ev(() => closeAll());

  /* ---- 回归 #5：标准值里的否定表达与连接号不能把条件吃掉 ----
     SJ-IQC-S2 真实保存 10:'18–45'（en dash）、26:['无强制证']。
     只认 ASCII '-' 会把客户明示上限当成无限制；'无强制证' 会被造出一个同名必备证书。 */
  const iqcGate = await ev(() => {
    const s = STD_JOBS.find(x => x.id === 'SJ-IQC-S2');
    const st = { sid:'SJ-IQC-S2', draft:{}, dirty:{}, city:'中山', deadline:'2026-12-20', people:'2' };
    const g = ndGate(st, s);
    return { age:g.age, ageRaw:g.ageRaw, cert:g.cert, certMust:g.certMust, trade:g.trade };
  });
  ok('RG002-44 标准年龄区间的连接号可解析',
     Array.isArray(iqcGate.age) && iqcGate.age[0] === 18 && iqcGate.age[1] === 45,
     JSON.stringify(iqcGate));
  ok('RG002-45 无强制证归一为空证书要求',
     Array.isArray(iqcGate.cert) && iqcGate.cert.length === 0 && iqcGate.certMust === false,
     JSON.stringify(iqcGate));
  /* 客户明示上限必须真的拦住人：46 岁在「18–45」这一单的年龄项不能判符合 */
  ok('RG002-46 超出客户明示年龄上限判不符合', await ev(() => {
      const bak = DEMAND_GATE.DT9;
      DEMANDS.unshift({ id:'DT9', code:'XQ-TEST-09', client:'测试客户', cs:'测试', ps:'品质',
        project:'年龄校验', post:'IQC · 熟手', head:1, hired:0, price:'35 元/时', city:'中山',
        deadline:'2026-12-20', valid:'2026-12-20 ~ 待定', confirm:'已确认', alloc:'未分配',
        status:'已确认', req:[], owner:'李文静', stdId:'SJ-IQC-S2', stdVer:'v1.0',
        stdList:'EL-IQC-S2', stdOverride:[] });
      DEMAND_GATE.DT9 = { city:'中山', age:[18,45], gender:'不限', night:'不需要', trade:'品质',
        skill:[], cert:[], certMust:false, arriveBy:'2026-12-20' };
      DEMAND_VERS.DT9 = [{ v:'v1.0', status:'生效', audit:'已通过', at:'2026-11-10 09:00',
        by:'金诚（代客户登记）', way:'微信', n:47, note:'', changes:[], gate:DEMAND_GATE.DT9 }];
      const p = PERSONS.find(x => x.age > 45);
      const it = p ? assessPerson(p, D('DT9')) : [];
      const a = it.find(x => x.key === 'age') || {};
      const out = { hasP:!!p, age:p && p.age, state:a.state };
      DEMANDS.shift(); delete DEMAND_GATE.DT9; delete DEMAND_VERS.DT9;
      return out;
    }), '');

  /* 只读确认单：第一节与第二节必须同一版来源（同一个截止日期，不能出现两个） */
  const sameSrc = await ev(() => {
    DEMANDS.unshift({ id:'DT7', code:'XQ-TEST-07', client:'测试客户', cs:'测试', ps:'电工',
      project:'只读页同源', post:'装配电工 · 大工', head:2, hired:0, price:'30 元/时', city:'东莞',
      deadline:'2026-11-30', valid:'2026-11-30 ~ 待定', confirm:'已确认', alloc:'未分配',
      status:'已确认', req:[], owner:'李文静', stdId:'SJ-DG-D3', stdVer:'v1.1',
      stdList:'EL-DG-D3', stdOverride:[] });
    DEMAND_GATE.DT7 = { city:'东莞', age:[18,45], gender:'不限', night:'不需要', trade:'电工',
      skill:[], cert:[], certMust:false, arriveBy:'2026-11-30' };
    DEMAND_VERS.DT7 = [
      { v:'v1.0', status:'已被取代', at:'2026-11-01 09:00', by:'金诚', way:'微信', n:47, note:'',
        changes:[], gate:{ arriveBy:'2026-11-30' } },
      { v:'v1.1', status:'生效', audit:'已通过', at:'2026-11-12 17:20', by:'金诚（代客户登记）',
        way:'电话', n:47, note:'', changes:[], gate:{ arriveBy:'2026-11-28' } },
    ];
    const tok = genLink('DT7', 'v1.1', '金诚');
    openCustLinkDemo(tok);
    const doc = document.querySelector('.cust-doc');
    const sec1 = doc ? (doc.querySelectorAll('.sec')[0] || {}).innerText || '' : '';
    const sec2 = doc ? (doc.querySelectorAll('.sec')[1] || {}).innerText || '' : '';
    const out = { hasDoc:!!doc, sec1, sec2 };
    exitCustLink();
    DEMANDS.shift(); delete DEMAND_GATE.DT7; delete DEMAND_VERS.DT7;
    CLINKS.splice(CLINKS.findIndex(l => l.tok === tok), 1);
    return out;
  });
  ok('RG002-47 只读页第一节与第二节同源',
     sameSrc.hasDoc && sameSrc.sec1.includes('2026-11-28') && !sameSrc.sec1.includes('2026-11-30')
     && sameSrc.sec2.includes('2026-11-28'), JSON.stringify(sameSrc));

  /* 已有未结版本时不得再生成同名新版本（否则送审与审核不是同一个对象） */
  const dupVer = await ev(() => {
    enter('R01'); go('confirms');   /* 弹窗 / 抽屉容器只在角色外壳里存在 */
    DEMANDS.unshift({ id:'DT6', code:'XQ-TEST-06', client:'测试客户', cs:'测试', ps:'电工',
      project:'版本唯一', post:'装配电工 · 大工', head:2, hired:0, price:'30 元/时', city:'东莞',
      deadline:'2026-11-30', valid:'2026-11-30 ~ 待定', confirm:'已确认', alloc:'未分配',
      status:'已确认', req:[], owner:'李文静', stdId:'SJ-DG-D3', stdVer:'v1.1',
      stdList:'EL-DG-D3', stdOverride:[] });
    DEMAND_GATE.DT6 = { city:'东莞', age:[18,45], gender:'不限', night:'不需要', trade:'电工',
      skill:[], cert:[], certMust:false, arriveBy:'2026-11-30' };
    DEMAND_VERS.DT6 = [{ v:'v1.0', status:'生效', audit:'已通过', at:'2026-11-10 09:00',
      by:'金诚（代客户登记）', way:'微信', n:47, note:'', changes:[], gate:DEMAND_GATE.DT6 }];
    const d = D('DT6'), n0 = versOf(d).length;
    confirmReg('DT6', 'change');                       /* 第一次：弹确认框 */
    const btn = document.getElementById('askOk');
    if(btn) btn.click();                               /* 落笔生成 v2.0 */
    const n1 = versOf(d).length, vNew = versOf(d).slice(-1)[0].v;
    confirmReg('DT6', 'change');                       /* 第二次：应被拦住 */
    const n2 = versOf(d).length;
    const sameName = versOf(d).filter(v => v.v === vNew).length;
    closeAll();
    DEMANDS.shift(); delete DEMAND_GATE.DT6; delete DEMAND_VERS.DT6;
    return { n0, n1, n2, vNew, sameName };
  });
  ok('RG002-48 已有未结版本不重复生成版本号',
     dupVer.n1 === dupVer.n0 + 1 && dupVer.n2 === dupVer.n1 && dupVer.sameName === 1,
     JSON.stringify(dupVer));

  /* 第五轮回归：缺资料≠不符合（R5 不得自动淘汰），优先证≠硬条件 */
  const ageMiss = await ev(() => {
    DEMANDS.unshift({ id:'DT10', code:'XQ-TEST-10', client:'测试客户', cs:'测试', ps:'电工',
      project:'年龄缺失', post:'电工 · 熟手', head:1, hired:0, price:'30 元/时', city:'东莞',
      deadline:'2026-12-20', valid:'2026-12-20 ~ 待定', confirm:'已确认', alloc:'未分配',
      status:'已确认', req:[], owner:'李文静', stdId:'SJ-DG-D3', stdVer:'v1.1',
      stdList:'EL-DG-D3', stdOverride:[] });
    DEMAND_GATE.DT10 = { city:'东莞', age:[18,45], gender:'不限', night:'不需要', trade:'电工',
      skill:[], cert:[], certMust:false, arriveBy:'2026-12-20' };
    /* 年龄与性别都留空：空串会被数值比较当成 0 岁，历史实现会直接判「不符合」。
       其余条件临时置为已核实，让汇总值只受年龄影响，否则城市/夜班会把结论带偏。 */
    const pid = PERSONS[0].personId, keep = VERIFY[pid];
    VERIFY[pid] = { certs:[],
      city:{ live:'东莞', liveState:'已核实', want:['东莞'], wantState:'已确认', src:'测试', at:'2026-11-14 09:00' },
      arrive:{ date:'2026-11-20', state:'已确认', src:'测试', at:'2026-11-14 09:00' },
      night:{ state:'已确认愿意', src:'测试', at:'2026-11-14 09:00' } };
    const fake = Object.assign({}, PERSONS[0], { age:'', gender:'', skills:[] });
    const it = assessPerson(fake, D('DT10'));
    const a = it.find(x=>x.key==='age') || {}, g2 = it.find(x=>x.key==='gender') || {};
    const out = { ageState:a.state, genderState:g2.state, ageNeed:a.need, sum:triSum(it), note:a.note||'' };
    VERIFY[pid] = keep;
    const i = DEMANDS.findIndex(x=>x.id==='DT10'); if(i>=0) DEMANDS.splice(i,1); delete DEMAND_GATE.DT10;
    return out;
  });
  ok('RG002-52 年龄性别缺资料判待确认而非不符合',
     ageMiss.ageState === 'pend' && ageMiss.genderState === 'ok' && ageMiss.sum === 'pend'
     && ageMiss.note.includes('不得'), JSON.stringify(ageMiss));

  const certKind = await ev(() => {
    const pick = (name, did) => {
      const p = PERSONS.find(x=>x.name===name) || PERSONS[0];
      const it = assessPerson(p, D(did));
      const c = it.find(x=>x.key==='cert') || {};
      return { state:c.state, need:c.need||'', soft:!!c.soft, hardKeys:it.filter(x=>!x.soft).map(x=>x.key) };
    };
    return { d1:pick('张建国','D1'), d4:pick('郑海峰','D4') };   /* D1 优先 / D4 必备 */
  });
  ok('RG002-53 优先证书标注且不参与硬条件判定',
     certKind.d1.soft === true && certKind.d1.need.includes('优先')
     && certKind.d4.soft === false && certKind.d4.need.includes('必备'),
     JSON.stringify(certKind));

  const triFilter = await ev(() => {
    enter('R04'); go('persons');
    const n = () => document.querySelectorAll('.tbl-wrap tbody tr').length;
    const nAll = n();
    statFilter('tri','no');
    const nNo = n();
    const rowsAllNo = Array.from(document.querySelectorAll('.tbl-wrap tbody tr'))
      .every(tr => !!tr.querySelector('.b.r'));
    statFilter('tri','');
    const nBack = n();
    return { nAll, nNo, nBack, rowsAllNo };
  });
  ok('RG002-54 人员列表硬条件筛选真实过滤',
     triFilter.nNo > 0 && triFilter.nNo < triFilter.nAll && triFilter.rowsAllNo
     && triFilter.nBack === triFilter.nAll, JSON.stringify(triFilter));

  /* 多选必备证书必须逐项核验：只核验到一张不得判 ok（原 find+some 会漏掉其余证） */
  const multiCert = await ev(() => {
    DEMANDS.unshift({ id:'DT11', code:'XQ-TEST-11', client:'测试客户', cs:'测试', ps:'电工',
      project:'双证', post:'电工 · 双证', head:1, hired:0, price:'35 元/时', city:'上海',
      deadline:'2026-12-20', valid:'2026-12-20 ~ 待定', confirm:'已确认', alloc:'未分配',
      status:'已确认', req:[], owner:'李文静', stdId:'SJ-DG-D3', stdVer:'v1.1',
      stdList:'EL-DG-D3', stdOverride:[] });
    const base = { city:'上海', age:[18,45], gender:'不限', night:'不需要', trade:'船舶电工',
      skill:[], arriveBy:'2026-12-30' };
    /* 只持一张证 / 两张都持 / 第二张明确不满足，三种情形都要正确 */
    const p = PERSONS.find(x=>x.name==='郑海峰');
    const keep = VERIFY[p.personId];
    const run = certs => {
      DEMAND_GATE.DT11 = Object.assign({}, base, { cert:['电工特种作业操作证','登高作业证'], certMust:true });
      VERIFY[p.personId] = Object.assign({}, keep, { certs });
      const c = assessPerson(p, D('DT11')).find(x=>x.key==='cert') || {};
      return { state:c.state, note:c.note||'' };
    };
    const one = run([{ name:'电工特种作业操作证', state:'ok', src:'原件核验', ev:'x', at:'2026-11-14 10:00' }]);
    const both = run([
      { name:'电工特种作业操作证', state:'ok', src:'原件核验', ev:'x', at:'2026-11-14 10:00' },
      { name:'登高作业证', state:'ok', src:'原件核验', ev:'y', at:'2026-11-14 10:00' }]);
    const oneNo = run([
      { name:'电工特种作业操作证', state:'ok', src:'原件核验', ev:'x', at:'2026-11-14 10:00' },
      { name:'登高作业证', state:'no', src:'候选人确认', ev:'「没考」', at:'2026-11-14 10:00' }]);
    VERIFY[p.personId] = keep;
    const i = DEMANDS.findIndex(x=>x.id==='DT11'); if(i>=0) DEMANDS.splice(i,1); delete DEMAND_GATE.DT11;
    return { one, both, oneNo };
  });
  ok('RG002-55 必备证书逐项核验，缺一张不判符合',
     multiCert.one.state === 'pend' && multiCert.one.note.includes('登高作业证')
     && multiCert.both.state === 'ok'
     && multiCert.oneNo.state === 'no', JSON.stringify(multiCert));

  /* 核实依据页必须读**生效版本**的到岗日：自建「生效 v1.0 = 11-25 / 待审 v1.1 = 12-01」夹具，
     候选人 11-26 已确认 → 两页都必须判「已确认不符合」，页面不许出现待审版的 12-01。 */
  const arriveSame = await ev(() => {
    const pe = PEOPLE.find(x=>x.name==='曹敏') || PEOPLE[0];
    const ap = appsOf(pe.id)[0];
    if(!ap) return { noApp:true };
    const keepDemand = ap.demandId;
    const person = PERSONS.find(x=>x.personId===pe.id) || {};
    const keepVerify = VERIFY[pe.id];
    DEMANDS.unshift({ id:'DT12', code:'XQ-TEST-12', client:'测试客户', cs:'测试', ps:'电工',
      project:'生效版到岗日', post:'CNC · 生效版', head:1, hired:0, price:'36 元/时', city:'东莞',
      deadline:'2026-11-25', valid:'2026-11-25 ~ 待定', confirm:'已确认', alloc:'未分配',
      status:'已确认', req:[], owner:'李文静', stdId:'SJ-DG-D3', stdVer:'v1.1',
      stdList:'EL-DG-D3',
      /* 关键：本单调整里挂着待确认的新日期 12-01。老实现读 effVal 就会取这个值而放行，
         新实现必须只认生效版本 gate 的 11-25，这条断言才有区分力。 */
      stdOverride:[{ no:7, from:'2026-11-25', to:'2026-12-01', why:'客户放宽到岗时间', at:'2026-11-12' }] });
    DEMAND_GATE.DT12 = { city:'东莞', age:[18,50], gender:'不限', night:'不需要', trade:'CNC 操作',
      skill:[], cert:[], certMust:false, arriveBy:'2026-11-25' };
    DEMAND_VERS.DT12 = [
      { v:'v1.0', status:'生效', audit:'已通过', at:'2026-11-10 09:00', by:'金诚（代客户登记）',
        way:'微信', n:47, note:'', changes:[], gate:{ city:'东莞', age:[18,50], gender:'不限',
        night:'不需要', trade:'CNC 操作', skill:[], cert:[], certMust:false, arriveBy:'2026-11-25' } },
      { v:'v1.1', status:'待内部审核', audit:'待审核', at:'2026-11-13 10:00', by:'金诚（代客户登记）',
        way:'微信', n:47, note:'客户放宽到岗', changes:[], gate:{ city:'东莞', age:[18,50],
        gender:'不限', night:'不需要', trade:'CNC 操作', skill:[], cert:[], certMust:false,
        arriveBy:'2026-12-01' } },
    ];
    VERIFY[pe.id] = Object.assign({}, keepVerify, {
      arrive:{ date:'2026-11-26', state:'已确认', src:'电话确认', at:'2026-11-13 09:30' },
      night:{ state:'已确认愿意', src:'电话确认', at:'2026-11-13 09:30' },
    });
    ap.demandId = 'DT12';
    enter('R04'); openHuman(pe.id, 'verify', ap.id);
    const drawer = document.querySelector('#drawer');
    const txt = drawer ? drawer.innerText : '';
    const g = gateOf(D('DT12'));
    const byAssess = (assessPerson(person, D('DT12')).find(x=>x.key==='arrive') || {}).state;
    const out = {
      active: g.arriveBy, byAssess,
      showsActive: txt.includes(String(g.arriveBy)),
      leaksPending: txt.includes('2026-12-01'),
      pageNo: /已确认不符合/.test(txt),
    };
    closeAll();
    ap.demandId = keepDemand; VERIFY[pe.id] = keepVerify;
    const i = DEMANDS.findIndex(x=>x.id==='DT12'); if(i>=0) DEMANDS.splice(i,1);
    delete DEMAND_GATE.DT12; delete DEMAND_VERS.DT12;
    return out;
  });
  ok('RG002-56 核实依据页与匹配判定同读生效版本到岗日',
     !arriveSame.noApp && arriveSame.active === '2026-11-25' && arriveSame.byAssess === 'no'
     && arriveSame.showsActive && !arriveSame.leaksPending && arriveSame.pageNo,
     JSON.stringify(arriveSame));

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
