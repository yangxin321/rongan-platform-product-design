/* ===== R01 管理员页面 ===== */

/* 业务看板 */
function r01Dash(){
  const totalHead = DEMANDS.reduce((a,d)=>a+d.head,0);
  const totalHired = DEMANDS.reduce((a,d)=>a+d.hired,0);
  const urgent = DEMANDS.filter(d=>(new Date(d.deadline)-new Date(TODAY))/864e5 < 20);

  const projRows = DEMANDS.filter(d=>d.status==='招聘中').map(d=>{
    const days = Math.ceil((new Date(d.deadline)-new Date(TODAY))/864e5);
    return `<tr class="clk" onclick="openDemand('${d.id}')">
      <td><div class="t-name">${esc(d.post)}</div><div class="t-sub">${esc(d.client)} · ${esc(d.city)}</div></td>
      <td class="num">${d.head}</td>
      <td class="num">${d.hired}</td>
      <td class="num" style="color:var(--bad);font-weight:500">${d.head-d.hired}</td>
      <td><div class="barline"><div class="bar"><i style="width:${pct(d.hired,d.head)}%"></i></div><b>${pct(d.hired,d.head)}%</b></div></td>
      <td><span class="mono sm" style="${days<20?'color:var(--bad)':''}">${days} 天</span></td>
      <td>${confirmB(d.confirm)}</td>
    </tr>`;
  }).join('');

  const staffRows = ['李文静','陈曦','王浩'].map(s=>{
    const a = ALLOCS.filter(x=>x.staff===s && x.status==='进行中');
    const qty = a.reduce((x,y)=>x+y.qty,0), hired = a.reduce((x,y)=>x+y.hired,0);
    const ps = PERSONS.filter(p=>p.owner===s);
    const bs = BATCHES.filter(b=>b.owner===s && b.date>=TODAY);
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="avatar">${esc(s.slice(0,1))}</div><b class="sm">${s}</b></div></td>
      <td class="num">${a.length} 个</td>
      <td class="num">${qty}</td>
      <td class="num">${hired}</td>
      <td><div class="barline"><div class="bar ${pct(hired,qty)>=40?'g':''}"><i style="width:${pct(hired,qty)}%"></i></div><b>${pct(hired,qty)}%</b></div></td>
      <td class="num sm">${ps.filter(p=>p.status==='跟进中').length} 人在跟</td>
      <td class="sm">${bs.length} 个</td>
    </tr>`;
  }).join('');

  return `<div class="page">
    ${head('业务看板','全公司视角：需求、到岗、人效、时效风险，一屏看完', `<button class="btn" onclick="toast('已导出周报')">导出周报</button><button class="btn pri" onclick="go('demands')">进入需求管理</button>`)}
    ${stats([
      {lab:'在招需求', val:DEMANDS.filter(d=>d.status==='招聘中').length, unit:'个', foot:`共 ${totalHead} 人指标`},
      {lab:'累计已入职', val:totalHired, unit:'人', foot:`整体到岗率 ${pct(totalHired,totalHead)}%`},
      {lab:'缺口', val:totalHead-totalHired, unit:'人', accent:true, foot:'含未分配需求'},
      {lab:'时效预警', val:urgent.length, unit:'个', foot:'20 天内到期'},
    ])}
    <div class="grid g2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-h"><div><h3>重点需求推进</h3><div class="sub">按缺口与时效排序</div></div>
          <button class="btn sm" onclick="go('demands')">全部 →</button></div>
        <div class="tbl-wrap" style="border:none;border-radius:0"><table>
          <thead><tr><th>需求</th><th>人数</th><th>入职</th><th>缺口</th><th>到岗率</th><th>剩余</th><th>确认</th></tr></thead>
          <tbody>${projRows}</tbody></table></div>
      </div>
      <div class="card">
        <div class="card-h"><div><h3>专员战况</h3><div class="sub">谁背了多少、推进到哪</div></div></div>
        <div class="tbl-wrap" style="border:none;border-radius:0"><table>
          <thead><tr><th>专员</th><th>需求</th><th>指标</th><th>入职</th><th>达成</th><th>在跟</th><th>今日批次</th></tr></thead>
          <tbody>${staffRows}</tbody></table></div>
        <div class="card-b" style="border-top:1px solid var(--line2);padding:13px 18px">
          <div class="note w">时效风险：${urgent.map(d=>esc(d.post)).join('、')} 将在 20 天内到期，缺口合计 ${urgent.reduce((a,d)=>a+d.head-d.hired,0)} 人。</div>
        </div>
      </div>
    </div>
    <div class="grid g3">
      <div class="card"><div class="card-h"><h3>行情速览</h3><span class="xs mut">本周</span></div>
        <div class="card-b" style="padding:0">
          ${[['东莞·电气调试','32-36 元/时',168],['上海·船舶电工','40-46 元/时',92],['苏州·装配钳工','26-30 元/时',214]].map(r=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 18px;border-bottom:1px solid var(--line2)">
            <div><div class="sm">${r[0]}</div><div class="xs mut">样本 ${r[2]} 份</div></div>
            <div class="mono sm">${r[1]}</div></div>`).join('')}
        </div></div>
      <div class="card"><div class="card-h"><h3>人才池</h3><span class="xs mut">全量</span></div>
        <div class="card-b">
          <div class="mono" style="font-size:30px;font-weight:600">${POOL.length}</div>
          <div class="xs mut">池内可用人员</div>
          <div class="hr"></div>
          <div class="sm">资料完整度 ≥85%：<b>${POOL.filter(p=>p.complete>=85).length}</b> 人</div>
          <div class="sm" style="margin-top:4px">本周新增：<b>6</b> 人</div>
          <button class="btn sm" style="margin-top:12px" onclick="go('pool')">进入人才池</button>
        </div></div>
      <div class="card"><div class="card-h"><h3>系统与权限</h3><span class="xs mut">最近变更</span></div>
        <div class="card-b" style="padding:0">
          ${[['11-12 09:30','调整角色 R04 权限','新增人才池导出'],['11-11 16:20','画像因子库 v1.3','新增 3 个技能因子'],['11-10 14:00','新增账号 2 个','王浩、陈曦']].map(r=>`
          <div style="padding:11px 18px;border-bottom:1px solid var(--line2)">
            <div class="xs mut mono">${r[0]}</div><div class="sm">${r[1]}</div><div class="xs mut">${r[2]}</div></div>`).join('')}
          <div style="padding:12px 18px"><button class="btn sm" onclick="go('perms')">账号与权限 →</button></div>
        </div></div>
    </div>
  </div>`;
}

/* 转化监控 */
function r01Conversion(){
  const steps = [
    {n:'简历入库', v:1240, note:'全渠道'},
    {n:'进入批次', v:486, note:'39.2%'},
    {n:'有效触达', v:402, note:'82.7%'},
    {n:'推荐客户', v:168, note:'41.8%'},
    {n:'参加面试', v:121, note:'72.0%'},
    {n:'面试通过', v:78, note:'64.5%'},
    {n:'实际到岗', v:52, note:'66.7%'},
  ];
  const max = steps[0].v;
  return `<div class="page">
    ${head('转化监控','简历 → 推荐 → 面试 → 到岗，按画像 / 规则版本切片', `<button class="btn" onclick="toast('已切换为近 30 天')">近 30 天</button><button class="btn" onclick="toast('已导出')">导出</button>`)}
    ${stats([
      {lab:'简历入库', val:'1,240', unit:'份'},
      {lab:'整体到岗转化', val:'4.2', unit:'%', accent:true, foot:'52 / 1240'},
      {lab:'推荐通过率', val:'72.0', unit:'%', foot:'面试 121 / 推荐 168'},
      {lab:'面试通过率', val:'64.5', unit:'%'},
    ])}
    <div class="grid g2">
      <div class="card"><div class="card-h"><div><h3>转化漏斗</h3><div class="sub">每一步的留存与流失</div></div></div>
        <div class="card-b">
          ${steps.map((s,i)=>`<div style="margin-bottom:13px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span>${s.n}</span><span class="mono">${s.v} <span class="xs mut">${i?'· '+s.note:''}</span></span></div>
            <div class="bar" style="height:9px"><i style="width:${s.v/max*100}%;background:${i===6?'var(--good)':'var(--accent)'}"></i></div>
          </div>`).join('')}
        </div></div>
      <div class="card"><div class="card-h"><div><h3>按画像切片</h3><div class="sub">哪类人更容易到岗</div></div></div>
        <div class="tbl-wrap" style="border:none;border-radius:0"><table>
          <thead><tr><th>画像分类</th><th>推荐</th><th>面试</th><th>到岗</th><th>到岗率</th></tr></thead>
          <tbody>
          ${[['电气调试类',42,32,15,'35.7%'],['装配钳工类',38,26,12,'31.6%'],['CNC 操作类',31,22,9,'29.0%'],['品质检验类',28,21,10,'35.7%'],['售后运维类',29,20,6,'20.7%']].map(r=>`
            <tr><td class="sm">${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td>
            <td><span class="b ${parseFloat(r[4])>32?'g':'w'}">${r[4]}</span></td></tr>`).join('')}
          </tbody></table></div>
        <div class="card-b" style="border-top:1px solid var(--line2)">
          <div class="note">售后运维类到岗率偏低（20.7%），主要流失在「推荐后客户排期慢」。建议把该类需求的面试确认时效纳入 R02 考核。</div>
        </div></div>
    </div>
  </div>`;
}

/* 客户确认
   v1.3 · RG-012 第二批：去掉顶部四张统计卡（确认单 / 已生效 / 待客户确认 / 待内部审核）。
   四个数字原来占掉首屏第一行，却和下面表格的「状态」列重复；
   现在它们变成工具栏里的一个状态筛选，筛出来的就是那批记录，条数由「共 N 份」给。
   顺手修掉一个老问题：工具栏的搜索框以前不生效（rows 直接拿 DEMANDS），现已接上。
   不要在 head 和 toolbar 之间加回任何卡片 —— 要加先改 Issue #6 的 AC-1。 */
function r01Confirms(){
  const cf = S.f.cf || '', q = (S.f.q||'').trim();
  const list = DEMANDS.filter(d=>{
    if(cf==='effective' && !isEffective(d)) return false;
    if(cf==='wait' && d.confirm!=='待客户确认') return false;
    if(cf==='audit' && (openVer(d)||{}).status!=='待内部审核') return false;
    if(q && !(d.client+d.project+d.post+d.code).includes(q)) return false;
    return true;
  });
  const rows = list.map(d=>{
    const st = d.confirm==='已确认'?'g':d.confirm==='待客户确认'?'w':'r';
    const av = activeVer(d), pv = pendingVer(d), lk = mainLink(d.id);
    const rg = lastReg(d.id, av?av.v:(pv?pv.v:'v1.0'));
    return `<tr class="clk" onclick="openConfirm('${d.id}')">
      <td><div class="t-name mono" style="font-size:13px">QR-${d.code.slice(3)}</div>
        <div class="t-sub">${av?av.v:'—'}${pv?' → '+pv.v:''}</div></td>
      <td><div class="sm">${esc(d.client)} · ${esc(d.project)}</div><div class="t-sub">${esc(d.post)}（${d.head} 人）</div></td>
      <td><span class="b n">47 项</span></td>
      <td class="sm">${rg?`<b>${esc(rg.regBy)}</b><div class="t-sub">登记 · 反馈人 ${esc(rg.fbPerson)}</div>
          <div class="t-sub">反馈 ${esc(rg.fbAt)} / 登记 ${esc(rg.regAt)}</div>`
        :'<span class="mut">未登记</span>'}</td>
      <td>${lk?`<span class="b ${lk.state==='有效'?'g':'r'}">${esc(lk.state)}</span><div class="t-sub mono">${esc(lk.tok)}</div>`
        :`<span class="b w">未生成</span>`}</td>
      <td><span class="mono sm">${esc(d.valid.split(' ~ ')[1])}</span></td>
      <td><span class="b ${st}">${esc(d.confirm)}</span>
        ${pv?`<div class="t-sub">${esc(pv.v)} ${esc(pv.audit||'未送审')}</div>`:''}
        ${av?'':'<div class="t-sub" style="color:var(--bad)">不生效</div>'}</td>
      <td><div class="acts"><span class="link">查看确认单</span>
        <span class="link" onclick="event.stopPropagation();openVers('${d.id}')">版本</span></div></td>
    </tr>`;
  }).join('');
  const needAudit = DEMANDS.filter(d=>{ const v=openVer(d); return v && v.status==='待内部审核'; }).length;
  return `<div class="page">
    ${head('客户确认','客户线下确认 → 我方代登记 → 内部审核 → 生效；一张确认单覆盖同一项目的多个岗位', `<button class="btn" onclick="go('clinks')">确认链接</button><button class="btn pri" onclick="ndEnter()">＋ 新建确认单</button>`)}
    ${toolbar({q:'搜索客户 / 项目 / 岗位', filters:[
      {k:'cf',opts:[
        {v:'',label:`全部确认单 · ${DEMANDS.length}`},
        {v:'effective',label:`已生效 · ${DEMANDS.filter(d=>isEffective(d)).length}`},
        {v:'wait',label:`待客户确认 · ${DEMANDS.filter(d=>d.confirm==='待客户确认').length}`},
        {v:'audit',label:`待内部审核 · ${needAudit}`},
      ]}
    ], right:`<span class="sm mut">共 ${list.length} 份</span>`})}
    <div class="tbl-wrap"><table>
      <thead><tr><th>确认单</th><th>项目 / 岗位</th><th>确认项</th><th>代登记（客户反馈人 / 我方登记人）</th><th>只读链接</th><th>有效期至</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="empty">当前筛选下没有确认单</td></tr>'}</tbody></table></div>
    ${pager(list.length)}
    <div class="note" style="margin-top:12px">「已确认」但无生效版本的按未生效处理；代登记后需<b>内部审核通过</b>才生效，退回的版本由我方补充客户依据后重新送审（见 REVIEW.md §2）。</div>
  </div>`;
}
function openConfirm(id){
  /* v1.2：改为「需求确认单 · 代登记」，实现见 pages-vers.js */
  return demandConfirmDrawer(id);
}

/* ===== 人才画像因子库：两个 Tab —— 通用因子 / 工种技能因子 ===== */
function r01Factors(){
  const tab = S.f.ftab || 'common';
  const bar = `<div class="tabbar">
    <div class="tab ${tab==='common'?'on':''}" onclick="setF('ftab','common')">通用因子 · 47 项</div>
    <div class="tab ${tab==='trade'?'on':''}" onclick="setF('ftab','trade')">工种技能因子 · ${FACTORS_TRADE.length} 条</div>
  </div>`;
  return tab==='common' ? factorsCommon(bar) : factorsTrade(bar);
}

/* ---- Tab1：通用因子（跨工种共用） ---- */
function factorsCommon(bar){
  let rows = [];
  FACTOR_GROUPS.forEach(g=>g.items.forEach((it,i)=>rows.push({g:g.name, n:it, k:COMMON_CLASS[it]||'skill', rule:['PASS','加分','灵活','仅信息'][i%4], type:['文本','枚举','数值','日期'][i%4], ver:'v1.3'})));
  const q=(S.f.q||'').trim();
  if(q) rows = rows.filter(r=>(r.n+r.g).includes(q));
  const ck = S.f.ck;
  if(ck) rows = rows.filter(r=>r.k===ck);
  const st = commonClassStat();
  const cols=[
    {label:'字段名', r:r=>`<div class="t-name">${esc(r.n)}</div>`},
    {label:'字段性质', r:r=>{ const m=classOf(r.n);
      return `<span class="b ${m.tone}">${esc(m.name)}</span><div class="t-sub">${esc(m.desc)}</div>`; }},
    {label:'所属分组', r:r=>`<span class="b n">${esc(r.g)}</span>`},
    {label:'数据类型', r:r=>`<span class="sm mut">${r.type}</span>`},
    {label:'匹配规则', r:r=>`<span class="b ${r.rule==='PASS'?'r':r.rule==='加分'?'g':r.rule==='灵活'?'w':'n'}">${r.rule}</span>`},
    {label:'版本', r:r=>`<span class="mono xs">${r.ver}</span>`},
    {label:'操作', r:r=>`<div class="acts"><span class="link" onclick="toast('编辑 ${esc(r.n)}')">编辑</span>
      <span class="link" onclick="toast('查看引用该因子的需求')">引用</span></div>`},
  ];
  const chips = Object.keys(CLASS_META).filter(k=>st[k]).map(k=>
    `<span class="chip ${ck===k?'on':''}" onclick="setF('ck','${ck===k?'':k}')">${esc(CLASS_META[k].name)} ${st[k]}</span>`).join('');

  return `<div class="page">
    ${head('人才画像因子库', xpl('这 47 项是<b>人员档案采集口径</b>，不等于因子 —— 按定义只有 7 项同时具备观察点/值域/来源/算子','AI 算分的最小单位 · 每个因子双轴维护「填写属性」与「匹配规则」'), `<button class="btn" onclick="toast('已导出因子库')">导出</button><button class="btn pri" onclick="toast('新增因子')">＋ 新增因子</button>`)}
    ${stats([
      {lab:'采集字段', val:Object.values(st).reduce((a,b)=>a+b,0), unit:'项', foot:'4 个分组 · 跨工种共用'},
      {lab:'可当因子', val:st.skill||0, unit:'项', foot:'其余只做采集或下沉'},
      {lab:'交易条件', val:st.cond||0, unit:'项', foot:'应下沉到职位层'},
      {lab:'证据 / 材料', val:(st.cert||0)+(st.text||0), unit:'项', foot:'证书与文本，可被引用'},
    ])}
    ${bar}
    ${xpl(`<div class="note w" style="margin-bottom:12px">
      <b>审核结论：47 项名不副实。</b>按「观察点 + 值域 + 来源 + 算子」的定义逐条过，只有 <b>7 项</b>能当因子（技能年限 / 设备品牌 / 工艺类型 / 行业背景 / 带班经验 / 语言能力 / 驾驶技能）。另有 ${st.dup||0} 项与工种技能层重复（识图能力、对刀调机、编程能力）、${st.cond||0} 项是交易条件、${st.id||0} 项是标识、${(st.cert||0)+(st.text||0)} 项是证据或材料。这一层应改名为「人员档案字段」，不要叫因子库。
    </div>`,'')}
    ${toolbar({q:'搜索字段名 / 分组', right:`<span class="sm mut">${rows.length} 项</span>`})}
    <div class="toolbar" style="border-top:none;padding-top:0"><div style="display:flex;gap:6px;flex-wrap:wrap">${chips}</div></div>
    ${table(cols, rows)}
    ${pager(rows.length)}
  </div>`;
}

/* ---- Tab2：工种技能因子（挂在 T2 上，一条因子 = 一根三档尺） ---- */
const isGapTier = x => !x || !x.label || x.label==='待补';
const factorHasGap = f => (f.tiers||[]).some(isGapTier);
/* 有精度指标才算「可数字化验收」；「—」「无要求」都不算 */
const hasMetric = x => !!(x && x.metric && x.metric!=='—' && x.metric!=='无要求');

function factorsTrade(bar){
  const tid = S.f.trade || 'T2-QG';
  const t = tradeOf(tid);
  const all = factorsOfTrade(tid);
  const q = (S.f.q||'').trim();
  const fk = S.f.fk || '';
  const usedN = f => PORTRAITS_V2.filter(p=>p.pick.some(x=>x[0]===f.id)).length;

  let rows = all;
  if(q) rows = rows.filter(f=>(f.id+f.name+f.question).includes(q));
  if(fk==='core')   rows = rows.filter(f=>f.core);
  if(fk==='gap')    rows = rows.filter(factorHasGap);
  if(fk==='unused') rows = rows.filter(f=>usedN(f)===0);

  const coreN   = all.filter(f=>f.core).length;
  const gapN    = all.filter(factorHasGap).length;
  const metricN = all.filter(f=>(f.tiers||[]).some(hasMetric)).length;
  const usedCnt = all.filter(f=>usedN(f)>0).length;

  const chips = TRADES.map(x=>`<span class="chip ${tid===x.id?'on':''}" onclick="setF('trade','${x.id}')">${esc(x.name)} · ${factorsOfTrade(x.id).length} 条</span>`).join('');
  const fchips = [
    {k:'',       label:'全部 '+all.length},
    {k:'core',   label:'核心 PASS 项 '+coreN},
    {k:'gap',    label:'刻度待补 '+gapN},
    {k:'unused', label:'未进画像 '+(all.length-usedCnt)},
  ].map(c=>`<span class="chip ${fk===c.k?'on':''}" onclick="setF('fk','${c.k}')">${c.label}</span>`).join('');

  const tierCell = (f,i)=>{
    const x = (f.tiers||[])[i];
    if(!x) return '<span class="mut sm">—</span>';
    const gap = isGapTier(x);
    return `<div class="sm" style="color:${gap?'var(--ink4)':'var(--ink)'}">${esc(x.label)}</div>
      <div class="mono" style="font-size:11px;margin-top:2px;color:${hasMetric(x)?'var(--accent2)':'var(--ink4)'}">${esc(x.metric||'—')}</div>`;
  };

  const cols=[
    {label:'因子', r:f=>`<div class="t-name">${esc(f.id)} ${esc(f.name)}${f.core?'<span class="b r" style="margin-left:6px">核心</span>':''}</div>
      <div class="t-sub">${esc(f.question)}</div>
      <div class="t-sub mono" style="margin-top:2px">${esc(f.valueType)} · ${esc(f.operator)}</div>`},
    {label:'D1 会做',  r:f=>tierCell(f,0)},
    {label:'D2 达标',  r:f=>tierCell(f,1)},
    {label:'D3 精通',  r:f=>tierCell(f,2)},
    {label:'刻度', r:f=>{
      const bars=[0,1,2].map(i=>{const x=(f.tiers||[])[i];
        return `<i class="${!x?'':isGapTier(x)?'gp':'on'}"></i>`;}).join('');
      const n=(f.tiers||[]).filter(x=>!isGapTier(x)).length;
      return `<div class="mini">${bars}</div><div class="t-sub">${n}/3 ${n<3?'<span style="color:var(--warn)">待补</span>':'齐全'}</div>`;
    }},
    {label:'被画像用', r:f=>{ const n=usedN(f);
      return n? `<span class="sm">${n} 个</span>` : '<span class="mut sm">0 · 面试项</span>'; }},
    {label:'操作', r:f=>`<div class="acts"><span class="link" onclick="openTradeFactor('${f.id}')">能力卡</span>
      <span class="link" onclick="openFactorEdit('${f.id}')">编辑</span></div>`},
  ];

  return `<div class="page">
    ${head('人才画像因子库', xpl('只有两层：工种节点 → 能力项。能力项下面<b>不再分层级</b>；竖着那根是三档刻度，不是三档标签',
      '工种技能因子 · 每个能力项一根「D1 会做 → D2 达标 → D3 精通」的刻度'), `<button class="btn" onclick="toast('已导出工种因子')">导出</button><button class="btn pri" onclick="toast('新增工种因子')">＋ 新增因子</button>`)}
    ${stats([
      {lab:'当前工种因子', val:all.length, unit:'条', foot:esc(t.name)+' · 每工种 7–12 条'},
      {lab:'三档齐全', val:all.length-gapN, unit:'条', foot:gapN?`还有 ${gapN} 条 D3 待补`:'刻度完整'},
      {lab:'带精度指标', val:metricN, unit:'条', foot:'可数字化验收'},
      {lab:'已进画像', val:usedCnt, unit:'条', foot:`其余 ${all.length-usedCnt} 条只做面试实操`},
    ])}
    ${xpl(`<div class="note i" style="margin-bottom:14px">
      <b>这一页只有两条规则，就是它长得这样的原因。</b><br>
      ① <b>横着只有两层</b>：工种节点（${esc(t.name)}）→ 能力项（打表 / 划线 / 锉削…）。能力项下面<b>不再加子级</b>。<br>
      ② <b>竖着是一根尺</b>：D1 会做 → D2 达标 → D3 精通。因为是一根尺，画像才能写「≥D2」；如果是三个标签，就只能勾选。<br>
      原表 76 个叶子（38 个 L3 × L4/L5 两档）压成 11 条 × 3 档 = 33 格，8 组精度数字一条没丢 —— 因为 L4/L5 本来就不是层级，是刻度。
    </div>`, '')}
    ${bar}
    ${toolbar({q:'搜索因子编号 / 名称 / 问句', right:`<span class="sm mut">${rows.length} 条</span>`})}
    <div class="toolbar" style="border-top:none;padding-top:0"><div style="display:flex;gap:6px;flex-wrap:wrap">${chips}${'<span style="width:12px"></span>'}${fchips}</div></div>
    ${table(cols, rows)}
    ${gapN?`<div class="note w" style="margin-top:14px">
      <b>${gapN} 条因子的 D3 精通档还是空的</b>：${all.filter(factorHasGap).map(f=>esc(f.id+' '+f.name)).join('、')}。
      这是<b>内容缺口</b>，不是层级问题 —— 加一层嵌套救不了。补一句话（做什么活、到什么精度、带不带人）即可落档。
      <span class="link" onclick="toast('已生成 D3 补写清单')">生成补写清单</span>
    </div>`:''}
    ${pager(rows.length)}
  </div>`;
}

/* ---- 能力卡抽屉：四件套 + 三档刻度尺 + 锚点 ---- */
/* 一根尺：档 / 会做什么 / 精度 / 工具 / 明确的不会 / 简历锚点，全部落在一格里 */
function tierRuler(f){
  return `<div class="ruler">${(f.tiers||[]).map((x,i)=>{
    const gap = isGapTier(x);
    return `<div class="rl d${i+1} ${gap?'gap':''}">
      <div class="rl-h"><b>${esc(x.d)}</b><span>${esc(gradeName(x.d))}</span></div>
      <div class="rl-l">${gap?'（业务待补）':esc(x.label)}</div>
      <div class="rl-m">${esc(x.metric||'—')}</div>
      <div class="rl-d">${gap?'这一档还没有可验收的标准，暂时不能当门槛用。':esc(x.desc||'')}</div>
      ${x.limit&&x.limit!=='—'?`<div class="rl-x">明确的不会：${esc(x.limit)}</div>`:''}
      ${x.tool&&x.tool!=='—'?`<div class="rl-t">量具 · ${esc(x.tool)}</div>`:''}
      ${(x.anchors&&x.anchors.length)?`<div class="rl-a">${x.anchors.map(a=>`<em>${esc(a)}</em>`).join('')}</div>`:''}
    </div>`;
  }).join('')}</div>`;
}

function openTradeFactor(fid){
  window.__FE__ = null;
  const f = factorOf(fid);
  if(!f) return;
  const t = tradeOf(f.trade);
  const gapN = (f.tiers||[]).filter(isGapTier).length;

  const usedIn = PORTRAITS_V2.filter(p=>p.pick.some(x=>x[0]===fid))
    .map(p=>{ const pr = p.pick.find(x=>x[0]===fid);
      return `<span class="tg" style="padding:3px 8px;font-size:11.5px">${esc(p.name)} · 要 ${esc(pr[1])} · ${esc(pr[2])}</span>`; }).join('');

  openDrawer(`<div class="dr-h"><div><h3>${esc(f.id)} ${esc(f.name)}</h3>
      <div class="sub">${esc(t.name)} · ${esc(f.valueType)}型 · 算子 ${esc(f.operator)} · ${(f.tiers||[]).length-gapN}/3 档已写</div></div>
      <button class="dr-x" onclick="closeAll()">×</button></div>
    <div class="dr-b">
      <div class="sec"><div class="sec-t">${xpl('四件套（缺一件就算不出分）','因子定义')}</div>
        <dl class="kv">
          <div><dt>观察点</dt><dd>${esc(f.question)}</dd></div>
          <div><dt>值域</dt><dd>${esc(f.valueType)}：D1 → D3 三档，每档有语义</dd></div>
          <div><dt>来源</dt><dd>${esc(f.source)}</dd></div>
          <div><dt>算子</dt><dd class="mono">岗位要求 ${esc(f.operator)} 简历实际值</dd></div>
        </dl>
      </div>

      <div class="sec"><div class="sec-t">${xpl('三档刻度 · 一根尺上的三个刻度','三档刻度')}</div>
        ${tierRuler(f)}
        ${xpl(`<div class="note i" style="margin-top:10px">
          <b>为什么这三档不是三个标签、下面也不再分层。</b>
          三档写的是<b>同一个人在同一种能力上的不同水平</b>（会做 → 达标 → 精通），所以能比大小、能写「≥D2」，AI 才能算「超出要求一档」。
          如果是三个标签（"会划线""会锯削""会锉削"），只能勾选，勾不出高低。<br>
          再往下就不分层了：只有当某个子项<b>需要一套独立的验收标准</b>时才拆 —— 而且拆法是<b>横着拆成两条并列因子</b>（各自带三档），不是在这条下面再挂一层子级。原因是子级会让「≥某档」没法比较：一旦写成「P1 打表 ≥ 子级第 2 档」，换个工种、换条因子就没法对齐了。
        </div>`,'')}
        ${gapN?`<div class="note w" style="margin-top:10px">还有 ${gapN} 档没写（标斜纹的那格）。这一档现在不能当门槛用 —— 画像里引用它会直接判"无法验收"。</div>`:''}
      </div>

      <div class="sec"><div class="sec-t">被哪些画像引用</div>
        <div class="tags">${usedIn || '<span class="mut sm">暂无画像引用 —— 这条因子只做面试实操项</span>'}</div>
      </div>

      ${xpl(`<div class="note w">「明确的不会」这一行才是等级分界线：简历里出现上一档才该会的东西，说明这个人其实在更高一档，不能按低档定价。</div>`,'')}
    </div>
    <div class="dr-f"><button class="btn" onclick="closeAll()">关闭</button>
      <button class="btn pri" onclick="openFactorEdit('${f.id}')">编辑因子</button></div>`);
}


/* ---- 岗位能力画像列表 ---- */
function r01Portraits(){
  const tid = S.f.ptrade || 'T2-QG';
  const t = tradeOf(tid);
  const list = portraitsOfTrade(tid);
  const chips = TRADES.map(x=>`<span class="chip ${tid===x.id?'on':''}" onclick="setF('ptrade','${x.id}')">${esc(x.name)} · ${portraitsOfTrade(x.id).length} 个画像</span>`).join('');

  const allPick = PORTRAITS_V2.flatMap(p=>p.pick);
  const metrN = allPick.filter(x=>hasMetric(tierOf(x[0],x[1]))).length;
  const gapPickN = allPick.filter(x=>isGapTier(tierOf(x[0],x[1]))).length;

  const cards = list.map(p=>{
    const g = k => p.pick.filter(x=>x[2]===k).length;
    const gaps = p.pick.filter(x=>isGapTier(tierOf(x[0],x[1]))).length;
    const metr = p.pick.filter(x=>hasMetric(tierOf(x[0],x[1]))).length;
    return `<div class="card" style="margin-bottom:12px;cursor:pointer" onclick="openPortrait('${p.id}')">
      <div class="card-h"><div>
        <h3>${esc(p.name)} <span class="mono xs mut">${esc(p.ver)}</span></h3>
        <div class="sub">${esc((GRADES[p.grade]||{}).desc||'')}</div>
      </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="b r">PASS ${g('PASS')}</span>
          <span class="b i">必填 ${g('必填')}</span>
          <span class="b g">加分 ${g('加分')}</span>
          ${gaps?`<span class="b w">${gaps} 项刻度待补</span>`:''}
          <span class="arrow" style="margin-left:6px">→</span>
        </div></div>
      <div class="card-b">
        <div class="sm mut" style="margin-bottom:8px">${esc(p.passNote||'')}</div>
        <div class="tags">${p.pick.map(x=>{
          const f = factorOf(x[0]); const tr = tierOf(x[0], x[1]);
          const gap = isGapTier(tr);
          const num = hasMetric(tr) ? tr.metric : null;
          const color = x[2]==='PASS'?'#A32D2D':x[2]==='加分'?'#3B6D11':'#185FA5';
          const bg = x[2]==='PASS'?'#FCEBEB':x[2]==='加分'?'#EAF3DE':'#E6F1FB';
          return `<span class="tg" style="padding:4px 9px;font-size:11.5px;background:${gap?'var(--bg2)':bg};border-color:${gap?'var(--warn-line)':color};color:${gap?'var(--warn)':color}">${esc(f.name||x[0])} ≥${esc(x[1])} · ${esc(num||tr.label||'待补')}</span>`;
        }).join('')}</div>
        <div class="t-sub" style="margin-top:8px">${metr===0
          ? `${p.pick.length} 条全部落在没有精度指标的档（多为 D1「会做」）—— 只能靠面试实操判定`
          : `${metr}/${p.pick.length} 条带精度指标 · 其余靠面谈`}${gaps?' · '+gaps+' 条引用了未补写的档':''}</div>
      </div>
    </div>`;
  }).join('');

  return `<div class="page">
    ${head('岗位画像', xpl('一个画像 = (T2 工种 × 等级) · 每条因子都挂一个 required_tier，画像只放「能力门槛」，薪资/住宿/班次/体检下沉到职位层',
      '画像 = 工种 × 等级 · 每条因子 = 引用因子 + 要求档 + 分档'), `<button class="btn" onclick="openTradeMap()">看工种能力地图</button><button class="btn pri" onclick="toast('新增画像')">＋ 新增画像</button>`)}
    ${stats([
      {lab:'画像总数', val:PORTRAITS_V2.length, unit:'个', foot:TRADES.length+' 个工种 × 3 档'},
      {lab:'画像条目', val:allPick.length, unit:'条', foot:'一条 = 引用因子 + 要求档 + 分档'},
      {lab:'可数字化验收', val:metrN+'/'+allPick.length, foot:'带精度指标的条目'},
      {lab:'引用待补档', val:gapPickN, unit:'条', foot:gapPickN?'这些条目当前无法验收':'无'},
    ])}
    ${xpl(`<div class="note i" style="margin-bottom:14px">
      <b>画像里的一行不是一句描述，是三个字段</b>：引用哪个因子 · 要第几档 · 不达标怎么处理。因子长什么样（观察点/值域/算子/三档）全在因子库里，这里只存编号 —— 所以改一次 P1 的精度指标，所有画像同时生效。<br>
      下方标签显示的是<b>该档的精度指标</b>，不是文字描述 —— 因为验收靠的是数字（0.02–0.05mm），不是形容词（"熟练"）。
    </div>`,'')}
    ${toolbar({q:'搜索画像', chips:TRADES.map(x=>({k:'ptrade',v:x.id,label:x.name}))})}
    ${cards}
    ${pager(list.length)}
  </div>`;
}

/* ---- 画像详情：因子清单 + 完整度三数 + N 清单 + 跃迁 ---- */
/* 要求档在三档尺上的位置：实心=要求这一档，斜纹=该档还没写 */
function tierDots(fid, d){
  const ts = factorOf(fid).tiers || [];
  if(!ts.length) return '';
  return `<span class="mini" style="display:inline-flex;width:40px;gap:2px;margin-left:7px;vertical-align:middle">${
    ts.map(x=>`<i class="${x.d===d?'on':(isGapTier(x)?'gp':'')}"></i>`).join('')}</span>`;
}

function openPortrait(pid){
  window.__PE__ = null;
  const p = PORTRAITS_V2.find(x=>x.id===pid); if(!p) return;
  const t = tradeOf(p.trade);
  const g = k => p.pick.filter(x=>x[2]===k);
  const hasNum = x => hasMetric(tierOf(x[0],x[1]));
  const okN = p.pick.filter(hasNum).length;
  const gapRefs = p.pick.filter(x=>isGapTier(tierOf(x[0],x[1])));
  const noNum  = p.pick.filter(x=>!hasNum(x) && !isGapTier(tierOf(x[0],x[1])));

  const rowHtml = k => g(k).map(x=>{
    const f = factorOf(x[0]); const tr = tierOf(x[0], x[1]);
    return `<tr><td><b class="sm" style="cursor:pointer" onclick="openTradeFactor('${x[0]}')">${esc(f.name||x[0])}</b><div class="t-sub">${esc(f.id)} · ${esc(f.valueType||'')} · 点开看刻度</div></td>
      <td><span class="b ${k==='PASS'?'r':k==='加分'?'g':'i'}">${esc(x[1])}</span></td>
      <td class="sm">${esc(tr.label||'')}<div class="t-sub">${esc(tr.desc||'')}</div></td>
      <td class="sm mono">${esc(tr.metric||'—')}</td></tr>`;
  }).join('');

  /* 结构视图：一行 = 三元组 (factor_id, required_tier, gate) */
  const structRows = p.pick.map((x,i)=>{
    const f = factorOf(x[0]); const tr = tierOf(x[0], x[1]);
    const gc = x[2]==='PASS'?'r':x[2]==='加分'?'g':'i';
    return `<tr>
      <td class="mono xs mut">${String(i+1).padStart(2,'0')}</td>
      <td><span class="fid" onclick="openTradeFactor('${x[0]}')">${esc(x[0])}</span><div class="t-sub">${esc(f.name||'')}</div></td>
      <td><span class="b w">${esc(x[1])}</span><div class="t-sub">${esc(gradeName(x[1]))}</div></td>
      <td><span class="b ${gc}">${esc(x[2])}</span></td>
      <td class="sm">${esc(f.name||'')} ≥ ${esc(x[1])} · ${esc(tr.label||'')}<div class="t-sub">${esc(tr.desc||'')}</div></td>
    </tr>`;
  }).join('');

  const rec = `{
  <span class="k">"id"</span>:    <span class="s">"${p.id}"</span>,
  <span class="k">"trade"</span>: <span class="s">"${p.trade}"</span>,   <span class="m">// → TRADES 里的工种节点</span>
  <span class="k">"grade"</span>: <span class="s">"${p.grade}"</span>,   <span class="m">// 画像主键第二段</span>
  <span class="k">"pick"</span>: [
${p.pick.map(x=>`    [<span class="s">"${x[0]}"</span>, <span class="s">"${x[1]}"</span>, <span class="s">"${x[2]}"</span>]`).join(',\n')}
  ]           <span class="m">// factor_id, required_tier, gate —— 只此三列</span>
}`;


  const nlist = (TRADE_NLIST[p.trade]||[]).map(n=>`<tr>
    <td><b class="sm">${esc(n.id)}</b></td>
    <td class="sm">${esc(n.text)}</td>
    <td class="sm"><span class="b w">${esc(n.means)}</span></td>
    <td class="sm mut">${esc(n.risk)}</td></tr>`).join('');

  const trans = p.grade==='D1' ? (TRADE_TRANS[p.trade]||[]) : [];
  const transHtml = trans.length ? `<div class="sec"><div class="sec-t">${xpl('升到「中工」的 4 个跃迁点（任意 3 条达成，但 J1 打表/看图 J2 整机 必达）','升档跃迁点')}</div>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>跃迁</th><th>本档</th><th>上一档</th></tr></thead>
    <tbody>${trans.map(x=>`<tr><td class="mono xs">${esc(x.id)}</td><td class="sm"><b>${esc(x.name)}</b></td>
      <td class="sm mut">${esc(x.from)}</td><td class="sm" style="color:#3B6D11">${esc(x.to)}</td></tr>`).join('')}</tbody></table></div></div>` : '';

  openDrawer(`<div class="dr-h"><div><h3>${esc(p.name)}</h3>
      <div class="sub">${esc(t.name)} × ${esc(p.grade)} ${esc(gradeName(p.grade))} · ${esc(p.ver)} · ${p.pick.length} 条因子</div></div>
      <button class="dr-x" onclick="closeAll()">×</button></div>
    <div class="dr-b">
      <div class="note i">${esc((GRADES[p.grade]||{}).desc||'')}</div>

      ${xpl(`<div class="sec"><div class="sec-t">这一条数据是什么结构</div>
        <div class="note i" style="margin-bottom:10px">画像里的一行<b>不是一句描述</b>，是三个字段：<b>引用哪个因子 · 要第几档 · 不达标怎么处理</b>。因子本身长什么样（观察点 / 值域 / 算子 / 三档刻度）全在因子库里，这里只存编号 —— 所以改一次 P1 的精度指标，下面这几行同时生效，不用逐条改。</div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>#</th><th>factor_id · 引用</th><th>required_tier · 要求档</th><th>gate · 分档</th><th>展开后等于</th></tr></thead>
          <tbody>${structRows}</tbody></table></div>
        ${rec ? `<div class="rec">${rec}</div>` : ''}
        <div class="note w" style="margin-top:10px">这张表<b>只允许这三列</b>。出现“住宿免费 / 两班倒 / 无烟疤 / 下月 5 号到岗”这类字段，一律拒绝入库 —— 那不是能力，是这一单的交易条件，要下沉到职位层。混进来，这个画像就不能跨客户复用了。</div>
      </div>`, `<div class="sec"><div class="sec-t">画像条目（${p.pick.length} 条）</div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>#</th><th>因子</th><th>要求档</th><th>分档</th><th>该档要求</th><th>精度指标</th><th>验收</th></tr></thead>
          <tbody>${p.pick.map((x,i)=>{
            const f = factorOf(x[0]); const tr = tierOf(x[0], x[1]);
            const gc = x[2]==='PASS'?'r':x[2]==='加分'?'g':'i';
            const gap = isGapTier(tr);
            const num = hasMetric(tr);
            return `<tr>
              <td class="mono xs mut">${String(i+1).padStart(2,'0')}</td>
              <td><span class="fid" onclick="openTradeFactor('${x[0]}')">${esc(x[0])}</span>
                <div class="t-sub">${esc(f.name||'')}</div></td>
              <td><span class="b w">${esc(x[1])}</span>${tierDots(x[0],x[1])}</td>
              <td><span class="b ${gc}">${esc(x[2])}</span></td>
              <td class="sm ${gap?'mut':''}">${esc(gap?'（待补）':tr.label||'')}</td>
              <td class="sm mono">${esc(tr.metric||'—')}</td>
              <td>${gap?'<span class="b w">待补</span>':num?'<span class="b g">数字可判</span>':'<span class="b n">靠面谈</span>'}</td></tr>`;
          }).join('')}</tbody></table></div>
        <div class="t-sub" style="margin-top:9px"><b>${okN}/${p.pick.length}</b> 条带精度指标，能直接判定合格 / 不合格${okN<p.pick.length?`；其余 ${p.pick.length-okN} 条只有语义描述，要靠面试确认`:'。'}${okN===0?'<br>这份画像的要求档全是没有精度指标的档 —— D1 的定义就是「会做、精度不保证」，所以本来判不出数字，只能靠面试实操。':''}</div>
        ${gapRefs.length?`<div class="note w" style="margin-top:9px">其中 ${gapRefs.length} 条引用了<b>还没补写的档</b>（${gapRefs.map(x=>esc(x[0]+' '+x[1])).join('、')}）—— 这几条现在判不出合格与否，需要先把因子的这一档补上。<span class="link" onclick="toast('已生成补写清单')">去补</span></div>`:''}
      </div>`)}

      <div class="sec"><div class="sec-t">${xpl('完整度：三个数，不给百分比','完整度')}</div>
        <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:10px">
          <div class="card"><div class="card-b"><div class="sm mut">PASS · 硬门槛</div>
            <div style="font-size:20px;font-weight:500;color:#A32D2D">${g('PASS').length} 条</div>
            <div class="t-sub">缺一项就不能发确认单</div></div></div>
          <div class="card"><div class="card-b"><div class="sm mut">必填</div>
            <div style="font-size:20px;font-weight:500;color:#185FA5">${g('必填').length} 条</div>
            <div class="t-sub">缺了标黄，可后补</div></div></div>
          <div class="card"><div class="card-b"><div class="sm mut">加分</div>
            <div style="font-size:20px;font-weight:500;color:#3B6D11">${g('加分').length} 条</div>
            <div class="t-sub">只影响排序，不淘汰</div></div></div>
        </div>
        ${xpl(`<div class="t-sub" style="margin-top:8px">合计 ${p.pick.length} 条，不是 47 项 —— 47 项是通用采集口径，工种技能因子在这之外另算。候选人打分时这三个数变成 <b>已满足 / 要求</b>，永远不给百分比。</div>`, '')}
      </div>

      ${xpl(`<div class="sec"><div class="sec-t">PASS · 硬门槛（${g('PASS').length} 条）</div>
        <div class="tbl-wrap"><table><thead><tr><th>因子</th><th>要求档</th><th>该档要求</th><th>精度指标</th></tr></thead>
        <tbody>${rowHtml('PASS')}</tbody></table></div></div>

      <div class="sec"><div class="sec-t">必填（${g('必填').length} 条）</div>
        <div class="tbl-wrap"><table><thead><tr><th>因子</th><th>要求档</th><th>该档要求</th><th>精度指标</th></tr></thead>
        <tbody>${rowHtml('必填')}</tbody></table></div></div>

      ${g('加分').length?`<div class="sec"><div class="sec-t">加分（${g('加分').length} 条）</div>
        <div class="tbl-wrap"><table><thead><tr><th>因子</th><th>要求档</th><th>该档要求</th><th>精度指标</th></tr></thead>
        <tbody>${rowHtml('加分')}</tbody></table></div></div>`:''}`, '')}

      <div class="sec"><div class="sec-t">${xpl('「不会」清单：等级反查（不是门槛，是定价线）','「不会」清单')}</div>
        <div class="tbl-wrap"><table><thead><tr><th>#</th><th>不会什么</th><th>会了意味着</th><th>用工风险</th></tr></thead>
        <tbody>${nlist}</tbody></table></div>
        ${xpl(`<div class="note w">简历出现右列「会了」的动作，说明这个人实际在更高一档 —— 按本档价招进来会立刻流失。</div>`,'')}
      </div>

      ${transHtml}
    </div>
    <div class="dr-f"><button class="btn" onclick="closeAll()">关闭</button>
      <button class="btn" onclick="toast('已复制画像快照到剪贴板')">复制快照</button>
      ${stdOfPortrait(p.id)?`<button class="btn" onclick="openStd('${stdOfPortrait(p.id).id}')">看标准岗位标准</button>`:`<button class="btn" onclick="go('std')">看标准岗位标准列表</button>`}
      <button class="btn pri" onclick="openPortraitEdit('${p.id}')">编辑画像</button></div>`);
}

/* ============================================================
   编辑态 A：岗位画像
   改的是「引用」：加/减因子、调要求档、改分档
   不改的是「身份」：画像主键 (工种 × 等级)
   ============================================================ */
function openPortraitEdit(pid){
  const p = PORTRAITS_V2.find(x=>x.id===pid); if(!p) return;
  window.__PE__ = { pid, pick:p.pick.map(x=>x.slice()), pool:false };
  renderPortraitEdit();
}
function peSet(i, col, v){ window.__PE__.pick[i][col] = v; renderPortraitEdit(); }
function peDel(i){ window.__PE__.pick.splice(i,1); renderPortraitEdit(); }
function peAdd(fid){
  const st = window.__PE__;
  if(st.pick.some(x=>x[0]===fid)) return;
  st.pick.push([fid,'D1','必填']);
  st.pool = false; renderPortraitEdit();
}
function peTogglePool(){ window.__PE__.pool = !window.__PE__.pool; renderPortraitEdit(); }
function peCancel(){ const pid = window.__PE__.pid; window.__PE__ = null; openPortrait(pid); }
function peSave(){
  const st = window.__PE__;
  const p = PORTRAITS_V2.find(x=>x.id===st.pid); if(!p) return;
  if(!st.pick.length) return toast('至少保留 1 条因子');
  if(!st.pick.some(x=>x[2]==='PASS')) return toast('PASS 硬门槛不能为空');
  p.pick = st.pick.map(x=>x.slice());
  p.ver = bumpVer(p.ver);
  window.__PE__ = null;
  toast('已保存为 ' + p.ver + ' · 旧版本可查，已发出的确认单不回溯');
  go('portraits');
}
function bumpVer(v){
  const m = String(v||'v1.0').match(/v(\d+)\.(\d+)/);
  if(!m) return 'v1.1';
  return 'v' + m[1] + '.' + (Number(m[2])+1);
}

function renderPortraitEdit(){
  const st = window.__PE__;
  const p = PORTRAITS_V2.find(x=>x.id===st.pid); if(!p) return;
  const t = tradeOf(p.trade);
  const passN = st.pick.filter(x=>x[2]==='PASS').length;
  const mustN = st.pick.filter(x=>x[2]==='必填').length;
  const plusN = st.pick.filter(x=>x[2]==='加分').length;
  const canSave = st.pick.length>0 && passN>0;

  const rows = st.pick.map((x,i)=>{
    const f = factorOf(x[0]); const tr = tierOf(x[0], x[1]);
    return `<tr>
      <td class="mono xs mut">${String(i+1).padStart(2,'0')}</td>
      <td><b class="sm">${esc(f.name||x[0])}</b><div class="t-sub mono">${esc(x[0])} · 锁定</div></td>
      <td><select class="ed-in" onchange="peSet(${i},1,this.value)">
        ${['D1','D2','D3'].map(d=>`<option value="${d}" ${x[1]===d?'selected':''}>${d} ${esc(gradeName(d))}</option>`).join('')}
      </select></td>
      <td><select class="ed-in" onchange="peSet(${i},2,this.value)">
        ${['PASS','必填','加分'].map(g=>`<option value="${g}" ${x[2]===g?'selected':''}>${g}</option>`).join('')}
      </select></td>
      <td class="sm mut">${esc(tr.label||'—')}<div class="t-sub mono">${esc(tr.metric||'—')}</div></td>
      <td><span class="ed-del" onclick="peDel(${i})">移除</span></td>
    </tr>`;
  }).join('');

  const cands = factorsOfTrade(p.trade).filter(f=>!st.pick.some(x=>x[0]===f.id));
  const pool = st.pool ? `<div class="ed-pool">
    ${cands.length ? cands.map(f=>`<span class="pitem" onclick="peAdd('${f.id}')"><b>${esc(f.id)}</b>${esc(f.name)}</span>`).join('')
      : '<span class="sm mut">该工种全部因子都已选入</span>'}
  </div>
  <div class="t-sub" style="margin-top:6px">点一条即加入，默认落在「${esc(gradeName('D1'))} · 必填」，加进来后再调。</div>` : '';

  openDrawer(`<div class="dr-h"><div><h3>编辑 · ${esc(p.name)}</h3>
      <div class="sub">${esc(t.name)} × ${esc(p.grade)} ${esc(gradeName(p.grade))} · 当前 ${esc(p.ver)}</div></div>
      <button class="dr-x" onclick="peCancel()">×</button></div>
    <div class="dr-b">
      <div class="editbar"><b>编辑中</b><span>改动只影响这个画像的「要求」，不动因子本身的刻度</span></div>

      <div class="ed-lock"><span class="lk">锁定</span>
        <span>画像主键 <b>${esc(p.trade)} × ${esc(p.grade)}</b> 不可改 —— 改了就变成另一个画像，不是这个画像的新版本</span></div>

      <div class="sec"><div class="sec-t">画像条目（${st.pick.length} 条）</div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>#</th><th>因子</th><th>要求档</th><th>分档</th><th>该档要求</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" class="sm mut" style="padding:16px;text-align:center">还没有因子，从下面加</td></tr>'}</tbody></table></div>
        <div style="margin-top:10px;display:flex;gap:10px;align-items:center">
          <span class="ed-add" onclick="peTogglePool()">${st.pool?'收起候选':'＋ 添加因子'}</span>
          <span class="sm mut">候选来自「${esc(t.name)}」这个工种节点，不能跨工种挑</span>
        </div>
        ${pool}
        ${passN===0 ? `<div class="ed-warn">PASS 硬门槛是 0 条 —— 这个画像发出去没有任何一票否决项，等于不筛人。至少留 1 条。</div>`
          : `<div class="ed-ok">PASS ${passN} 条 · 必填 ${mustN} 条 · 加分 ${plusN} 条 · 合计 ${st.pick.length} 条</div>`}
      </div>

      <div class="sec"><div class="sec-t">保存后会发生什么</div>
        <div class="tbl-wrap"><table><tbody>
          <tr><td class="sm" style="width:130px">版本</td><td class="sm">${esc(p.ver)} → <b>${bumpVer(p.ver)}</b>，旧版本保留可查</td></tr>
          <tr><td class="sm">已发出的确认单</td><td class="sm">不回溯，仍按当时那一版判定</td></tr>
          <tr><td class="sm">未发出的需求</td><td class="sm">下次打分用新版本，旧评分失效</td></tr>
        </tbody></table></div>
      </div>
    </div>
    <div class="dr-f"><button class="btn" onclick="peCancel()">取消</button>
      <button class="btn pri" ${canSave?'':'disabled'} onclick="peSave()">保存为 ${bumpVer(p.ver)}</button></div>`);
}

/* ============================================================
   编辑态 B：工种技能因子
   改的是「刻度本身」—— 会同时改所有引用它的画像
   ============================================================ */
function openFactorEdit(fid){
  const f = factorOf(fid); if(!f) return;
  window.__FE__ = { fid, question:f.question, tiers:(f.tiers||[]).map(x=>Object.assign({},x)) };
  renderFactorEdit();
}
function feSet(k,v){ window.__FE__[k] = v; }
function feTier(i,k,v){ window.__FE__.tiers[i][k] = v; }
function feCancel(){ const fid = window.__FE__.fid; window.__FE__ = null; openTradeFactor(fid); }
function feSave(){
  const st = window.__FE__;
  const f = factorOf(st.fid); if(!f) return;
  if(!String(st.question||'').trim()) return toast('观察点不能为空');
  const bad = st.tiers.find(x=>!String(x.label||'').trim());
  if(bad) return toast(bad.d + ' 档的「能做什么」不能为空');
  f.question = st.question;
  f.tiers = st.tiers.map(x=>Object.assign({},x));
  window.__FE__ = null;
  toast('刻度已更新 · 影响 ' + PORTRAITS_V2.filter(p=>p.pick.some(x=>x[0]===f.id)).length + ' 个画像');
  go('portraits');
}

function renderFactorEdit(){
  const st = window.__FE__;
  const f = factorOf(st.fid); if(!f) return;
  const t = tradeOf(f.trade);
  const used = PORTRAITS_V2.filter(p=>p.pick.some(x=>x[0]===f.id));

  const rows = st.tiers.map((x,i)=>`<tr>
    <td><b class="sm">${esc(x.d)}</b><div class="t-sub">${esc(gradeName(x.d))}</div></td>
    <td><input class="ed-in" value="${esc(x.label||'')}" oninput="feTier(${i},'label',this.value)"></td>
    <td><input class="ed-in mono" value="${esc(x.metric||'')}" oninput="feTier(${i},'metric',this.value)" placeholder="精度/范围"></td>
    <td><input class="ed-in" value="${esc(x.tool||'')}" oninput="feTier(${i},'tool',this.value)"></td>
    <td><input class="ed-in" value="${esc(x.desc||'')}" oninput="feTier(${i},'desc',this.value)"></td>
    <td><input class="ed-in" value="${esc(x.limit||'')}" oninput="feTier(${i},'limit',this.value)" placeholder="不会什么"></td>
  </tr>`).join('');

  openDrawer(`<div class="dr-h"><div><h3>编辑 · ${esc(f.id)} ${esc(f.name)}</h3>
      <div class="sub">${esc(t.name)} · ${esc(f.valueType)}型 · 算子 ${esc(f.operator)}</div></div>
      <button class="dr-x" onclick="feCancel()">×</button></div>
    <div class="dr-b">
      <div class="editbar" style="background:var(--warn-soft);border-color:var(--warn-line);color:var(--warn)">
        <b>全局改动</b><span>这条刻度被 ${used.length} 个画像引用，改完所有画像的判定标准同时变</span></div>

      <div class="ed-lock"><span class="lk">锁定</span>
        <span>因子编号 <b>${esc(f.id)}</b>、所属工种 <b>${esc(f.trade)}</b>、值类型 <b>${esc(f.valueType)}</b> 不可改 —— 编号被画像引用，改了引用就断；值类型换了算子要重算</span></div>

      <div class="sec"><div class="sec-t">观察点</div>
        <input class="ed-in" value="${esc(st.question||'')}" oninput="feSet('question',this.value)">
      </div>

      <div class="sec"><div class="sec-t">三档刻度</div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>档</th><th>能做什么</th><th>精度指标</th><th>量具/工具</th><th>补充说明</th><th>明确的不会</th></tr></thead>
          <tbody>${rows}</tbody></table></div>
        <div class="t-sub" style="margin-top:8px">「明确的不会」是等级分界线：这一列写的是"做到这一档的人不会什么"，用来反查简历。</div>
      </div>

      <div class="sec"><div class="sec-t">被 ${used.length} 个画像引用</div>
        <div class="tbl-wrap"><table><thead><tr><th>画像</th><th>要求档</th><th>分档</th><th>改动后</th></tr></thead>
        <tbody>${used.map(p=>{
          const pr = p.pick.find(x=>x[0]===f.id);
          return `<tr><td class="sm">${esc(p.name)} <span class="mono xs mut">${esc(p.ver)}</span></td>
            <td><span class="b w">${esc(pr[1])}</span></td><td><span class="b ${pr[2]==='PASS'?'r':pr[2]==='加分'?'g':'i'}">${esc(pr[2])}</span></td>
            <td class="sm mut">档位不变，判据会变</td></tr>`;
        }).join('') || '<tr><td colspan="4" class="sm mut" style="padding:12px">暂无画像引用，改它只影响面试实操项</td></tr>'}</tbody></table></div>
      </div>
    </div>
    <div class="dr-f"><button class="btn" onclick="feCancel()">取消</button>
      <button class="btn pri" onclick="feSave()">保存刻度</button></div>`);
}

/* ---- 工种能力地图：一屏看清 工时/等级/因子 ---- */
function openTradeMap(){
  const blocks = TRADES.map(t=>{
    const fs = factorsOfTrade(t.id);
    return `<div class="sec"><div class="sec-t">${esc(t.name)} · ${fs.length} 条因子 · ${esc(t.domain)}</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>因子</th><th>D1 ${esc(gradeName('D1'))}</th><th>D2 ${esc(gradeName('D2'))}</th><th>D3 ${esc(gradeName('D3'))}</th></tr></thead>
        <tbody>${fs.map(f=>`<tr>
          <td class="sm"><b>${esc(f.name)}</b></td>
          ${f.tiers.map(x=>`<td class="sm ${x.label==='待补'?'mut':''}">${esc(x.label)}<div class="t-sub mono">${esc(x.metric||'')}</div></td>`).join('')}
        </tr>`).join('')}</tbody></table></div></div>`;
  }).join('');

  openDrawer(`<div class="dr-h"><div><h3>工种能力地图</h3>
      <div class="sub">一屏看清：每个工种有哪些因子、每档到哪儿</div></div>
      <button class="dr-x" onclick="closeAll()">×</button></div>
    <div class="dr-b">
      <div class="note i">这张表就是「岗位画像」的来源 —— 画像不是手填的，是从这张表里挑因子 + 定档位得来的。</div>
      ${blocks}
    </div>
    <div class="dr-f"><button class="btn" onclick="closeAll()">关闭</button></div>`);
}


/* 账号与权限 */
function r01Perms(){
  const tab = S.f.tab||'acc';
  const tabs = [['acc','账号列表'],['role','角色与菜单权限'],['data','数据权限'],['audit','权限审计']];
  let body = '';
  if(tab==='acc'){
    body = `<div class="tbl-wrap"><table>
      <thead><tr><th>姓名</th><th>账号</th><th>角色</th><th>所属组织</th><th>数据范围</th><th>状态</th><th>最近登录</th><th>操作</th></tr></thead>
      <tbody>${[['金诚','jincheng','R01 管理员 + R02 客户负责人','总部','全部','正常','11-13 09:12'],
        ['李文静','liwenjing','R04 招聘专员','东莞一组','本人负责','正常','11-13 08:40'],
        ['陈曦','chenxi','R04 招聘专员','上海一组','本人负责','正常','11-13 09:05'],
        ['王浩','wanghao','R04 招聘专员','苏州一组','本人负责','正常','11-13 08:22'],
        ['张敏','zhangmin','R06 财务','总部','指定客户','停用','10-28 15:30']].map(r=>`
        <tr><td><b class="sm">${r[0]}</b></td><td class="mono sm">${r[1]}</td><td class="sm">${r[2]}</td>
        <td class="sm">${r[3]}</td><td><span class="b n">${r[4]}</span></td>
        <td>${r[5]==='正常'?'<span class="b g">正常</span>':'<span class="b r">停用</span>'}</td>
        <td class="mono xs">${r[6]}</td>
        <td><div class="acts"><span class="link" onclick="toast('编辑账号')">编辑</span><span class="link" onclick="toast('查看权限')">权限</span></div></td></tr>`).join('')}
      </tbody></table></div>`;
  } else if(tab==='role'){
    body = `<div class="grid g2"><div class="card"><div class="card-h"><h3>角色</h3><span class="xs mut">4 个</span></div>
      <div class="card-b" style="padding:0">
        ${[['R01 管理员','全部 13 个页面 · 全字段'],['R02 客户负责人','5 个页面 · 可见合同价'],['R04 招聘专员','6 个页面 · 不可见合同价/提成/利润'],['E01 工人端','4 个 tab · 不看分数']].map((r,i)=>`
        <div style="padding:12px 18px;border-bottom:${i<3?'1px solid var(--line2)':'none'};display:flex;align-items:center;justify-content:space-between">
          <div><div class="sm"><b>${r[0]}</b></div><div class="xs mut">${r[1]}</div></div>
          <span class="b ${i===0?'a':'n'}">${i===0?'当前':'查看'}</span></div>`).join('')}
      </div></div>
      <div class="card"><div class="card-h"><h3>R04 招聘专员 · 权限明细</h3><span class="xs mut">勾选到二级页</span></div>
        <div class="card-b">
          <div class="sec-t">菜单权限</div>
          ${['我的首页','需求列表','批次列表','人员列表','人才池列表','系统操作记录'].map(m=>`
            <label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px"><input type="checkbox" checked style="width:15px;height:15px">${m}</label>`).join('')}
          <div class="sec-t" style="margin-top:14px">动作权限</div>
          <div class="tags">${['查看','新建','编辑','导出','记录联系','分配（否）','删除（否）'].map(t=>`<span class="tg">${t}</span>`).join('')}</div>
          <div class="sec-t" style="margin-top:14px">字段级权限</div>
          <div style="font-size:13px;line-height:2">
            <div>合同价 <span class="b r" style="float:right">不可见</span></div>
            <div>提成 / 利润 <span class="b r" style="float:right">不可见</span></div>
            <div>人员手机号 <span class="b w" style="float:right">脱敏</span></div>
            <div>客户联系人 <span class="b g" style="float:right">可见</span></div>
          </div>
        </div></div></div>`;
  } else if(tab==='data'){
    body = `<div class="grid g2"><div class="card"><div class="card-h"><h3>数据范围规则</h3></div><div class="card-b">
      ${['本人负责（默认）','本组','指定客户','指定项目','全部'].map((r,i)=>`<label style="display:flex;align-items:center;gap:8px;padding:8px 0;font-size:13.5px">
        <input type="radio" name="dr" ${i===0?'checked':''} style="width:15px;height:15px">${r}</label>`).join('')}
      </div></div>
      <div class="card"><div class="card-h"><h3>例外名单</h3><span class="xs mut">白名单 / 黑名单</span></div><div class="card-b">
        <div class="mut sm">暂无例外名单</div>
        <button class="btn sm" style="margin-top:10px" onclick="toast('新增例外')">＋ 添加</button>
        <div class="hr"></div>
        <div class="note">默认拒绝：新账号未配置权限时看不到任何数据。</div>
      </div></div></div>`;
  } else {
    body = `<div class="tbl-wrap"><table>
      <thead><tr><th>时间</th><th>操作人</th><th>对象</th><th>变更前</th><th>变更后</th><th>原因</th><th>操作</th></tr></thead>
      <tbody>${[['11-12 09:30','金诚','角色 R04','未授权人才池导出','已授权','业务需要批量捞人'],
        ['11-10 14:00','金诚','账号 王浩','—','创建 · R04 · 苏州一组','新增专员'],
        ['11-08 10:20','金诚','角色 R02','可见合同价','可见合同价','—']].map(r=>`
        <tr><td class="mono xs">${r[0]}</td><td class="sm">${r[1]}</td><td class="sm">${r[2]}</td>
        <td class="sm mut">${r[3]}</td><td class="sm">${r[4]}</td><td class="sm mut">${r[5]}</td>
        <td><span class="link" onclick="toast('已回滚（需二次确认）')">回滚</span></td></tr>`).join('')}</tbody></table></div>`;
  }
  return `<div class="page">
    ${head('账号与权限','默认拒绝 · 菜单 / 动作 / 字段三层控制，变更可审计可回滚', `<button class="btn" onclick="toast('已导出权限矩阵')">导出</button><button class="btn pri" onclick="toast('新增账号')">＋ 新增账号</button>`)}
    <div class="tabbar">${tabs.map(t=>`<div class="tab ${tab===t[0]?'on':''}" onclick="setTab('${t[0]}')">${t[1]}</div>`).join('')}</div>
    ${body}
  </div>`;
}
function setTab(t){ S.f.tab=t; refreshTable(); }

PAGES.dash = {R01:r01Dash};
PAGES.conversion = {R01:r01Conversion, R02:r01Conversion};
PAGES.confirms = {R01:r01Confirms, R02:r01Confirms};
PAGES.factors = {R01:r01Factors};
PAGES.portraits = {R01:r01Portraits};
PAGES.perms = {R01:r01Perms};
