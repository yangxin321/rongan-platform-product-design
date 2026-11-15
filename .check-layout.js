/* 字号放大后的布局体检：不看截图，直接量。
   检查项：① 内容区横向溢出 ② 侧栏菜单文字被截 ③ 表格单元格文字溢出/换行过多
           ④ 按钮/徽标被压扁 ⑤ 工具栏换行 ⑥ 标题与正文实际渲染字号
   NODE_PATH=<node_modules> node .check-layout.js */
const { chromium } = require('playwright-core');
const FILE = process.env.TARGET || ('file://' + encodeURI('/Users/yangxin/WorkBuddy/2026-11-10-18-54-53/月贝招聘平台-需求梳理/融敢平台-角色版-v1.2.html'));

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1560, height: 1020 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await page.goto(FILE); await page.waitForTimeout(500);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); enter('R01'); });

  const pages = ['demands','batches','persons','pool','logs','custreq','confirms','clinks','dicts','factors','std','dash','conversion','perms','home'];
  const report = { overX: [], navClip: [], cellOver: [], btnSquash: [], fs: {}, rows: [] };

  for (const role of ['R01','R04','R02']) {
    await page.evaluate(r => enter(r), role);
    for (const pg of pages) {
      const r = await page.evaluate(p => {
        try { go(p); } catch(e) { return { p, err: String(e.message||e) }; }
        const main = document.getElementById('main');
        const out = { p, page: S.page, overX: 0, navClip: [], cellOver: [], btnSquash: [] };
        if (main) {
          /* 内容区不能横向滚（表格自带 .tbl-wrap 横向滚动，不算） */
          const wrapOver = main.scrollWidth - main.clientWidth;
          out.overX = wrapOver;
        }
        document.querySelectorAll('.nav-item').forEach(el => {
          if (el.scrollWidth - el.clientWidth > 1) out.navClip.push(el.innerText.trim());
        });
        document.querySelectorAll('.main tbody td, .main .card-b, .main .kv dd').forEach(el => {
          if (el.scrollWidth - el.clientWidth > 2 && getComputedStyle(el).overflow !== 'auto') {
            out.cellOver.push(el.innerText.trim().slice(0, 24));
          }
        });
        document.querySelectorAll('.main .btn, .main .chip, .main .b').forEach(el => {
          if (el.scrollHeight - el.clientHeight > 3) out.btnSquash.push(el.innerText.trim().slice(0, 18));
        });
        return out;
      }, pg);
      if (r.err) { report.err = (report.err||[]).concat(role + '/' + pg + ': ' + r.err); continue; }
      if (r.overX > 1) report.overX.push(role + '/' + r.p + ' x=' + r.overX);
      if (r.navClip.length) report.navClip.push(role + ':' + r.navClip.join('|'));
      if (r.cellOver.length) report.cellOver.push(role + '/' + r.p + ':' + r.cellOver.slice(0, 3).join('|'));
      if (r.btnSquash.length) report.btnSquash.push(role + '/' + r.p + ':' + r.btnSquash.slice(0, 3).join('|'));
    }
  }

  /* 实际渲染字号抽查 */
  await page.evaluate(() => { enter('R01'); go('demands'); });
  await page.waitForTimeout(200);
  report.fs = await page.evaluate(() => {
    const g = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontSize : '-'; };
    return { body: g('body'), h2: g('.page-head h2'), th: g('thead th'), td: g('tbody td'),
      tsub: g('.t-sub'), link: g('.main .link'), nav: g('.nav-item'), badge: g('.b'), btn: g('.btn') };
  });
  report.rows = await page.evaluate(() => {
    const tr = document.querySelector('.main tbody tr');
    return tr ? { h: Math.round(tr.getBoundingClientRect().height) } : null;
  });

  console.log(JSON.stringify(report, null, 1));
  console.log('ERRS', JSON.stringify(errs));
  await browser.close();
})();
