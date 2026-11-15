/* ===== 共用列表页：需求 / 批次 / 人员 / 人才池 / 操作记录 ===== */

/* ---------- 需求列表 ----------
   招聘专员看的是「我在这一单上的活」：我背几个人、已入职几个、还差几个、我手里几份简历。
   整单人数 / 整单已入职 / 总缺口不是他的口径，留着只会让人以为自己要补 12 个人（2026-11-15 第七批）。
   整单口径进需求详情顶部，这里一格都不出现。 */
function dmMyTask(d){
  const a = allocOf(d.id).find(x=>x.staff===S.who) || { qty:0, hired:0, target:'—' };
  const mine = dmMine(d.id);
  return { qty:a.qty, hired:a.hired, left:Math.max(0, a.qty - a.hired), resumes:mine.length, target:a.target };
}
function demandsPage(){
  const isR04 = S.role==='R04', isR02 = S.role==='R02';
  let rows = DEMANDS.slice();
  if(isR04) rows = rows.filter(d => allocOf(d.id).some(a=>a.staff===S.who));
  if(isR02) rows = rows.filter(d => ['D1','D2','D4','D6','D7'].includes(d.id) || d.isNew);
  const q = (S.f.q||'').trim(), st = S.f.st||'';
  if(q) rows = rows.filter(d => (d.post+d.client+d.project+d.code).includes(q));
  if(st) rows = rows.filter(d => d.status===st);

  const actions = isR04
    ? `<button class="btn" onclick="toast('已按缺口排序')">按缺口排序</button><button class="btn" onclick="toast('已导出 4 条需求')">导出</button>`
    : `<button class="btn pri" onclick="ndEnter()">＋ 新建需求</button><button class="btn" onclick="toast('已导出需求清单')">导出</button>`;

  /* 公共操作三件套顺序固定：查看简历 → 传简历 → 人才库找人（管理端再加「分配需求」） */
  const acts = d => `<div class="acts">
    <span class="link" onclick="event.stopPropagation();openDemand('${d.id}','resume')" title="进这一单的简历明细（只看我当前跟进的人）">查看简历</span>
    <span class="link" onclick="event.stopPropagation();openModal(uploadNewBatchModal(),'md-lg')">传简历</span>
    <span class="link" onclick="event.stopPropagation();findInPool('${d.id}')" title="进人才池完整筛选页，带入这一单的岗位条件">人才库找人</span>
    ${isR04?'':`<span class="link" onclick="event.stopPropagation();openAlloc('${d.id}')">分配需求</span>`}
  </div>`;

  const cols = isR04 ? [
    {label:'需求 / 岗位', r:d=>`<div class="t-name"><span class="link-post" title="点开进入这条需求的独立详情页（需求明细 / 简历明细 / 招聘进度）" onclick="openDemand('${d.id}','detail')">${esc(d.post)}</span></div><div class="t-sub"><span class="arc-link mono" onclick="openDemand('${d.id}','detail')">${esc(d.code)}</span> · ${esc(d.client)}</div>`},
    {label:'项目', r:d=>`<div class="sm">${esc(d.project)}</div><div class="t-sub">${esc(d.city)}</div>`},
    {label:'我的目标', r:d=>{ const t = dmMyTask(d);
      return `<div class="num"><b>${t.qty}</b> 人</div><div class="t-sub">已入职 <b>${t.hired}</b> · 缺口 <b style="color:${t.left?'var(--bad)':'var(--good)'}">${t.left}</b></div>`;}},
    {label:'我的简历', r:d=>{ const t = dmMyTask(d);
      return `<div class="num"><b>${t.resumes}</b> 份</div><div class="t-sub">我当前跟进</div>`;}},
    {label:'最迟到岗', r:d=>`<div class="mono sm">${esc(d.deadline)}</div><div class="t-sub">${d.deadline<'2026-11-25'?'<span style="color:var(--bad)">临期</span>':'时效正常'}</div>`},
    {label:'客户确认', r:d=>`${confirmB(d.confirm)}<div class="t-sub">${d.confirm==='已确认'?'客户已认口径':'可先找简历'}</div>`},
    {label:'状态', r:d=>demandB(d.status)},
    {label:'操作', r:acts},
  ] : [
    {label:'需求 / 岗位', r:d=>`<div class="t-name"><span class="link-post" title="点开进入这条需求的独立详情页（需求明细 / 简历明细 / 招聘进度）" onclick="openDemand('${d.id}','detail')">${esc(d.post)}</span></div><div class="t-sub"><span class="arc-link mono" onclick="openDemand('${d.id}','detail')">${esc(d.code)}</span> · ${esc(d.client)}</div>`},
    {label:'项目', r:d=>`<div class="sm">${esc(d.project)}</div><div class="t-sub">${esc(d.city)}</div>`},
    {label:'整单人数 / 缺口', r:d=>`<div class="num"><b>${d.head}</b> 人</div><div class="t-sub">缺口 <b style="color:var(--bad)">${d.head-d.hired}</b> · 已入职 ${d.hired}</div><div class="t-sub" style="color:var(--ink2)">在投 <b>${personsOf(d.id).length}</b></div>`},
    {label:'分配', r:d=>{
      const a = allocOf(d.id);
      return a.length? `<div class="sm">${a.length} 人分摊</div><div class="t-sub">${a.map(x=>x.staff).join(' / ')}</div>` : '<span class="b w">未分配</span>';
    }},
    {label:'最迟到岗', r:d=>`<div class="mono sm">${esc(d.deadline)}</div><div class="t-sub">${d.deadline<'2026-11-25'?'<span style="color:var(--bad)">临期</span>':'时效正常'}</div>`},
    {label:'客户确认', r:d=>`${confirmB(d.confirm)}<div class="t-sub">${d.confirm==='已确认'?'客户已认口径':'可先找简历'}</div>`},
    {label:'状态', r:d=>demandB(d.status)},
    {label:'操作', r:acts},
  ];

  const sl = pageSlice('demands', rows);
  return `<div class="page">
    ${head('需求列表', isR04? '我参与招聘的需求 · 只算我自己的目标与简历 · 点岗位名或编号进入独立详情页' : '客户确认后落下的可执行需求 · 一个需求一个岗位一个人数', actions)}
    ${toolbar({q:'搜索岗位 / 客户 / 项目 / 编号', filters:[{k:'st',opts:[{v:'',label:'全部状态'},{v:'招聘中',label:'招聘中'},{v:'待分配',label:'待分配'},{v:'已完成',label:'已完成'}]}], right:`<span class="sm mut">共 ${rows.length} 条</span>`})}
    ${table(cols, sl.rows)}
    ${pagerBar('demands', sl, '条')}
  </div>`;
}

/* ---------- 列表顶部「我要干的事」已移除（v1.3 · RG-012）----------
   原来的三张卡（待面试 / 入职跟进 / 意向跟进）+ 系统提醒放在需求列表最上面，
   占掉首屏却只对 R04 有用，R01/R02 打开列表第一眼看不到需求。
   现在：能力留在独立工作台「我的首页」的第二张卡「需要我跟的事」里（同一份分阶段名单，
   点人名直接进人详情，数量与列表一致），列表本身只放记录。
   不要在这里加回任何卡片 / 待办 / 汇总数字 —— 要加就先改 Issue #6 的 AC-1。 */

/* ---------- 批次列表 ----------
   批次是招聘专员每天的工作单元。这一页回答两件事：这批收了没有、这批跟到哪了。
   所以字段只说「已联系 / 待联系」「跟进结果」，不再用「战果」这种打鸡血又含糊的词。
   已关闭 = 结束新增收集，不是结束跟进：关闭批次的人还在需求下继续走面试与入职，
   所以关闭批次不给上传入口，只给「新增到今日批次」—— 新简历永远不会落到关闭的批次里。 */
function sameDayCount(b){ return BATCHES.filter(x=>x.demandId===b.demandId && x.date===b.date).length; }
function sameDaySeq(b){ return BATCHES.filter(x=>x.demandId===b.demandId && x.date===b.date).sort((p,q)=>p.code.localeCompare(q.code)).findIndex(x=>x.id===b.id)+1; }
/* 一条批次有两个数，口径不同、都不能凑：
     新增 N 份 = 上传/下载记录（b.boss+b.manual+pool），是「收了多少份文件」
     已建档 M 人 = 真正落成投递的人（PERSONS 里 batchId 指向它），是「进来多少个人」
   同一批里重复简历、格式不对被退回的，只算份不算人 —— 所以两个数允许不相等。 */
function batchUploaded(b){ return b.boss+b.manual+b.pool; }
function batchFiled(b){ return PERSONS.filter(p=>p.batchId===b.id).length; }
function batchesPage(){
  const isR04 = S.role==='R04';
  let rows = BATCHES.slice();
  if(isR04) rows = rows.filter(b=>b.owner===S.who);
  const q=(S.f.q||'').trim(), st=S.f.st||'', ow=S.f.ow||'', day=S.f.day||'', dmF=S.f.dm||'';
  const mine = rows.slice();                      /* 筛需求下拉只列这一页能看到的批次所属需求 */
  if(q) rows = rows.filter(b=>(b.code+D(b.demandId).post).includes(q));
  if(st) rows = rows.filter(b=>b.status===st);
  if(ow) rows = rows.filter(b=>b.owner===ow);
  if(dmF) rows = rows.filter(b=>b.demandId===dmF);
  if(day==='today') rows = rows.filter(b=>b.date===TODAY);
  if(day==='7d'){
    const from = new Date(TODAY+'T00:00:00'); from.setDate(from.getDate()-6);
    const key = from.toISOString().slice(0,10);
    rows = rows.filter(b=>b.date>=key);
  }
  rows.sort((a,b)=>b.date.localeCompare(a.date) || a.code.localeCompare(b.code));

  /* 这一页不再挂「从人才池捞人 / 传简历建批次 / 补建批次」三个按钮：
     批次不是在这儿起头的 —— 简历从需求详情或人才池进来，系统自己按「需求+日期」建批。
     顶部三个按钮既重复又把人往「先建批再找人」的错顺序上带。
     能力都还在：传简历 / 新增到今日批次在行内，人才库找人在行内，捞人在人才池页，
     补建批次在「我的首页 → 需要我跟的事」。 */
  const actions = '';

  const cols = [
    {label:'批次名称', r:b=>`<div class="t-name mono arc-link" style="font-size:15px" onclick="event.stopPropagation();openBatchPersons('${b.id}')">${esc(b.code)}</div><div class="t-sub">${b.date}${b.date===TODAY?' · <span style="color:var(--accent)">今天</span>':''}${sameDayCount(b)>1?' · 同日第 '+sameDaySeq(b)+' 批':''}</div>`},
    {label:'所属需求', r:b=>`<div class="sm">${esc(D(b.demandId).post)}</div><div class="t-sub">${esc(D(b.demandId).client)}</div>`},
    ...(isR04?[]:[{label:'负责人', r:b=>`<span class="sm">${esc(b.owner)}</span>`}]),
    {label:'来源构成', r:b=>{const ch=batchChannels(b), cap=batchUploaded(b), filed=batchFiled(b);
      /* 渠道统计有两种口径，必须标清在数什么，不能混挂在一个数字下面：
          有人建档 → batchChannels 数的是「已建档的人」按渠道，合计 = 已建档人数
          没人建档 → 数的是「收进来的份」按来源，合计 = 新增份数
         以前两种都挂在「N 份」下、出入再补一句「含去重」，读起来像 25 份里只有 6 份有来源（2026-11-15 第七批修正） */
      const byPerson = PERSONS.some(p=>p.batchId===b.id);
      const chStr = ch.slice(0,3).map(([n,c])=>esc(n)+' '+c).join(' · ') + (ch.length>3?' +'+(ch.length-3):'');
      return `<div class="num"><b>${cap}</b> 份</div>
        <div class="t-sub">${byPerson?`已建档 <b>${filed}</b> 人：${chStr||'—'}`:`份来源：${chStr||'—'}`}</div>
        ${byPerson?'':`<div class="t-sub" style="color:var(--ink2)">已建档 <b>${filed}</b> 人</div>`}`;}},
    {label:'触达进度', r:b=>{const cap=batchUploaded(b); const wait = Math.max(0, cap-b.touched);
      return `<div class="barline"><div class="bar ${wait===0?'g':b.touched/cap>.8?'g':''}"><i style="width:${cap?pct(b.touched,cap):0}%"></i></div><b>${pct(b.touched,cap)}%</b></div>
        <div class="t-sub">已联系 <b>${b.touched}</b> · 待联系 <b style="color:${wait?'var(--bad)':'var(--good)'}">${wait}</b></div>`;}},
    {label:'跟进结果', r:b=>`<div class="sm">有意向 <b>${b.intent}</b> · 面试 <b>${b.interview}</b></div><div class="t-sub">到面 ${b.arrived}</div>`},
    {label:'状态', r:b=>b.status==='进行中'?'<span class="b i">进行中</span>':'<span class="b n">已关闭</span>'},
    {label:'操作', r:b=>`<div class="acts">
      <span class="link" onclick="event.stopPropagation();openBatchPersons('${b.id}')">查看简历</span>
      ${b.status==='进行中'
        ? `<span class="link" onclick="event.stopPropagation();openModal(uploadModal('${b.id}'),'md-lg')">传简历</span>`
        : `<span class="link" title="这批已关闭，不再收新简历；新简历进今天的批次" onclick="event.stopPropagation();openModal(uploadNewBatchModal(),'md-lg')">新增到今日批次</span>`}
      <span class="link" onclick="event.stopPropagation();findInPool('${b.demandId}')">人才库找人</span>
    </div>`},
  ];

  const dmOpts = [...new Set(mine.map(b=>b.demandId))].map(id=>({v:id,label:D(id).post}));
  const sl = pageSlice('batches', rows);
  return `<div class="page">
    ${head('批次列表', isR04
      ? '只列我自己的批次 · 一个需求一天一个批次（同日同需求可建多个）· 点批次名看这一批的完整简历列表'
      : '批次 = 招聘专员每天的工作单元：一个需求一天一个批次（同日同需求可建多个）；不用手工建批，传简历 / 捞人时系统自动建', actions)}
    ${toolbar({q:'搜索批次号 / 岗位', filters:[
      {k:'dm',opts:[{v:'',label:'全部需求'},...dmOpts]},
      {k:'day',opts:[{v:'',label:'全部日期'},{v:'today',label:'今天'},{v:'7d',label:'近 7 天'}]},
      {k:'st',opts:[{v:'',label:'全部状态'},{v:'进行中',label:'进行中'},{v:'已关闭',label:'已关闭'}]},
      ...(isR04?[]:[{k:'ow',opts:[{v:'',label:'全部负责人'},...['李文静','陈曦','王浩'].map(n=>({v:n,label:n}))]}])
    ], right:`<span class="sm mut">共 ${rows.length} 个批次</span>`})}
    ${table(cols, sl.rows)}
    ${pagerBar('batches', sl, '个批次')}
  </div>`;
}

/* ---------- 人员列表 ---------- */
function personsPage(){
  const isR04 = S.role==='R04';
  let rows = PERSONS.slice();
  /* 「我名下」= 这一单里我当前跟进的人，与需求详情的「简历明细」同一口径（dmWhoFollows）。
     以前按 p.owner 筛，而演示数据里同一单的 owner 是常量，会把同事跟进的人一起算进来。 */
  if(isR04) rows = rows.filter(p=>dmWhoFollows(p)===S.who);
  const q=(S.f.q||'').trim(), nd=S.f.nd||'', dm=S.f.dm||'', ow=S.f.ow||'', stt=S.f.st||'', triF=S.f.tri||'';
  if(q) rows = rows.filter(p=>(p.name+p.phone+p.skills.join('')).includes(q));
  if(stt) rows = rows.filter(p=>p.status===stt);
  if(nd) rows = rows.filter(p=>p.node===nd);
  if(dm) rows = rows.filter(p=>p.demandId===dm);
  if(ow) rows = rows.filter(p=>p.owner===ow);
  /* 硬条件筛选：按「该人 × 该需求」的逐项判定汇总值过滤，
     口径与「硬条件」列完全同源（assessPerson + triSum），避免下拉框形同虚设。 */
  if(triF) rows = rows.filter(p=>triSum(assessPerson(p, D(p.demandId))) === triF);

  /* 三态统计卡（在跟 / 待面试 / 待入职 / 已入职）已挪进工具栏当筛选（v1.3 · RG-012 第三批）。
     原来卡片上的数字含「面试通过」，点下去却只筛 node==='待面试'，数字和列表对不上；
     现在按组筛：待面试 = 待面试 + 面试通过，与数字同源。计数在分组筛选之前算，避免自己把自己筛没。 */
  const ng = S.f.ng || '';
  const base = rows.slice();
  const cnt = {
    follow: base.filter(p=>p.status==='跟进中').length,
    itv:    base.filter(p=>['待面试','面试通过'].includes(p.node)).length,
    onb:    base.filter(p=>p.node==='待入职').length,
    hired:  base.filter(p=>p.node==='已入职').length,
  };
  if(ng==='follow') rows = rows.filter(p=>p.status==='跟进中');
  if(ng==='itv')    rows = rows.filter(p=>['待面试','面试通过'].includes(p.node));
  if(ng==='onb')    rows = rows.filter(p=>p.node==='待入职');
  if(ng==='hired')  rows = rows.filter(p=>p.node==='已入职');

  /* 简单跟进筛选（2026-11-15 第八批）：今天待跟进 / 已逾期。
     只算还在跟的人 —— 已入职、已结束（无意向 / 已淘汰）不进入待跟进范围，
     否则每天都有一堆「早就结束的人」压在逾期里，真正的待办就被埋掉了。 */
  const fu = S.f.fu || '';
  if(fu) rows = rows.filter(p=>p.status==='跟进中' && p.nextFollow!=='—');
  if(fu==='today') rows = rows.filter(p=>p.nextFollow===TODAY);
  if(fu==='late')  rows = rows.filter(p=>p.nextFollow<TODAY);

  /* 这一页不再挂「导出 / ＋加人」：人是从「传简历 / 人才库找人」进来的，
     在人员列表里凭空加一个人，会绕开批次与需求，也不是这一页要干的事。 */
  const actions = '';

  const cols = [
    {label:'姓名', r:p=>{const n=otherApps(p).length;
      return `<div class="t-name"><span class="arc-link" onclick="event.stopPropagation();openPerson('${p.id}')">${esc(p.name)}</span> <span class="t-sub" style="display:inline">${p.gender} · ${p.age}岁</span>${n?` <span class="b a" title="该人还有 ${n} 条投递">同投 ${n+1}</span>`:''}</div><div class="t-sub mono">${esc(p.phone)}</div>`;}},
    {label:'技能', r:p=>`<div class="tags">${p.skills.slice(0,2).map(s=>`<span class="tg">${esc(s)}</span>`).join('')}${p.skills.length>2?`<span class="tg">+${p.skills.length-2}</span>`:''}</div>`},
    {label:'所属需求 / 批次', r:p=>`<div class="sm">${esc(D(p.demandId).post)}</div><div class="t-sub mono">${p.batchId?B(p.batchId).code:'人才池捞入'}</div>`},
    {label:'当前节点', r:p=>nodeB(p.node)},
    {label:'硬条件', r:p=>{
      const d = D(p.demandId), items = assessPerson(p, d), sum = triSum(items);
      const bad = items.filter(i=>i.state!=='ok' && !i.soft);
      return `<div style="cursor:pointer" onclick="event.stopPropagation();openMatchDetail('${p.id}','${d.id}')" title="点开看逐项依据">
        ${triS(sum)}<div class="t-sub">${bad.length?bad.length+' 项待核 / 不符':'全部已核实'}</div></div>`;
    }},
    {label:'匹配档位 <span class="xs mut">演示评分</span>', r:p=>`<div style="display:flex;align-items:center;gap:6px">${tierChip(p.tier)}<span class="mono sm">${p.score}</span></div>`},
    {label:'上次联系', r:p=>`<div class="sm mono">${p.lastContact==='—'?'—':p.lastContact.slice(5)}</div><div class="t-sub">${p.lastType==='—'?'未联系':esc(p.lastType)}</div>`},
    {label:'下次跟进', r:p=>{
      if(p.nextFollow==='—') return '<span class="mut">—</span>';
      const late = p.nextFollow < TODAY;
      return `<span class="mono sm" style="${late?'color:var(--bad)':''}">${p.nextFollow.slice(5)}${late?' · 已逾期':''}</span>`;
    }},
    ...(isR04?[]:[{label:'负责人', r:p=>`<span class="sm">${esc(p.owner)}</span>`}]),
    {label:'状态', r:p=>statB(p.status)},
    /* 三个入口对应三个业务页面：看简历 / 推进这一单 / 其余三页收进「更多」。
       以前只有一个笼统的「详情」，点进去还得自己找页签。 */
    {label:'操作', r:p=>`<div class="acts">
      <span class="link" onclick="event.stopPropagation();openPerson('${p.id}')">查看简历</span>
      <span class="link" onclick="event.stopPropagation();huAppTo('${p.id}')">投递跟进</span>
      <span class="link ${pmIsOpen('persons',p.id)?'on':''}" onclick="event.stopPropagation();pmMore('persons','${p.id}')">更多 ${pmIsOpen('persons',p.id)?'▴':'▾'}</span>
    </div>`},
  ];

  const sl = pageSlice('persons', rows);
  /* 「更多」展开行：一行里塞三个链接，点开才能进另外三页；再点一次收起 */
  const deco = sl.rows.map(p=>{
    if(!pmIsOpen('persons', p.id)) return p;
    const q = Object.assign({}, p, { _more: `
      <div class="more-row">
        <span class="xs mut">同一份档案的其他页面：</span>
        <span class="link" onclick="huGoTo('${p.personId||p.id}','profile','${p.id}','${p.demandId}')">人才画像</span>
        <span class="hu-dot">·</span>
        <span class="link" onclick="huGoTo('${p.personId||p.id}','logs','${p.id}','${p.demandId}')">沟通记录</span>
        <span class="hu-dot">·</span>
        <span class="link" onclick="huGoTo('${p.personId||p.id}','verify','${p.id}','${p.demandId}')">资料核实</span>
        <span class="xs mut">（都打开独立页面，不在这行展开内容）</span>
      </div>` });
    return q;
  });

  return `<div class="page">
    ${head('人员列表', (isR04? '我名下的人员' : '全部在跟人员') + ' · 一行 = 一次投递（人 × 需求）；同一个人投多个需求会出现多行，姓名旁标「同投 N」· 点匹配档位看逐项依据 · 新增简历走需求 / 批次的「传简历」「人才库找人」', actions)}
    ${toolbar({q:'搜索姓名 / 电话 / 技能', filters:[
      {k:'fu',opts:[{v:'',label:'全部跟进'},{v:'today',label:'今天待跟进'},{v:'late',label:'已逾期'}]},
      {k:'nd',opts:[{v:'',label:'全部节点'},...NODES.map(n=>({v:n,label:n}))]},
      {k:'tri',opts:[{v:'',label:'全部硬条件'},{v:'ok',label:'已核实符合'},{v:'pend',label:'信息待确认'},{v:'no',label:'已确认不符合'}]},
      {k:'dm',opts:[{v:'',label:'全部需求'},...DEMANDS.map(d=>({v:d.id,label:d.post}))]},
      ...(isR04?[]:[{k:'ow',opts:[{v:'',label:'全部负责人'},...['李文静','陈曦','王浩'].map(n=>({v:n,label:n}))]}])
    ], chips:[
      {k:'ng',v:'',label:'全部'},
      {k:'ng',v:'follow',label:`在跟中 ${cnt.follow}`},
      {k:'ng',v:'itv',label:`待面试 ${cnt.itv}`},
      {k:'ng',v:'onb',label:`待入职 ${cnt.onb}`},
      {k:'ng',v:'hired',label:`已入职 ${cnt.hired}`},
    ], right:`<span class="sm mut">共 ${rows.length} 人</span>`})}
    ${table(cols, deco)}
    ${pagerBar('persons', sl, '人')}
  </div>`;
}

/* 「更多」菜单：只记哪一行展开，收起靠再点一次。
   按列表分开记（人员列表 / 需求简历明细 / 批次人员各有自己的 key），
   一处展开不会让另一个列表也跟着展开。 */
let PM = {open:{}};
function pmIsOpen(key, id){ return PM.open[key] === id; }
function pmMore(key, id){
  PM.open[key] = pmIsOpen(key, id) ? null : id;
  refreshTable();
}
/* 从「更多」进另外三页：带上这一行的投递与需求，页面才知道是哪一单 */
function huGoTo(pid, view, appId, demandId){
  PM.open = {};
  openHuman(pid, view, appId, demandId);
}

/* 人才库找人：从需求 / 批次带着岗位条件跳进完整筛选页，不新开弹窗。
   条件留在顶部横条上（客户、岗位、地点、工价、需求原文），列表仍可自由改筛选。
   捞入批次时默认选这一单的进行中批次，避免「点了半天不知道捞到哪」。 */
function findInPool(did){
  go('pool');
  if(did){
    S.f.for = did;
    S.f.st = 'free';                 /* 默认只看空闲可捞：正在别人手上的人不该先出现在这里 */
  }
  refreshTable(); commitState();
  if(did) toast('已带入「' + D(did).post + '」的岗位条件 · 默认只看空闲可捞');
}
function poolForBar(d){
  const req = (d.req||[]).join(' · ');
  return `<div class="note i" style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px">
    <div style="flex:1">
      <div><b>正在为「${esc(d.post)}」找人</b> · ${esc(d.client)} · ${esc(d.project)}</div>
      <div class="xs" style="margin-top:3px">岗位条件：${esc(req||'—')}</div>
      <div class="xs mut" style="margin-top:3px">${esc(d.city)} · ${esc(d.price)} · 最迟到岗 ${esc(d.deadline)} · 需求编号 <span class="mono">${esc(d.code)}</span></div>
    </div>
    <button class="btn xs" onclick="clearPoolFor()">退出找人</button>
  </div>`;
}
function clearPoolFor(){ S.f.for = ''; S.f.st = ''; refreshTable(); commitState(); }

/* ---------- 人才池列表（人员档案视图） ---------- */
function poolPage(){
  const ac = p => activeAppsOf(p.id).length;
  let rows = PEOPLE.slice();
  const q=(S.f.q||'').trim(), src=S.f.src||'', st=S.f.st||'', rel=S.f.rel||'', forD=S.f.for||'';
  if(q) rows = rows.filter(p=>(p.name+p.skills.join('')+p.phone).includes(q));
  if(src) rows = rows.filter(p=>p.channel===src);
  if(st==='free') rows = rows.filter(p=>ac(p)===0);
  if(st==='busy') rows = rows.filter(p=>ac(p)>0);
  if(st==='full') rows = rows.filter(p=>p.complete>=85);        /* 原「资料完整」统计卡的筛选口径 */
  if(rel==='by') rows = rows.filter(p=>p.createdBy===S.who);      /* 我提供的 */
  if(rel==='fl') rows = rows.filter(p=>p.follower===S.who);       /* 我在跟的 */

  const cols = [
    {label:'姓名', r:p=>{const n=ac(p);return `<div class="t-name"><span class="arc-link" onclick="event.stopPropagation();openArchive('${p.id}','resume')">${esc(p.name)}</span> <span class="t-sub" style="display:inline">${p.gender} · ${p.age}岁</span></div><div class="t-sub mono">${esc(p.phone)} · ${p.id}</div>`;}},
    {label:'技能', r:p=>`<div class="tags">${p.skills.slice(0,3).map(s=>`<span class="tg">${esc(s)}</span>`).join('')}${p.skills.length>3?`<span class="tg">+${p.skills.length-3}</span>`:''}</div>`},
    {label:'来源 / 活跃', r:p=>`<div class="sm"><span class="b n">${esc(p.channel||p.source)}</span></div><div class="t-sub mono">${p.lastActive.slice(5)}</div>`},
    {label:'当前跟进人', r:p=>`<div class="sm">${esc(p.follower||p.createdBy||'—')}</div><div class="t-sub">${p.follower&&p.follower!==p.createdBy?'由 '+esc(p.createdBy)+' 转交':'建档人'}</div>`},
    {label:'投递中', r:p=>{const n=ac(p); if(!n) return '<span class="b g">空闲可捞</span>';
      const ds = appsOf(p.id).filter(x=>x.status==='跟进中').map(x=>D(x.demandId).post).join('、');
      return `<div class="sm"><b>${n}</b> 个需求</div><div class="t-sub" title="${esc(ds)}">${esc(ds.length>12?ds.slice(0,12)+'…':ds)}</div>`;}},
    {label:'资料完整度', r:p=>`<div class="barline"><div class="bar ${p.complete>=85?'g':p.complete<65?'w':''}"><i style="width:${p.complete}%"></i></div><b>${p.complete}%</b></div>`},
    {label:'操作', r:p=>{const first=appsOf(p.id)[0];
      return `<div class="acts">
      <span class="link" onclick="event.stopPropagation();openArchive('${p.id}','resume')">档案</span>
      <span class="link" onclick="event.stopPropagation();openModal(poolPickBatch('${p.id}','${forD}'))">捞入批次</span>
      ${first?`<span class="link" onclick="event.stopPropagation();openPerson('${first.id}')">看投递</span>`:''}
    </div>`;}},
  ];

  const sl = pageSlice('pool', rows);
  return `<div class="page">
    ${head('人才池列表','全量人员档案（按手机号去重）· 一个人只有一份档案，投几次需求就有几条投递；点姓名进档案独立页（简历 / 画像 / 本次投递 / 沟通）', `<button class="btn" onclick="toast('已给 12 位资料待补全的候选人发送补全链接（短信/微信）')">发补全链接</button><button class="btn" onclick="openModal(uploadPoolModal(),'md-lg')">↑ 上传简历入库</button><button class="btn pri" onclick="openModal(aiFindModal(),'md-lg')">AI 找候选人</button>`)}
    ${forD && D(forD).id ? poolForBar(D(forD)) : ''}
    ${toolbar({q:'搜索姓名 / 技能 / 手机号', filters:[
      {k:'st',opts:[
        {v:'',label:'全部状态'},
        {v:'free',label:`空闲可捞 · ${PEOPLE.filter(p=>ac(p)===0).length}`},
        {v:'busy',label:`投递中 · ${PEOPLE.filter(p=>ac(p)>0).length}`},
        {v:'full',label:`资料完整 ≥85% · ${PEOPLE.filter(p=>p.complete>=85).length}`},
      ]},
      {k:'src',opts:[{v:'',label:'全部渠道'},...CHANNELS.map(c=>({v:c.name,label:c.name}))]},
      {k:'rel',opts:[{v:'',label:'全部人'},{v:'by',label:'我提供的'},{v:'fl',label:'我在跟的'}]}
    ], right:`<span class="sm mut">共 ${rows.length} 人（档案 ${PEOPLE.length}）</span>`})}
    ${table(cols, sl.rows)}
    ${pagerBar('pool', sl, '人')}
  </div>`;
}

/* ---------- 操作记录 ---------- */
function logsPage(){
  let rows = LOGS.slice();
  const isR04 = S.role==='R04';
  if(isR04) rows = rows.filter(l=>l.staff===S.who);
  const q=(S.f.q||'').trim();
  if(q) rows = rows.filter(l=>(l.staff+l.act+l.obj).includes(q));
  const sl = pageSlice('logs', rows);
  const cols=[
    {label:'时间', r:l=>`<span class="mono sm">${l.time}</span>`},
    {label:'操作人', r:l=>`<div class="sm">${esc(l.staff)}</div><div class="t-sub">${l.role}</div>`},
    {label:'动作', r:l=>`<span class="b n">${esc(l.act)}</span>`},
    {label:'对象', r:l=>`<span class="sm">${esc(l.obj)}</span>`},
    {label:'详情', r:l=>`<span class="sm mut">${esc(l.detail)}</span>`},
  ];
  return `<div class="page">
    ${head('系统操作记录','每一次写操作都留痕 · 按人、按动作、按对象可追溯', `<button class="btn" onclick="toast('已导出操作记录')">导出</button>`)}
    ${toolbar({q:'搜索操作人 / 动作 / 对象', right:`<span class="sm mut">${rows.length} 条</span>`})}
    ${table(cols, sl.rows)}
    ${pagerBar('logs', sl, '条')}
  </div>`;
}

/* ================= 抽屉 ================= */

/* =============================================================
   需求详情：独立页面 + 三个页签（v1.3 · RG-012 / 2026-11-15）
   -------------------------------------------------------------
   [ 需求明细 ]（默认，可改） [ 简历明细 ]（列同人员列表） [ 招聘进度 ]
   以前是右侧抽屉：遮罩压着列表、看不到系统导航、地址留不住，
   刷新就丢、返回就回到第一页。现在整页占满主内容区，导航还在，
   地址是 #demand/<id>/detail?tab=<detail|resume|progress>，刷新与返回都能落回原处。
   页签键用语义名（detail/resume/progress），不用数字下标 —— 以后加页签不会错位。
   ============================================================= */
const DM_TABS = [
  {k:'detail',   n:'需求明细', tip:'要求什么样的人'},
  {k:'resume',   n:'简历明细', tip:'像人员列表那样看人'},
  {k:'progress', n:'招聘进度', tip:'漏斗与批次'},
];
/* back：进详情前记下的「从哪来」（页面 / 筛选 / 滚动），供页面内返回原样还原
   sub：detail | history —— 同一条需求的两个视图，地址分别是 #demand/<id>/detail 与 /history
   edit：需求明细是否处于编辑态（默认只看最新值） */
let DM = {id:null, tab:'detail', scope:'mine', back:null, sub:null, edit:false, hist:{}};

function dmTabOk(t){ return DM_TABS.some(x=>x.k===t); }

function openDemand(id, tab){
  const from = S.page;
  markScrollOut();                  /* 必须在 render 之前：之后列表已经滚到 0 */
  /* 只要不是「在本详情页内切页签」，就要刷新返回上下文：
     浏览器后退回列表时 DM.id 还留着，只比 ID 的话第二次进来会沿用第一次的筛选与滚动。 */
  if(DM.id !== id || from !== 'demandDetail'){
    /* 招聘专员进来默认看自己；管理层没有「自己跟的人」（总经理不背个人指标），默认看全单，
       否则一进来是「我的 0」，还得先点一下「全部」才能干活。 */
    DM.scope = S.role==='R04' ? 'mine' : 'all';
    DM.back = snapshotHere();       /* 带来源页记录定位，详情页互跳也能原样返回 */
  }
  DM.id = id;
  DM.tab = dmTabOk(tab) ? tab : 'detail';
  DM.sub = null; DM.edit = false; DM.hist = {};
  S.page = 'demandDetail';
  closeAll();
  render();
  setMainScroll(0);
  navHash(routeHash(), 'push');
}
function dmSetTab(t){
  if(!dmTabOk(t) || DM.tab === t) return;
  DM.tab = t; DM.sub = null; DM.edit = false;   /* 切页签就退出「变更历史」与编辑态 */
  dmRender(false);
}
function dmSetScope(s){ DM.scope = s; dmRender(false); }
/* 只重画主内容区，不重建外壳，避免导航闪一下 */
function dmRender(push){
  const m = document.getElementById('main');
  const sc = m ? m.scrollTop : 0;
  S.page = 'demandDetail';
  render();
  setMainScroll(push === false ? sc : 0);
  navHash(routeHash(), push ? 'push' : 'replace');
}
/* 页面内返回：优先回到进来时的那一页并还原记录、筛选与滚动，没有来源就去需求列表 */
function dmBack(){
  const b = DM.back;
  DM.id = null; DM.tab = 'detail'; DM.back = null; DM.sub = null; DM.edit = false;
  /* 来源页本身是需求详情（详情互跳）时不能返回自己，回落列表 */
  if(b && b.page && b.page !== 'demandDetail' && restoreSnap(b)){
    render();
    setMainScroll(b.scroll || 0);
    /* 来源可能是另一个详情页（如从档案页的「这一单」点进来），必须写完整记录地址；
       只拼 '#'+page 会把 #person/PE001/detail?tab=apply&app=P42 退化成 #personDetail，刷新就找不到人 */
    navHash(routeHash(), 'replace');
    return;
  }
  go('demands');
}

/* 点岗位名的旧入口（R04 首页等）统一走同一个详情页，不再开弹窗 */
function pmOpen(did){ openDemand(did, 'detail'); }

function dmHtml(){
  const d = D(DM.id);
  if(!d || !d.id) return dmMissingHtml();
  if(DM.sub === 'history') return dmHistoryHtml(d);
  const ps = personsOf(d.id), al = allocOf(d.id);
  const isR04 = S.role==='R04';
  const mineN = dmMine(d.id).length;
  const badge = {detail:'', resume:String(mineN), progress:'', };
  const fromList = DM.back && DM.back.page === 'demands';
  const acts = isR04
    ? `<button class="btn" onclick="openModal(uploadNewBatchModal(),'md-lg')">↑ 传简历</button><button class="btn pri" onclick="findInPool('${d.id}')">人才库找人</button>`
    : `<button class="btn" onclick="openAlloc('${d.id}')">分配需求</button><button class="btn pri" onclick="toast('已发起客户重确认')">发起重确认</button>`;
  return `<div class="page dm-page">
    <div class="pg-back" onclick="dmBack()">← 返回${fromList?'需求列表':'上一页'}</div>
    ${head(esc(d.post), `${esc(d.code)} · ${esc(d.client)} · ${esc(d.project)} · ${esc(d.city)} · 最迟到岗 ${esc(d.deadline)}`, acts)}
    <div class="arc-top">
      ${demandB(d.status)} ${confirmB(d.confirm)}
      <span class="sm"><b>整单</b> 需求 <b>${d.head}</b> 人 · 已入职 <b>${d.hired}</b> · 缺口 <b style="color:var(--bad)">${d.head-d.hired}</b> · 在投 <b>${ps.length}</b></span>
      ${isR04?(()=>{const t=dmMyTask(d); return `<span class="sm" style="margin-left:6px">我的目标 <b>${t.qty}</b> 人 · 已入职 <b>${t.hired}</b> · 缺口 <b style="color:var(--bad)">${t.left}</b></span>`;})():''}
    </div>

    <div class="arc-tabs">
      ${DM_TABS.map(t=>`<span class="arc-tab ${DM.tab===t.k?'on':''}" title="${esc(t.tip)}" onclick="dmSetTab('${t.k}')">
        ${t.n}${badge[t.k]?` <i class="vis n" title="我当前跟进的简历数">${badge[t.k]}</i>`:''}</span>`).join('')}
    </div>

    ${DM.tab==='detail' ? dmDetail(d) : DM.tab==='resume' ? dmResume(d) : dmProgress(d, al, ps)}
  </div>`;
}

/* 地址里的需求不存在（刷新后内存演示数据已重置 / 编号写错）：说清原因，给返回入口，不静默跳别处 */
function dmMissingHtml(){
  return `<div class="page">
    <div class="pg-back" onclick="go('demands')">← 返回需求列表</div>
    ${head('找不到这条需求','地址指向的需求不在当前演示数据里')}
    <div class="note w">
      <div><b>需求编号</b> <span class="mono">${esc(DM.id || '—')}</span> 没有匹配到记录。</div>
      <div style="margin-top:6px">常见原因：演示数据存在内存里，刷新页面后新增/改过的记录会回到初始状态；或者编号被改动过。</div>
      <div style="margin-top:6px">这不是权限问题，系统也不会自动跳到别的需求上。</div>
    </div>
    <div style="margin-top:12px"><button class="btn pri" onclick="go('demands')">返回需求列表</button></div>
  </div>`;
}

/* ---------- 页签 1 · 需求明细（只展开最新一版的条件） ----------
   原来这一页把三件事挤在一屏：标准岗位标准是什么、本单改过哪几项、47 项逐项对照表。
   招聘专员打开只想看「这一单要什么样的人」，版本差异是另一件事，看完就走。
   现在拆成：
     · 一条版本线（生效 v1.1 / 待处理 / 匹配依据 / 只读链接 + 三个入口）
     · 「要什么样的人」：只列当前值，与标准不同的打一个「改」标（hover 看标准值）
     · 「人 / 时间 / 钱」：人数、工价、到岗、有效期、地点、跟进人
   每个版本改了什么 → 独立页 #demand/<id>/history（右上的「变更历史」）。
   「编辑这一单」把当前值切成输入框，改的仍是本单差异，标准本身不动。 */
const DM_PRICE_NO = 32;                 /* 工价：在「人 / 时间 / 钱」里出现，要素清单不重复列 */
function dmOvMap(d){ const m={}; (d.stdOverride||[]).forEach(o=>{ m[o.no]=o.to; }); return m; }
function dmSetVal(no, v){
  const d = D(DM.id), s = stdOf(d.stdId)||{};
  const base = (s.vals||{})[no];
  d.stdOverride = (d.stdOverride||[]).filter(o=>o.no!==+no);
  if(JSON.stringify(v)!==JSON.stringify(base)) d.stdOverride.push({no:+no, from:base, to:v});
  const cell = document.getElementById('dmm-' + no);
  if(cell) cell.innerHTML = dmMark(no, base, v);
  toast('已改本单值 · ' + (f47Of(+no).name||no) + ' —— 标准本身不动');
}
function dmMark(no, base, v){
  const same = JSON.stringify(base)===JSON.stringify(v);
  return same ? '<span class="xs mut">同标准</span>' : '<span class="b a">已改</span>';
}
function dmEditor(no, v){
  const f = f47Of(no);
  const isEnum = ['枚举','词表'].includes(f.type) && !Array.isArray(v);
  if(isEnum){
    const opts = (f.vals||[]).slice(), cur = v==null?'':String(v);
    if(cur && !opts.includes(cur)) opts.unshift(cur);
    return `<select class="ed-in" onchange="dmSetVal(${no},this.value)">
      <option value="">— 未定 —</option>
      ${opts.map(o=>`<option value="${esc(o)}" ${o===cur?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
  }
  if(Array.isArray(v) || f.type==='多选'){
    const cur = Array.isArray(v)? v.join(' · ') : (v||'');
    return `<input class="ed-in" value="${esc(cur)}" placeholder="多个值用 · 分隔"
      onchange="dmSetVal(${no}, this.value.split('·').map(x=>x.trim()).filter(Boolean))">`;
  }
  return `<input class="ed-in" value="${esc(v==null?'':v)}" placeholder="填这一单的值"
    onchange="dmSetVal(${no}, this.value)">`;
}
function dmFieldRow(f, base, v, edit){
  const changed = JSON.stringify(base) !== JSON.stringify(v);
  return `<div>
    <dt>${esc(f.name)}</dt>
    <dd>${edit ? dmEditor(f.no, v) : esc(stdVal(f.no, v) || '未定')}${changed
      ? `<span class="b a" title="标准值 ${esc(stdVal(f.no, base)||'未定')}">改</span>` : ''}
      ${edit ? `<div class="t-sub">标准 ${esc(stdVal(f.no, base)||'未定')} · <span id="dmm-${f.no}">${dmMark(f.no, base, v)}</span></div>` : ''}
    </dd></div>`;
}

function dmDetail(d){
  const isR04 = S.role==='R04';
  const al = allocOf(d.id);
  const s = stdOf(d.stdId) || {};
  const ov = dmOvMap(d);
  const l = elListOf(d.stdList || s.list), picks = l.picks || [];
  const edit = !!DM.edit;
  const av = activeVer(d);

  /* 平台里还有两种历史数据：只挂岗位描述（jd）的、什么都没挂的 —— 保持原样，不硬套要素表 */
  if(!d.stdId && d.jdId) return `${demandStateBar(d)}${jdSection(d)}`;
  if(!d.stdId && !d.jdId) return `${demandStateBar(d)}
    <div class="sec"><div class="sec-t">岗位口径</div>
      <div class="note w">这一单既没挂标准岗位标准、也没挂岗位描述（历史数据）—— 没有口径就没法评分、没法出确认单。
      ${isR04?'':'<button class="btn xs" style="margin-left:6px" onclick="closeAll();ndEnter()">新建一单</button>'}</div>
    </div>`;

  const ovN = (d.stdOverride||[]).filter(o=>picks.includes(o.no)).length;   /* 只数这一页真的看得见的差异 */
  const stdStale = s.ver && d.stdVer && s.ver !== d.stdVer;

  /* 要素清单：按一级域分组、两列铺开，只显示当前值；工价在「人 / 时间 / 钱」里，这里不重复列 */
  const fields = picks.filter(no=>no!==DM_PRICE_NO);
  const groups = F47_L1.map(dom=>{
    const items = fields.map(f47Of).filter(f=>f.l1===dom.id);
    if(!items.length) return '';
    return `<div class="req-grp"><div class="req-grp-h">${esc(dom.mark)} ${esc(dom.name)}</div>
      <dl class="req-dl">${items.map(f=>dmFieldRow(f, (s.vals||{})[f.no],
        (f.no in ov) ? ov[f.no] : (s.vals||{})[f.no], edit)).join('')}</dl></div>`;
  }).join('');

  const hasPrice = picks.includes(DM_PRICE_NO);
  const priceBase = (s.vals||{})[DM_PRICE_NO];
  const priceV = (DM_PRICE_NO in ov) ? ov[DM_PRICE_NO] : priceBase;
  const priceChanged = JSON.stringify(priceBase) !== JSON.stringify(priceV);

  const cell = (label, val, hint) => `<div><dt>${label}</dt>
    <dd>${val}${hint?`<span class="xs mut" style="margin-left:6px">${hint}</span>`:''}</dd></div>`;
  const money = [
    cell('需求人数', edit ? `<input class="ed-in" type="number" value="${d.head}" onchange="dmSetD('head',+this.value)">` : `<b>${d.head}</b> 人`),
    cell('已入职 / 缺口', `<b>${d.hired}</b> / <b style="color:var(--bad)">${d.head-d.hired}</b>`),
    cell('工价', edit && hasPrice ? dmEditor(DM_PRICE_NO, priceV)
        : esc(hasPrice ? (stdVal(DM_PRICE_NO, priceV)||'未定') : d.price),
      hasPrice && priceChanged ? `标准 ${esc(stdVal(DM_PRICE_NO, priceBase)||'—')}` : ''),
    cell('最迟到岗', edit ? `<input class="ed-in" type="date" value="${esc(d.deadline)}" onchange="dmSetD('deadline',this.value)">` : esc(d.deadline)),
    cell('需求有效期', edit ? `<input class="ed-in" value="${esc(d.valid)}" onchange="dmSetD('valid',this.value)">` : esc(d.valid)),
    cell('工作地点', edit ? `<input class="ed-in" value="${esc(d.city)}" onchange="dmSetD('city',this.value)">` : esc(d.city)),
    cell('当前跟进', al.length ? esc(al.map(x=>x.staff).join(' / ')) : '<span class="b w">未分配</span>'),
    cell('需求编号', `<span class="mono">${esc(d.code)}</span>`),
  ].join('');

  return `${demandStateBar(d)}
    ${stdStale?`<div class="note w" style="margin:-6px 0 12px">标准已升版到 <b>${esc(s.ver)}</b>，本单仍按 ${esc(d.stdVer)} 算 —— 历史评分不回溯。</div>`:''}
    <div class="sec">
      <div class="sec-t">要什么样的人
        <span class="xs mut" style="font-weight:400">${picks.length} 项 · 当前版 ${esc(av?av.v:(d.stdVer||'—'))}${ovN?` · ${ovN} 项与标准不同`:''}</span></div>
      <div class="req-grid">${groups || '<div class="mut sm">这一单还没有要素清单</div>'}</div>
      ${edit?`<div class="note w" style="margin-top:10px">改的是<b>这一单</b>：只存差异，标准岗位标准不动、也不升版。</div>`:''}
    </div>

    <div class="sec">
      <div class="sec-t">人 / 时间 / 钱</div>
      <dl class="req-money">${money}</dl>
      ${edit?`<div class="note w" style="margin-top:10px">改「需求人数」「最迟到岗」属于关键内容变更，<b>已发出的确认单需要客户重新确认</b>；本页改动都会写操作日志。</div>`:''}
    </div>`;
}
function dmSetD(field, v){
  const d = D(DM.id);
  const old = d[field];
  d[field] = v;
  toast(`已改 ${field}：${old} → ${v}${field==='head'||field==='deadline'?'（关键内容，需重确认）':''}`);
  dmRender(false);
}
/* 「这一单里谁在跟这个人」—— 与表格「当前跟进人」列同源。
   口径落在**投递**上（人 × 需求），不是落在档案上：同一个人可以这单归我、那单归同事，
   档案层的跟进人是全局的，拿来筛某一单必然串人（以前出现过「我的 8 / 全部 8」但每行是陈曦）。
   投递上有 follower（转交后才有）就用它，否则用这条投递的 owner。 */
function dmWhoFollows(p){
  return p.follower || p.owner;
}
function dmMine(did){
  const me = S.who;
  return personsOf(did).filter(p => dmWhoFollows(p) === me);
}

/* ---------- 变更历史（独立页 #demand/<id>/history） ----------
   需求明细页只放「最新一版要什么样的人」；每个版本改了什么，进这一页看。
   一个版本一块折叠区：默认展开最新版与生效版，其余收起（点标题展开）。
   这一页同时是原来「版本历史」抽屉的唯一去处 —— 抽屉停了，不再一处功能两个入口。 */
function dmHistOpen(v){
  const d = D(DM.id);
  const vers = versOf(d) || [];
  const newest = (vers[vers.length-1]||{}).v;
  const act = (activeVer(d)||{}).v;
  const m = DM.hist || {};
  if(v in m) return m[v];
  return v === newest || v === act;
}
function dmHistFold(v){
  DM.hist = DM.hist || {};
  DM.hist[v] = !dmHistOpen(v);
  dmRender(false);
}
function dmHistoryHtml(d){
  const vers = versOf(d).slice().reverse();
  const av = activeVer(d);
  const one = v => {
    const open = dmHistOpen(v.v);
    const ch = v.changes || [];
    return `<div class="acc ${open?'open':''}" data-ver="${esc(v.v)}">
      <div class="acc-hd" onclick="dmHistFold('${esc(v.v)}')" title="点标题${open?'收起':'展开'}这一版">
        <span class="acc-arw">▶</span>
        <b class="acc-post mono">${esc(v.v)}</b>
        <span class="b ${VER_TONE[v.status]||'n'}">${esc(v.status)}</span>
        ${av && v.v===av.v?'<span class="b a">当前匹配依据</span>':''}
        <span class="xs mut">${esc(v.at||'')} · ${esc(v.by||'—')}${v.way?' · '+esc(v.way):''}</span>
        <div class="sp"></div>
        <span class="acc-tog">${ch.length?`变更 ${ch.length} 项`:'首版'} · ${open?'收起 ▴':'展开 ▾'}</span>
      </div>
      ${open?`<div class="acc-bd">
        ${v.note?`<div class="sm" style="margin-bottom:10px">${esc(v.note)}</div>`:''}
        ${ch.length?`<div class="tbl-wrap" style="border-radius:9px"><table>
          <thead><tr><th style="width:180px">字段</th><th>旧值</th><th>新值</th></tr></thead>
          <tbody>${ch.map(c=>`<tr><td class="sm"><b>${esc(c.f)}</b></td>
            <td class="sm mut">${esc(c.from)}</td><td class="sm"><b style="color:var(--accent2)">${esc(c.to)}</b></td></tr>`).join('')}
          </tbody></table></div>`
          :`<div class="sm mut">首版：按当时选中的标准岗位标准整单建立，没有字段变更。</div>`}
        <div class="xs mut" style="margin-top:10px">审核 ${esc(v.audit||'未送审')}${v.auditBy?` · ${esc(v.auditBy)} · ${esc(v.auditAt||'')}`:''} · 代登记记录 ${regsOfVer(d.id, v.v).length} 条</div>
        ${v.auditNote?`<div class="note ${v.audit==='已退回'?'r':'i'}" style="margin-top:9px"><b>${v.audit==='已退回'?'退回意见':'审核意见'}</b>：${esc(v.auditNote)}</div>`:''}
        ${auditHistHtml(v)}
        ${v.status==='待重新确认'||v.status==='待内部审核'?`<div class="note r" style="margin-top:10px">旧版（生效中）的确认<b>不自动继承</b>到本版。本版未生效前，不作为匹配依据。</div>`:''}
      </div>`:''}
    </div>`;
  };
  return `<div class="page">
    <div class="pg-back" onclick="dmHistoryBack()">← 返回需求明细</div>
    ${head('变更历史 · ' + esc(d.post),
      `${esc(d.code)} · ${esc(d.client)} · ${esc(d.project)} · 共 ${vers.length} 个版本`,
      `<button class="btn" onclick="openConfirm('${d.id}')">需求确认单</button>`)}
    ${demandStateBar(d, {noBtn:true})}
    <div class="xs mut" style="margin:-4px 0 11px">每一版记的是<b>相对上一版改了什么</b>。旧版记录不删除、不覆盖；新版未生效前，匹配仍按旧版算。</div>
    <div class="acc-list">${vers.map(one).join('') || '<div class="mut sm">这一单还没有版本记录</div>'}</div>
  </div>`;
}
function openDmHistory(did){
  const d = D(did);
  if(!d || !d.id) return;
  if(DM.id !== did){ DM.back = snapshotHere(); DM.tab = 'detail'; DM.hist = {}; }
  DM.id = did; DM.sub = 'history'; DM.edit = false;
  S.page = 'demandDetail';
  closeAll();
  render();
  setMainScroll(0);
  navHash(routeHash(), 'push');
}
/* 历史页 → 需求明细：replace，不往历史里再堆一条。
   地址必须一起换回 /detail，否则返回后地址还停在 /history，刷新会又跳回历史页。 */
function dmHistoryBack(){ DM.sub = null; dmRender(false); navHash(routeHash(), 'replace'); }
function dmToggleEdit(){ DM.edit = !DM.edit; dmRender(false); }

/* ---------- 一份「投递列表」= 需求简历明细 + 批次人员共用 ----------
   第 02 项（需求下的简历明细）和第 05 项（批次人员）是同一个列表，只是范围不同：
     · 需求 → 我在这条需求下的全部投递（跨批次）
     · 批次 → 我在这条需求、这个批次下的投递
   所以列、筛选、分页都只写一次，两页不会长歪。
   列只留招聘专员真会看的：姓名与联系方式、技能、来源、当前节点、匹配结果、联系时间、下次跟进、结果。
   搜索 / 阶段 / 结果三个筛选 + 50 条一页；key 隔离，两页各翻各的页。 */
function lfSetQ(key, v){
  const s = lfState(key);
  s.q = v; s.page = 1;
  refreshTable();
  const el = document.getElementById('lf-q');
  if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  commitStateSoon();
}
function appListHtml(o){
  const key = o.key, st = lfState(key);
  let rows = o.rows.slice();
  const q = (st.q||'').trim();
  if(q) rows = rows.filter(p=>(p.name+p.phone+(p.skills||[]).join('')).includes(q));
  if(st.node) rows = rows.filter(p=>p.node===st.node);
  if(st.st) rows = rows.filter(p=>p.status===st.st);

  const cols = [
    {label:'姓名', r:p=>`<div class="t-name"><span class="arc-link" onclick="openHuman('${p.personId}','resume','${p.id}','${p.demandId}')">${esc(p.name)}</span>
        <span class="t-sub" style="display:inline">${p.gender} · ${p.age}岁</span></div><div class="t-sub mono">${esc(p.phone)}</div>`},
    {label:'技能', r:p=>`<div class="tags">${p.skills.slice(0,2).map(s=>`<span class="tg">${esc(s)}</span>`).join('')}${p.skills.length>2?`<span class="tg">+${p.skills.length-2}</span>`:''}</div>`},
    {label:'来源 / 批次', r:p=>`<div class="sm">${esc(p.channel||'—')}</div><div class="t-sub mono">${p.batchId?esc(B(p.batchId).code):'人才池捞入'}</div>`},
    {label:'当前节点', r:p=>nodeB(p.node)},
    {label:'匹配结果', r:p=>`<div style="display:flex;align-items:center;gap:6px">${tierChip(p.tier)}<span class="mono sm">${p.score}</span></div>`},
    ...(o.showFollow?[{label:'当前跟进人', r:p=>`<span class="sm">${esc(dmWhoFollows(p))}</span>`}]:[]),
    {label:'上次联系', r:p=>`<div class="sm mono">${p.lastContact==='—'?'—':p.lastContact.slice(5)}</div><div class="t-sub">${p.lastType==='—'?'未联系':esc(p.lastType)}</div>`},
    {label:'下次跟进', r:p=>{ if(p.nextFollow==='—') return '<span class="mut">—</span>';
      const late = p.nextFollow < TODAY;
      return `<span class="mono sm" ${late?'style="color:var(--bad)"':''}>${p.nextFollow.slice(5)}${late?' · 逾期':''}</span>`;}},
    {label:'结果', r:p=>statB(p.status)},
    /* 与人员列表同一组操作（查看简历 / 投递跟进 / 更多），
       只是范围更窄：这里是「本人 + 当前需求」或「本人 + 当前批次」。
       投递与需求随行带过去，进去不会变成别的单。 */
    {label:'操作', r:p=>`<div class="acts">
        <span class="link" onclick="openHuman('${p.personId}','resume','${p.id}','${p.demandId}')">查看简历</span>
        <span class="link" onclick="huAppTo('${p.id}')">投递跟进</span>
        <span class="link ${pmIsOpen(key,p.id)?'on':''}" onclick="pmMore('${key}','${p.id}')">更多 ${pmIsOpen(key,p.id)?'▴':'▾'}</span>
      </div>`},
  ];

  const deco = sl0 => sl0.map(p=> pmIsOpen(key,p.id) ? Object.assign({}, p, { _more: `
      <div class="more-row">
        <span class="xs mut">同一份档案的其他页面：</span>
        <span class="link" onclick="huGoTo('${p.personId}','profile','${p.id}','${p.demandId}')">人才画像</span>
        <span class="hu-dot">·</span>
        <span class="link" onclick="huGoTo('${p.personId}','logs','${p.id}','${p.demandId}')">沟通记录</span>
        <span class="hu-dot">·</span>
        <span class="link" onclick="huGoTo('${p.personId}','verify','${p.id}','${p.demandId}')">资料核实</span>
      </div>` }) : p);

  const sl = pageSlice(key, rows);
  return `<div class="toolbar">
    <div class="search"><span>⌕</span><input id="lf-q" placeholder="搜索姓名 / 电话 / 技能" value="${esc(st.q||'')}" oninput="lfSetQ('${key}',this.value)"></div>
    <select class="sel" onchange="lfSet('${key}','node',this.value)">
      <option value="">全部阶段</option>
      ${NODES.map(n=>`<option value="${esc(n)}" ${st.node===n?'selected':''}>${esc(n)}</option>`).join('')}
    </select>
    <select class="sel" onchange="lfSet('${key}','st',this.value)">
      <option value="">全部结果</option>
      ${['跟进中','已入职','无意向'].map(v=>`<option value="${esc(v)}" ${st.st===v?'selected':''}>${esc(v)}</option>`).join('')}
    </select>
    <div class="sp"></div>
    <span class="sm mut">共 ${rows.length} 人</span>
  </div>
  ${table(cols, deco(sl.rows), o.empty)}
  ${pagerBar(key, sl, '人')}`;
}

/* ---------- 页签 2 · 简历明细（只列我当前跟进的人） ----------
   招聘专员这一页不放「全部」：看同事的简历不是他的活，而且会把「我的」稀释掉。
   所以连「我的 / 全部」这个切换都不给 —— 范围只有一个，上下左右没有第二种解释。
   管理层（R01/R02）要审全量，保留「我的 / 全部」两档。 */
function dmResume(d){
  const all = personsOf(d.id);
  const mine = dmMine(d.id);
  const canSeeAll = S.role !== 'R04';
  const rows = (canSeeAll && DM.scope==='all') ? all : mine;
  const scopeBar = canSeeAll
    ? `<div class="seg" style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span class="sm">范围</span>
        <span class="chip ${DM.scope!=='all'?'on':''}" onclick="dmSetScope('mine')">我的 ${mine.length}</span>
        <span class="chip ${DM.scope==='all'?'on':''}" onclick="dmSetScope('all')">全部 ${all.length}</span>
      </div>`
    : '';
  const empty = canSeeAll && DM.scope==='all'
    ? '这个岗位还没有任何投递'
    : '这个岗位下还没有你当前跟进的人 —— 你的份额可能还没分配，或人还在同事手上';
  return `
    <div class="sec">
      ${scopeBar}
      ${appListHtml({ key:'dm-resume:'+d.id, rows, showFollow:true, empty })}
    </div>`;
}

/* ---------- 页签 3 · 招聘进度 ----------
   招聘专员看自己的：我背几个人、已入职几个、还差几个、我这几批跟到哪。
   其他专员的分配、跨专员合计、整单漏斗都是管理视角，放在这里只会让人误以为缺口要自己补。
   管理层（R01/R02）保留整单漏斗与分配表 —— 那本来就是他们要看的东西。 */
function dmProgress(d, al, ps){
  const isR04 = S.role==='R04';
  const bsAll = batchesOf(d.id);
  if(isR04){
    const t = dmMyTask(d);
    const bs = bsAll.filter(b=>b.owner===S.who).sort((a,b)=>b.date.localeCompare(a.date));
    return `
      <div class="sec"><div class="sec-t">我的目标
          <span class="xs mut" style="font-weight:400">只算我在这一单上的分配，不含其他专员</span></div>
        <div class="req-grid" style="grid-template-columns:repeat(4,1fr);gap:10px">
          ${[['我的目标', t.qty+' 人'], ['已入职', t.hired+' 人'], ['剩余缺口', t.left+' 人'], ['目标日期', t.target.slice(5)]]
            .map(([k,v],i)=>`<div style="background:#fff;border:1px solid var(--line);border-radius:9px;padding:12px 14px">
              <div class="xs mut">${k}</div><div class="mono" style="font-size:21px;font-weight:600;${i===2&&t.left?'color:var(--bad)':''}">${v}</div></div>`).join('')}
        </div>
        <div class="barline" style="margin-top:12px"><div class="bar ${t.left?'':'g'}"><i style="width:${pct(t.hired,t.qty)}%"></i></div><b>${pct(t.hired,t.qty)}%</b></div>
        <div class="xs mut" style="margin-top:6px">「已入职」只算真正到岗的人；面试通过、待入职都还在流程里，不提前计入。</div>
      </div>

      <div class="sec"><div class="sec-t">我的批次（${bs.length} 个）
          <span class="xs mut" style="font-weight:400">点批次进这一批的完整简历列表</span></div>
        ${bs.length? bs.map(b=>`<div style="background:#fff;border:1px solid var(--line);border-radius:9px;padding:11px 13px;margin-bottom:7px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer" onclick="openBatchPersons('${b.id}')">
          <div><div class="sm mono">${esc(b.code)}</div><div class="xs mut">${b.date} · 新增 ${batchUploaded(b)} 份 · 已建档 ${batchFiled(b)} 人${b.status==='已关闭'?' · 已关闭（不再收新简历）':''}</div></div>
          <div class="xs mut">已联系 ${b.touched} · 待联系 ${Math.max(0,batchUploaded(b)-b.touched)} · 有意向 ${b.intent}</div>
        </div>`).join('') : '<div class="mut sm">我在这条需求下还没有批次 —— 传一份简历，系统自动建今天的批次</div>'}
      </div>`;
  }

  const funnel = ['新入库','已匹配','触达中','补全中','待面试','面试通过','待入职','已入职'].map(n=>({n,c:ps.filter(p=>p.node===n).length}));
  const bs = bsAll;
  return `
    <div class="sec"><div class="sec-t">人员漏斗（${ps.length} 人 · 整单）</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${funnel.map(f=>`<div style="flex:1;min-width:76px;background:#fff;border:1px solid var(--line);border-radius:8px;padding:9px 10px;text-align:center">
          <div class="mono" style="font-size:19.5px;font-weight:600">${f.c}</div>
          <div class="xs mut" style="margin-top:1px">${f.n}</div></div>`).join('')}
      </div>
    </div>

    <div class="sec"><div class="sec-t">分配情况</div>
      ${al.length? `<div class="tbl-wrap" style="border-radius:9px"><table>
        <thead><tr><th>专员</th><th>分配</th><th>已入职</th><th>缺口</th><th>进度</th><th>目标日期</th></tr></thead>
        <tbody>${al.map(a=>`<tr><td class="sm">${esc(a.staff)}</td><td class="num">${a.qty}</td><td class="num">${a.hired}</td>
          <td class="num" style="color:var(--bad)">${a.qty-a.hired}</td>
          <td><div class="barline"><div class="bar"><i style="width:${pct(a.hired,a.qty)}%"></i></div><b>${pct(a.hired,a.qty)}%</b></div></td>
          <td class="mono sm">${a.target.slice(5)}</td></tr>`).join('')}
        <tr style="background:var(--card2)"><td class="sm"><b>合计</b></td><td class="num"><b>${al.reduce((x,a)=>x+a.qty,0)}</b></td>
          <td class="num"><b>${al.reduce((x,a)=>x+a.hired,0)}</b></td>
          <td class="num"><b>${al.reduce((x,a)=>x+a.qty-a.hired,0)}</b></td><td colspan="2"></td></tr>
        </tbody></table></div>
        <div style="margin-top:9px"><button class="btn sm" onclick="closeAll();openAlloc('${d.id}')">调整分配</button></div>`
      : '<div class="note w">该需求尚未分配 —— 未分配时招聘专员看不到这一单、也无法建批次。</div>'}
    </div>

    <div class="sec"><div class="sec-t">批次汇总（${bs.length} 个）</div>
      ${bs.length? bs.map(b=>`<div style="background:#fff;border:1px solid var(--line);border-radius:9px;padding:11px 13px;margin-bottom:7px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer" onclick="openBatchPersons('${b.id}')">
        <div><div class="sm mono">${esc(b.code)}</div><div class="xs mut">${b.date} · ${esc(b.owner)} · 新增 ${batchUploaded(b)} 份 · 已建档 ${batchFiled(b)} 人</div></div>
        <div class="xs mut">已联系 ${b.touched} · 待联系 ${Math.max(0,batchUploaded(b)-b.touched)} · 有意向 ${b.intent}</div>
      </div>`).join('') : '<div class="mut sm">暂无批次</div>'}
    </div>`;
}

/* ===== 本单岗位描述（V8–V11）=====
   标准层只读，单层可改；改动只存 diff，渲染时「标准 + override」现合成。
   被改/被加的句子带黄标「本单调整」，hover 看原句 → 新句 + 谁改的 + 客户原话依据。
*/
function jdSection(d){
  const j = jdOf(d.jdId);
  const m = mergeJd(j, d.jdOverride);
  const isR04 = S.role==='R04';
  const stale = d.jdVer && j.ver && d.jdVer!==j.ver;
  const gateB = {PASS:'r', 必填:'i', 加分:'g'};
  const custJd = CUSTOMER_JD[d.client];

  const sentRows = m.sent.map(s=>{
    const dup = s.metric && s.text.indexOf(s.metric) >= 0;
    const tip = s.adj ? (s.adj.kind==='add'
        ? `本单新增 · ${esc(s.adj.src||'')}${s.adj.by?` · ${esc(s.adj.by)} ${esc(s.adj.at||'')}`:''}`
        : `原为 ${esc(s.adj.from)} → 改为 ${esc(s.d)} · ${esc(s.adj.by||'')} ${esc(s.adj.at||'')}`) : '';
    return `<div class="jd-p ${s.gap?'gap':''} ${s.adj?'adjed':''}">
      <div class="tx">${esc(s.text)}${(s.metric&&!dup)?`<br><span class="sm mut">验收指标：<em>${esc(s.metric)}</em></span>`:''}</div>
      <div class="src">
        ${s.adj?`<span class="adj" title="${tip}">本单调整</span>`:''}
        <span class="g b ${gateB[s.gate]}">${esc(s.gate)}</span>
      </div></div>`;
  }).join('');

  const condRows = m.conds.filter(c=>true).map(c=>`<tr>
      <td class="sm">${esc(c.k)}${c.adj?' <span class="adj">本单调整</span>':''}</td>
      <td class="sm mono">${esc(c.v)}${c.adj?` <span class="xs mut" style="text-decoration:line-through">${esc(c.old)}</span>`:''}</td>
    </tr>`).join('');

  const nonChips = m.non.map(x=>`<span style="${x.adj?'border-color:var(--warn-line);background:var(--warn-soft)':''}">${esc(x.x)}</span>`).join('');

  return `<div class="sec"><div class="sec-t">本单岗位描述
      <span class="b ${stale?'w':'n'}" style="margin-left:2px">${esc(d.jdVer||j.ver)}${stale?` → 标准 ${esc(j.ver)}`:''}</span>
      ${m.adjN?`<span class="b w">${m.adjN} 处调整</span>`:''}
      <span style="margin-left:auto;display:flex;gap:6px">
        ${CUSTOMER_JD[d.client]?'<span class="b g">已存客户默认</span>':''}
        ${isR04?'':`<button class="btn xs" onclick="closeAll();openJdOverride('${d.id}')">调整本单描述</button>`}
      </span></div>
    ${stale?`<div class="note w" style="margin-bottom:8px">这份描述引用的是 ${esc(d.jdVer)}，标准已升到 ${esc(j.ver)}。<b>这一单仍按 ${esc(d.jdVer)} 评分</b> —— 历史评分不回溯，需要换口径就新建需求。</div>`:''}
    <div style="background:#fff;border:1px solid var(--line);border-radius:9px;padding:12px 14px">
      <div class="sm mut" style="margin-bottom:6px">${esc(j.title)} · 能力要求 ${m.sent.length} 句 · 准入 ${m.conds.length} 条 · 不需要 ${m.non.length} 条</div>
      ${sentRows}
      ${nonChips?`<div class="jd-non" style="margin-top:10px">${nonChips}</div>`:''}
    </div>
    <div class="tbl-wrap" style="border-radius:9px;margin-top:8px"><table>
      <thead><tr><th style="width:120px">准入 / 条件</th><th>本单取值</th></tr></thead><tbody>${condRows}</tbody></table></div>
    ${custJd?`<div class="note i" style="margin-top:8px">这个客户的默认描述已是 <b>${esc(jdOf(custJd.jdId).title||custJd.jdId)}</b>（${esc(custJd.at)} 存自 ${esc(custJd.from)}），下次给 ta 建同类需求会自动带出。</div>`:''}
  </div>`;
}

/* ---- 调整本单描述（只存 diff） ---- */
function openJdOverride(did){
  const d = D(did);
  if(!window.__JDO || window.__JDO.did!==did){
    const o = d.jdOverride || {};
    window.__JDO = { did, ov:{ add:[...(o.add||[])], del:[...(o.del||[])],
      tier:{...(o.tier||{})}, cond:{...(o.cond||{})}, notNeed:[...(o.notNeed||[])] } };
  }
  openModal(ovHtml(did));
}
function ovHtml(did){
  const d = D(did), j = jdOf(d.jdId), o = window.__JDO.ov;
  const base = jdSentences(j);
  const tierOpts = f => ['D1','D2','D3'].map(x=>`<option value="${x}">${x}</option>`).join('');
  const factorOpts = FACTORS_TRADE.filter(f=>f.trade===j.trade)
    .map(f=>`<option value="${f.id}">${esc(f.id)} · ${esc(f.name)}</option>`).join('');
  const sentOpts = base.map(s=>`<option value="${s.fid}">${esc(s.fid)} · ${esc(s.name)}（现在 ${esc(s.d)}）</option>`).join('');

  const cur = [
    ...o.add.map((a,i)=>`<div class="ovrow"><span class="b w">新增</span><span class="sm">${esc((factorOf(a.fid)||{}).name||a.fid)} ≥${esc(a.d)} · ${esc(a.gate)}</span>
      <span class="xs mut" style="flex:1">${esc(a.src||'')}</span><button class="btn xs danger" onclick="ovDrop('add',${i})">删</button></div>`),
    ...o.del.map((fid,i)=>`<div class="ovrow"><span class="b r">删除</span><span class="sm">${esc((factorOf(fid)||{}).name||fid)}</span>
      <span class="xs mut" style="flex:1">这一单不要这条</span><button class="btn xs danger" onclick="ovDrop('del',${i})">删</button></div>`),
    ...Object.entries(o.tier).map(([fid,dd],i)=>`<div class="ovrow"><span class="b i">改档</span><span class="sm">${esc((factorOf(fid)||{}).name||fid)} → ${esc(dd)}</span>
      <span class="xs mut" style="flex:1">会改变评分口径，已评分的人需重算</span><button class="btn xs danger" onclick="ovDrop('tier','${fid}')">删</button></div>`),
    ...Object.entries(o.cond).map(([k,v],i)=>`<div class="ovrow"><span class="b n">改条件</span><span class="sm">${esc(k)} → ${esc(v)}</span>
      <span class="xs mut" style="flex:1">只改这一单，不动标准</span><button class="btn xs danger" onclick="ovDrop('cond','${k}')">删</button></div>`),
  ].join('');

  return `<div class="md-h"><div><h3>调整本单描述 · ${esc(j.title)}</h3>
      <p>改的是这一单，标准层不动 · 只存差异，不复制全文 · 客户原话要留下来当依据</p></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="sec"><div class="sec-t">已做的调整（${o.add.length+o.del.length+Object.keys(o.tier).length+Object.keys(o.cond).length}）</div>
      ${cur||'<div class="mut sm">还没有调整，这一单用的就是标准原文。</div>'}
    </div>

    <div class="sec"><div class="sec-t">加一句（客户特有要求）</div>
      <div class="frow">
        <div class="field"><label>因子</label><select id="ovFid">${factorOpts}</select></div>
        <div class="field" style="max-width:110px"><label>档位</label><select id="ovTier">${tierOpts()}</select></div>
        <div class="field" style="max-width:130px"><label>匹配规则</label><select id="ovGate">
          <option>必填</option><option>PASS</option><option>加分</option></select></div>
      </div>
      <div class="field"><label>客户原话（依据，必填）</label>
        <input id="ovSrc" placeholder="例：得能看懂装配图，别到时候图纸都问我"></div>
      <div style="margin-top:8px"><button class="btn sm" onclick="ovAdd()">＋ 加上这一句</button></div>
    </div>

    <div class="sec"><div class="sec-t">改档位</div>
      <div class="frow">
        <div class="field"><label>句子</label><select id="ovPick">${sentOpts}</select></div>
        <div class="field" style="max-width:110px"><label>改成</label><select id="ovNew">${tierOpts()}</select></div>
      </div>
      <div class="note w" style="margin-top:2px">改档位会改变评分口径 —— 已评分的人需要重算，页面会提示。</div>
      <div style="margin-top:8px"><button class="btn sm" onclick="ovSetTier()">应用改档</button></div>
    </div>

    <div class="sec"><div class="sec-t">改条件值（工价 / 地点 / 班次）</div>
      ${(j.conds||[]).map(([k,v])=>`<div class="frow" style="align-items:center">
        <div class="field" style="max-width:140px"><label>${esc(k)}</label></div>
        <div class="field"><input value="${esc(o.cond[k]!=null?o.cond[k]:v)}" onchange="ovSetCond('${esc(k)}',this.value)"></div>
      </div>`).join('')}
    </div>

    <div class="sec"><div class="sec-t">明确不需要</div>
      <div style="display:flex;flex-direction:column;gap:5px">
        ${(j.notNeed||[]).map(x=>`<label class="sm" style="display:flex;gap:7px;align-items:center">
          <input type="checkbox" ${o.notNeed.includes('-'+x)?'checked':''} onchange="ovToggleNon('${esc(x)}',this.checked)">
          <span>${esc(x)}</span><span class="xs mut">（勾=这一单去掉这条）</span></label>`).join('')}
      </div>
    </div>

    <div class="note i">标准层只能改清单 —— 这一页所有改动都会写进 <b>本单差异</b>，不出现在标准里，也不影响别的需求。要沉淀成通用口径，用「另存为该客户默认描述」。</div>
  </div>
  <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
    <button class="btn" onclick="ovSaveDefault('${did}')">另存为该客户默认描述</button>
    <button class="btn pri" onclick="ovSave('${did}')">保存本单调整</button></div>`;
}
function ovRerender(did){ openModal(ovHtml(did)); }
function ovDrop(kind, key){
  const o = window.__JDO.ov;
  if(kind==='add'||kind==='del') o[kind].splice(Number(key),1);
  else delete o[kind][key];
  ovRerender(window.__JDO.did);
}
function ovAdd(){
  const o = window.__JDO.ov;
  const fid = document.getElementById('ovFid').value;
  const d = document.getElementById('ovTier').value;
  const gate = document.getElementById('ovGate').value;
  const src = (document.getElementById('ovSrc').value||'').trim();
  if(!src){ toast('客户原话要填 —— 这是日后扯皮时唯一的依据'); return; }
  o.add.push({ fid, d, gate, from:'customer', src });
  o.del = o.del.filter(x=>x!==fid);
  ovRerender(window.__JDO.did);
}
function ovSetTier(){
  const o = window.__JDO.ov;
  const fid = document.getElementById('ovPick').value;
  const nd = document.getElementById('ovNew').value;
  o.tier[fid] = nd;
  ovRerender(window.__JDO.did);
}
function ovSetCond(k, v){ window.__JDO.ov.cond[k] = v; }
function ovToggleNon(x, on){
  const o = window.__JDO.ov;
  const key = '-' + x;
  if(on){ if(!o.notNeed.includes(key)) o.notNeed.push(key); }
  else { o.notNeed = o.notNeed.filter(y=>y!==key); }
}
function ovSave(did){
  const d = D(did), o = window.__JDO.ov;
  const n = o.add.length + o.del.length + Object.keys(o.tier).length + Object.keys(o.cond).length + o.notNeed.length;
  d.jdOverride = n ? { ...o, by: S.who||'金诚', at:'11-13 16:5' } : null;
  closeAll();
  openDemand(did);
  toast(n?`已保存本单调整 ${n} 处 · 只影响这一单`:'已清空本单调整，恢复标准原文');
}
function ovSaveDefault(did){
  const d = D(did);
  CUSTOMER_JD[d.client] = { jdId:d.jdId, from:d.id, at:'11-13 16:58' };
  closeAll();
  openDemand(did);
  toast(`已存为「${d.client}」的默认描述 —— 下次给 ta 建同类需求直接带出`);
}

/* 分配需求 */
function openAlloc(id){
  const d = D(id), al = allocOf(id);
  const staffs = ['李文静','陈曦','王浩'];
  const used = al.map(a=>a.staff);
  const avail = staffs.filter(s=>!used.includes(s));
  openModal(`
    <div class="md-h"><div><h3>分配需求 · ${esc(d.post)}</h3>
      <p>需求 ${d.head} 人，已分 ${al.reduce((a,x)=>a+x.qty,0)} 人，剩余 ${d.head-al.reduce((a,x)=>a+x.qty,0)} 人可分配</p></div>
      <button class="dr-x" onclick="closeAll()">×</button></div>
    <div class="md-b">
      <div class="note" style="margin-bottom:14px">分配是把一个需求拆给多个招聘专员，各背各的缺口、各建各的批次。分配合计不得超过需求人数，个人目标日期不得晚于需求最迟到岗 <b class="mono">${d.deadline}</b>。</div>
      ${al.map(a=>`<div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:9px;padding:11px 13px;margin-bottom:8px">
        <div style="width:56px" class="sm"><b>${esc(a.staff)}</b></div>
        <input type="number" value="${a.qty}" style="width:70px;height:30px;border:1px solid var(--line);border-radius:6px;padding:0 8px;text-align:center" onchange="toast('分配人数改为 '+this.value+' 人，已保存')">
        <span class="xs mut">人</span>
        <span class="xs mut" style="margin-left:8px">已入职 ${a.hired}</span>
        <span class="xs mut">目标日期 <b class="mono">${a.target.slice(5)}</b></span>
        <div style="flex:1"></div>
        <button class="btn xs danger" onclick="toast('已回收 ${esc(a.staff)} 的分配，其名下人员回到人才池')">回收</button>
      </div>`).join('')}
      ${avail.length? `<div class="field" style="margin-top:12px">
        <label>添加专员</label>
        <div style="display:flex;gap:8px">
          <select id="newStaff" style="flex:1;height:36px;border:1px solid var(--line);border-radius:7px;padding:0 10px">
            ${avail.map(s=>`<option>${s}</option>`).join('')}</select>
          <input id="newQty" type="number" placeholder="人数" style="width:100px;height:36px;border:1px solid var(--line);border-radius:7px;padding:0 10px">
          <button class="btn" onclick="toast('已添加分配')">添加</button>
        </div>
      </div>`:''}
    </div>
    <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
      <button class="btn pri" onclick="closeAll();toast('分配已保存，已通知 3 位专员')">保存分配</button></div>`);
}

/* 人员详情已合并为统一「人详情」（四个页签），见 pages-archive.js 的 openHuman */

/* ---------- 批次人员：整页，不再是右侧抽屉 ----------
   抽屉只能看十几个人、不能搜索、不能翻页、地址留不住，还挡着导航。
   现在点批次名 / 「查看简历」进 #batch/<id>/persons：完整列表页，搜索、阶段、结果、50 条分页
   都复用需求简历明细那一个列表组件（第 05 项 = 第 02 项换了个范围）。
   范围三重收窄：本人 + 当前需求 + 当前批次 —— 不把同事的人、别的一单的人混进来。 */
function openBatchPersons(id){
  const b = B(id);
  if(!b || !b.id) return;
  markScrollOut();
  if(BP.id !== id) BP.back = snapshotHere();
  BP.id = id;
  S.page = 'batchPersons';
  closeAll();
  render();
  setMainScroll(0);
  navHash(routeHash(), 'push');
}
function batchPersonsBack(){
  const bk = BP.back;
  BP.id = null; BP.back = null;
  if(bk && bk.page && bk.page !== 'batchPersons' && restoreSnap(bk)){
    render(); setMainScroll(bk.scroll || 0);
    navHash(routeHash(), 'replace');
    return;
  }
  go('batches');
}
/* 兼容旧入口（首页「进人员列表」等）：一律走整页 */
function openBatch(id){ openBatchPersons(id); }
function batchPersonsHtml(){
  const b = B(BP.id);
  if(!b || !b.id) return `<div class="page">
    <div class="pg-back" onclick="go('batches')">← 返回批次列表</div>
    ${head('找不到这个批次','地址指向的批次不在当前演示数据里')}
    <div class="note w">批次编号 <span class="mono">${esc(BP.id||'—')}</span> 没有匹配到记录。演示数据存在内存里，刷新后新增/改过的批次会回到初始状态。</div>
    <div style="margin-top:12px"><button class="btn pri" onclick="go(\'batches\')">返回批次列表</button></div>
  </div>`;
  const d = D(b.demandId);
  const isR04 = S.role==='R04';
  /* 三重收窄：本批次 → 本需求 → 本人当前跟进 */
  const inBatch = PERSONS.filter(p=>p.batchId===b.id && p.demandId===b.demandId);
  const rows = isR04 ? inBatch.filter(p=>dmWhoFollows(p)===S.who) : inBatch;
  const cap = batchUploaded(b), filed = batchFiled(b);
  const ch = batchChannels(b);
  const closed = b.status !== '进行中';
  const acts = `<button class="btn" onclick="openDemand('${d.id}','resume')">看这条需求的简历</button>
    ${closed
      ? `<button class="btn" onclick="openModal(uploadNewBatchModal(),'md-lg')" title="这批已关闭，不再收新简历">新增到今日批次</button>`
      : `<button class="btn" onclick="openModal(uploadModal('${b.id}'),'md-lg')">↑ 传简历</button>`}
    <button class="btn pri" onclick="findInPool('${d.id}')">人才库找人</button>`;
  return `<div class="page">
    <div class="pg-back" onclick="batchPersonsBack()">← 返回批次列表</div>
    ${head('批次 ' + esc(b.code),
      `${esc(d.post)} · ${esc(d.client)} · ${b.date}${b.date===TODAY?' · 今天':''} · 负责人 ${esc(b.owner)}${closed?' · 已关闭（不再收新简历，跟进继续）':''}`,
      acts)}
    <div class="arc-top">
      <span class="sm">新增 <b>${cap}</b> 份</span>
      <span class="sm">已建档 <b>${filed}</b> 人</span>
      <span class="sm">已联系 <b>${b.touched}</b> · 待联系 <b style="color:${Math.max(0,cap-b.touched)?'var(--bad)':'var(--good)'}">${Math.max(0,cap-b.touched)}</b></span>
      <span class="sm">有意向 <b>${b.intent}</b> · 面试 <b>${b.interview}</b> · 到面 <b>${b.arrived}</b></span>
      <div class="sp"></div>
      <span class="xs mut">${PERSONS.some(p=>p.batchId===b.id)
        ? '已建档 '+filed+' 人的来源：'+(ch.map(([n,c])=>esc(n)+' '+c).join(' · ')||'—')
        : '份来源：'+(ch.map(([n,c])=>esc(n)+' '+c).join(' · ')||'—')}</span>
    </div>
    <div class="note i" style="margin-bottom:12px">
      <b>为什么「新增 ${cap} 份」和「已建档 ${filed} 人」不一样？</b>
      新增 = 这一批收进来的文件数（BOSS 下载 ${b.boss} + 上传 ${b.manual} + 人才池 ${b.pool}）；
      已建档 = 真正落成投递的人。同一人重复投、格式不对被退回、只留了联系方式没建档的，只算份不算人。
      两个数都按记录算，没有为了对上而补人。
    </div>
    ${isR04? `<div class="xs mut" style="margin:-4px 0 10px">只列我当前跟进的人（本批 ${inBatch.length} 人中 ${rows.length} 人归我）；其他专员跟的人不在这里显示。</div>` : ''}
    ${appListHtml({ key:'dm-batch:'+b.id, rows, showFollow:!isR04, empty:'这一批还没有建档的人 —— 传简历或从人才池捞人后会出现在这里' })}
  </div>`;
}

/* ================= 弹窗 ================= */

function pickChip(el){
  [...el.parentNode.children].forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
}

function newBatchModal(){
  const today = TODAY, dm = DEMANDS.filter(d=>d.status==='招聘中');
  const d0 = dm[0];
  const seq0 = nextSeq(d0.id, today);
  const preview = batchName(d0.id, today, seq0>1?seq0:0);
  const existing = BATCHES.filter(b=>b.date===today).length;
  return `<div class="md-h"><div><h3>补建批次</h3><p>只用于补录历史（如昨天忘了传）。日常不用建批——传简历、捞人时系统自动建</p></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="note" style="margin-bottom:14px">
      <b>今天已有 ${existing} 个批次。</b> 正常情况下你不需要来这里：在批次列表点「传简历建批次」、或在人才池点「捞入批次」，系统会自己找到当天批次，没有就建一个。
    </div>
    <div class="frow">
      <div class="field"><label>所属需求<i>*</i></label>
        <select id="nbDemand" onchange="previewBatch()">${dm.map(d=>`<option value="${d.id}">${d.post}（${d.client} · 缺口 ${d.head-d.hired}）</option>`).join('')}</select></div>
      <div class="field"><label>批次日期<i>*</i></label><input type="date" id="nbDate" value="${today}" onchange="previewBatch()">
        <div class="hint">可填历史日期补录</div></div>
    </div>
    <div class="field"><label>批次名称</label>
      <input id="nbName" value="${esc(preview)}">
      <div class="hint" id="nbHint">${d0.cs}（公司简称）+ ${d0.ps}（岗位简称）- ${today.slice(5,7)}${today.slice(8,10)}（月日）${seq0>1?' - '+String(seq0).padStart(2,'0')+'（序号）':'（当日首个，不带序号）'}</div></div>
    <div class="field"><label>负责人</label><input value="${esc(S.who||'李文静')}" readonly style="background:var(--bg2)">
      <div class="hint">固定为当前登录人，管理员可代建</div></div>
    <div class="note">批次<b>不再选简历来源</b>：一个批次里天然既有 BOSS 导出的、也有门店手传的、还有池子捞的。渠道记在每个人身上，批次只是汇总。</div>
  </div>
  <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" onclick="closeAll();toast('已补建批次 '+document.getElementById('nbName')?.value)">创建批次</button></div>`;
}
function previewBatch(){
  const did = document.getElementById('nbDemand').value;
  const date = document.getElementById('nbDate').value || TODAY;
  const seq = nextSeq(did, date);
  const name = batchName(did, date, seq>1?seq:0);
  document.getElementById('nbName').value = name;
  const d = D(did);
  document.getElementById('nbHint').innerHTML = `命名规则：${esc(d.cs)}（公司简称）+ ${esc(d.ps)}（岗位简称）- ${date.slice(5,7)}${date.slice(8,10)}（月日）${seq>1?' - '+String(seq).padStart(2,'0')+'（序号）':'（当日首个，不带序号）'}`;
}

/* ===== 上传简历（批量）· 三个入口 =====
   ① 批次内上传：主批次已定，逐人可加投别的需求
   ② 传简历建批次：先选需求，系统按「需求+日期+序号」建/并批次
   ③ 池子入库：只建档不投递，不要逐人加投（C1）
   共同点：渠道必填 —— 没渠道的档案等于不知道人从哪来 */
const UP_ROWS = [
  {name:'张建国', phone:'138****6621', skills:['非标设备','CNC']},
  {name:'周文杰', phone:'137****2234', skills:['装配','钳工']},
  {name:'邱实',   phone:'135****8834', skills:['电子装配']},
  {name:'王秀兰', phone:'135****7788', skills:['电气装配','接线']},
  {name:'秦志国', phone:'138****1102', skills:['PLC','伺服','电气调试']},
  {name:'蒋文斌', phone:'139****4417', skills:['CNC 操作','对刀']},
  {name:'龚雪',   phone:'137****8823', skills:['IQC','卡尺']},
  {name:'段鹏',   phone:'136****5519', skills:['船舶电工']},
];
/* 岗位画像关键词，用于「这个人还适合哪个需求」的建议（真实系统由 AI 匹配出分） */
const UP_KEYS = {D3:['IQC','检验','卡尺','千分尺','品质'], D4:['电工','船舶','舾装','船厂'], D5:['总装','装配','流水线','组装'], D2:['激光','装配','光路'], D7:['CNC','对刀','FANUC','三菱','加工中心']};
let UP_CTX = {mode:'batch', bid:null, mainDid:'', ch:'', chNote:''};

/* 某需求今天「我」的批次：有则复用，没有则导入时自动新建 */
function upLand(did){
  const me = (typeof S!=='undefined' && S.who) || '李文静';
  const ex = BATCHES.find(x=>x.demandId===did && x.owner===me && x.date===TODAY && x.status==='进行中');
  if(ex) return {code:ex.code, isNew:false};
  const n = nextSeq(did, TODAY);
  return {code:batchName(did, TODAY, n||0), isNew:true};
}
function upCands(mainDid){
  const me = (typeof S!=='undefined' && S.who) || '李文静';
  return DEMANDS.filter(d=>d.id!==mainDid && d.status==='招聘中' && allocOf(d.id).some(a=>a.staff===me));
}
function upRowState(row, mainDid, poolOnly){
  const pe = PEOPLE.find(x=>x.phone===row.phone);
  if(!pe) return {pe:null, kind:'new', label:'新建档案', chip:'n'};
  if(poolOnly) return {pe, kind:'exists', label:`${pe.id} · 已在库（跳过，不覆盖原资料）`, chip:'i'};
  const act = activeAppsOf(pe.id);
  if(mainDid && act.some(p=>p.demandId===mainDid)) return {pe, kind:'dup', label:`${pe.id} · 本需求已在跟进`, chip:'r'};
  const other = act.filter(p=>p.demandId!==mainDid);
  if(other.length) return {pe, kind:'busy', label:`${pe.id} · 另在 ${other.length} 个需求跟进中`, chip:'w'};
  return {pe, kind:'idle', label:`${pe.id} · 空闲可捞`, chip:'i'};
}
/* 技能命中候选需求 → 给出「还适合哪个岗」的建议 */
function upSuggest(row){
  const cands = upCands(UP_CTX.mainDid);
  const pe = PEOPLE.find(x=>x.phone===row.phone);
  let best = null;
  cands.forEach(d=>{
    if(pe && activeAppsOf(pe.id).some(p=>p.demandId===d.id)) return;
    const keys = UP_KEYS[d.id] || [];
    const hit = keys.filter(k=>(row.skills||[]).some(s=>s.includes(k)||k.includes(s)));
    if(hit.length && (!best || hit.length>best.hit.length)) best = {d, hit};
  });
  return best;
}
function upChOpts(){
  return EXT_CHANNELS().map(c=>`<button class="ch-opt ${UP_CTX.ch===c.id?'on':''}" onclick="upSetCh('${c.id}')">
    <b>${esc(c.name)}</b><span class="xs mut">${c.needNote?'自定义 · 需填说明':(c.bill?'计费':'免费')+' · '+esc(c.cost)}</span></button>`).join('');
}
function upSetCh(id){ UP_CTX.ch = id; const box = document.getElementById('upChBox'); if(box) box.innerHTML = upChOpts(); upSync(); }
function upChNoteHtml(){
  const c = CHANNELS.find(x=>x.id===UP_CTX.ch);
  if(!c || !c.needNote) return '';
  return `<div class="field" style="margin-top:8px"><label>「其他」要填一句说明<i>*</i></label>
    <input id="upChNoteIn" placeholder="例：同行转来的名单 / 微信群 / 老客户推荐但不算转介绍" value="${esc(UP_CTX.chNote||'')}"
      onchange="UP_CTX.chNote=this.value">
    <div class="hint">选「其他」必须写清是什么口径 —— 否则半年后没人知道这批人从哪来。</div></div>`;
}

function uploadModal(bid, mode){
  mode = mode || 'batch';
  if(UP_CTX.mode!==mode || UP_CTX.bid!==(bid||null)){
    UP_CTX = {mode, bid: bid||null, mainDid: bid ? B(bid).demandId : '', ch: '', chNote: ''};
  }
  const b = UP_CTX.bid ? B(UP_CTX.bid) : null;
  const poolOnly = UP_CTX.mode==='pool';
  const buildMode = UP_CTX.mode==='build';
  const mainDid = UP_CTX.mainDid || null;
  const dem = mainDid ? D(mainDid) : null;
  UP_CTX.mainDid = mainDid;
  const me = (typeof S!=='undefined' && S.who) || '李文静';

  const st = UP_ROWS.map(r=>upRowState(r, mainDid, poolOnly));
  const nNew = st.filter(s=>s.kind==='new').length;
  const nHit = st.filter(s=>s.kind==='busy'||s.kind==='idle').length;
  const nDup = st.filter(s=>s.kind==='dup'||s.kind==='exists').length;

  const cands = upCands(mainDid);
  const opt = cands.map(d=>`<option value="${d.id}">${esc(d.post)} · ${esc(d.client)}</option>`).join('');
  const noAlloc = DEMANDS.filter(d=>d.id!==mainDid && d.status==='招聘中' && !allocOf(d.id).some(a=>a.staff===me)).map(d=>d.post).join('、');

  /* 建批模式的「选需求」下拉：只列我有份额的在招需求 */
  const myDemands = DEMANDS.filter(d=>d.status==='招聘中' && (S.role==='R01' || allocOf(d.id).some(a=>a.staff===me)));
  const didOpts = myDemands.map(d=>`<option value="${d.id}" ${mainDid===d.id?'selected':''}>${esc(d.post)} · ${esc(d.client)}（缺 ${d.gap||'—'} 人）</option>`).join('');
  const land = (buildMode && mainDid) ? upLand(mainDid) : null;

  const rowsHtml = UP_ROWS.map((r,i)=>{
    const s = st[i];
    const nm = s.pe ? `<span class="arc-link" onclick="openArchive('${s.pe.id}')">${esc(r.name)}</span>` : esc(r.name);
    if(s.kind==='dup') return `<div class="up-row skip" data-phone="${r.phone}">
      <div class="up-row-main"><div class="up-nm">${nm} <span class="xs mut">${esc(r.phone)}</span></div>
        <div class="up-mt"><span class="b n">已跳过</span> ${esc(s.label)}　不重复建档、不重复打电话</div></div>
      <span class="xs mut">—</span></div>`;
    if(poolOnly) return `<div class="up-row" data-phone="${r.phone}">
      <div class="up-row-main"><div class="up-nm">${nm} <span class="xs mut">${esc(r.phone)}</span></div>
        <div class="up-mt"><span class="b ${s.chip}">${esc(s.label)}</span></div></div>
      <span class="xs mut">${s.kind==='new'?'建档':'跳过'}</span></div>`;
    return `<div class="up-row" data-phone="${r.phone}">
      <div class="up-row-main"><div class="up-nm">${nm} <span class="xs mut">${esc(r.phone)}</span></div>
        <div class="up-mt"><span class="b ${s.chip}">${esc(s.label)}</span></div>
        <div class="up-land"></div></div>
      <select class="up-sel" onchange="upSync()"><option value="">只进主批次</option>${opt}</select>
    </div>`;
  }).join('');

  const title = poolOnly ? '上传简历入库 · 只建档' : buildMode ? '传简历 · 建/并批次' : '上传简历 · 批量';
  const sub = poolOnly ? '进人才池，不产生投递 —— 等人被捞'
    : buildMode ? '选需求后系统自动生成/并入今天的批次'
    : '一次导入多份，逐人决定要不要顺手推到别的需求';

  const landBlock = poolOnly
    ? `<div style="display:flex;align-items:center;gap:8px;background:var(--info-soft);border:1px solid var(--info-line);border-radius:9px;padding:9px 12px">
        <span class="b i">只入库</span><b class="sm">不生成投递、不进任何批次</b>
        <span class="xs mut">入库后可在人才池搜索 / AI 找候选人</span>
      </div>
      <div class="note" style="margin-top:9px;line-height:1.7">
        <b>人才池是全公司共用的水库</b>：这里只负责把简历收进来建档（记录上传人，脏数据能追到人）。
        <b>不要求为这批人挑需求</b> —— 手动上传不选需求就只入库，这是允许的默认路径；等有人来捞再生成投递。
        要给某个人开投递，去「人员列表 · 加人」，别混在一个弹窗里做两件事。
      </div>`
    : buildMode
      ? `<div class="frow" style="gap:10px">
          <div class="field" style="flex:2"><label>投到哪个需求<i>*</i></label>
            <select id="upDid" onchange="upSetDid(this.value)"><option value="">请选择需求</option>${didOpts}</select></div>
          <div class="field" style="flex:2"><label>批次（系统生成）</label>
            <div class="up-batch">${land
              ? `<b class="mono">${esc(land.code)}</b> <span class="xs mut">${land.isNew?'今天还没有批次，导入时自动新建':'今天已有批次，直接并进去'}</span>`
              : '<span class="xs mut">选需求后自动带出</span>'}</div></div>
        </div>
        <div class="note" style="margin-top:2px;line-height:1.7">
          <b>已有则并入 · 无则新建</b>：批次不再单独建，也不再选「简历来源」——来源是每个人的属性，记在渠道上。
        </div>`
      : `<div style="display:flex;align-items:center;gap:8px;background:var(--accent-soft);border:1px solid var(--accent-line);border-radius:9px;padding:9px 12px">
          <span class="b i">主批次</span>
          <b class="mono" style="font-size:14.5px">${b?esc(b.code):'—'}</b>
          <span class="xs mut">${dem?esc(dem.post)+' · '+esc(dem.client):''}</span>
        </div>
        <div class="note" style="margin-top:9px;line-height:1.7">
          <b>同一需求下的其他批次不用选</b> —— 人是挂在需求上的，批次只记录他从哪个口子进来。<br>
          这里要选的是「<b>别的需求</b>」：选中后会新增一条独立投递（分数、进度、负责人另算），今天该需求还没有批次就自动建一个。
        </div>`;

  return `<div class="md-h"><div><h3>${title}</h3><p>${sub}</p></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="up-drop">
      <div style="font-size:26px;color:var(--ink4)">↑</div>
      <div class="sm" style="margin-top:6px"><b>点击选择文件</b> 或拖拽到此处</div>
      <div class="xs mut" style="margin-top:4px">支持 .xlsx / .csv / .zip / .pdf / 图片 · 单次最多 200 份</div>
      <div class="sm mono" style="margin-top:10px;color:var(--accent)">已选择：BOSS导出_1113.xlsx（8 份）</div>
    </div>

    <div style="background:#fff;border:1px solid var(--line);border-radius:9px;padding:11px 14px;margin-top:12px">
      <div class="sm" style="font-weight:600;margin-bottom:6px">查重结果（按手机号比对人才档案）</div>
      <div style="display:flex;gap:14px;font-size:14px;flex-wrap:wrap">
        <span>本次 <b class="mono">8</b> 份</span>
        <span style="color:var(--good)">新建档案 <b class="mono">${nNew}</b></span>
        ${poolOnly
          ? `<span style="color:var(--bad)">已存在（跳过 · 不覆盖原资料）<b class="mono">${nDup}</b></span>`
          : `<span style="color:var(--accent)">命中已有档案 <b class="mono">${nHit}</b></span>
             <span style="color:var(--bad)">本需求已在跟进 <b class="mono">${nDup}</b></span>`}
      </div>
    </div>

    <div style="margin-top:14px">
      <div class="sm" style="font-weight:600;margin-bottom:6px">${poolOnly?'入到哪':'进哪个批次'}</div>
      ${landBlock}
    </div>

    <div class="up-ch" style="margin-top:14px">
      <div class="sm" style="font-weight:600;margin-bottom:7px">简历渠道 <span style="color:var(--bad)">*</span>
        <span class="xs mut" style="font-weight:400">整批同一渠道；单份不同渠道请分开传</span></div>
      <div class="ch-pick" id="upChBox">${upChOpts()}</div>
      <div id="upChNote">${upChNoteHtml()}</div>
      <div class="xs mut" style="margin-top:7px;line-height:1.7">
        渠道 ≠ 采集方式。采集方式是「怎么弄进来的」（文件导入/手动上传/池内捞入，系统自动记）；
        渠道是「人从哪个平台来」（BOSS / 抖音 / 小红书…，要核算投入产出）。档案上只存首次来源渠道，功劳只算一次。
      </div>
    </div>

    <div style="margin-top:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">
        <div class="sm" style="font-weight:600">导入预览 <span class="xs mut">${poolOnly?'只建档，不投递':'逐人可加投其他需求，不选就只进主批次'}</span></div>
        ${poolOnly?'':`<button class="link xs" onclick="upClear()">清空加投</button>`}
      </div>
      <div style="max-height:262px;overflow:auto;padding-right:2px">${rowsHtml}</div>
      ${(!poolOnly && noAlloc)?`<div class="xs mut" style="margin-top:8px;line-height:1.7">未分配给你的需求不能推：${esc(noAlloc)}（需管理员先分配缺口）</div>`:''}
    </div>

    <div id="upSum" class="up-sum"></div>
  </div>
  <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" id="upBtn" onclick="upDo()">开始导入</button></div>`;
}

function upSetDid(v){
  UP_CTX.mainDid = v;
  openModal(uploadModal(UP_CTX.bid, UP_CTX.mode),'md-lg');
}

function upSync(){
  const poolOnly = UP_CTX.mode==='pool';
  const noteBox = document.getElementById('upChNote');
  if(noteBox) noteBox.innerHTML = upChNoteHtml();
  const rows = [...document.querySelectorAll('.up-row:not(.skip)')];
  let extra = 0, notify = 0;
  rows.forEach(row=>{
    const sel = row.querySelector('.up-sel');
    const land = row.querySelector('.up-land');
    if(!sel) return;
    const pe = PEOPLE.find(x=>x.phone===row.dataset.phone);
    if(sel.value){
      const dupe = pe && activeAppsOf(pe.id).find(p=>p.demandId===sel.value);
      if(dupe){
        land.innerHTML = `<span style="color:var(--bad)">→ 该需求已在跟进（${esc(dupe.node)}），导入时会跳过这条</span>`;
      } else {
        const l = upLand(sel.value);
        extra++;
        land.innerHTML = `→ 落到 <b>${esc(l.code)}</b> <span class="mut">${l.isNew?'今天还没有批次，导入时自动新建':'今天已有批次，直接并进去'}</span>`;
        if(pe && activeAppsOf(pe.id).length) notify++;
      }
    } else {
      const r = UP_ROWS.find(x=>x.phone===row.dataset.phone);
      const sg = r ? upSuggest(r) : null;
      land.innerHTML = sg ? `顺手可加投 <b>${esc(sg.d.post)}</b> <span class="mut">技能命中 ${esc(sg.hit.join('、'))}</span> <span class="up-take" onclick="upTake(this,'${sg.d.id}')">采纳</span>` : '';
    }
  });
  const newCnt = rows.filter(r=>!PEOPLE.find(x=>x.phone===r.dataset.phone)).length;
  const total = rows.length + extra;
  const sum = document.getElementById('upSum');
  const btn = document.getElementById('upBtn');
  const chName = (CHANNELS.find(c=>c.id===UP_CTX.ch)||{}).name;
  const chTip = UP_CTX.ch
    ? `渠道 <b>${esc(chName)}</b>`
    : `<b style="color:var(--bad)">未选渠道</b>`;
  if(sum) sum.innerHTML = poolOnly
    ? `<div class="sm"><b>预计</b> 入库 <b>${rows.length}</b> 份 · 新建档案 <b>${newCnt}</b> · 已存在跳过 <b>${rows.length-newCnt}</b>（不覆盖原资料）· ${chTip}<span class="mut">· 不进任何需求</span></div>`
    : `<div class="sm"><b>预计</b> 新建档案 <b>${newCnt}</b> 份 · 新建投递 <b>${total}</b> 条<span class="mut">（主批次 ${rows.length} + 其他需求 ${extra}）</span> · ${chTip}${extra?` · 其中 <b style="color:var(--bad)">${notify} 人</b>正在别处跟进，会通知原负责人`:''}</div>`;
  if(btn) btn.textContent = poolOnly ? `开始入库（${rows.length} 份）` : `开始导入（${total} 条投递）`;
}
function upTake(el, did){
  const row = el.closest('.up-row');
  row.querySelector('.up-sel').value = did;
  upSync();
}
function upClear(){
  document.querySelectorAll('.up-sel').forEach(s=>{ s.value=''; });
  upSync();
}
function upDo(){
  if(!UP_CTX.ch){ toast('请先选择简历渠道 —— 渠道必填，否则不知道人从哪来'); return; }
  const c = CHANNELS.find(x=>x.id===UP_CTX.ch) || {};
  if(c.needNote && !(UP_CTX.chNote||'').trim()){ toast('渠道选了「其他」，要填一句说明是什么口径'); return; }
  const chName = (CHANNELS.find(c=>c.id===UP_CTX.ch)||{}).name;
  const me = (typeof S!=='undefined' && S.who) || '李文静';
  if(UP_CTX.mode==='pool'){
    toast(`已入库 8 份：新建档案 3 份，已存在跳过 5 份（不覆盖原资料）；渠道 ${chName} · 上传人 ${me}，未进任何需求`);
  } else if(UP_CTX.mode==='build'){
    const l = UP_CTX.mainDid ? upLand(UP_CTX.mainDid) : null;
    toast(`已导入 8 份：${l?(l.isNew?'新建批次 '+l.code:'并入批次 '+l.code):'已建批次'}，新建投递 8 条 · 渠道 ${chName}`);
  } else {
    toast(`已导入 8 份：新建档案 3 份，写入主批次并生成投递 · 渠道 ${chName}`);
  }
  closeAll();
}
function uploadPoolModal(){ return uploadModal(null, 'pool'); }
function uploadNewBatchModal(){ return uploadModal(null, 'build'); }

/* 新建需求已改为四步向导，实现在 pages-nd.js（选标准岗位标准 → 看并改 → 人/时间/钱 → 生成） */

/* AI 匹配（v1.2：硬条件三态 + 加分只排序 + 绑定需求版本） */
function runMatch(bid, forceScope){
  const b = B(bid) || {};
  const d = D(b.demandId);
  if(!d){ toast('该批次未关联需求'); return; }
  const scope = forceScope || S.f.mScope || 'demand';
  S.f.mScope = scope;
  const pool = PERSONS.filter(p => scope==='batch' ? p.batchId===bid : p.demandId===d.id);
  const rows = pool.map(p=>{
    const items = assessPerson(p, d);
    return {p, items, sum: triSum(items), bonus: bonusOf(p,d).filter(x=>x.hit).length, score:p.score};
  }).sort((x,y)=> (TRI_RANK[x.sum]-TRI_RANK[y.sum]) || (y.score-x.score));

  const av = activeVer(d);
  /* 没有生效版本 = 条件未定，任何人都不能进「可推荐」；否则会出现「顶部说禁止推荐、底部提示推荐成功」 */
  const canRec = !!av;
  const okRows = rows.filter(r=>r.sum==='ok');
  const okN = canRec ? okRows.length : 0;
  const blockedN = canRec ? 0 : okRows.length;
  const pendN = rows.filter(r=>r.sum==='pend').length;
  const noN = rows.filter(r=>r.sum==='no').length;
  const stale = matchNeedsUpdate(d);
  const stamp = MATCH_STAMP[d.id] || {};

  openModal(`
    <div class="md-h"><div><h3>AI 匹配结果 <span class="b n" style="font-size:12.5px;vertical-align:middle">演示逻辑</span></h3>
      <p>${esc(pool.length?'':'')}依据需求 <span class="mono">${esc(d.code)}</span> · 生效版本 <span class="mono">${esc(av?av.v:'无')}</span> · 硬条件逐项判断</p></div>
      <button class="dr-x" onclick="closeAll()">×</button></div>
    <div class="md-b">

      ${av? '' : `<div class="note r" style="margin-bottom:12px"><b>该需求没有生效版本</b>（${esc(d.confirm)}），本次结果仅作演示，<b>不得作为推荐依据</b>；下方「可推荐」已归零，推荐入口不可用。</div>`}
      ${stale? `<div class="note w" style="margin-bottom:12px"><b>匹配结果需更新</b>：需求条件已变更（结果基于 ${esc(stamp.ver||'—')}，当前生效 ${esc(av?av.v:'无')}）。
        <button class="btn xs" style="margin-left:8px" onclick="refreshMatch('${bid}')">按当前版本重算</button></div>`:''}

      <div style="display:flex;gap:8px;margin-bottom:14px">
        ${[['ok',okN,'可推荐'],['pend',pendN,'待补依据'],['no',noN,'不可推荐']].map(([k,v,lab])=>`
          <div style="flex:1;text-align:center;background:#fff;border:1px solid var(--line);border-radius:9px;padding:11px">
            <div class="xs mut">${esc(lab)}</div>
            <div class="mono" style="font-size:24px;font-weight:600;color:${k==='ok'?'var(--good)':k==='pend'?'var(--warn)':'var(--bad)'}">${v}</div>
            <div class="xs">${tri(k)}</div>
            ${k==='ok'&&!canRec&&blockedN?`<div class="xs mut">${blockedN} 人条件已符合，但需求未生效</div>`:''}</div>`).join('')}
      </div>

      <div class="toolbar" style="border:1px solid var(--line);border-radius:9px;margin-bottom:10px">
        <span class="chip ${scope==='demand'?'on':''}" onclick="runMatch('${bid}','demand')">本需求全部 ${PERSONS.filter(p=>p.demandId===d.id).length} 人</span>
        <span class="chip ${scope==='batch'?'on':''}" onclick="runMatch('${bid}','batch')">只看本批次 ${PERSONS.filter(p=>p.batchId===bid).length} 人</span>
        <div class="sp"></div>
        <span class="xs mut">S/A/B/C/D 与分数为演示口径，不参与符合性判断</span>
      </div>

      ${rows.map(r=>{
        const bad = r.items.filter(i=>i.state!=='ok' && !i.soft);
        const why = bad.length
          ? bad.map(i=>`${i.label.split(' / ')[0]}${i.state==='no'?'不符合':'待确认'}`).join(' · ')
          : '全部硬条件已核实符合';
        return `<div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:9px;padding:10px 12px;margin-bottom:6px;cursor:pointer"
            onclick="closeAll();openMatchDetail('${r.p.id}','${d.id}')">
          ${triS(r.sum)}
          <div style="flex:1"><div class="sm"><b>${esc(r.p.name)}</b> <span class="xs mut">${esc(r.p.skills[0]||'')} · ${r.p.age}岁 · ${esc(r.p.gender)}</span>
            <span class="tier ${r.p.tier}" style="transform:scale(.85)">${r.p.tier}</span>
            <span class="mono xs mut">${r.score} 分</span></div>
            <div class="xs ${bad.length?'':'mut'}" style="color:${r.sum==='no'?'var(--bad)':r.sum==='pend'?'var(--warn)':''}">${esc(why)}</div></div>
          <span class="link">看依据</span></div>`;
      }).join('') || '<div class="empty">该范围内没有候选人</div>'}

      <div class="note" style="margin-top:12px">判断口径：任一硬条件<b>已确认不符合</b> → 整体不可推荐；无明确不符合但存在<b>信息待确认</b> → 整体待确认；全部<b>已核实符合</b> → 才可推荐。
        加分项只影响排序，<b>不得</b>覆盖 Pass 判断。资料缺失一律记「待确认」，不自动当作符合或不符合。</div>
    </div>
    <div class="md-f"><button class="btn" onclick="closeAll()">关闭</button>
      ${stale?`<button class="btn" onclick="refreshMatch('${bid}')">按当前版本重算</button>`:''}
      ${canRec
        ? `<button class="btn pri" onclick="closeAll();toast('已把 ${okN} 位「已核实符合」的人加入优先跟进')">加入优先跟进（${okN} 人）</button>`
        : `<button class="btn" title="需求没有生效版本，未审核不得推荐" onclick="recBlocked('${d.id}')">不可推荐（需求未生效）</button>`}
    </div>`, 'md-xl');
}
/* 拦截原因必须点名：哪一步没过、为什么不能推荐，而不是一个灰按钮 */
function recBlocked(did){
  const d = D(did);
  const ov = openVer(d);
  const why = ov
    ? `该需求当前是「${ov.status}」的 ${ov.v}，未经内部审核通过不生效`
    : `该需求当前为「${d.confirm}」，还没有生效版本`;
  toast(`不可推荐：${why}。请先完成代登记与内部审核，再用生效版本重算匹配`);
}
function refreshMatch(bid){
  const b = B(bid)||{}; const d = D(b.demandId); if(!d) return;
  const av = activeVer(d);
  MATCH_STAMP[d.id] = {ver: av?av.v:'—', at:'2026-11-14 08:30', stale:false};
  runMatch(bid, S.f.mScope||'demand');
  toast('已按 '+(av?av.v:'当前版本')+' 重新判断');
}
/* 单人匹配详情：逐项三态 + 依据，与列表口径一致 */
function openMatchDetail(pid, did){
  const p = P(pid), d = D(did);
  const items = assessPerson(p, d);
  const sum = triSum(items);
  const av = activeVer(d);
  const bonus = bonusOf(p, d);
  openDrawerW(`<div class="dr-h"><div><h3>匹配依据 · ${esc(p.name)}</h3>
    <div class="sub">${esc(d.client)} · ${esc(d.post)} · 依据版本 <span class="mono">${esc(av?av.v:'无生效版本')}</span></div></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="dr-b">
    <div class="card" style="margin-bottom:14px"><div class="card-b">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        ${tri(sum)}<span class="sm">${esc(TRI_SUM_TXT[sum])}</span>
        <div class="sp" style="flex:1"></div>
        <span class="xs mut">演示评分 ${p.score} 分 · 档位 ${p.tier}（仅排序参考）</span>
      </div>
    </div></div>

    <div class="sec"><div class="sec-t">硬条件逐项判断（${items.length} 项）</div>
      ${items.map(i=>`<div class="tri-row">
        <div class="tr-l"><b>${esc(i.label.split(' / ')[0])}</b>
          <div class="xs mut">#${i.no} · ${esc(i.grade||'')}${i.soft?' · 加分项（不计入 Pass）':''}</div>
          <div class="xs mut">要求：${esc(i.need||'—')}</div></div>
        <div class="tr-v">${tri(i.state)}<div class="sm" style="margin-top:3px">${esc(i.got||'—')}</div>
          <div class="tr-n">来源：${esc(i.src||'—')}${i.ev?' · 原文：'+esc(i.ev):''}${i.at&&i.at!=='—'?' · 确认于 '+esc(i.at):''}
          ${i.note?'<br>'+esc(i.note):''}</div></div>
      </div>`).join('')}
    </div>

    <div class="sec"><div class="sec-t">加分项（只影响排序）</div>
      ${bonus.map(b=>`<div class="sm" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line2)">
        <span>${esc(b.label)}</span><span>${b.hit?'<span class="b g">命中</span>':'<span class="b n">未命中</span>'}</span></div>`).join('')}
      <div class="note" style="margin-top:9px">加分项不参与 Pass 判断：加分再高，只要有一项硬条件「已确认不符合」，整体仍不可推荐。</div>
    </div>

    <div class="sec"><div class="sec-t">需要补的信息</div>
      ${items.filter(i=>i.state==='pend').length
        ? items.filter(i=>i.state==='pend').map(i=>`<div class="sm" style="padding:5px 0;border-bottom:1px solid var(--line2)">
            <span class="b w">待确认</span> ${esc(i.label.split(' / ')[0])} —— ${esc(i.note||'缺依据')}</div>`).join('')
        : '<div class="sm mut">无缺口</div>'}
    </div>
  </div>
  <div class="dr-f"><button class="btn" onclick="closeAll()">关闭</button>
    <button class="btn" onclick="closeAll();openHuman('${p.personId}', 'verify')">看核实依据</button></div>`);
}
function matchOneModal(kid){
  const k = PEOPLE.find(x=>x.id===kid);
  return `<div class="md-h"><div><h3>AI 匹配 · ${esc(k.name)} <span class="b n" style="font-size:12.5px;vertical-align:middle">演示逻辑</span></h3>
    <p>选择需求后给出档位与分值 —— 分数只用于排序，符合性以硬条件三态为准</p></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="field"><label>匹配目标需求（非必填）</label>
      <select>${DEMANDS.map(d=>`<option>${d.post} · ${d.client}</option>`).join('')}</select>
      <div class="hint">不选需求时不产生 Pass 判断，仅给通用演示分</div></div>
    <div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:15px;margin-top:6px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="text-align:center"><div class="mono" style="font-size:34px;font-weight:600;color:var(--good)">A</div><div class="xs mut">演示档位</div></div>
        <div style="flex:1">
          <div class="barline"><span class="xs mut">综合</span><div class="bar g"><i style="width:84%"></i></div><b>84</b></div>
          <div class="barline" style="margin-top:6px"><span class="xs mut">技能</span><div class="bar"><i style="width:88%"></i></div><b>88</b></div>
          <div class="barline" style="margin-top:6px"><span class="xs mut">经验</span><div class="bar"><i style="width:82%"></i></div><b>82</b></div>
        </div>
      </div>
      <div class="hr"></div>
      <div class="sm"><b>演示说明</b></div>
      <div class="xs mut" style="margin-top:5px;line-height:1.75">
        · 本页分值为演示口径，<b>尚未接入真实评分模型</b><br>
        · 实际推荐以「已核实符合 / 信息待确认 / 已确认不符合」三态为准<br>
        · 资料缺失时一律待确认，不按分数推断符合
      </div>
    </div>
  </div>
  <div class="md-f"><button class="btn" onclick="closeAll()">关闭</button>
    <button class="btn pri" onclick="closeAll();toast('已保存演示评分留档')">保存演示评分</button></div>`;
}
/* 捞入批次：从「人才库找人」进来时带着需求（forD），下拉先给这一单的进行中批次，
   省得在一堆批次号里找 —— 但不禁用别的批次，临时帮别的单捞人也是允许的。 */
function poolPickBatch(kid, forD){
  const open = BATCHES.filter(b=>b.status==='进行中');
  const list = forD ? open.filter(b=>b.demandId===forD).concat(open.filter(b=>b.demandId!==forD)) : open;
  const d = forD ? D(forD) : null;
  return `<div class="md-h"><div><h3>捞入批次${d?' · '+esc(d.post):''}</h3><p>把池内人员加入某个进行中的批次</p></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    ${d?`<div class="note i" style="margin-bottom:12px">当前在给 <b>${esc(d.post)}</b>（${esc(d.client)}）找人，默认选这一单的进行中批次。</div>`:''}
    <div class="field"><label>选择批次</label>
      <select>${list.map(b=>`<option>${b.code} · ${D(b.demandId).post}</option>`).join('')}</select></div>
    <div class="note">捞入后该人员会出现在批次人员列表与需求人员列表中，状态为「新入库」。</div>
  </div>
  <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" onclick="closeAll();toast('已捞入批次')">确认捞入</button></div>`;
}
function addPersonModal(){
  const sample = [
    {n:'周文杰', id:'P41', s:'装配、钳工', note:'已投 阿特斯装配（王浩）', busy:true},
    {n:'方志明', id:'PE', s:'钳工、装配、机修', note:'空闲可捞', busy:false},
    {n:'邱实', id:'P40', s:'电子装配', note:'已投 阿特斯装配（王浩）', busy:true},
  ];
  return `<div class="md-h"><div><h3>加人 · 从人才池捞</h3>
    <p>先搜档案，再决定推到哪个需求 · 同一份档案可以投多个需求</p></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="field"><label>搜索技能 / 姓名</label><input value="钳工" placeholder="例：钳工、CNC、售后">
      <div class="hint">按技能、姓名、手机号搜索，结果会标注该人当前的投递情况</div></div>
    <div class="frow">
      <div class="field"><label>推到哪个需求<i>*</i></label>
        <select>${DEMANDS.filter(x=>x.status==='招聘中').map(x=>`<option>${x.post} · ${x.client}</option>`).join('')}</select></div>
      <div class="field"><label>进哪个批次</label>
        <select>${BATCHES.filter(b=>b.status==='进行中').map(b=>`<option>${b.code}</option>`).join('')}</select></div>
    </div>
    <div class="sec-t" style="margin-top:16px">搜索结果（3）</div>
    ${sample.map(r=>`<div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:9px;padding:10px 12px;margin-bottom:7px">
      <div class="avatar">${esc(r.n.slice(0,1))}</div>
      <div style="flex:1"><div class="sm"><b>${esc(r.n)}</b> <span class="xs mut">${esc(r.s)}</span></div>
        <div class="xs ${r.busy?'':'mut'}" style="${r.busy?'color:var(--bad)':''}">${esc(r.note)}</div></div>
      ${r.busy? `<button class="btn xs" onclick="crossAppConfirm('${esc(r.n)}','阿特斯装配','王浩')">加入</button>`
        : `<button class="btn xs" onclick="toast('已加入批次，新建一条投递')">加入</button>`}
    </div>`).join('')}
    <div class="note" style="margin-top:12px">同一需求下同一人只允许一条进行中的投递 —— 若该人已在本需求里，系统会拦下并提示「已在跟进中」，避免两个专员重复打电话。</div>
  </div>
  <div class="md-f"><button class="btn" onclick="closeAll()">关闭</button></div>`;
}
function crossAppConfirm(name, demand, owner){
  openModal(`<div class="md-h"><div><h3>该人正在别的需求跟进中</h3>
    <p>确定要再推一个需求吗</p></div><button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="note r"><b>${esc(name)}</b> 目前正在 <b>${esc(demand)}</b> 跟进中，负责人 <b>${esc(owner)}</b>。</div>
    <div class="sm" style="margin-top:14px;line-height:1.85">
      继续加入会新建一条<b>独立投递</b>：<br>
      · 分数按新需求重新计算，与原投递无关<br>
      · 进度、负责人、批次各自独立<br>
      · 系统会通知原负责人 ${esc(owner)}，避免两边同时往两家客户推同一个人
    </div>
    <div class="field" style="margin-top:14px"><label>冲突处理方式</label>
      <select>
        <option>仍要加入，并通知原负责人</option>
        <option>仍要加入，不通知</option>
        <option>不加入，先问清对方意向</option>
      </select></div>
  </div>
  <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" onclick="closeAll();toast('已新增投递，并通知 ${esc(owner)}')">确认加入</button></div>`);
}
function batchMatchAll(){
  openModal(`<div class="md-h"><div><h3>批量 AI 匹配</h3><p>从人才池勾选人员，批量对某个需求算分</p></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="field"><label>目标需求</label><select>${DEMANDS.map(d=>`<option>${d.post} · ${d.client}</option>`).join('')}</select></div>
    <div class="field"><label>已选人员</label><div class="mut sm">从列表勾选后此处显示，当前未选择</div></div>
    <div class="note">批量匹配结果会按 S/A/B/C/D 分组，可直接勾选高档次人员捞入批次。</div>
  </div>
  <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" onclick="closeAll();toast('已完成批量匹配')">开始匹配</button></div>`);
}

/* 注册共用页 */
['demands','batches','persons','pool','logs'].forEach(k=>{ PAGES[k] = PAGES[k]||{}; });
PAGES.demands = {R01:demandsPage, R02:demandsPage, R04:demandsPage};
/* 需求详情独立页：#demand/<id>/detail?tab=<detail|resume|progress>（不在菜单里，由列表/首页/档案进入） */
PAGES.demandDetail = {any: dmHtml};
/* 批次人员独立页：#batch/<id>/persons（不在菜单里，由批次列表 / 招聘进度进入） */
PAGES.batchPersons = {R01: batchPersonsHtml, R04: batchPersonsHtml};
PAGES.batches = {R01:batchesPage, R04:batchesPage};
PAGES.persons = {R01:personsPage, R04:personsPage};
PAGES.pool    = {R01:poolPage, R04:poolPage};
PAGES.logs    = {R01:logsPage, R04:logsPage};
