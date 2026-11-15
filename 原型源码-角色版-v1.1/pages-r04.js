/* ===== R04 我的首页 =====
   首页只有一个目的：往上上人（录音原话"最终这个软件它最终的目的就是为了效率"）。
   所以第一屏就是「我负责的岗位」的宽表 —— 标题 + 明细全摊开，不折叠、不二次点击、
   点一下就能改；缺口与剩余天数两列加粗变色，因为这是每天扫一眼要用的两个数。
   卡片改宽表是因为"业务人员不怕长"，一屏 15–20 行 × 13 列。
   ============================================================= */

/* ---------- 排序状态（记住上次用的规则） ---------- */
const HD_SORT_KEYS = {
  gap:  {n:'缺口',     d:-1},
  days: {n:'剩余天数', d: 1},
  act:  {n:'在投',     d:-1},
  name: {n:'岗位名',   d: 1},
};
function hdLoadSort(){
  try{
    const v = JSON.parse(localStorage.getItem('rg-home-sort')||'null');
    if(Array.isArray(v) && v.length && v.every(x=>HD_SORT_KEYS[x.k])) return v;
  }catch(e){}
  return [{k:'gap', d:-1}];
}
let HS = {sort:null};
function hdSortState(){ if(!HS.sort) HS.sort = hdLoadSort(); return HS.sort; }
function hdSortSave(){ try{ localStorage.setItem('rg-home-sort', JSON.stringify(hdSortState())); }catch(e){} }
function hdSortClick(k){
  const st = hdSortState();
  const i = st.findIndex(x=>x.k===k);
  if(i<0){ st.push({k, d:HD_SORT_KEYS[k].d}); }
  else if(i===0){ st[0].d *= -1; }
  else { st[i].d *= -1; const [x]=st.splice(i,1); st.unshift(x); }
  HS.sort = st.slice(0,3);
  hdSortSave();
  hdRefresh();
}
function hdSortReset(){
  HS.sort = [{k:'gap', d:-1}];
  hdSortSave();
  hdRefresh();
}
function hdRefresh(){
  const m = document.getElementById('main');
  const sc = m.scrollTop;
  m.innerHTML = renderPage();
  m.scrollTop = sc;
}

/* ---------- 每行要算的数 ---------- */
function hdModel(d){
  const me = S.who;
  const a = allocOf(d.id).find(x=>x.staff===me) || {qty:0, hired:0, target:d.deadline};
  const ps = personsOf(d.id);
  const days = Math.ceil((new Date(d.deadline) - new Date(TODAY))/864e5);
  const price = parseFloat(String(d.price||'').replace(/[^\d.]/g,'')) || 0;
  return {
    d, a,
    mine: a.qty, mineHired: a.hired, gap: a.qty - a.hired,
    act: ps.filter(p=>p.status==='跟进中').length,
    itv: ps.filter(p=>p.node==='待面试').length,
    onb: ps.filter(p=>p.node==='待入职').length,
    days, price,
    name: d.post || '',
  };
}
function hdSortRows(rows){
  const st = hdSortState();
  return rows.slice().sort((x,y)=>{
    for(const {k,d} of st){
      let a=x[k], b=y[k];
      if(typeof a==='string' || typeof b==='string'){ a=String(a); b=String(b); return a.localeCompare(b)*d; }
      if(a!==b) return (a-b)*d;
    }
    return 0;
  });
}

/* ---------- 一行 ---------- */
function hdRow(m, i){
  const d = m.d;
  const late = m.days < 0, urgent = m.days >= 0 && m.days <= 15;
  const gapTone = m.gap > 0 ? 'var(--bad)' : 'var(--good)';
  return `<tr id="hdrow-${d.id}">
    <td style="min-width:210px">
      <div class="t-name"><span class="link-post" title="点开进入这条需求的独立详情页（三页签）" onclick="openDemand('${d.id}','detail')">${esc(d.post)}</span>
        ${d.pinned?'<span class="b a">置顶</span>':''}</div>
      <div class="t-sub">${esc(d.project)} · <span class="mono">${esc(d.code)}</span></div>
    </td>
    <td><div class="sm">${esc(d.client)}</div><div class="t-sub">${esc(d.city)}</div></td>
    <td class="num hd-ed" id="hdc-${d.id}-qty" onclick="hdEdit('${d.id}','qty')"><b>${m.mine}</b><span class="xs mut">/${d.head}</span></td>
    <td class="num">${m.mineHired}</td>
    <td class="num" id="hdc-${d.id}-gap"><b style="color:${gapTone};font-size:15px">${m.gap}</b></td>
    <td class="num">${m.act}</td>
    <td class="num">${m.itv}</td>
    <td class="num">${m.onb}</td>
    <td id="hdc-${d.id}-deadline" onclick="hdEdit('${d.id}','deadline')" class="hd-ed"><span class="mono sm">${esc(d.deadline.slice(5))}</span></td>
    <td class="num" style="color:${late?'var(--bad)':urgent?'var(--warn)':'var(--ink)'};font-weight:600;white-space:nowrap">
      ${late? '已过期 '+Math.abs(m.days)+' 天' : m.days+' 天'}</td>
    <td id="hdc-${d.id}-owner" onclick="hdEdit('${d.id}','owner')" class="hd-ed"><span class="sm">${esc(d.owner||'—')}</span></td>
    <td id="hdc-${d.id}-status" onclick="hdEdit('${d.id}','status')" class="hd-ed">${demandB(d.status)}</td>
  </tr>`;
}

/* ---------- 行内编辑（只改需求侧，标准值不在这里改） ---------- */
function hdEdit(did, f){
  const el = document.getElementById('hdc-'+did+'-'+f);
  if(!el || el.querySelector('input,select')) return;
  const d = D(did);
  if(f==='owner'){
    const cur = d.owner||'';
    el.innerHTML = `<select class="ed-in" onchange="hdSave('${did}','owner',this.value)">
      ${['李文静','陈曦','王浩'].map(n=>`<option ${n===cur?'selected':''}>${n}</option>`).join('')}</select>`;
    el.querySelector('select').focus();
    return;
  }
  if(f==='status'){
    const opts = ['招聘中','暂停','已完成','已关闭'];
    el.innerHTML = `<select class="ed-in" onchange="hdSave('${did}','status',this.value)">
      ${opts.map(n=>`<option ${n===d.status?'selected':''}>${n}</option>`).join('')}</select>`;
    el.querySelector('select').focus();
    return;
  }
  const a = allocOf(did).find(x=>x.staff===S.who) || {};
  const cur = f==='price'? d.price : f==='deadline'? d.deadline : f==='qty'? (a.qty||0) : d.head;
  el.innerHTML = `<input class="ed-in" type="${f==='deadline'?'date':'text'}" value="${esc(cur)}"
    onkeydown="if(event.key==='Enter'){this.blur()} if(event.key==='Escape'){hdReRow('${did}')}"
    onblur="hdSave('${did}','${f}',this.value)">`;
  const ip = el.querySelector('input');
  if(ip){ ip.focus(); if(ip.select) ip.select(); }
}
function hdSave(did, f, v){
  const d = D(did);
  if(f==='qty'){
    const a = allocOf(did).find(x=>x.staff===S.who);
    const old = a ? a.qty : 0;
    if(a) a.qty = +v || 0;
    toast(`已保存 · 我背人数：${old} → ${v}　（分配合计不得超过需求 ${d.head} 人）`);
    hdReRow(did);
    return;
  }
  const old = d[f];
  if(f==='head') d.head = +v || 0;
  else if(f==='price') d.price = /^\d+(\.\d+)?$/.test(String(v).trim()) ? String(v).trim()+' 元/时' : v;
  else d[f] = v;
  const key = (f==='head'||f==='deadline');
  toast(`已保存 · ${f}：${String(old)==='undefined'?'—':old} → ${f==='price'?d.price:v}${key?'　（关键内容变更，已发确认单需客户重确认）':''}`);
  hdReRow(did);
}
/* 只重算这一行，不重排、不刷新整表 */
function hdReRow(did){
  const row = document.getElementById('hdrow-'+did);
  if(!row) return;
  row.outerHTML = hdRow(hdModel(D(did)), 0);
}

/* ---------- 页面 ---------- */
function r04Home(){
  const me = '李文静';
  const myAllocs = ALLOCS.filter(a=>a.staff===me);
  const myDemands = [...new Set(myAllocs.map(a=>a.demandId))].map(D).filter(d=>d.id);
  const myPersons = PERSONS.filter(p=>p.owner===me);
  const myBatches = BATCHES.filter(b=>b.owner===me);
  const todayB = myBatches.filter(b=>b.date===TODAY);
  const myFocus = FOCUS.filter(f=>f.staff===me);

  const rows = hdSortRows(myDemands.map(hdModel));
  const totalGap = rows.reduce((a,x)=>a+x.gap,0);
  const totalMine = rows.reduce((a,x)=>a+x.mine,0);

  /* --- 排序条 --- */
  const sortBar = (()=>{
    const st = hdSortState();
    const btns = Object.entries(HD_SORT_KEYS).map(([k,v])=>{
      const at = st.findIndex(x=>x.k===k);
      const on = at>=0;
      const dir = on ? (st[at].d>0?'↑':'↓') : '';
      const arrow = on ? `<b>${dir}</b>` : '';
      const ord = (on && at>0) ? `<i class="ord">${at+1}</i>` : '';
      return `<button class="hd-sbtn ${on?'on':''}" onclick="hdSortClick('${k}')">${v.n}${arrow}${ord}</button>`;
    }).join('');
    return `<div class="hd-sort">
      <span class="xs mut">排序</span>${btns}
      <button class="hd-sbtn" onclick="hdSortReset()">复位</button>
      <div class="sp"></div>
      <span class="xs mut">点同一列切正反序；多列排序先点主、再点次（最多 3 列）· 下次进来还是这个顺序</span>
    </div>`;
  })();

  /* --- 宽表 --- */
  const head_ = `<div class="tbl-wrap hd-wrap"><table class="hd-tbl">
    <thead><tr>
      <th>岗位 / 项目</th><th>客户</th><th class="num">我背/整单</th><th class="num">已入职</th>
      <th class="num">缺口</th><th class="num">在投</th><th class="num">待面试</th><th class="num">待入职</th>
      <th>最迟到岗</th><th class="num">剩</th><th>跟进人</th><th>状态</th>
    </tr></thead>
    <tbody>${rows.map((m,i)=>hdRow(m,i)).join('')}</tbody>
  </table></div>`;

  /* --- 需要我跟的事：按"在跟"分类，不是按系统待办分类 --- */
  const mineP = myPersons.filter(p=>p.status==='跟进中');
  const grp = [
    {k:'待面试', n:'待面试', tone:'w', list: mineP.filter(p=>p.node==='待面试'), act:'约面/登记结果'},
    {k:'入职', n:'入职跟进', tone:'g', list: mineP.filter(p=>['面试通过','待入职'].includes(p.node)), act:'推进到岗'},
    {k:'意向', n:'意向跟进', tone:'i', list: mineP.filter(p=>['触达中','补全中','新入库'].includes(p.node)), act:'记录联系'},
  ];
  const personRow = (p, act) => `<div class="hd-p" onclick="openPerson('${p.id}')">
    <div class="avatar">${esc(p.name.slice(0,1))}</div>
    <div style="flex:1;min-width:0">
      <div class="sm"><b>${esc(p.name)}</b> <span class="xs mut">· ${esc(D(p.demandId).post)}</span></div>
      <div class="xs mut">${esc(p.skills[0]||'')} · 上次 ${p.lastContact==='—'?'未联系':p.lastContact.slice(5)}${p.nextFollow!=='—'?' · 下次 '+p.nextFollow.slice(5):''}</div>
    </div>
    ${nodeB(p.node)}
    <button class="btn xs" onclick="event.stopPropagation();openModal(followModal('${p.id}'))">${act}</button>
  </div>`;
  const focusBlocks = grp.map(g=>`<div class="hd-grp">
      <div class="hd-grp-h"><span class="b ${g.tone}">${g.n}</span><b class="sm">${g.list.length} 人</b>
        <div class="sp"></div><span class="xs mut">${g.act}</span></div>
      ${g.list.length? g.list.slice(0,6).map(p=>personRow(p,g.act)).join('') : '<div class="xs mut" style="padding:6px 2px">这类现在没有人</div>'}
      ${g.list.length>6?`<div class="xs mut" style="padding:4px 2px">还有 ${g.list.length-6} 人 → <span class="link" onclick="event.stopPropagation();go('persons')">去人员列表</span></div>`:''}
    </div>`).join('');

  const sysFocus = myFocus.length
    ? `<div class="hd-sys">系统提醒 ${myFocus.map(f=>`<span class="hd-sysi ${f.level==='bad'?'r':f.level==='warn'?'w':''}" onclick="handleFocus('${f.target}')">${esc(f.title)}</span>`).join('')}</div>`
    : '';

  /* --- 新增简历：竖条流 --- */
  const recent = PERSONS.filter(p=>p.owner===me && p.lastContact!=='—')
    .sort((a,b)=>b.lastContact.localeCompare(a.lastContact)).slice(0,8);
  const flowRows = recent.map(p=>`<div class="hd-flow" onclick="openPerson('${p.id}')">
      <div class="avatar">${esc(p.name.slice(0,1))}</div>
      <div style="flex:1;min-width:0">
        <div class="sm"><b>${esc(p.name)}</b> <span class="xs mut">${p.age}岁 · ${esc(p.skills.slice(0,2).join('、'))}</span></div>
        <div class="xs mut">${esc(D(p.demandId).post)} · ${p.batchId?esc(B(p.batchId).code):'人才池捞入'}</div>
      </div>
      ${tierChip(p.tier)} ${nodeB(p.node)}
      <div class="xs mut mono" style="width:56px;text-align:right">${p.lastContact.slice(5)}</div>
    </div>`).join('') || '<div class="empty">今天还没有新增简历 —— 传一份简历，系统自动建今天的批次</div>';

  /* --- 今日批次 --- */
  const todayRow = todayB.length? todayB.map(b=>{
    const total = b.boss+b.manual+b.pool;
    return `<div class="hd-batch">
      <div style="width:190px"><div class="sm"><b>${esc(D(b.demandId).post)}</b></div><div class="xs mut mono">${esc(b.code)}</div></div>
      <div style="flex:1">
        <div class="barline"><div class="bar ${b.touched/total>.9?'g':'w'}"><i style="width:${pct(b.touched,total)}%"></i></div><b>${b.touched}/${total}</b></div>
        <div class="xs mut" style="margin-top:3px">新增 ${total} 份 · 有意向 ${b.intent} · 约面 ${b.interview}${total===0?' · <span style="color:var(--accent)">待上传简历</span>':''}</div>
      </div>
      <button class="btn sm" onclick="openBatch('${b.id}')">进人员列表</button>
    </div>`;
  }).join('') : '<div class="empty">今天还没有批次 —— 传一份简历，系统自动建今天的批次</div>';

  return `<div class="page">
    ${head(`早上好，${me}`,
      `今天 ${TODAY} · 我负责 ${rows.length} 个岗位、总缺口 <b style="color:var(--bad)">${totalGap}</b> 人 · 在跟 ${mineP.length} 人 · ${todayB.length} 个今日批次`,
      `<button class="btn" onclick="openModal(followModal('P1'),'md-lg')">记录联系</button><button class="btn pri" onclick="openModal(newBatchModal())">＋ 建今日批次</button>`)}

    ${stats([
      {lab:'我在背的缺口', val:totalGap, unit:'人', accent:true, foot:`共背 ${totalMine} 人指标 · ${rows.length} 个岗位`},
      {lab:'我名下在跟', val:mineP.length, unit:'人', foot:`待面试 ${grp[0].list.length} · 入职跟进 ${grp[1].list.length} · 意向 ${grp[2].list.length}`},
    ])}

    <div class="card" style="margin-bottom:16px">
      <div class="card-h"><div><h3>我负责的岗位</h3>
        <div class="sub">标题 + 明细全摊开 · 点工价/最迟到岗/跟进人/状态可直接改 · 点岗位名看三页签详情</div></div>
        <span class="b ${totalGap?'r':'g'}">总缺口 ${totalGap} 人</span></div>
      <div class="card-b">
        ${sortBar}
        ${head_}
        <div class="xs mut" style="margin-top:8px">共 ${rows.length} 行，不分页。缺口 = 我背的人数 − 已入职；剩 = 最迟到岗 − 今天。</div>
      </div>
    </div>

    <div class="grid g2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-h"><div><h3>需要我跟的事</h3><div class="sub">按在跟的阶段分，不是按系统待办分</div></div>
          <button class="btn sm" onclick="go('persons')">全部人员 →</button></div>
        <div class="card-b" style="max-height:430px;overflow-y:auto">${focusBlocks}${sysFocus}</div>
      </div>
      <div class="card">
        <div class="card-h"><div><h3>新增简历</h3><div class="sub">按最近沟通倒序 · 竖条流</div></div>
          <button class="btn sm" onclick="go('batches')">批次列表 →</button></div>
        <div class="card-b" style="max-height:430px;overflow-y:auto">${flowRows}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><div><h3>今日批次</h3><div class="sub">早上导简历，白天打电话 · 这块决定今天的节奏</div></div>
        <button class="btn sm" onclick="go('batches')">全部批次 →</button></div>
      ${todayRow}
    </div>
  </div>`;
}

function handleFocus(target){
  if(target.startsWith('person:')) openPerson(target.split(':')[1]);
  else if(target.startsWith('demand:')) openDemand(target.split(':')[1]);
}

PAGES.home = {R04:r04Home};
