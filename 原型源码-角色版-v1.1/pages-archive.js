/* ===== 档案详情（人）／AI 找候选人／记录联系（含录音解析） ===== */

/* -------------------------------------------------------------
   人详情：一个抽屉，四个页签（2026-11-14 定 · P0-0）
   -------------------------------------------------------------
   以前是两个抽屉并存：openPerson（投递详情，只有进度）与 openArchive（档案详情，有简历）。
   两个标题长得一模一样，点进去内容完全不同 —— 这就是"有些名字点进去不是我想的那个"。
   现在统一成 openHuman(personId)，所有入口都往这里走：

     简历明细（默认）  候选人自己给的，可对客户
     人才画像          我们的判断，仅内部（内部日常看这个更多，所以紧挨简历）
     本次投递          这一单谈到哪
     沟通记录          跨投递、跨专员合并

   页签记住上次停留（localStorage），他每天推进度，不想每次翻到第三个。
   ------------------------------------------------------------- */

/* -------------------------------------------------------------
   人档案：独立页面，五个页签（v1.3 · RG-012 第三批）
   -------------------------------------------------------------
   以前是一个右侧抽屉，四个页签。抽屉盖住列表、看不到系统导航、地址留不住，
   在名单弹窗里点人名还会变成「弹窗上再叠一层抽屉」，点错和返回都很难受。
   现在整页：地址 #person/<id>/detail?tab=<resume|verify|portrait|apply|talk>，
   页签用英文稳定键（不用数字下标），刷新/前进后退都能落回原处。
   「核实依据」原先只有内容、没有页签，只能从一个弹窗按钮进来，
   而「简历明细」里又写着「详见核实依据页签」—— 悬空引用；这次补成第 2 个页签。
   ------------------------------------------------------------- */

/* =======================================================================
   人员：五个独立业务页（第二轮讨论稿 · 2026-11-15 第八批）
   =======================================================================
   以前是「一个人员详情页 + 五个页签」：看简历要点两下、做画像是第二个页签、
   推进投递是第三个 —— 页签成了「什么都得先进这个页」的借口，而且一张页面
   同时背着简历、画像、投递流程、建档历史，谁都读不完。

   现在按业务任务拆成五个独立页面，各有地址、各有标题、各自只干一件事：

     #person/<pid>/resume               查看简历      候选人自己给的
     #person/<pid>/profile              人才画像      我们的判断 · 仅内部
     #person/<pid>/apply/<appId>        投递跟进      一条投递一个地址
     #person/<pid>/logs                 沟通记录      跨投递合并
     #person/<pid>/verify?demand=<did>  资料核实      按岗位逐项对照

   页签栏已删除，改成页头下面一行文字链接（不在本页展开别人的内容）。
   旧地址 #person/<pid>/detail?tab=xxx 仍然可用，按 tab 映射过来 ——
   已经发出去的链接不该因为改版就打不开。
   ======================================================================= */

const HU_VIEWS = [
  {k:'resume', n:'查看简历', tip:'基本资料 / 求职意愿 / 能力经历 / 附件'},
  {k:'profile',n:'人才画像', tip:'我们的判断 · 仅内部'},
  {k:'apply',  n:'投递跟进', tip:'一条投递一个页面'},
  {k:'logs',   n:'沟通记录', tip:'跨投递合并'},
  {k:'verify', n:'资料核实', tip:'按岗位逐项对照'},
];
const HU_VIEW_NAME = {resume:'查看简历', profile:'人才画像', apply:'投递跟进', logs:'沟通记录', verify:'资料核实'};
/* 旧页签键 → 新页面键（兼容 detail?tab=） */
const HU_TAB_MAP = {resume:'resume', verify:'verify', portrait:'profile', apply:'apply', talk:'logs'};

let HU = {pid:null, appId:null, view:'resume', demandId:null, back:null, navKey:'persons', open:null};

function huViewOk(v){ return HU_VIEWS.some(x=>x.k===v); }
function huTabOk(t){ return !!HU_TAB_MAP[t]; }
function huMemGet(){ try{ return localStorage.getItem('rg-human-view')||'resume'; }catch(e){ return 'resume'; } }
function huMemSet(v){ try{ localStorage.setItem('rg-human-view', v); }catch(e){} }
/* 人员 id：投递记录（PERSONS）用 personId，档案记录（PEOPLE）用 id */
function huPid(p){ return (p && (p.personId || p.id)) || null; }

/* 当前页面路径：同一份档案的不同页面各自可寻址，刷新/分享都落回原处 */
function huHash(){
  const pid = encodeURIComponent(HU.pid||'');
  const v = HU.view || 'resume';
  if(v === 'apply'){
    return `#person/${pid}/apply${HU.appId?('/'+encodeURIComponent(HU.appId)):''}`;
  }
  if(v === 'verify' && HU.demandId){
    return `#person/${pid}/verify?demand=${encodeURIComponent(HU.demandId)}`;
  }
  return `#person/${pid}/${v}`;
}

/* 空态判断与状态标 */
function archiveState(p){
  const id = huPid(p);
  const act = activeAppsOf(id);
  if(p.blacklist) return {label:'黑名单', tone:'r'};
  if(appsOf(id).some(a=>a.node==='已入职')) return {label:'已入职', tone:'g'};
  if(act.length) return {label:'投递中 · ' + act.length + ' 个需求', tone:'i'};
  return {label:'空闲可捞', tone:'g'};
}

/* 统一入口：openHuman(pid, view, appId, demandId)
   openArchive / openPerson 都是它的别名，全站「点人名」收口到这里。 */
function openHuman(pid, view, appId, demandId){
  const from = S.page;
  markScrollOut();
  if(HU.pid !== pid || from !== 'personDetail'){
    HU.back = snapshotHere();          /* 带来源页记录定位：从批次人员进来，返回要回到那一批 */
    HU.navKey = from;
  }
  if(HU.pid !== pid) HU.logsDm = null; /* 换人时沟通记录的「只看这一单」重新按投递取 */
  HU.pid = pid;
  if(appId) HU.appId = appId;
  const cur = HU.appId ? P(HU.appId) : null;
  if(!cur || cur.personId !== pid){
    const act = activeAppsOf(pid);
    HU.appId = (act[0]||appsOf(pid)[0]||{}).id || null;
  }
  const v0 = HU_TAB_MAP[view] || view;            /* portrait → profile、talk → logs */
  HU.view = huViewOk(v0) ? v0 : (view ? 'resume' : huMemGet());
  if(demandId) HU.demandId = demandId;
  else if(HU.view === 'verify'){
    /* 从人员入口直接进「资料核实」、没带需求：不给默认需求，
       页面先让人选一条投递（huVerifyPick），不拿第一条投递替人判符合。 */
    HU.demandId = null;
  }
  else HU.demandId = null;
  S.page = 'personDetail';
  closeAll();
  render();
  setMainScroll(0);
  navHash(huHash(), 'push');
}
/* 在五个页面之间跳（不再有页签）：只重画内容区，地址用 replace，返回仍回来源列表 */
function huGo(view, appId, demandId){
  if(!huViewOk(view)) return;
  if(view === 'logs' && appId) HU.logsDm = null;   /* 从某条投递进来：默认只看这一单 */
  if(appId) HU.appId = appId;
  HU.view = view; huMemSet(view);
  if(view === 'apply'){
    const cur = HU.appId ? P(HU.appId) : null;
    if(!cur || cur.personId !== HU.pid){
      const act = activeAppsOf(HU.pid);
      HU.appId = (act[0]||appsOf(HU.pid)[0]||{}).id || null;
    }
  }
  if(view === 'verify'){
    HU.demandId = demandId || (HU.appId ? P(HU.appId).demandId : null) ||
      ((appsOf(HU.pid)[0]||{}).demandId) || null;
  }
  const m = document.getElementById('main');
  const sc = m ? m.scrollTop : 0;
  render();
  setMainScroll(0);
  navHash(huHash(), 'replace');
}
/* 兼容旧调用：huSetTab('verify') 等同进「资料核实」页 */
function huSetTab(t){ const v = HU_TAB_MAP[t]; if(v) huGo(v); }
function huPaint(){ render(); }

/* 一条投递跳转：从列表直接点「投递跟进」时 HU.pid 可能还没设置，
   以前只 huGo 会拼出 #person//apply（空人员）。这里先把人定位好再进。 */
function huAppTo(appId){
  const a = P(appId);
  if(!a) return;
  if(S.page !== 'personDetail' || HU.pid !== a.personId){
    openHuman(a.personId, 'apply', appId, a.demandId);
    return;
  }
  huGo('apply', appId, a.demandId);
}
function huOpenMap(pid, apps){
  if(!HU.open || HU.open.pid !== pid) HU.open = {pid:pid, ids:{}};
  const act = HU.appId || (apps[0]||{}).id;
  if(act && !(act in HU.open.ids)) HU.open.ids[act] = true;
  return HU.open.ids;
}
function huCopy(id){ toast('档案编号 ' + id + ' 已复制'); }

/* 页面内返回：回到进来时的列表 / 详情页，还原记录、筛选与滚动 */
function huBack(){
  const b = HU.back, nav = HU.navKey;
  HU.pid = null; HU.appId = null; HU.view = 'resume'; HU.demandId = null; HU.back = null; HU.logsDm = null;
  if(b && b.page && b.page !== 'personDetail' && restoreSnap(b)){
    render(); setMainScroll(b.scroll || 0);
    navHash(routeHash(), 'replace');
    return;
  }
  go(nav === 'personDetail' ? 'persons' : (nav || 'persons'));
}
/* 兼容旧调用：view 可能是旧页签名（portrait / talk），在这里统一折成新页面键 */
function openArchive(id, view, appId, demandId){
  openHuman(id, HU_TAB_MAP[view] || view, appId, demandId);
}
function openPerson(id){
  const a = P(id);
  openHuman(a ? a.personId : id, 'resume', a ? id : null, a ? a.demandId : null);
}

/* 补全链接：APP 推送之外，还要能复制到微信手动发 —— 候选人未必看 APP 通知 */
function copyFillLink(pid){
  const url = 'https://rg.zhaopin.local/fill/' + (pid||'') + '?t=' + Math.random().toString(36).slice(2,8);
  const done = () => toast('补全链接已复制，可直接粘贴到微信发给候选人');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(done).catch(()=>{ fallbackCopy(url); done(); });
  } else { fallbackCopy(url); done(); }
}
function fallbackCopy(txt){
  const ta = document.createElement('textarea');
  ta.value = txt; ta.style.cssText = 'position:fixed;left:-9999px';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
}

/* ---------- 页头：返回 + 标题 + 识别信息 + 其他页面的文字链接 ---------- */
function huPage(p, view, body, acts){
  const st = archiveState(p);
  const fromNav = {persons:'招聘人员列表', pool:'人才池列表', demands:'需求列表', batches:'批次列表',
    batchPersons:'批次人员', custreq:'客户需求确认', confirms:'客户确认', home:'我的首页', interviews:'面试管理'}[HU.navKey];
  const title = view === 'resume' ? p.name
    : `${p.name}的${HU_VIEW_NAME[view]}`;
  const sub = `<span class="xs mut">${p.gender} · ${p.age}岁 · ${esc(p.phone)}</span>
     · <span class="b ${st.tone}">${esc(st.label)}</span>
     · 当前跟进人 <b>${esc(p.follower||p.createdBy||'—')}</b>`;
  const others = HU_VIEWS.filter(v=>v.k!==view)
    .map(v=>`<span class="link" onclick="huGo('${v.k}')" title="${esc(v.tip)}">${v.n}</span>`).join('<span class="hu-dot">·</span>');
  return `<div class="page hu-page">
    <div class="pg-back" onclick="huBack()">← 返回${fromNav||'上一页'}</div>
    ${head(esc(title), sub, acts||'')}
    <div class="hu-links"><span class="xs mut">同一份档案：</span>${others}</div>
    ${body}
  </div>`;
}

/* 地址里的档案不存在（刷新后演示数据重置 / 编号写错）：说清原因并给返回，不静默跳别的人 */
function huMissingHtml(){
  return `<div class="page">
    <div class="pg-back" onclick="go('persons')">← 返回招聘人员列表</div>
    ${head('找不到这份档案','地址指向的人员不在当前演示数据里')}
    <div class="note w">
      <div><b>档案编号</b> <span class="mono">${esc(HU.pid||'—')}</span> 没有匹配到记录。</div>
      <div style="margin-top:6px">常见原因：演示数据存在内存里，刷新后新增/改过的记录会回到初始状态；或者编号被改动过。</div>
      <div style="margin-top:6px">这不是权限问题，系统也不会自动跳到别的候选人上。</div>
    </div>
    <div style="margin-top:12px"><button class="btn pri" onclick="go('persons')">返回招聘人员列表</button></div>
  </div>`;
}

function huHtml(){
  const p = appPerson(HU.pid);
  if(!p || p.id === '—') return huMissingHtml();
  const view = HU.view || 'resume';
  const pid = huPid(p);
  const apps = appsOf(pid), cs = contactsOf(pid);

  /* 右上角动作：每条页面只挂这一页真正要做的事 */
  const acts = view === 'resume'
    ? `<button class="btn" onclick="huGo('apply')">投递跟进</button>
       <button class="btn pri" onclick="openModal(followModal('${esc(pid)}','archive'),'md-lg')">记录联系</button>`
    : view === 'profile'
    ? `<button class="btn" onclick="openModal(followModal('${esc(pid)}','archive'),'md-lg')">记录联系 · 补依据</button>`
    : view === 'logs'
    ? `<button class="btn pri" onclick="openModal(followModal('${esc(pid)}','archive'),'md-lg')">＋ 新增沟通记录</button>`
    : view === 'verify'
    ? `<button class="btn" onclick="openModal(followModal('${esc(pid)}','archive'),'md-lg')">记录联系 · 补材料</button>`
    : `<button class="btn" onclick="openDemand('${esc((P(HU.appId)||{}).demandId||'')}')">看这条需求</button>`;

  let body;
  if(view === 'profile') body = huPortrait(p);
  else if(view === 'apply') body = apps.length ? huApply(p) : huApplyEmpty(p);
  else if(view === 'logs') body = huTalk(p, cs, apps);
  else if(view === 'verify') body = huVerifyPage(p);
  else body = huResume(p);

  return huPage(p, view, body, acts);
}

/* 三个角色都能看人员页（R01 全量、R02 客户侧、R04 我名下） */
PAGES.personDetail = { any: huHtml };

/* =======================================================================
   页 1 · 查看简历
   -----------------------------------------------------------------------
   只回答「这个人是谁、能给什么、原件长什么样」。
   建档时间 / 建档人 / 上传履历 <b>不在这一页</b>（它们属于记录，去了沟通记录页的
   「档案记录」），招聘跟进、画像判断、大段规则说明也不进来。
   ======================================================================= */
function huResume(p){
  const pid = huPid(p);
  const files = filesOf(pid), vf = verifyOf(pid);
  const cs = cityStateOf(p);
  const a = vf.arrive || {};
  const n = vf.night || {};
  const certs = vf.certs || [];
  /* 简历页只说「核验到哪一步」，不说岗位层面的「符合 / 不符合」——
     符合是相对某个岗位要求说的，这一页不挂岗位，写了就是替人下结论。 */
  const certTag = s => s==='ok' ? '<span class="b g">已核验证件有效</span>'
    : s==='no' ? '<span class="b r">已确认无证</span>' : '<span class="b w">待核验</span>';

  /* 基本资料：紧凑字段表（一项一行），不再是两列 dl 堆叠 */
  const base = [
    ['姓名', `${esc(p.name)} <span class="xs mut">${esc(p.gender)} · ${p.age} 岁</span>`],
    ['手机号', `<span class="mono">${esc(p.phone)}</span>`],
    ['现居地', `${esc((vf.city||{}).live || p.city || '—')} <span class="xs mut">人员资料，不作为工作意愿</span>`],
    ['来源渠道', `${esc(p.channel)} <span class="xs mut">${esc((CH(p.channel)||{}).type||'')}</span>`],
    ['资料完整度', `<div class="barline" style="max-width:180px"><div class="bar ${p.complete>=85?'g':p.complete<65?'w':''}"><i style="width:${p.complete}%"></i></div><b>${p.complete}%</b></div>`],
  ];
  const baseTbl = table([{label:'项目', r:r=>`<span class="sm mut">${r[0]}</span>`},
    {label:'内容', r:r=>`<span class="sm">${r[1]}</span>`}], base);

  /* 求职意愿：候选人自述 + 核实状态（是否满足岗位见资料核实，不在这里下结论） */
  const wants = [
    ['期望薪资', esc(p.expect||'32-36 元/时'), '候选人自述'],
    ['愿意工作城市', esc(cs.want.length?cs.want.join('、'):'未确认'), `${tri(cs.st)} <span class="xs mut">是否满足岗位见资料核实</span>`],
    ['可到岗', `${esc(a.date || '未确认')} ${a.state!=='已确认'&&a.date?'<span class="xs mut">日期有值但未经候选人确认</span>':''}`, tri((a.state==='已确认' && a.date) ? 'ok' : 'pend')],
    ['夜班意愿', esc(n.state||'未确认'), '候选人自述，是否满足班制见资料核实'],
  ];
  const wantTbl = table([{label:'项目', r:r=>`<span class="sm mut">${r[0]}</span>`},
    {label:'候选人自述', r:r=>`<span class="sm">${r[1]}</span>`},
    {label:'核实状态', r:r=>`<span class="sm">${r[2]}</span>`}], wants);

  /* 能力经历：技能 / 证书 / 工作经历各一条记录 */
  const skills = [
    ['技能', p.skills.map(esc).join(' / ')||'—', '技能名不等于持证'],
    ['证书', certs.length ? certs.map(c=>esc(c.name)+' '+certTag(c.state)).join(' ') : '<span class="mut">无证书记录</span>', '技能栏出现「电工」等词，不得据此判定持证'],
    ['工作经历', '见下方简历原件', '平台不另存一份摘要，避免与原件对不上'],
  ];
  const skillTbl = table([{label:'项目', r:r=>`<span class="sm mut">${r[0]}</span>`},
    {label:'内容', r:r=>`<span class="sm">${r[1]}</span>`},
    {label:'说明', r:r=>`<span class="xs mut">${r[2]}</span>`}], skills);

  /* 简历附件：一版一条记录，预览 / 下载 / 看版本都在操作里 */
  const fileTbl = table([
    {label:'版本', r:f=>`<span class="sm mono">v${f.ver}</span><div class="t-sub">${esc(f.kind)}</div>`},
    {label:'文件', r:f=>`<div class="sm"><b>${esc(f.name)}</b></div>
      <div class="t-sub">${esc(f.size)} · ${f.online?'平台来源，无原件（仅结构化字段）':'有原件'}</div>`},
    {label:'上传人及时间', r:f=>`<div class="sm">${esc(f.uploader)}</div><div class="t-sub mono">${esc(f.time)}</div>`},
    {label:'操作', r:f=>`<div class="acts">
      <span class="link" onclick="toast('打开原件预览（演示）')">预览</span>
      <span class="link" onclick="toast('已开始下载')">下载</span>
      <span class="link" onclick="toast('这一版的时间与上传人见「沟通记录 → 档案记录」')">历史版本</span>
    </div>`},
  ], files, '暂无原件（BOSS 导出的数据行不含附件）');

  return `
    <div class="sec"><div class="sec-t">基本资料</div>${baseTbl}</div>

    <div class="sec"><div class="sec-t">求职意愿<span class="perm">候选人自述 · 是否满足岗位见「资料核实」</span></div>
      ${wantTbl}
      <div class="xs mut" style="margin-top:6px">这一栏是候选人自己说的。现居地<b>不</b>推断异地意愿，投递状态<b>不</b>推断可到岗。</div>
    </div>

    <div class="sec"><div class="sec-t">能力经历</div>${skillTbl}</div>

    <div class="sec"><div class="sec-t">简历附件（${files.length} 版）<span class="perm">内部全员可见</span></div>
      ${fileTbl}
      <div class="xs mut" style="margin-top:6px">简历版本<b>不覆盖</b>，每次上传留一版；上传与档案变更记录在「沟通记录」页，不占这一页。</div>
    </div>`;
}

/* =======================================================================
   页 2 · 人才画像（表格）
   -----------------------------------------------------------------------
   一行一个画像项目：画像项目 / 当前判断 / 具体依据摘要 / 确认人及更新 / 操作。
   沿用已有画像项目，不新增指标；没有判断就写「待了解」，不留空、不猜。
   置信度放在「当前判断」单元格内，不另占一块。
   ======================================================================= */
const PT_ROWS = [
  {dim:'稳定性', label:'稳定性',   hint:'沿用已有判断'},
  {dim:'意向',   label:'求职意向', hint:'按对应需求看，不混用到其他投递'},
  {dim:'履约',   label:'履约情况', hint:'到面 / 改期 / 跳票等事实'},
  {dim:'适配',   label:'岗位适配', hint:'沿用已有判断'},
  {dim:'风险',   label:'风险提示', hint:'仅内部可见'},
];
function huPortrait(p){
  const pid = huPid(p);
  const pts = ptOf(pid);
  const app = (HU.appId && P(HU.appId) && P(HU.appId).personId === pid) ? P(HU.appId) : (appsOf(pid)[0]||null);
  const dm = app ? D(app.demandId) : null;
  const confB = c => `<span class="pt-conf c${c==='高'?'h':c==='中'?'m':'l'}" style="margin-left:6px">${esc(c)}置信</span>`;
  const stale = t => (new Date(TODAY) - new Date(t.updated.slice(0,10)))/86400000 > 90;
  const short = s => (s||'').length > 22 ? s.slice(0,22)+'…' : (s||'—');

  const cols = [
    {label:'画像项目', r:x=>`<div class="sm"><b>${esc(x.label)}</b></div><div class="t-sub">${esc(x.hint)}</div>`},
    {label:'当前判断', r:x=>{
      const list = pts.filter(t=>t.dim===x.dim);
      if(!list.length) return '<span class="b n">待了解</span><div class="t-sub">还没有可用的判断</div>';
      return list.map(t=>`<div style="margin-bottom:4px"><b class="sm">${esc(t.val)}</b>${confB(t.conf)}
        ${stale(t)?'<span class="b n" style="margin-left:4px">已过期</span>':''}</div>`).join('');
    }},
    {label:'具体依据摘要', r:x=>{
      const list = pts.filter(t=>t.dim===x.dim);
      if(!list.length) return '<span class="mut sm">—</span>';
      return list.map(t=>`<div class="sm" title="${esc(t.basis)}">${esc(short(t.basis))}</div>`).join('');
    }},
    {label:'确认人及更新', r:x=>{
      const list = pts.filter(t=>t.dim===x.dim);
      if(!list.length) return '<span class="mut sm">—</span>';
      return list.map(t=>`<div class="sm">${esc(t.by)}</div><div class="t-sub mono">${esc(t.updated.slice(0,10))} · ${esc(t.src)}</div>`).join('');
    }},
    {label:'操作', r:x=>{
      const list = pts.filter(t=>t.dim===x.dim);
      return `<div class="acts">
        <span class="link" onclick="huGo('logs')">看依据</span>
        <span class="link" onclick="openModal(followModal('${esc(pid)}','archive'),'md-lg')">${list.length?'补充 / 修正':'补充依据'}</span>
      </div>`;
    }},
  ];

  return `
    <div class="note" style="margin-bottom:12px">
      <b>画像 = 我们对这个人的判断，不是他填的简历。</b>
      候选人看不到这一页；只写可验证的行为，每条都能顺着「看依据」追到一次沟通。
      ${dm?`本页「求职意向」对应需求 <b>${esc(dm.post)}</b>（<span class="mono">${esc(dm.code)}</span>）。`:''}
    </div>
    ${table(cols, PT_ROWS)}
    <div class="xs mut" style="margin-top:8px">
      沿用已有画像项目，本轮未新增指标；没有依据的项目显示「待了解」，不填默认值。
      超过 90 天未更新的判断标「已过期」。画像只辅助人工决策，<b>不作自动淘汰依据</b>，也不外发。
    </div>`;
}

/* =======================================================================
   页 3 · 投递跟进（一条投递一个页面）
   -----------------------------------------------------------------------
   「某一次面试失败不代表全部投递失败」—— 所以一单一个地址
   #person/<pid>/apply/<appId>，进度、联系记录、操作都只属于这一单。
   ======================================================================= */
const HU_NODE_NEXT = {
  '新入库': {todo:'先跑匹配，看这一单的硬条件过没过', act:'重算匹配'},
  '已匹配': {todo:'还没联系过，先做第一次触达', act:'记录首次联系'},
  '触达中': {todo:'联系上了，等候选人补资料', act:'发补全链接'},
  '补全中': {todo:'资料已提交，复核后提报客户', act:'复核通过'},
  '待面试': {todo:'已约面试，等到面后登记结果', act:'登记面试结果'},
  '面试通过': {todo:'客户已通过，推进到入职安排', act:'推进到待入职'},
  '待入职': {todo:'已确认入职，安排报到、体检与建档', act:'报到登记'},
  '已入职': {todo:'已到岗；如需补体检或建档材料在这里处理', act:'审核体检'},
  '已淘汰': {todo:'这一单已结束，人员回到人才池；其他投递不受影响', act:'—'},
};
function huApply(p){
  const pid = huPid(p);
  const all = appsOf(pid).slice().sort((x,y)=>(x.status==='跟进中'?0:1)-(y.status==='跟进中'?0:1));
  const actId = HU.appId && all.some(a=>a.id===HU.appId) ? HU.appId : all[0].id;
  const a = P(actId);
  const d = D(a.demandId);
  const idx = NODES.indexOf(a.node);
  const nx = HU_NODE_NEXT[a.node] || {todo:'按流程推进', act:'推进'};
  const fl = FOLLOWS.filter(f=>f.personId===a.id).sort((x,y)=>y.time.localeCompare(x.time));
  const others = all.filter(x=>x.id!==a.id);
  const cnt = fl.length;
  const lastF = fl[0];

  /* 沿用既有六段环节，改成表格：环节 / 当前情况 / 已有记录或结果 / 操作。
     每段只在自己该处理的时候给按钮，点进去才处理 —— 不点一下就自动判完成。 */
  const steps = [
    {n:'匹配',
     now: a.tier? `档位 ${a.tier}` : '尚未运行匹配',
     rec: a.tier? `${a.score} 分 · 硬门槛已通过` : '还没有匹配记录',
     ops:[`<button class="btn xs" onclick="toast('已重算，档位 ${a.tier||'B'}')">重算</button>`,`<button class="btn xs" onclick="openMatchDetail('${a.id}','${d.id}')">看依据</button>`]},
    {n:'触达',
     now: a.lastContact==='—'? '尚未联系' : '已联系',
     rec: a.lastContact==='—'? '本单暂无联系记录' : `上次 ${esc(a.lastContact)} · ${esc(a.lastType)} · 共 ${cnt} 次`,
     ops:[`<button class="btn xs" onclick="openModal(followModal('${a.id}'))">记录联系</button>`,`<button class="btn xs danger" onclick="toast('已标为无意向，人员回到人才池')">标无意向</button>`]},
    {n:'补全复核',
     now: a.node==='补全中'? '等待候选人提交' : (idx>=3? '已复核通过' : '未开始'),
     rec: `资料完整度 ${p.complete}%${idx>=3?' · 12 项因子已更新':''}`,
     ops:[`<button class="btn xs" onclick="toast('补全链接已发送 → 候选人 APP 收到一条待办')">发补全链接</button>`,
       `<button class="btn xs" onclick="copyFillLink('${a.personId}')">复制链接</button>`,
       `<button class="btn xs" onclick="toast('复核通过，12 项因子已更新')">复核通过</button>`]},
    {n:'面试',
     now: ['待面试','面试通过'].includes(a.node)? (a.node==='面试通过'?'客户已确认通过':'已约面试') : '未提报',
     rec: ['待面试','面试通过'].includes(a.node)? '面试安排已登记' : '还没有提报记录',
     ops:[`<button class="btn xs" onclick="toast('已提报客户，等待排期')">提报面试</button>`,`<button class="btn xs" onclick="toast('已登记面试结果')">登记结果</button>`]},
    {n:'入职安排',
     now: a.node==='待入职'? '已确认，等待报到' : (a.node==='已入职'?'已报到':'未开始'),
     rec: a.node==='待入职'||a.node==='已入职'? '报到信息已登记' : '还没有报到记录',
     ops:[`<button class="btn xs" onclick="toast('已推进到下一段')">推进</button>`,`<button class="btn xs danger" onclick="toast('已跳票，人员回到人才池')">跳票回池</button>`]},
    {n:'体检与建档',
     now: a.node==='已入职'? '体检通过，档案已建' : '未开始',
     rec: a.node==='已入职'? '体检报告已审核 · 员工档案已建立' : '还没有体检 / 建档记录',
     ops:[`<button class="btn xs" onclick="toast('体检报告已审核')">审核体检</button>`,`<button class="btn xs" onclick="toast('员工档案已建立')">完成建档</button>`]},
  ];
  const stepState = i => {
    const map = {'新入库':0,'已匹配':1,'触达中':2,'补全中':3,'待面试':4,'面试通过':4,'待入职':5,'已入职':6,'已淘汰':1};
    const cur = map[a.node]||0;
    return i<cur? 'done' : i===cur? 'now' : 'todo';
  };
  /* 表格行：当前环节高亮，todo 段落不给按钮（没到时候，点了就是跳过流程） */
  const rows = steps.map((s,i)=>Object.assign(s, {
    _i:i, _st:stepState(i),
    nameHtml: `<div class="sm"><b>${s.n}</b></div>${stepState(i)==='now'?'<span class="b a">当前</span>':''}`,
    opsHtml: `<div class="acts">${stepState(i)==='todo'?'<span class="xs mut">还没到这一步</span>':s.ops.join('')}</div>`,
  }));
  const stepTbl = table([
    {label:'环节', r:s=>s.nameHtml},
    {label:'当前情况', r:s=>`<span class="sm">${s.now}</span>`},
    {label:'已有记录或结果', r:s=>`<span class="sm mut">${s.rec}</span>`},
    {label:'操作', r:s=>s.opsHtml},
  ], rows);

  const trs = transfersOf(pid);
  const trTbl = trs.length ? table([
    {label:'时间', r:t=>`<span class="sm mono">${esc(t.at)}</span>`},
    {label:'原跟进人', r:t=>`<span class="sm">${esc(t.from)}</span>`},
    {label:'新跟进人', r:t=>`<span class="sm">${esc(t.to)}</span>`},
    {label:'转交范围', r:t=>`<span class="sm">${esc(t.scope||'这个人全部投递')}</span>`},
    {label:'原因', r:t=>`<span class="sm mut">${esc(t.why)}</span>`},
  ], trs) : '<div class="mut sm">这个人的投递还没有转交记录</div>';

  return `
    <div class="arc-top" style="margin-bottom:12px">
      <span class="sm"><b>人员</b> ${esc(p.name)} <span class="xs mut">${esc(p.gender)} · ${p.age}岁 · ${esc(p.phone)}</span></span>
      <span class="sm"><b>当前需求</b> <span class="arc-link" onclick="openDemand('${d.id}')">${esc(d.code)} · ${esc(d.post)}</span></span>
      <span class="sm"><b>岗位</b> ${esc(d.post)}</span>
      <span class="sm"><b>客户</b> ${esc(d.client)}</span>
      <span class="sm"><b>批次</b> ${a.batchId?esc(B(a.batchId).code):'人才池捞入'}</span>
      <span class="sm"><b>当前阶段</b> ${nodeB(a.node)}</span>
      <span class="sm">${statB(a.status)}</span>
    </div>

    <div class="note i" style="margin-bottom:12px">
      <b>这一单现在要做：</b>${esc(nx.todo)}
    </div>

    <div class="sec"><div class="sec-t">跟进环节<span class="perm">负责人 ${esc(a.owner)}</span></div>
      ${stepTbl}
    </div>

    <div class="sec"><div class="sec-t">这一单的联系记录（${fl.length}）</div>
      ${fl.length? `<div class="tl">${fl.map(f=>`<div class="tl-item hot"><div class="tl-d">${esc(f.time)} · ${esc(f.type)} · ${esc(f.staff)}</div>
        <div class="tl-t">${esc(f.note)}</div></div>`).join('')}</div>`
      : '<div class="mut sm">这一单还没有联系记录</div>'}
      <div class="xs mut" style="margin-top:6px">只列这一单的联系；跨需求的合并记录在「沟通记录」。</div>
    </div>

    ${others.length?`<div class="sec"><div class="sec-t">这个人的其他投递（${others.length}）<span class="perm">各走各的，互不影响</span></div>
      ${others.map(x=>{const dd=D(x.demandId); return `<div class="app-row" onclick="huGo('apply','${x.id}')">
        <div style="flex:1"><div class="sm"><b>${esc(dd.post)}</b> <span class="xs mut">· ${esc(dd.client)}</span></div>
          <div class="xs mut mono">${x.batchId?esc(B(x.batchId).code):'人才池捞入'} · ${esc(x.owner)}</div></div>
        ${tierChip(x.tier)} ${nodeB(x.node)}<span class="link xs">看这一单</span></div>`;}).join('')}
      <div class="xs mut" style="margin-top:6px">某一次面试没过，不代表这个人在别的需求上也失败。</div>
    </div>`:''}

    <div class="sec"><div class="sec-t">更多操作</div>
      <div class="acts" style="margin-bottom:10px">
        <button class="btn sm" onclick="openModal(transferModal('${esc(pid)}','${a.id}'))">转交跟进（只作用于这一条投递）</button>
      </div>
      <div class="sec-t" style="margin-top:6px">转交历史（${trs.length}）</div>
      ${trTbl}
      <div class="xs mut" style="margin-top:6px">转交历史不可删除；转回自己也算一条。档案级转交的范围在「转交范围」列标明，不与单条投递的转交混为一事。</div>
    </div>`;
}
function huApplyEmpty(p){
  return `<div class="empty">这个人还没有任何投递 —— 从人才池「捞入批次」后会生成第一条</div>`;
}

/* =======================================================================
   页 4 · 沟通记录（表格）
   -----------------------------------------------------------------------
   沟通时间 / 关联需求或岗位 / 沟通方式 / 内容摘要 / 记录人 / 下次跟进 / 操作。
   默认最近在前；从某条投递进来默认只看那一单，可切成「此人的全部沟通」。
   顶部不再放「共沟通 / 首次 / 最近 / 下次跟进」四个汇总块 —— 表格自己会说。
   建档、上传、转交这些「记录」也在这里（简历页不放它们，但记录不能删）。
   ======================================================================= */
/* 需求筛选：undefined = 跟随当前投递；'*' = 全部；其它 = 指定需求 */
function huLogsFilter(v){
  HU.logsDm = (v === '__all') ? '*' : v;
  refreshTable();
}
function huTalk(p, cs, apps){
  const pid = huPid(p);
  const ups = uploadsOf(pid), tr = transfersOf(pid);
  const apps2 = apps || appsOf(pid);
  const today = TODAY;
  const days = t => Math.round((new Date(today+'T00:00:00') - new Date(t.slice(0,10)+'T00:00:00'))/86400000);

  /* 当前筛选：从投递进来默认只看那一单；切换过就以切换的为准 */
  const auto = (HU.appId && P(HU.appId)) ? P(HU.appId).demandId : '';
  const pick = HU.logsDm === '*' ? '' : (HU.logsDm || auto);
  const dmIds = [...new Set(apps2.map(a=>a.demandId).filter(Boolean))];
  const rows = pick ? cs.filter(c=>c.demandId===pick) : cs;

  const opts = [`<option value="__all" ${pick?'':'selected'}>全部需求的沟通（${cs.length}）</option>`]
    .concat(dmIds.map(id=>`<option value="${esc(id)}" ${pick===id?'selected':''}>${esc(D(id).post)} · ${esc(D(id).client)}（${cs.filter(c=>c.demandId===id).length}）</option>`))
    .join('');

  const cols = [
    {label:'沟通时间', r:c=>`<div class="sm mono">${esc(c.time)}</div><div class="t-sub">${c.time.slice(0,10)===today?'今天':days(c.time)+' 天前'}</div>`},
    {label:'关联需求或岗位', r:c=>c.demandId?`<div class="sm">${esc(D(c.demandId).post)}</div><div class="t-sub mono">${esc(D(c.demandId).code)}</div>`:'<span class="sm mut">未关联需求</span>'},
    {label:'沟通方式', r:c=>`<div class="sm">${esc(c.type)}</div><div class="t-sub">${esc(c.purpose||'—')}</div>`},
    {label:'内容摘要', r:c=>`<div class="sm">${esc(c.concl)}</div>`},
    {label:'记录人', r:c=>`<span class="sm">${esc(c.staff)}</span>`},
    {label:'下次跟进', r:c=>{
      if(!c.next) return '<span class="mut">—</span>';
      const late = c.next < today;
      return `<span class="sm mono" style="${late?'color:var(--bad)':''}">${esc(c.next.slice(5))}${late?' · 已逾期':''}</span>`;
    }},
    {label:'操作', r:c=>`<div class="acts">
      <span class="link" onclick="toast('打开这条沟通的录音 / 截图与全文（演示）')">详情及附件</span>
      ${c.appId?`<span class="link" onclick="huAppTo('${c.appId}')">这一单</span>`:''}
    </div>`},
  ];

  const emptyMsg = pick
    ? '这条投递还没有沟通记录 —— 上方「＋ 新增沟通记录」补一条，或切换为全部需求查看'
    : '这个人还没有沟通记录 —— 上方「＋ 新增沟通记录」补一条';

  /* 档案记录：建档信息压成一行表格，不再占大块 */
  const arch = [
    ['建档时间', `${esc(p.createdAt)} <span class="xs mut">${days(p.createdAt)} 天前</span>`],
    ['建档人', esc(p.createdBy)],
    ['首次进入方式', esc(p.entryMode)],
    ['当前跟进人', `${esc(p.follower||p.createdBy)} <span class="xs mut">${p.follower&&p.follower!==p.createdBy?'（已转交）':'（与建档人一致）'}</span>`],
  ];
  const archTbl = table([{label:'项目', r:r=>`<span class="sm mut">${r[0]}</span>`},
    {label:'内容', r:r=>`<span class="sm">${r[1]}</span>`}], arch);
  const upTbl = table([
    {label:'时间', r:u=>`<span class="sm mono">${esc(u.time)}</span>`},
    {label:'上传人 / 渠道', r:u=>`<div class="sm">${esc(u.staff)}</div><div class="t-sub">${esc(u.channel)}</div>`},
    {label:'版本及文件', r:u=>`<div class="sm">第 ${u.ver} 版 · ${esc(u.file)}</div><div class="t-sub">解析出 ${u.factors} 项</div>`},
    {label:'变化', r:u=>`<span class="sm" style="color:var(--accent2)">${esc(u.diff)}</span>`},
  ], ups, '无上传记录');
  const trTbl = table([
    {label:'时间', r:t=>`<span class="sm mono">${esc(t.at)}</span>`},
    {label:'原跟进人', r:t=>`<span class="sm">${esc(t.from)}</span>`},
    {label:'新跟进人', r:t=>`<span class="sm">${esc(t.to)}</span>`},
    {label:'转交范围', r:t=>`<span class="sm">${esc(t.scope||'这个人全部投递')}</span>`},
    {label:'原因', r:t=>`<span class="sm mut">${esc(t.why)}</span>`},
  ], tr);

  return `
    <div class="toolbar" style="margin-bottom:10px">
      <select class="sel" onchange="huLogsFilter(this.value)">${opts}</select>
      <div class="sp"></div>
      <span class="xs mut">跨投递、跨专员合并 · 权限内可见</span>
    </div>

    ${table(cols, rows, emptyMsg)}

    <div class="sec" style="margin-top:18px"><div class="sec-t">转交历史（${tr.length}）<span class="perm">不与沟通内容混在一起</span></div>
      ${trTbl}
      <div class="xs mut" style="margin-top:6px">转交历史不可删除；转回自己也算一条。</div>
    </div>

    <div class="sec" style="margin-top:18px"><div class="sec-t">档案记录<span class="perm">建档 / 上传，不在简历页</span></div>
      ${archTbl}
      <div class="sec-t" style="margin-top:12px">上传履历（${ups.length} 次）</div>
      ${upTbl}
    </div>`;
}

/* =======================================================================
   页 5 · 资料核实（岗位对照表格）
   -----------------------------------------------------------------------
   核实项目 / 岗位要求 / 已有信息 / 核实结果 / 依据及时间 / 操作。
   判断规则、三态口径完全沿用原来那一套（没有借改版动算法）。
   从人员入口进来而没指定需求时，先选一条投递（huVerifyPick）——
   不指定需求就没有「岗位要求」可对照，硬判就成了猜。
   ======================================================================= */
function huVerifyPage(p){
  const pid = huPid(p);
  const apps = appsOf(pid).filter(a=>a.status==='跟进中');
  const all = apps.length ? apps : appsOf(pid);
  if(!HU.demandId && all.length > 1) return huVerifyPick(p, all);
  const a = HU.demandId ? (appsOf(pid).find(x=>x.demandId===HU.demandId) || all[0] || null) : (all[0]||null);
  const dm = a ? D(a.demandId) : null;
  return `
    <div class="arc-top" style="margin-bottom:12px">
      <span class="sm"><b>当前需求</b> ${dm?esc(dm.post):'未关联需求'}</span>
      ${dm?`<span class="sm mono">${esc(dm.code)}</span>`:''}
      ${dm?`<span class="sm"><b>客户</b> ${esc(dm.client)}</span>`:''}
      ${dm?`<span class="sm"><b>生效版本</b> ${esc((activeVer(dm)||{}).v || '—')}</span>`:''}
      ${a?`<span class="sm"><b>批次</b> ${a.batchId?esc(B(a.batchId).code):'人才池捞入'}</span>`:''}
      <div class="sp"></div>
      ${all.length>1?`<span class="link xs" onclick="huGo('verify')">换一条投递</span>`:''}
    </div>
    ${huVerify(p)}
  `;
}
function huVerifyPick(p, apps){
  return `
    <div class="note i" style="margin-bottom:12px">
      <b>资料核实是按岗位对照的，先选一条投递。</b>
      同一个人投了几个需求，每个岗位要求的证书、城市、到岗时间可能都不一样 ——
      不指定需求就判「符合 / 不符合」，等于替他猜岗位。
    </div>
    ${table([{label:'需求 / 岗位', r:a=>`<div class="sm"><b>${esc(D(a.demandId).post)}</b></div><div class="t-sub mono">${esc(D(a.demandId).code)}</div>`},
      {label:'客户', r:a=>esc(D(a.demandId).client)},
      {label:'当前阶段', r:a=>nodeB(a.node)},
      {label:'批次', r:a=>a.batchId?esc(B(a.batchId).code):'人才池捞入'},
      {label:'操作', r:a=>`<span class="link" onclick="huGo('verify','${a.id}','${a.demandId}')">按这个岗位核实</span>`}], apps)}`;
}

function huVerify(p){
  const pid = huPid(p);
  const v = verifyOf(pid);
  const certs = v.certs || [], c = v.city || {}, a = v.arrive || {}, n = v.night || {};
  const cs = cityStateOf(p);
  const certState = certs.some(x=>x.state==='ok') ? 'ok' : certs.some(x=>x.state==='no') ? 'no' : 'pend';
  const gaps = [];
  if(cs.st === 'pend') gaps.push('愿意工作城市');
  if(!(a.date && a.state==='已确认')) gaps.push('可到岗时间');
  if(n.state !== '已确认愿意' && n.state !== '已确认不愿') gaps.push('夜班意愿');
  if(!certs.some(x=>x.state==='ok')) gaps.push('已核验的证书');

  /* 当前投递对应需求的生效版本（与匹配页同一口径，不能读本单待确认值） */
  const curApp = (HU.appId && P(HU.appId)) ? P(HU.appId) : (appsOf(pid)[0] || null);
  const dm = curApp ? D(curApp.demandId) : null;
  const g = dm ? gateOf(dm) : {};
  const arriveBy = String(g.arriveBy || '').match(/\d{4}-\d{2}-\d{2}/) ? String(g.arriveBy).match(/\d{4}-\d{2}-\d{2}/)[0] : '';
  const av = dm ? activeVer(dm) : null;
  const avTag = av ? `（生效 ${av.v}）` : '';
  const dv = (String(a.date || '').match(/\d{4}-\d{2}-\d{2}/) || [])[0] || '';
  const late = !!(dv && arriveBy && a.state === '已确认' && dv > arriveBy);
  const arrSt = late ? 'no' : (a.state === '已确认' ? 'ok' : 'pend');
  const arriveNote = late
    ? `候选人确认的可到岗日期 ${dv} <b>晚于</b>需求（${esc(dm.post)}）生效版本${avTag}要求的最晚报到日 ${arriveBy}，按日期依据判为<b>已确认不符合</b>。`
    : (a.state === '已确认' ? '' : '没有候选人确认的时间就不算可到岗，与是否有进行中投递无关');

  const cityNeed = cs.dm ? `客户岗位所在城市 ${cs.need}（需求 ${cs.dm.post}）` : '客户岗位所在城市';
  const cityNote = cs.st === 'no'
    ? `客户岗位地点为 ${cs.need}，候选人明确不愿去该地，按依据判为已确认不符合`
    : cs.st === 'ok' ? ''
    : (cs.c.wantState === '已确认' ? '意愿已确认，但缺少对应需求的地点条件，暂不可判定' : '意愿缺失时一律待确认，不按现居地推断');

  const act = (label) => `<div class="acts">
    <span class="link" onclick="toast('打开${label}材料（演示）')">查看</span>
    <span class="link" onclick="openModal(followModal('${esc(pid)}','archive'),'md-lg')">补充</span></div>`;

  const certRow = certs.length
    ? certs.map(x=>[
        `作业证书 <span class="xs mut">${esc(x.name)}</span>`,
        '客户要求的有效证件 <div class="t-sub">技术职称（技师 / 高级技师 / 工程师）不等于作业证书</div>',
        `${esc(x.name)}${x.ev?`<div class="t-sub">${esc(x.ev)}</div>`:''}`,
        tri(x.state),
        `${esc(x.src||'—')}${x.at&&x.at!=='—'?`<div class="t-sub">${esc(x.at)}</div>`:''}${x.state==='ok'?'<div class="t-sub">已核验证件有效</div>':''}`,
        act('证书')
      ])
    : [[
        `作业证书 <span class="xs mut">无证书记录</span>`,
        '客户要求的有效证件 <div class="t-sub">技术职称（技师 / 高级技师 / 工程师）不等于作业证书</div>',
        '<span class="mut">无</span><div class="t-sub">技能栏出现「电工」「电工证书」等词，<b>不得</b>据此判定持证</div>',
        tri('pend'),
        '—<div class="t-sub">证据不足，未核验前不得视为持证</div>',
        act('证书')
      ]];

  const rows = [
    ...certRow,
    [
      '愿意工作城市',
      esc(cityNeed),
      `${esc(cs.want.length?cs.want.join('、'):'未确认')}<div class="t-sub">现居地 ${esc(c.live||'—')}（人员资料，不替代工作意愿）</div>`,
      tri(cs.st),
      `${esc(cs.c.src||'—')}${cs.c.at&&cs.c.at!=='—'?`<div class="t-sub">${esc(cs.c.at)}</div>`:''}${cityNote?`<div class="t-sub">${cityNote}</div>`:''}`,
      act('城市意愿')
    ],
    [
      '可到岗日期',
      dm?`需求最晚报到日 ${esc(arriveBy||'—')}${avTag}`:'需求最晚报到日',
      esc(a.date||'未确认'),
      tri(arrSt),
      `${esc(a.src||'—')}${a.at&&a.at!=='—'?`<div class="t-sub">${esc(a.at)}</div>`:''}${arriveNote?`<div class="t-sub">${arriveNote}</div>`:''}`,
      act('到岗')
    ],
    [
      '夜班意愿',
      '客户班制',
      esc(n.state||'未确认'),
      tri(n.state==='已确认愿意'?'ok':n.state==='已确认不愿'?'no':'pend'),
      `${esc(n.src||'—')}${n.at&&n.at!=='—'?`<div class="t-sub">${esc(n.at)}</div>`:''}${n.state==='已确认不愿'?'<div class="t-sub">候选人明确拒绝，属已确认不符合</div>':''}`,
      act('夜班')
    ],
  ];
  const cols = ['核实项目','岗位要求','已有信息','核实结果','依据及时间','操作'];
  const tbl = `<div class="tbl-wrap hu-tbl"><table><thead><tr>${cols.map(x=>`<th>${x}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${r.map((cell,i)=>`<td${i===0?' class="sm"':''}>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  const conflicts = VER_CONFLICT[p.name] || [];
  const conflictTbl = conflicts.length ? table([
    {label:'核实项目', r:x=>`<span class="sm">${esc(x.need)}</span>`},
    {label:'记录 A', r:x=>`<span class="sm mut">${esc(x.a)}</span>`},
    {label:'记录 B', r:x=>`<span class="sm mut">${esc(x.b)}</span>`},
    {label:'暂定处理', r:()=>'<span class="b w">信息待确认</span>'},
  ], conflicts) : '';

  return `
    ${tbl}

    ${conflicts.length?`<div class="sec" style="margin-top:16px"><div class="sec-t">信息冲突<span class="perm">待核实</span></div>
      ${conflictTbl}
      <div class="xs mut" style="margin-top:6px">两条记录不一致时暂按「信息待确认」处理，不静默选取有利值。</div>
    </div>`:''}

    <div class="sec" style="margin-top:16px"><div class="sec-t">信息缺口（${gaps.length}）</div>
      ${gaps.length
        ? `<div class="sm">${gaps.map(g2=>`<span class="b w" style="margin:0 6px 6px 0">${esc(g2)}</span>`).join('')}
             <span class="xs mut">不当作「符合」，匹配里统一显示为信息待确认。</span></div>`
        : `<div class="sm">硬条件依据齐全，可进入匹配判断。</div>`}
    </div>`;
}

/* ---------- 愿意工作城市的三态（R5 / RG-004 · 第三项） ----------
   「意愿已确认」只说明问过了，**不等于**「符合本岗位地点」：必须与当前查看的这次投递
   对应需求的**生效版本**地点比对，与 assessPerson 第 3 项同一口径。
   否则同一人会在匹配页判不符合、在核实页判符合，两处结论相反。 */
function cityStateOf(p){
  const pid = huPid ? (p.personId || p.id) : p.id;
  const c = (verifyOf(pid) || {}).city || {};
  const huApp = (HU.appId && P(HU.appId)) ? P(HU.appId) : null;
  const curApp = (huApp && huApp.personId === pid) ? huApp
    : (HU.demandId ? (appsOf(pid).find(a=>a.demandId===HU.demandId) || null) : null)
    || (appsOf(pid)[0] || null);
  const dm = (curApp && curApp.demandId) ? D(curApp.demandId) : null;
  const need = (dm && (gateOf(dm) || {}).city) || '';
  const want = c.want || [];
  let st = 'pend';
  if(c.wantState === '已确认' && want.length && need){
    st = want.some(x => need.includes(x)) ? 'ok' : 'no';
  }
  return { c, want, need, dm, st };
}
/* 按姓名索引：同一手机号重复投递复用同一档案 id，硬编码 PE00X 会错位 */
const VER_CONFLICT = {
  '马长青':[{need:'电工特种作业操作证是否在有效期',
          a:'简历技能栏写「电工证书」', b:'2026-11-13 电话：「证过期了，正在复审」'}],
  '陈志强':[{need:'低压电工证证件信息是否可辨',
          a:'简历附件上传了证书照片', b:'照片模糊，证件号与发证日期看不清'}],
};

/* ---------- 转交跟进 ----------
   从「投递跟进」页进来时带 appId：转交范围锁定为这一条投递，不影响这个人的其他投递。
   从人员档案层面转交（没有 appId）时，范围可以是这个人的全部投递 —— 两种含义分开记。 */
function transferModal(pid, appId){
  const p = appPerson(pid);
  const a = appId ? P(appId) : null;
  const d = a ? D(a.demandId) : null;
  const staff = ['李文静','陈曦','王浩','金诚'].filter(n=>n!==(p.follower||p.createdBy));
  return `<div class="md-h"><div><h3>转交跟进 · ${esc(p.name)}${d?' · '+esc(d.post):''}</h3>
    <p>${a?`本次转交只作用于这一条投递（${esc(d.code)}）；这个人的其他投递仍由原负责人跟进。`
        :`当前跟进人 ${esc(p.follower||p.createdBy)} · 转交后原负责人不再收到该人的待办`}</p></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="frow">
      <div class="field"><label>转给<i>*</i></label>
        <select id="trTo">${staff.map(n=>`<option>${n}</option>`).join('')}</select></div>
      <div class="field"><label>转交范围</label>
        ${a?`<div class="sm" style="padding:9px 0">只转这一条投递（${esc(d.code)}）</div>
             <input type="hidden" id="trScope" value="只转这一条投递">`
          :`<select id="trScope"><option>这个人全部投递</option><option>只转最近这一条投递</option></select>`}</div>
    </div>
    <div class="field"><label>原因<i>*</i></label>
      <select id="trWhy"><option>我请假 / 不在岗</option><option>人太多跟不过来</option><option>技能不匹配，换人更合适</option><option>其他（写在备注）</option></select></div>
    <div class="field"><label>备注</label><input id="trNote" placeholder="例：我请假两天，先让她跟，回来转回"></div>
    <div class="note">转交会写一条流水（谁转给谁、时间、范围、原因），<b>不可删除</b>；想收回就再转一次给自己，同样留痕。</div>
  </div>
  <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" onclick="trDo('${esc(pid)}','${a?a.id:''}')">确认转交</button></div>`;
}
function trDo(pid, appId){
  const to = document.getElementById('trTo').value;
  const why = document.getElementById('trWhy').value;
  const note = (document.getElementById('trNote').value||'').trim();
  const scope = (document.getElementById('trScope')||{}).value || '这个人全部投递';
  const p = appPerson(pid);
  const a = appId ? P(appId) : null;
  const from = p.follower || p.createdBy;
  p.follower = to;
  TRANSFERS.unshift({personId:pid, from, to, at:TODAY+' '+new Date().toTimeString().slice(0,5),
    why: note?why+' · '+note:why, scope,
    demandId: a ? a.demandId : null});
  closeAll();
  huPaint();
  toast(`已转交：${from} → ${to}（${scope}），流水已记`);
}

/* ---------------- AI 找候选人 ---------------- */
let AI = {did:null, age:'', city:'', cert:'', arrived:'', picked:{}};

function aiFindModal(){
  AI = {did:(AI.did || (DEMANDS.find(d=>d.id!=='D6')||{}).id), age:AI.age||'', city:AI.city||'', cert:AI.cert||'', arrived:AI.arrived||'', picked:{}};
  const dem = DEMANDS.filter(d=>d.status==='招聘中');
  const r = aiRank(AI.did);
  const groups = ['S','A','B','C','D'];
  return `<div class="md-h"><div><h3>AI 找候选人</h3>
    <p>选需求 → 硬条件预筛 → AI 跑全池 → 你只负责勾选采纳</p></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="field"><label>目标需求<i>*</i></label>
      <select onchange="AI.did=this.value;aiRefresh()">${dem.map(d=>`<option value="${d.id}" ${d.id===AI.did?'selected':''}>${esc(d.post)} · ${esc(d.client)} · 缺口 ${d.head-d.hired}</option>`).join('')}</select>
      <div class="hint">硬门槛走结构化筛选（不走 AI）：城市 / 年龄 / 证书 / 可到岗</div></div>

    <div class="ai-pre">
      <select onchange="AI.city=this.value;aiRefresh()"><option value="">全部城市</option>${[...new Set(DEMANDS.map(d=>d.city))].map(c=>`<option ${AI.city===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
      <select onchange="AI.age=this.value;aiRefresh()"><option value="">全部年龄</option><option value="35" ${AI.age==='35'?'selected':''}>35 岁以下</option><option value="45" ${AI.age==='45'?'selected':''}>45 岁以下</option></select>
      <select onchange="AI.cert=this.value;aiRefresh()"><option value="">证书不限</option><option ${AI.cert==='电工'?'selected':''}>需电工证</option><option ${AI.cert==='焊工'?'selected':''}>需焊工证</option></select>
      <select onchange="AI.arrived=this.value;aiRefresh()"><option value="">到岗不限</option><option ${AI.arrived==='now'?'selected':''}>本周可到</option></select>
    </div>

    <div class="ai-flow" id="aiFlow">${aiFlowHtml(r)}</div>
    <div id="aiList">${aiListHtml(r)}</div>
  </div>
  <div class="md-f"><span class="sm mut" id="aiSel" style="margin-right:auto">已选 0 人</span>
    <button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" id="aiGo" onclick="aiAdopt()">捞入批次</button></div>`;
}

/* 召回 + 打分（演示口径：技能命中 + 完成度 + 履历稳定） */
function aiRank(did){
  const d = D(did);
  const keys = {
    D1:['售后','设备','调试','电气','PLC'], D2:['激光','装配','光路','光电'], D3:['IQC','检验','卡尺','千分尺','品质'],
    D4:['电工','船舶','舾装','船厂'], D5:['总装','装配','流水线','组装'], D6:['售后','3C','客服'],
    D7:['CNC','对刀','FANUC','三菱','加工中心'], D8:['钳工','装配','光伏','机修'],
  }[did] || [];
  let pool = PEOPLE.filter(p=>!p.blacklist);
  const total = pool.length;
  if(AI.city) pool = pool.filter(p=>(p.city||'').includes(AI.city.split('·')[0]));
  if(AI.age) pool = pool.filter(p=>p.age<=Number(AI.age));
  if(AI.cert==='电工') pool = pool.filter(p=>p.skills.some(s=>s.includes('电工'))||p.skills.some(s=>s.includes('电气')));
  if(AI.cert==='焊工') pool = pool.filter(p=>p.skills.some(s=>s.includes('焊')));
  if(AI.arrived==='now') pool = pool.filter(p=>!activeAppsOf(p.id).length);
  const pre = pool.length;

  const scored = pool.map(p=>{
    const hit = keys.filter(k=>p.skills.some(s=>s.includes(k)||k.includes(s)));
    let score = 52 + hit.length*13 + Math.round((p.complete-70)/4);
    const apps = appsOf(p.id);
    if(apps.some(a=>a.node==='已入职')) score = 0;
    score = Math.max(0, Math.min(97, score));
    const tier = score>=85?'S':score>=80?'A':score>=60?'B':score>=40?'C':'D';
    const bad = apps.find(a=>a.node==='已淘汰'||a.status==='无意向');
    return {p, score, tier, hit, total, pre, bad,
      short: hit.length>=keys.length? '' : '未命中：'+keys.filter(k=>!hit.includes(k)).slice(0,2).join('、')};
  }).filter(x=>x.p.id && x.score>0).sort((a,b)=>b.score-a.score).slice(0,14);
  return {list:scored, total, pre, keys};
}

function aiFlowHtml(r){
  return `<div class="ai-stat"><span>全池 <b>${r.total}</b> 人</span><span class="ar">→</span>
    <span>硬条件预筛 <b>${r.pre}</b> 人</span><span class="ar">→</span>
    <span>AI 精排 <b>${r.list.length}</b> 人</span>
    <span class="mut xs" style="margin-left:auto">技能命中 ${esc((r.keys||[]).join('、'))}</span></div>`;
}

function aiListHtml(r){
  const groups = ['S','A','B','C','D'];
  return groups.map(g=>{
    const list = r.list.filter(x=>x.tier===g);
    if(!list.length) return '';
    const label = {S:'强匹配',A:'匹配',B:'可用',C:'需补强',D:'不建议'}[g];
    return `<div class="ai-grp"><div class="ai-grp-h">
        <span class="tier ${g}">${g}</span><span class="sm">${label}</span>
        <span class="sm mut">${list.length} 人</span>
        <span class="link xs" style="margin-left:auto" onclick="aiPickGroup('${g}')">${g==='S'||g==='A'?'全选本组':''}</span>
      </div>
      ${list.map(x=>`<div class="ai-row">
        <input type="checkbox" class="ai-ck" ${AI.picked[x.p.id]?'checked':''} onchange="aiPick('${x.p.id}',this.checked)">
        <div style="flex:1;min-width:0">
          <div class="sm"><b class="arc-link" onclick="openArchive('${x.p.id}','profile')">${esc(x.p.name)}</b>
            <span class="xs mut">${x.p.age}岁 · ${esc(x.p.channel)} · ${x.p.complete}%</span>
            ${x.bad?`<span class="b w" title="推荐时带避坑提示">避坑</span>`:''}</div>
          <div class="xs mut">${x.hit.length?`命中 ${esc(x.hit.join('、'))}`:''}${x.short?' · '+esc(x.short):''}</div>
          ${x.bad?`<div class="ai-pit">曾被 ${esc(x.bad.owner)} 淘汰：${esc(x.bad.reason||'期望薪资超出上限')}（${esc(x.bad.lastContact.slice(5,10))}）</div>`:''}
        </div>
        <div class="ai-score"><b>${x.score}</b><span>${x.tier}</span></div>
      </div>`).join('')}</div>`;
  }).join('') + (r.list.length?'':'<div class="mut sm" style="padding:14px">没有符合条件的候选人，放宽预筛条件试试</div>');
}

function aiRefresh(){
  const r = aiRank(AI.did);
  document.getElementById('aiFlow').innerHTML = aiFlowHtml(r);
  document.getElementById('aiList').innerHTML = aiListHtml(r);
  aiSum();
}
function aiPick(id, on){ if(on) AI.picked[id]=true; else delete AI.picked[id]; aiSum(); }
function aiPickGroup(g){
  aiRank(AI.did).list.filter(x=>x.tier===g).forEach(x=>AI.picked[x.p.id]=true);
  aiRefresh();
}
function aiSum(){
  const n = Object.keys(AI.picked).length;
  const el = document.getElementById('aiSel'), go = document.getElementById('aiGo');
  if(el) el.textContent = '已选 ' + n + ' 人';
  if(go) go.textContent = n? '捞入批次（'+n+'）+ 生成投递' : '先勾选候选人';
}
function aiAdopt(){
  const n = Object.keys(AI.picked).length;
  if(!n) return toast('请先勾选候选人');
  closeAll();
  toast('已采纳 '+n+' 人：写入批次并生成投递，AI 推荐已留痕');
}

/* ---------------- 记录联系（含 MP3 / 截图 AI 解析） ---------------- */
function followModal(pid, from){
  const p = P(pid) || appPerson(pid) || {name:'该人员', id:pid};
  const isArch = from==='archive';
  return `<div class="md-h"><div><h3>记录联系 · ${esc(p.name)}</h3>
    <p>可手填，也可上传录音 / 截图让 AI 解析，确认后回写画像</p></div><button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="frow">
      <div class="field"><label>联系方式<i>*</i></label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${['电话','微信','线下见面','短信'].map((t,i)=>`<span class="chip ${i===0?'on':''}" onclick="pickChip(this)">${t}</span>`).join('')}
        </div></div>
      <div class="field"><label>沟通目的<i>*</i></label>
        <select>${PURPOSES.map(x=>`<option>${x}</option>`).join('')}</select></div>
    </div>

    <div class="field"><label>沟通结论<i>*</i></label>
      <textarea placeholder="例：接受 12 月初到岗，约周四上午线下面试">接受 12 月初到岗，约周四上午线下面试</textarea>
      <div class="hint">必填。时间线上只写“打了个电话”对下一个人没有价值</div></div>

    <div class="field"><label>上传录音 / 截图（选填）</label>
      <div class="up-drop">
        <div class="up-t">MP3 / m4a 录音 · 微信截图 · 现场照片</div>
        <div class="xs mut">单条 ≤ 20 分钟 · 单张 ≤ 10MB</div>
        <div class="up-files">
          <span class="up-file">通话录音_1113.mp3 <i>12:40</i> <b>解析完成</b></span>
          <span class="up-file">微信截图_1113.png <i>—</i> <b>解析完成</b></span>
        </div>
      </div>
      <label class="up-consent"><input type="checkbox" checked> 已告知对方并取得同意（录音属敏感个人信息，未勾选不允许上传）</label>
      <div class="hint" style="margin-top:6px">手机端上传<b>本期不做</b>：录音请先在手机上导出/传到电脑，再从电脑端这条记录上传。录音长期保留，候选人要求删除时按删除申请处理。</div>
    </div>

    <div class="ai-res">
      <div class="ai-res-h">AI 解析结果 · 抽出 6 项，<b>4 项待确认</b>
        <span class="xs mut" style="margin-left:auto">高置信默认勾选，低置信默认不勾</span></div>
      <div class="ai-item"><span class="ai-q">“我这边下个月初就能走，周四上午过去看看”</span>
        <div class="ai-v"><span class="b g">可到岗 12-05</span><span class="link xs">确认</span><span class="link xs mut">忽略</span></div></div>
      <div class="ai-item"><span class="ai-q">“工资能不能到 36”</span>
        <div class="ai-v"><span class="b w">期望薪资 36 元/时（档案记 32-36，不覆盖）</span><span class="link xs">确认</span><span class="link xs mut">忽略</span></div></div>
      <div class="ai-item"><span class="ai-q">“加班太多我可能不太行，最好别排夜班”</span>
        <div class="ai-v"><span class="b w">画像判断 · 适配：不接受夜班（低置信，默认不勾）</span><span class="link xs">确认</span><span class="link xs mut">忽略</span></div></div>
      <div class="ai-item"><span class="ai-q">“周四上午十点，我准时到”</span>
        <div class="ai-v"><span class="b i">待办：11-14 10:00 面试提醒</span><span class="link xs">确认</span><span class="link xs mut">忽略</span></div></div>
      <div class="xs mut" style="margin-top:8px">事实类需你确认才写入（不静默覆盖）；判断类只进画像并标「AI 推断」；待办类自动进首页重点关注。原文录音与转写全文留在这条记录上，可回听。</div>
    </div>

    <div class="frow">
      <div class="field"><label>下次跟进</label><input type="date" value="2026-11-14"></div>
      <div class="field"><label>标记重点</label><select><option>不标记</option><option>标记为重点关注</option></select></div>
    </div>
  </div>
  <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" onclick="closeAll();toast('已保存：时间线 +1 条，画像 2 项已更新，待办已生成')">保存并回写</button></div>`;
}
