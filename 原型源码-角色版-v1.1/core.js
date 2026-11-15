/* ===== 核心：角色、路由、通用组件 ===== */
const S = { role:null, page:null, f:{}, drawer:null, modal:null };

const ROLES = {
  R01:{ code:'R01', who:'金诚', post:'总经理', title:'管理员', tone:'accent',
    desc:'维护 AI 与人才画像因子，拥有上帝视角：全部需求、全部人员、合同价与利润可见。',
    meta:'5 个分组 · 13 个页面', note:'金总同时是客户负责人',
    groups:[
      {g:'业务监控', items:[['dash','业务看板'],['conversion','转化监控']]},
      {g:'需求管理', items:[['demands','需求列表'],['custreq','客户需求确认'],['confirms','客户确认']]},
      {g:'招聘执行', items:[['batches','批次列表'],['persons','人员列表'],['pool','人才池列表']]},
      {g:'数据字典维护', items:[['dicts','数据字典'],['factors','人才画像因子库'],['std','标准岗位标准']]},
      {g:'系统日常管理', items:[['perms','账号与权限'],['logs','系统操作记录']]},
    ]},
  R02:{ code:'R02', who:'金诚', post:'客户负责人', title:'客户负责人', tone:'info',
    desc:'代表客户看需求与面试：确认需求、确认面试结果，不参与日常招人动作。',
    meta:'5 个页面', note:'金总同时是管理员',
    groups:[
      {g:'我的客户', items:[['custreq','客户需求确认'],['confirms','客户确认'],['demands','需求列表']]},
      {g:'结果确认', items:[['interviews','面试管理'],['conversion','转化监控']]},
    ]},
  R04:{ code:'R04', who:'李文静', post:'招聘专员', title:'招聘专员', tone:'good',
    desc:'每天建批次、下简历、打电话：只看自己负责的需求与自己名下的人。',
    meta:'6 个页面', note:'看不到合同价 / 提成 / 利润',
    groups:[
      {g:'工作', items:[['demands','需求列表'],['batches','批次列表']]},
      {g:'招人', items:[['persons','人员列表'],['pool','人才池列表']]},
      {g:'其他', items:[['logs','系统操作记录'],['home','我的首页']]},
    ]},
  E01:{ code:'E01', who:'张建国', post:'求职者', title:'工人端', tone:'warn',
    desc:'小程序端：找工作、看进度、收待办、管资料。不看分数，只看结果与下一步。',
    meta:'4 个 tab', note:'手机演示',
    groups:[
      {g:'小程序', items:[['jobs','找工作'],['progress','我的进度'],['todos','待办'],['mine','我的']]},
    ]},
};

const DEFAULT_PAGE = {R01:'dash', R02:'custreq', R04:'demands', E01:'jobs'};

/* ---------- 工具 ---------- */
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pct = (a,b) => b? Math.min(100,Math.round(a/b*100)) : 0;
const money = v => '¥'+v;

const NODE_TONE = {'新入库':'n','已匹配':'i','触达中':'i','补全中':'w','待面试':'w','面试通过':'g','待入职':'g','已入职':'g','已淘汰':'r'};
const nodeB = n => `<span class="b ${NODE_TONE[n]||'n'}">${esc(n)}</span>`;
const tierChip = t => t? `<span class="tier ${t}">${t}</span>` : '<span class="mut">—</span>';
const statB = s => s==='已入职'? '<span class="b g">已入职</span>' : s==='无意向'? '<span class="b r">无意向</span>' : '<span class="b i">跟进中</span>';
const demandB = s => ({'招聘中':'<span class="b i">招聘中</span>','已完成':'<span class="b g">已完成</span>','待分配':'<span class="b w">待分配</span>','已关闭':'<span class="b n">已关闭</span>'}[s]||`<span class="b n">${esc(s)}</span>`);
const confirmB = s => ({'已确认':'<span class="b g">已确认</span>','待客户确认':'<span class="b w">待客户确认</span>','变更待重确认':'<span class="b r">变更待重确认</span>'}[s]||`<span class="b n">${esc(s)}</span>`);

function mainSel(){ return S.role==='R01'?'全部':S.who; }

/* ---------- 渲染入口 ---------- */
function boot(){
  const el = document.getElementById('root');
  const keep = localStorage.getItem('rg-role');
  if(keep && ROLES[keep]) { enter(keep, true); } else { S.role=null; el.innerHTML = viewLanding(); }
}
function viewLanding(){
  const cards = ['R01','R02','R04','E01'].map(k=>{
    const r = ROLES[k];
    const merged = (k==='R01'||k==='R02');
    return `<button class="role ${merged?'merged':''}" onclick="enter('${k}')">
      <span class="tag">${r.code}${merged?' · 角色重合':''}</span>
      <div class="rname">${r.title}</div>
      <div class="rdesc">${esc(r.desc)}</div>
      <div class="rmeta"><span>${esc(r.who)} · ${esc(r.post)}</span><span>${esc(r.meta)} <span class="arrow">→</span></span></div>
    </button>`;
  }).join('');
  return `<div class="landing">
    <div class="landing-brand"><div class="logo">融</div><h1>融敢平台</h1></div>
    <div class="sub">B2B 招聘协作平台 · 从需求到入职</div>
    <div class="hint">选择你的角色进入</div>
    <div class="roles">${cards}</div>
    <div class="land-bar">
      <span><b>8</b> 个在招需求</span><span><b>40</b> 位候选人</span><span><b>3</b> 位招聘专员</span><span><b>11</b> 个每日批次</span>
    </div>
    <div class="landing-foot">演示环境 · 数据为虚构样例 · 每个角色进入后只看自己的页面与数据</div>
  </div>`;
}

function enter(role, silent){
  S.role = role; S.page = DEFAULT_PAGE[role]; S.f={}; S.who = ROLES[role].who;
  localStorage.setItem('rg-role', role);
  render();
}
function exitRole(){ localStorage.removeItem('rg-role'); S.role=null; document.getElementById('root').innerHTML = viewLanding(); }
function go(page){ S.page = page; S.f={}; closeAll(); render(); }

function render(){
  const r = ROLES[S.role];
  document.getElementById('root').innerHTML = `<div class="shell">
    <aside class="side">
      <div class="side-top">
        <div class="side-brand"><div class="logo">融</div><b>融敢平台</b></div>
        <div class="side-role">
          <div class="who">${esc(r.who)}<small>${esc(r.title)} · ${esc(r.post)}</small></div>
          <button onclick="exitRole()">切换</button>
        </div>
      </div>
      <nav class="nav">
        ${r.groups.map(gr=>`<div class="nav-group">
          ${S.role==='R01'?`<div class="nav-gt">${esc(gr.g)}</div>`:''}
          ${gr.items.map(([k,label])=>{
            const badge = badgeFor(k);
            return `<div class="nav-item ${S.page===k?'on':''}" onclick="go('${k}')">
              <span class="ni">${iconOf(k)}</span><span>${label}</span>${badge?`<span class="nav-badge">${badge}</span>`:''}
            </div>`;
          }).join('')}
        </div>`).join('')}
      </nav>
      <div class="side-foot"><span>v1.1 · 角色版</span><span>2026-11-13</span></div>
    </aside>
    <main class="main" id="main">${renderPage()}</main>
  </div>
  <div class="mask" id="mask" onclick="closeAll()"></div>
  <div class="drawer" id="drawer"></div>
  <div class="modal" id="modal"></div>`;
}

function badgeFor(k){
  if(k==='persons'&&S.role==='R04') return String(PERSONS.filter(p=>p.owner==='李文静'&&p.status==='跟进中').length);
  if(k==='home') return String(FOCUS.filter(f=>f.staff==='李文静').length);
  if(k==='confirms'&&S.role==='R02') return String(DEMANDS.filter(d=>d.confirm!=='已确认').length);
  return '';
}
function iconOf(k){
  return {home:'◉',dash:'◉',demands:'▤',batches:'▥',persons:'◍',pool:'◌',logs:'≡',confirms:'✓',conversion:'◔',
    custreq:'✎',interviews:'◇',factors:'⌗',elements:'⊞',std:'▣',portraits:'◈',dicts:'⌸',perms:'⚿',jobs:'▤',progress:'◍',todos:'✓',mine:'◉'}[k]||'·';
}
function renderPage(){
  const fn = (PAGES[S.page]||{})[S.role] || PAGES[S.page] && PAGES[S.page].any;
  if(!fn) return `<div class="page"><div class="empty">该页面暂未开放</div></div>`;
  return fn();
}

/* ---------- 通用片段 ---------- */
function head(title, desc, actions){
  return `<div class="page-head"><div><h2>${title}</h2>${desc?`<p>${desc}</p>`:''}</div>${actions?`<div class="page-actions">${actions}</div>`:''}</div>`;
}
function stats(list){
  return `<div class="stats">${list.map(s=>`<div class="stat ${s.accent?'accent':''} ${s.on?'clkable':''} ${s.on&&s.hot?'hot':''}" ${s.on?`onclick="${s.on}"`:''}>
    <div class="lab">${s.lab}</div><div class="val">${s.val}${s.unit?`<small>${s.unit}</small>`:''}</div>
    ${s.foot?`<div class="foot">${s.foot}</div>`:''}</div>`).join('')}</div>`;
}
function toolbar({q, filters, right, chips}){
  return `<div class="toolbar">
    <div class="search"><span>⌕</span><input id="q" placeholder="${q||'搜索'}" value="${esc(S.f.q||'')}" oninput="setQ(this.value)"></div>
    ${(filters||[]).map(f=>`<select class="sel" onchange="setF('${f.k}',this.value)">
      ${f.opts.map(o=>`<option value="${esc(o.v)}" ${S.f[f.k]===o.v?'selected':''}>${esc(o.label)}</option>`).join('')}
    </select>`).join('')}
    ${(chips||[]).map(c=>`<span class="chip ${S.f[c.k]===c.v?'on':''}" onclick="setF('${c.k}','${c.v}')">${esc(c.label)}</span>`).join('')}
    <div class="sp"></div>${right||''}
  </div>`;
}
function table(cols, rows, empty){
  if(!rows.length) return `<div class="tbl-wrap"><div class="empty">${empty||'没有匹配的数据'}</div></div>`;
  return `<div class="tbl-wrap"><table><thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c.r? c.r(r) : esc(r[c.k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function pager(n){
  return `<div class="pager"><span>共 ${n} 条 · 已选 0 条</span>
    <div class="pgs"><span class="pg on">1</span></div></div>`;
}
function setQ(v){ S.f.q=v; refreshTable(); }
function setF(k,v){ S.f[k]=v; refreshTable(); }
function refreshTable(){
  const m = document.getElementById('main');
  const sc = m.scrollTop;
  m.innerHTML = renderPage();
  m.scrollTop = sc;
  const q = document.getElementById('q'); if(q){ q.focus(); q.setSelectionRange(q.value.length,q.value.length); }
}
function clearF(){ S.f={}; refreshTable(); }
/* 统计卡点一下过滤下表，再点一下取消 */
function statFilter(k, v){ S.f[k] = (S.f[k]===v) ? '' : v; refreshTable(); }

/* ---------- 抽屉 / 弹窗 ---------- */
function openDrawer(html){
  const d = document.getElementById('drawer'), m = document.getElementById('mask');
  const mo = document.getElementById('modal');
  const over = !!(mo && mo.classList.contains('on'));
  d.className = 'drawer' + (over?' over':''); m.className = 'mask' + (over?' over':'');
  d.style.zIndex = over ? '80' : ''; m.style.zIndex = over ? '75' : '';
  d.innerHTML = html; d.classList.add('on'); m.classList.add('on');
}
function closeAll(){
  const d=document.getElementById('drawer'), m=document.getElementById('mask'), mo=document.getElementById('modal');
  if(d){ d.classList.remove('on'); d.style.zIndex=''; }
  if(m){ m.classList.remove('on'); m.style.zIndex=''; }
  if(mo) mo.classList.remove('on');
}
function openModal(html, size){
  const mo = document.getElementById('modal'), m=document.getElementById('mask');
  mo.className = 'modal' + (size?' '+size:'');
  mo.innerHTML = html; mo.classList.add('on'); m.classList.add('on');
  if(mo.querySelector('#upSum')) upSync();
}
function toast(msg){
  let t = document.getElementById('toast');
  if(!t){ t = document.createElement('div'); t.id='toast';
    t.style.cssText='position:fixed;left:50%;bottom:34px;transform:translateX(-50%);background:#111820;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;z-index:99;opacity:0;transition:.2s';
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity='1';
  clearTimeout(window.__tt); window.__tt = setTimeout(()=>{t.style.opacity='0'},1800);
}

/* ---------- 页面注册表 ---------- */
const PAGES = {};
