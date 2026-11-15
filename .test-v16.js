/* =======================================================================
   .test-v16.js · 候选人基本信息（学历 / 院校 / 专业 / 意向岗位 / 总工作年限 / 微信 / 邮箱）
   -----------------------------------------------------------------------
   跑法：NODE_PATH=<node_modules> node .test-v16.js
         TARGET=http://106.3.136.150:8095/ node .test-v16.js
   口径（用户 2026-11-15）：
     这些是候选人自己的基本信息，简历上怎么写就怎么录；
     不核实、不进硬条件、不产生「符合 / 不符合」；缺项显示「未填」。
   断言只认用户能看见的东西：DOM 文本、表头、下拉选项、行内容。
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

  await page.goto(FILE); await page.waitForTimeout(500);
  await ev(() => { localStorage.clear(); sessionStorage.clear(); enter('R01'); });
  await page.waitForTimeout(200);

  /* 先记住一份参照人：有完整学历的一位、学历未填的一位 */
  const ref = await ev(() => {
    const full = PEOPLE.find(p => p.edu && p.school && p.major && p.years && p.wechat && p.email) || PEOPLE[0] || null;
    const noEdu = PEOPLE.find(p => !p.edu);
    const noWx = PEOPLE.find(p => !p.wechat && p.edu);
    const appOf = pid => PERSONS.find(x => x.personId === pid) || null;
    const b = x => x ? { id: x.id, name: x.name, edu: x.edu, school: x.school, major: x.major,
      wantJob: x.wantJob, years: x.years, phone: x.phone, email: x.email,
      wechat: x.wechat ? x.wechat.id : null, same: x.wechat ? !!x.wechat.same : null,
      appId: (appOf(x.id) || {}).id || null, demandId: (appOf(x.id) || {}).demandId || null } : null;
    return { full: b(full), noEdu: b(noEdu), noWx: b(noWx), n: PEOPLE.length,
      missEdu: PEOPLE.filter(p => !p.edu).length, hasWx: PEOPLE.filter(p => p.wechat).length,
      hasMail: PEOPLE.filter(p => p.email).length };
  });
  ok('RG016-00 演示数据里确实有学历 / 微信 / 邮箱三种状态（有值、缺失）',
     ref.n > 0 && ref.missEdu > 0 && ref.hasWx > 0 && ref.hasMail > 0,
     JSON.stringify({ n: ref.n, missEdu: ref.missEdu, hasWx: ref.hasWx, hasMail: ref.hasMail }));

  /* ===================== 页 1 · 查看简历的基本资料 ===================== */
  const res = await ev(r => {
    openHuman(r.id, 'resume', r.appId, r.demandId);
    const m = document.querySelector('.main');
    const secs = Array.from(m.querySelectorAll('.hu-page .sec'));
    const baseSec = secs[0] || null;
    const wantSec = secs[1] || null;
    const rows = baseSec ? Array.from(baseSec.querySelectorAll('tbody tr')).map(tr => tr.innerText.replace(/\n/g, ' | ')) : [];
    const wantRows = wantSec ? Array.from(wantSec.querySelectorAll('tbody tr')).map(tr => tr.innerText.replace(/\n/g, ' | ')) : [];
    return { hash: location.hash, base: baseSec ? baseSec.innerText : '', rows, wantRows,
      want: wantSec ? wantSec.innerText : '', body: m.innerText,
      copy: Array.from(m.querySelectorAll('.hu-page .link')).filter(x => x.innerText.trim() === '复制').length,
      ths: baseSec ? Array.from(baseSec.querySelectorAll('thead th')).map(x => x.innerText.trim()) : [],
      pageErrs: 0 };
  }, ref.full);

  const has = (t, s) => String(t || '').includes(s);
  ok('RG016-01 基本资料出现「学历 / 毕业院校 / 专业 / 总工作年限」四项',
     has(res.base, '学历') && has(res.base, '毕业院校') && has(res.base, '专业') && has(res.base, '总工作年限'),
     JSON.stringify(res.ths));
  ok('RG016-02 四项值与档案一致（不是写死的示例值）',
     has(res.base, ref.full.edu) && has(res.base, ref.full.school) && has(res.base, ref.full.major)
     && has(res.base, ref.full.years + ' 年'),
     JSON.stringify({ edu: ref.full.edu, school: ref.full.school, major: ref.full.major, years: ref.full.years }));
  ok('RG016-03 联系方式补齐手机号 / 微信 / 邮箱三项',
     has(res.base, '手机号') && has(res.base, '微信') && has(res.base, '邮箱')
     && has(res.base, ref.full.email),
     JSON.stringify({ email: ref.full.email, wechat: ref.full.wechat }));
  ok('RG016-04 微信与手机同号时标明「与手机同号」，不重复编一个号',
     !ref.full.same || has(res.base, '与手机同号'), 'same=' + ref.full.same);
  ok('RG016-05 手机号 / 微信 / 邮箱都有「复制」入口（加微信、发邮件是高频动作）',
     res.copy >= 3, 'copy links=' + res.copy);
  ok('RG016-06 「意向岗位」进了求职意愿，且是第一行',
     A(res.wantRows).length > 0 && has(A(res.wantRows)[0], '意向岗位') && has(A(res.wantRows)[0], ref.full.wantJob),
     JSON.stringify(A(res.wantRows)[0] || ''));
  ok('RG016-07 意向岗位写明「不核实」，不冒充核实项',
     has(A(res.wantRows)[0] || '', '不核实'), JSON.stringify(A(res.wantRows)[0] || ''));
  ok('RG016-08 基本资料不含「符合 / 不符合」判断',
     !has(res.base, '符合'), '');
  ok('RG016-09 简历页写明这些字段不核实、不进硬条件',
     has(res.body, '不核实') && has(res.body, '不进硬条件'), '');
  ok('RG016-10 简历页仍不出现建档人 / 上传履历等记录类文案',
     !has(res.body, '建档人') && !has(res.body, '上传履历'), '');

  /* 缺项：学历没写的档案显示「未填」，不按年龄或岗位倒推 */
  const miss = await ev(r => {
    openHuman(r.id, 'resume', r.appId, r.demandId);
    const secs = Array.from(document.querySelectorAll('.hu-page .sec'));
    const base = secs[0] ? secs[0].innerText : '';
    const rows = secs[0] ? Array.from(secs[0].querySelectorAll('tbody tr')).map(tr => tr.innerText.replace(/\n/g, ' | ')) : [];
    return { base, rows };
  }, ref.noEdu);
  ok('RG016-11 学历缺失时基本资料写「未填」',
     has(miss.base, '未填') && A(miss.rows).some(r => /^学历/.test(r) && has(r, '未填')),
     JSON.stringify(A(miss.rows).filter(r => /^学历|^毕业院校|^专业/.test(r))));

  /* 微信缺失：只写未填，不拿手机号顶替 */
  if (ref.noWx) {
    const nw = await ev(r => {
      openHuman(r.id, 'resume', r.appId, r.demandId);
      const rows = Array.from(document.querySelectorAll('.hu-page .sec tbody tr')).map(tr => tr.innerText.replace(/\n/g, ' | '));
      return { rows };
    }, ref.noWx);
    ok('RG016-12 没有微信时写「未填」，不拿手机号冒充微信',
       A(nw.rows).some(r => /^微信/.test(r) && has(r, '未填')), JSON.stringify(A(nw.rows).filter(r => /^微信/.test(r))));
  } else {
    ok('RG016-12 没有微信时写「未填」，不拿手机号冒充微信', false, '演示数据里找不到无微信样本');
  }

  /* ===================== 资料核实：这些字段不许进来 ===================== */
  const vf = await ev(r => {
    HU.demandId = r.demandId;
    openHuman(r.id, 'verify', r.appId, r.demandId);
    const m = document.querySelector('.main');
    const items = Array.from(m.querySelectorAll('.hu-tbl tbody tr')).map(tr => (tr.querySelector('td') || {}).innerText || '');
    return { hash: location.hash, items, body: m.innerText };
  }, ref.full);
  ok('RG016-13 资料核实页没有「学历 / 院校 / 专业 / 工作年限 / 意向岗位」核实行',
     A(vf.items).length > 0 && !A(vf.items).some(t => /学历|院校|专业|工作年限|意向岗位/.test(t)),
     JSON.stringify(A(vf.items)));
  ok('RG016-14 资料核实仍只判证书 / 城市 / 到岗 / 夜班四类，不因新增字段变宽',
     A(vf.items).every(t => /作业证书|愿意工作城市|可到岗日期|夜班意愿/.test(t)), JSON.stringify(A(vf.items)));

  /* ===================== 招聘人员列表：列 + 筛选 ===================== */
  const list = await ev(() => {
    go('persons');
    const m = document.querySelector('.main');
    const ths = Array.from(m.querySelectorAll('.tbl-wrap thead th')).map(x => x.innerText.trim());
    const rows = Array.from(m.querySelectorAll('.tbl-wrap tbody tr')).filter(t => !t.classList.contains('row-more'));
    const first = rows[0] ? Array.from(rows[0].querySelectorAll('td')).map(td => td.innerText.replace(/\n/g, ' | ')) : [];
    return { ths, first, n: rows.length,
      sels: Array.from(m.querySelectorAll('.toolbar select')).map(s => s.options[0].text) };
  });
  const ci = A(list.ths).findIndex(t => /年限\s*\/\s*学历/.test(t));
  ok('RG016-15 招聘人员列表新增「年限 / 学历」列', ci >= 0, JSON.stringify(list.ths));
  ok('RG016-16 列内容是一行年限 + 学历、一行意向岗位',
     ci >= 0 && /\d+\s*年/.test(A(list.first)[ci] || '') && (A(list.first)[ci] || '').split('|').length >= 2,
     JSON.stringify(A(list.first)[ci] || ''));
  ok('RG016-17 列表筛选新增「学历」「年限」两项',
     A(list.sels).some(t => t.includes('全部学历')) && A(list.sels).some(t => t.includes('全部年限')),
     JSON.stringify(list.sels));

  const byEdu = await ev(() => {
    go('persons');
    const sel = Array.from(document.querySelectorAll('.toolbar select')).find(s => s.options[0].text.includes('全部学历'));
    sel.value = '大专'; sel.dispatchEvent(new Event('change'));
    const rows = Array.from(document.querySelectorAll('.tbl-wrap tbody tr')).filter(t => !t.classList.contains('row-more'));
    const idx = Array.from(document.querySelectorAll('.tbl-wrap thead th')).findIndex(t => t.innerText.includes('年限 / 学历'));
    const cells = rows.map(tr => (tr.querySelectorAll('td')[idx] || {}).innerText || '');
    return { n: rows.length, bad: cells.filter(c => c && !c.includes('大专')).length,
      total: rows.length, cells: cells.slice(0, 3) };
  });
  ok('RG016-18 选「大专」后列表只剩大专（筛选与列同源，不是摆设）',
     byEdu.n > 0 && byEdu.bad === 0, JSON.stringify(byEdu));

  const byYr = await ev(() => {
    go('persons');
    S.f.edu = ''; S.f.yr = '';
    const sel = Array.from(document.querySelectorAll('.toolbar select')).find(s => s.options[0].text.includes('全部年限'));
    sel.value = '5'; sel.dispatchEvent(new Event('change'));
    const rows = Array.from(document.querySelectorAll('.tbl-wrap tbody tr')).filter(t => !t.classList.contains('row-more'));
    const idx = Array.from(document.querySelectorAll('.tbl-wrap thead th')).findIndex(t => t.innerText.includes('年限 / 学历'));
    const cells = rows.map(tr => (tr.querySelectorAll('td')[idx] || {}).innerText || '');
    const nums = cells.map(c => parseInt((c.match(/(\d+)\s*年/) || [])[1] || '0', 10));
    return { n: rows.length, min: Math.min.apply(null, nums), bad: nums.filter(x => x < 5).length };
  });
  ok('RG016-19 选「5 年以上」后没有 5 年以下的人',
     byYr.n > 0 && byYr.bad === 0, JSON.stringify(byYr));

  const search = await ev(() => {
    go('persons');
    S.f.edu = ''; S.f.yr = ''; S.f.q = '电气'; refreshTable();
    const rows = Array.from(document.querySelectorAll('.tbl-wrap tbody tr')).filter(t => !t.classList.contains('row-more'));
    S.f.q = ''; refreshTable();
    return { n: rows.length };
  });
  ok('RG016-20 搜索能按「意向岗位」命中（不只看姓名 / 电话 / 技能）',
     search.n > 0, 'hits=' + search.n);

  /* ===================== 需求简历明细 / 批次人员 / 人才池 ===================== */
  const dm = await ev(() => {
    const d = DEMANDS[0];
    openDemand(d.id, 'resume');
    const m = document.querySelector('.main');
    const ths = Array.from(m.querySelectorAll('.tbl-wrap thead th')).map(x => x.innerText.trim());
    return { hash: location.hash, ths };
  });
  ok('RG016-21 需求「简历明细」同样带年限 / 学历列',
     A(dm.ths).some(t => /年限\s*\/\s*学历/.test(t)), JSON.stringify(dm.ths));

  const pool = await ev(() => {
    go('pool');
    const rows = Array.from(document.querySelectorAll('.tbl-wrap tbody tr'));
    const first = rows[0] ? rows[0].innerText.replace(/\n/g, ' | ') : '';
    return { n: rows.length, first };
  });
  ok('RG016-22 人才池一人一档也标年限 / 学历 / 意向岗位',
     pool.n > 0 && /\d+\s*年/.test(pool.first) && /意向/.test(pool.first), pool.first.slice(0, 160));

  ok('RG016-23 全程无页面报错', errs.length === 0, JSON.stringify(errs));

  /* ===================== 输出 ===================== */
  const fail = checks.filter(c => !c.pass);
  checks.forEach(c => console.log((c.pass ? 'PASS ' : 'FAIL ') + c.id + (c.extra ? '  ' + c.extra : '')));
  console.log('\nTOTAL ' + checks.length + ' FAIL ' + fail.length);
  console.log('ERRS ' + JSON.stringify(errs));
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})();
