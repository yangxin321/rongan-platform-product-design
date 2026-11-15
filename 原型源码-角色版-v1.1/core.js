/* ===== 核心：角色、路由、通用组件 ===== */
const S = { role:null, page:null, f:{}, drawer:null, modal:null };

const ROLES = {
  R01:{ code:'R01', who:'金诚', post:'总经理', title:'管理员', tone:'accent',
    desc:'维护 AI 与人才画像因子，拥有上帝视角：全部需求、全部人员、合同价与利润可见。',
    meta:'5 个分组 · 14 个页面', note:'金总同时是客户负责人',
    groups:[
      {g:'业务监控', items:[['dash','业务看板'],['conversion','转化监控']]},
      {g:'需求管理', items:[['demands','需求列表'],['custreq','客户需求确认'],['confirms','客户确认'],['clinks','客户确认链接']]},
      {g:'招聘执行', items:[['batches','批次列表'],['persons','人员列表'],['pool','人才池列表']]},
      {g:'数据字典维护', items:[['dicts','数据字典'],['factors','人才画像因子库'],['std','标准岗位标准']]},
      {g:'系统日常管理', items:[['perms','账号与权限'],['logs','系统操作记录']]},
    ]},
  R02:{ code:'R02', who:'金诚', post:'客户负责人', title:'内部客户负责人', tone:'info',
    desc:'我方内部角色，代表客户视角看需求与面试：确认需求、确认面试结果。客户本人不登录系统，不占用此身份。',
    meta:'6 个页面', note:'外部客户只通过只读确认单参与',
    groups:[
      {g:'我的客户', items:[['custreq','客户需求确认'],['confirms','客户确认'],['clinks','客户确认链接'],['demands','需求列表']]},
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
  E01:{ code:'E01', who:'张建国', post:'求职者', title:'求职者端', tone:'warn',
    desc:'小程序端：找工作、看进度、收待办、管资料。不看分数，只看结果与下一步。',
    meta:'4 个 tab', note:'原「工人端」，与工程师端关系待确认',
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
const confirmB = s => ({'已确认':'<span class="b g">已确认</span>','待客户确认':'<span class="b w">待客户确认</span>','变更待重确认':'<span class="b r">变更待重确认</span>','待内部审核':'<span class="b i">待内部审核</span>','已退回':'<span class="b r">已退回</span>'}[s]||`<span class="b n">${esc(s)}</span>`);

function mainSel(){ return S.role==='R01'?'全部':S.who; }

/* ---------- 渲染入口 ---------- */
function boot(){
  const el = document.getElementById('root');
  /* 只读确认单地址必须能独立打开：新标签页 / 刷新都直接落到确认单，不先拦在角色首页。
     客户方无账号，进入只读页即视为「不使用任何内部角色」，故顺手清掉记住的角色。 */
  const cm = (location.hash || '').match(/^#?cust=(.+)$/);
  if(cm){
    S.role = null;
    try{ localStorage.removeItem('rg-role'); }catch(e){}
    el.innerHTML = viewCustLink(decodeURIComponent(cm[1]));
    window.scrollTo(0,0);
    return;
  }
  const keep = localStorage.getItem('rg-role');
  /* 首次启动才按地址恢复（刷新 / 直达详情页）；主动选角色不走这里 */
  if(keep && ROLES[keep]) { enter(keep, true); } else { S.role=null; el.innerHTML = viewLanding(); }
}
function viewLanding(){
  const cards = ['R01','R02','R04','E01'].map(k=>{
    const r = ROLES[k];
    const merged = (k==='R01'||k==='R02');
    return `<button class="role ${merged?'merged':''}" onclick="enter('${k}')">
      <span class="tag">${r.code}${merged?' · 同一人两角色':''}</span>
      <div class="rname">${r.title}</div>
      <div class="rdesc">${esc(r.desc)}</div>
      <div class="rmeta"><span>${esc(r.who)} · ${esc(r.post)}</span><span>${esc(r.meta)} <span class="arrow">→</span></span></div>
    </button>`;
  }).join('');
  const matrix = [
    ['R01','管理员','金诚（兼内部客户负责人）','全部需求 · 全部人员 · 合同价与利润 · 因子与标准岗位标准','维护标准、看全盘、最终定价'],
    ['R02','内部客户负责人','金诚','本人名下客户的需求与面试结果','确认需求、确认面试结果；不参与日常招人动作'],
    ['R04','招聘专员','李文静','自己负责的需求与自己名下的投递','建批次、下简历、打电话、登记客户反馈'],
    ['E01','求职者','张建国','自己的投递、进度、待办、资料','找工作、看结果；看不到任何评分'],
    ['—','外部客户（无账号）','客户方对接人','仅一张只读确认单：该需求的岗位条件与时效','看确认单、线下反馈；不进系统、看不到人才库与价格'],
  ];
  return `<div class="landing">
    <div class="landing-brand"><div class="logo">融</div><h1>融敢平台</h1></div>
    <div class="sub">B2B 招聘协作平台 · 从需求到入职</div>
    <div class="hint">选择你的角色进入</div>
    <div class="roles">${cards}</div>

    <div class="cust-entry">
      <div class="ce-l">
        <div class="ce-t"><span class="b i">只读</span> 外部客户入口 · 不占账号</div>
        <p>客户不登录系统。我们按客户生成<strong>受控只读确认单</strong>链接，客户在链接里只看这一个需求的岗位条件与时效，线下反馈后由我方代登记。链接可失效、可撤销。</p>
      </div>
      <div class="ce-r">
        <button class="btn pri" onclick="openCustLinkDemo('LK-D8-V10')">打开示例确认单 →</button>
        <button class="btn" onclick="toast('演示：客户方无账号，故不出现在角色列表里')">为什么没有客户角色</button>
      </div>
    </div>

    <div class="role-matrix">
      <div class="rm-h">角色职责与可见范围</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>编码</th><th>角色</th><th>操作者</th><th>可见数据</th><th>可做操作</th></tr></thead>
        <tbody>${matrix.map(r=>`<tr>
          <td class="mono sm">${r[0]==='—'?'<span class="mut">—</span>':esc(r[0])}</td>
          <td class="sm"><b>${esc(r[1])}</b></td><td class="sm">${esc(r[2])}</td>
          <td class="sm mut">${esc(r[3])}</td><td class="sm">${esc(r[4])}</td></tr>`).join('')}</tbody>
      </table></div>
      <div class="rm-f">R02 是我方内部角色，不是外部企业用户；E01 编码保留，其「工人端 / 求职者端」与工程师端的关系<b>待产品负责人确认</b>（见 REVIEW.md §1）。</div>
    </div>

    <div class="land-bar">
      <span><b>8</b> 个在招需求</span><span><b>40</b> 位候选人</span><span><b>3</b> 位招聘专员</span><span><b>11</b> 个每日批次</span>
    </div>
    <div class="landing-foot">演示环境 · 数据为虚构样例 · 每个角色进入后只看自己的页面与数据</div>
  </div>`;
}

/* 外部客户只读确认单：无侧栏、无导航、无内部数据 */
function openCustLinkDemo(tok){
  localStorage.removeItem('rg-role');
  S.role = null;
  /* 默认取一条**未过期**的链接；LK-D8-V10 已过期，留作「过期后被拒」的演示样本 */
  const t = tok || (CLINKS.find(l=>l.state==='有效' && !linkExpired(l))||{}).tok || 'LK-D1-V11';
  location.hash = 'cust=' + t;
  document.getElementById('root').innerHTML = viewCustLink(t);
  window.scrollTo(0,0);
}
/* 年龄区间的展示文字：客户原文优先（'18–45'），没有原文再用解析出的区间。
   客户自己写的才是依据，解析只是给匹配用。 */
function custAgeTxt(g){
  const raw = String((g && g.ageRaw) || '').trim();
  if(raw && !/^(不限|无|无要求|无硬性要求)$/.test(raw)){
    return /岁/.test(raw) ? raw : raw + ' 岁';
  }
  const a = (g && g.age) || [];
  return a.length === 2 ? `${a[0]}–${a[1]} 岁` : '不限';
}
/* 证书要求的展示文字：按**每张证**分别标必备/优先，混选时不能笼统写一个「（优先）」，
   否则客户会以为那几张全都不是硬条件。 */
function certNeedTxt(g){
  const list = ((g && g.cert) || []).filter(Boolean);
  if(!list.length) return '无硬性要求';
  const optList = ((g && g.certOpt) || []).filter(Boolean);
  const allOpt = g.certMust === false && !optList.length;
  return list.map(n => optList.includes(n) || allOpt ? `${n}（优先）` : `${n}（必备）`).join('、');
}
function viewCustLink(tok){
  const r = custLinkPayload(tok);
  const back = `<div class="cust-back"><button class="btn xs" onclick="exitCustLink()">← 返回演示首页</button><span class="xs mut">演示导航，正式环境客户看不到此按钮</span></div>`;
  if(!r.ok){
    const map = {
      NOTFOUND:['链接不存在','请向对接人索取新的确认单链接。'],
      EXPIRED:['链接已失效',`该链接生成于 ${r.l?r.l.at:'—'}，有效期至 ${r.l?r.l.expire:'—'}，已过期。请对方重新生成。`],
      REVOKED:['链接已撤销',`撤销原因：${r.l&&r.l.why?r.l.why:'—'}。请联系对接人重新获取。`],
    };
    const m = map[r.code]||['链接不可用',''];
    return `<div class="cust-wrap"><div class="cust-doc">
      ${back}
      <div class="cust-hd"><div class="logo">融</div><div><b>融敢平台 · 需求确认单</b><div class="xs mut">只读链接</div></div></div>
      <div class="cust-body" style="text-align:center;padding:48px 24px">
        <div style="font-size:34px;margin-bottom:8px">⛔</div>
        <div class="sec-t" style="justify-content:center">${esc(m[0])}</div>
        <p class="sm mut" style="margin-top:10px">${esc(m[1])}</p>
        <div class="note r" style="text-align:left;margin-top:18px">失效 / 撤销后该链接<b>无法继续提交任何内容</b>，也不可作为需求确认依据。</div>
      </div>
    </div></div>`;
  }
  const d = r.d, g = r.gate, ver = r.ver || {};
  /* 第一节与第二节必须同源：都取「链接对应的那一版」的条件快照。
     只读页展示的是某一版，d.deadline / d.city 是需求对象上的基础值，
     审核通过新版后不会跟着变，客户就会在同一张单上看到两个日期。 */
  const gateRows = [
    ['用工地点', g.city||'—','工作城市意愿，不以现居地推断'],
    ['最晚报到日', g.arriveBy||'—','候选人确认的可到岗日期'],
    ['年龄区间', custAgeTxt(g), '客户明示条件'],
    ['性别要求', g.gender||'不限','客户明示条件'],
    ['工种 / 等级', `${d.post}（${g.trade||'—'}）`,''],
    ['专业技能项', (g.skill||[]).join('、')||'—',''],
    ['证书要求', certNeedTxt(g),''],
    ['夜班', g.night||'不需要',''],
  ];
  return `<div class="cust-wrap"><div class="cust-doc">
    ${back}
    <div class="cust-hd">
      <div class="logo">融</div>
      <div style="flex:1"><b>融敢平台 · 需求确认单</b><div class="xs mut">${esc(d.client)} · ${esc(d.project)}</div></div>
      <span class="b w">只读</span>
    </div>

    <div class="cust-title">
      <h2>${esc(d.post)}</h2>
      <div class="xs mut">需求编号 <span class="mono">${esc(d.code)}</span> · 版本 <span class="mono">${esc(r.l.ver)}</span> · 需求 ${d.head} 人</div>
    </div>

    <div class="note" style="margin:14px 0">本页只展示这一个需求。不含内部人才库、其他客户需求、合同价与利润信息。<b>页面内容不可编辑</b>，如需修改请在下方反馈。</div>

    <div class="sec"><div class="sec-t">一、岗位与地点</div>
      <dl class="kv">
        <div><dt>用工地点</dt><dd>${esc(g.city||d.city)}</dd></div>
        <div><dt>需求人数</dt><dd class="mono">${d.head} 人</dd></div>
        <div><dt>工期</dt><dd>${esc(d.term||'3 个月')}</dd></div>
        <div><dt>最晚报到</dt><dd class="mono">${esc(g.arriveBy||d.deadline)}</dd></div>
      </dl></div>

    <div class="sec"><div class="sec-t">二、岗位条件（请逐项确认）</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th style="width:38%">条件</th><th>我方按客户需求填写</th><th>说明</th></tr></thead>
        <tbody>${gateRows.map((x,i)=>`<tr><td class="sm"><b>${esc(x[0])}</b></td>
          <td class="sm">${esc(x[1])}</td><td class="xs mut">${esc(x[2])}</td></tr>`).join('')}</tbody>
      </table></div></div>

    <div class="sec"><div class="sec-t">三、时效与结算</div>
      <dl class="kv">
        <div><dt>需求有效期</dt><dd class="mono">${esc(d.valid)}</dd></div>
        <div><dt>工价区间</dt><dd class="mono">${esc(d.price)}</dd></div>
        <div><dt>结算方式</dt><dd>月结 · 见票 30 天</dd></div>
      </dl></div>

    <div class="sec"><div class="sec-t">四、你的反馈</div>
      <div class="note">确认方式：<b>线下反馈</b>（微信 / 会议 / 电话），由我方在系统内逐项登记。本链接不收集填写内容，也不提供在线提交。<br>
        如对本单有任何修改意见，请直接回复我方对接人；由我方登记并经内部审核后生效，本页内容不会因你的点击而改变。</div>
    </div>

    <div class="cust-ft">
      链接 <span class="mono">${esc(r.l.tok)}</span> · 生成人 ${esc(r.l.by)} · ${esc(r.l.at)} · 有效期至 <span class="mono">${esc(r.l.expire)}</span> · 已查看 ${r.l.views} 次
    </div>
  </div></div>`;
}
function exitCustLink(){
  location.hash = '';
  document.getElementById('root').innerHTML = viewLanding();
  window.scrollTo(0,0);
}

/* restore=true 只在首次启动时用：按地址定位到详情页。
   主动点角色卡片进来时**不继承上一个角色的地址** —— 否则 R01 的 #demands 会把 E01 顶到「暂未开放」。 */
function enter(role, restore){
  S.role = role; S.f={}; S.who = ROLES[role].who;
  S.page = DEFAULT_PAGE[role];
  /* 换角色必须把上一个角色的「正在看哪条记录」清干净：详情页注册成 any，
     不清的话切到求职者端还会继续显示上一个角色的人员档案 */
  DM.id=null; HU.pid=null; HU.appId=null; HU.back=null; HU.navKey='persons';
  CR.cid=null; CR.item=''; CR.back=null;
  if(restore) applyHash();           /* 地址优先：刷新 / 直达详情页时按 hash 定位 */
  localStorage.setItem('rg-role', role);
  render();
  navHash(routeHash(), 'replace');
}
function exitRole(){
  localStorage.removeItem('rg-role'); S.role=null;
  DM.id=null; HU.pid=null; HU.appId=null; HU.back=null; CR.cid=null; CR.item=''; CR.back=null;
  /* 清地址：留着上一个角色的 #demands，下次进来会被当成直达地址 */
  try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){ location.hash = ''; }
  LAST_HASH = location.hash || '';
  document.getElementById('root').innerHTML = viewLanding();
}
function go(page){
  markScrollOut();                  /* 切页前先记住列表滚到哪了，render 之后滚到 0 就晚了 */
  if(page !== 'demandDetail') DM.id = null;
  if(page !== 'personDetail'){ HU.pid = null; HU.appId = null; HU.back = null; }
  if(page !== 'custreqRaw'){ CR.cid = null; CR.item = ''; CR.back = null; }
  S.page = page; S.f = {}; closeAll(); render();
  setMainScroll(0);
  navHash('#' + page, 'push');
}

/* ---------- 地址路由（v1.3 · RG-012） ----------
   列表 #demands；需求详情 #demand/<id>/detail?tab=<detail|resume|progress>。
   地址只承载「在哪一页、哪条记录、哪个页签」，界面筛选与滚动另存 sessionStorage；
   不写凭据，也不代表业务数据持久化 —— 刷新后内存演示记录仍会回到初始状态。
   页签用语义键，不用会随排序改变的数字下标。 */
const SCROLL_MEM = 'rg-scroll-v13';
function mainScroll(){ const m=document.getElementById('main'); return m? m.scrollTop : 0; }
function setMainScroll(v){ const m=document.getElementById('main'); if(m) m.scrollTop = v||0; }
function scrollMem(){ try{ return JSON.parse(sessionStorage.getItem(SCROLL_MEM)||'{}'); }catch(e){ return {}; } }
/* 离开一个页面前，滚动位置会先被 render + setMainScroll(0) 冲掉，
   所以在切换动作的**第一行**就把「旧地址 + 旧滚动」记下来，等 navHash 真正改地址时再落盘。 */
let SCROLL_OUT = null;
function markScrollOut(){ SCROLL_OUT = { h: location.hash || ('#'+S.page), v: mainScroll() }; }
function saveScrollHere(){
  const key = SCROLL_OUT ? SCROLL_OUT.h : (location.hash || ('#'+S.page));
  const val = SCROLL_OUT ? SCROLL_OUT.v : mainScroll();
  SCROLL_OUT = null;
  const mp = scrollMem();
  mp[key] = val;
  try{ sessionStorage.setItem(SCROLL_MEM, JSON.stringify(mp)); }catch(e){}
}
function restoreScrollHere(){
  const mp = scrollMem();
  setMainScroll(mp[location.hash || ('#'+S.page)] || 0);
}
/* 页面是否属于当前角色：地址恢复时不能把 R01 的详情页塞给 E01。
   需求 / 档案 / 客户原话三类详情页是内部角色专用（外部客户走 #cust= 独立分支，求职者端无这些入口）。 */
function pageOkForRole(page){
  const p = PAGES[page];
  if(!p) return false;
  if(page==='demandDetail'||page==='personDetail'||page==='custreqRaw') return S.role!=='E01';
  return !!(p[S.role] || p.any);
}
function routeHash(){
  if(S.page === 'demandDetail'){
    const tab = (DM && dmTabOk(DM.tab)) ? DM.tab : 'detail';
    return `#demand/${encodeURIComponent(DM.id||'')}/detail?tab=${tab}`;
  }
  if(S.page === 'personDetail'){
    const tab = (HU && huTabOk(HU.tab)) ? HU.tab : 'resume';
    /* 同一人可能有多条投递（例如 P1 与 P42 同人、分别投 D1 与 D7）。
       只写人员编号的话，刷新后「本次投递」会被 HU.appId=null 冲回第一条。
       默认投递（第一条）不写，避免地址噪音；非默认的把投递标识带上。 */
    const first = (HU.pid ? appsOf(HU.pid) : [])[0];
    const appQ = (HU.appId && (!first || first.id !== HU.appId)) ? `&app=${encodeURIComponent(HU.appId)}` : '';
    return `#person/${encodeURIComponent(HU.pid||'')}/detail?tab=${tab}${appQ}`;
  }
  if(S.page === 'custreqRaw'){
    return `#custreq/${encodeURIComponent(CR.cid||'')}/raw?item=${encodeURIComponent(CR.item||'')}`;
  }
  return '#' + (S.page || '');
}
let NAV_SELF = false;               /* 自己改的地址不再触发一次渲染 */
function navHash(h, mode){
  if(!h || location.hash === h){ SCROLL_OUT = null; LAST_HASH = h || location.hash; return; }
  saveScrollHere();
  NAV_SELF = true;
  if(mode === 'push'){
    try{ history.pushState(null, '', h); NAV_SELF = false; LAST_HASH = h; return; }catch(e){}
  } else {
    try{ history.replaceState(null, '', h); NAV_SELF = false; LAST_HASH = h; return; }catch(e){}
  }
  LAST_HASH = h;
  location.hash = h;                /* file:// 等不支持 pushState 时退回 hash */
  setTimeout(()=>{ NAV_SELF = false; }, 0);
}
/* 解析当前地址并落到状态上；返回是否命中可渲染的页面 */
function applyHash(){
  const raw = decodeURI(location.hash || '').replace(/^#/, '');
  if(!raw) return false;
  const [path, qs] = raw.split('?');
  const seg = path.split('/').filter(Boolean);
  if(seg[0] === 'demand' && seg[1]){
    if(!pageOkForRole('demandDetail')) return false;
    DM.id = seg[1];
    const t = new URLSearchParams(qs || '').get('tab');
    DM.tab = dmTabOk(t) ? t : 'detail';
    S.page = 'demandDetail';
    return true;
  }
  if(seg[0] === 'person' && seg[1]){
    if(!pageOkForRole('personDetail')) return false;
    const sp = new URLSearchParams(qs || '');
    const t = sp.get('tab');
    HU.pid = seg[1];
    HU.tab = huTabOk(t) ? t : 'resume';
    /* 投递标识从地址恢复并校验归属：app 必须属于这个人，否则回落默认投递，
       不能让刷新把「正在处理的这一单」静默换成另一单。 */
    const app = sp.get('app');
    const apps = appsOf(HU.pid);
    HU.appId = (app && apps.some(a=>a.id===app)) ? app : ((apps[0]||{}).id || null);
    S.page = 'personDetail';
    return true;
  }
  if(seg[0] === 'custreq' && seg[1]){
    if(!pageOkForRole('custreqRaw')) return false;
    CR.cid = seg[1];
    CR.item = new URLSearchParams(qs || '').get('item') || '';
    S.page = 'custreqRaw';
    return true;
  }
  if(pageOkForRole(seg[0])){ S.page = seg[0]; return true; }
  return false;                     /* 无效地址 / 不属于该角色：保持原页面，不静默跳转 */
}
/* 返回上下文快照：不能只存页面键。
   详情页之间可以互相跳（D1 简历明细 → 档案 → 「这一单」回 D1），返回时如果只记 'demandDetail'，
   DM.id 早已被上一层返回清空，地址就会退化成 #demand//detail。
   所以把来源页正在看的那条记录的定位信息一起存下来，返回时原样恢复。 */
function snapshotHere(){
  const snap = { page: S.page, f: Object.assign({}, S.f), scroll: mainScroll() };
  if(S.page === 'demandDetail' && DM.id)
    snap.dm = { id: DM.id, tab: DM.tab, scope: DM.scope, back: DM.back };
  if(S.page === 'personDetail' && HU.pid)
    snap.hu = { pid: HU.pid, tab: HU.tab, appId: HU.appId, navKey: HU.navKey, back: HU.back };
  if(S.page === 'custreqRaw' && CR.cid)
    snap.cr = { cid: CR.cid, item: CR.item, back: CR.back };
  return snap;
}
/* 恢复快照；返回 false 表示这个快照不可用（没来源页 / 页面已不存在） */
function restoreSnap(snap){
  if(!snap || !snap.page || !PAGES[snap.page]) return false;
  if(snap.page === 'demandDetail' && !snap.dm) return false;   /* 没有记录的空详情页不还原 */
  if(snap.page === 'personDetail' && !snap.hu) return false;
  if(snap.page === 'custreqRaw' && !snap.cr) return false;
  if(snap.dm){ DM.id = snap.dm.id; DM.tab = snap.dm.tab || 'detail';
    DM.scope = snap.dm.scope || 'mine'; DM.back = snap.dm.back || null; }
  if(snap.hu){ HU.pid = snap.hu.pid; HU.tab = snap.hu.tab || 'resume';
    HU.appId = snap.hu.appId || null; HU.navKey = snap.hu.navKey || 'persons';
    HU.back = snap.hu.back || null; }
  if(snap.cr){ CR.cid = snap.cr.cid; CR.item = snap.cr.item || ''; CR.back = snap.cr.back || null; }
  S.page = snap.page;
  S.f = Object.assign({}, snap.f || {});
  return true;
}
/* 上一次渲染时地址栏里的值。popstate 触发时 location.hash 已经是**目标**地址，
   拿它当「从哪来」会错位，必须自己记住。 */
let LAST_HASH = location.hash || '';
function onHashNav(){
  if(NAV_SELF){ NAV_SELF = false; LAST_HASH = location.hash; return; }
  if(!S.role) return;               /* 还在角色入口页 / 只读确认单页：地址变化不重建外壳 */
  /* 前进/后退不经过 openXxx / go()，此时 DOM 还是旧页面、main 还停在那：
     先把旧滚动记到「离开时的地址」上再重绘，否则回到这一页永远是最早那次的位置。 */
  if(LAST_HASH && LAST_HASH !== location.hash){
    SCROLL_OUT = { h: LAST_HASH, v: mainScroll() };
    saveScrollHere();
  }
  const ok = applyHash();
  if(!ok){ S.page = DEFAULT_PAGE[S.role] || S.page; }
  closeAll();
  render();
  restoreScrollHere();
  LAST_HASH = location.hash;
}
window.addEventListener('popstate', onHashNav);
window.addEventListener('hashchange', onHashNav);

function render(){
  const r = ROLES[S.role];
  /* 详情页高亮所属列表：需求详情 → 需求列表；档案页 → 进来的那个列表（默认人员列表） */
  const navOn = S.page === 'demandDetail' ? 'demands'
    : S.page === 'personDetail' ? (HU.navKey && PAGES[HU.navKey] && HU.navKey!=='personDetail' ? HU.navKey : 'persons')
    : S.page === 'custreqRaw' ? 'custreq'
    : S.page;
  document.getElementById('root').innerHTML = `<div class="shell">
    <aside class="side">
      <div class="side-top">
        <div class="side-brand"><div class="logo">融</div><b>融敢平台</b></div>
        <div class="side-role">
          <div class="who">${esc(r.who)}<small><span class="mono">${esc(r.code)}</span> · ${esc(r.title===r.post ? r.title : r.title + ' · ' + r.post)}</small></div>
          <button onclick="exitRole()">切换</button>
        </div>
      </div>
      <nav class="nav">
        ${r.groups.map(gr=>`<div class="nav-group">
          ${S.role==='R01'?`<div class="nav-gt">${esc(gr.g)}</div>`:''}
          ${gr.items.map(([k,label])=>{
            const badge = badgeFor(k);
            return `<div class="nav-item ${navOn===k?'on':''}" onclick="go('${k}')">
              <span class="ni">${iconOf(k)}</span><span>${label}</span>${badge?`<span class="nav-badge">${badge}</span>`:''}
            </div>`;
          }).join('')}
        </div>`).join('')}
      </nav>
      <div class="side-foot"><span>角色版</span><span>演示数据</span></div>
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
/* 宽抽屉：确认单 / 版本历史 / 匹配详情用 */
function openDrawerW(html){
  openDrawer(html);
  document.getElementById('drawer').classList.add('wide');
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
