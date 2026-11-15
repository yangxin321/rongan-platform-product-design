/* =======================================================================
   v1.2 · RG-002：需求确认单（我方代登记）/ 版本历史 / 受控只读链接
   - 客户不登录系统，链接只读；确认结果由我方登记
   - 未确认或未审核通过 → 需求不生效，不得作为匹配依据
   - 旧版确认不自动继承给新版
   ======================================================================= */

/* 本单调整（覆盖标准值，但不改标准本身）；字段格式与新建向导一致：{no, from, to} */
const DEMAND_OVERRIDE = {
  D1:[{no:3, from:'中山兴禾厂区', to:'东莞·松山湖', why:'客户指定驻场厂区', at:'2026-11-10'},
      {no:19, from:'两班倒（15 天倒一次）', to:'需要（驻场跟线）', why:'客户产线两班', at:'2026-11-10'},
      {no:32, from:'42–44 元/时', to:'32-38 元/时', why:'客户报价，按售后岗定', at:'2026-11-10'}],
  D7:[{no:7, from:'2026-11-25', to:'2026-12-01', why:'客户放宽到岗时间', at:'2026-11-12'},
      {no:32, from:'50 元/时', to:'30-36 元/时', why:'客户改工价', at:'2026-11-12'}],
  D8:[{no:32, from:'36–38 元/时', to:'26-30 元/时', why:'新单报价', at:'2026-11-01'}],
};
DEMANDS.forEach(d=>{ if(DEMAND_OVERRIDE[d.id]) d.stdOverride = DEMAND_OVERRIDE[d.id]; });

const overrideOf = (d, no) => (d.stdOverride||[]).find(x=>x.no===no) || null;
function effVal(d, no){
  const o = overrideOf(d, no);
  if(o) return {v:o.to, from:'order'};
  const s = stdOf(d.stdId);
  if(s && s.vals && s.vals[no]!=null) return {v:stdVal(no, s.vals[no]), from:'std'};
  return {v:'—', from:'none'};
}

/* 客户对某一项的确认状态（演示口径：由需求整体确认状态推导） */
function confStateOf(d, no){
  const f = f47Of(no);
  const pv = pendingVer(d);
  const touched = pv && (pv.changes||[]).some(c=> f.name && (f.name.includes(c.f) || c.f.includes(f.name)));
  if(d.confirm === '待客户确认') return 'pending';
  if(d.confirm === '变更待重确认') return touched ? 'pending' : 'agree';
  return 'agree';
}
function confTag(st){
  return st==='agree' ? '<span class="b g">同意</span>'
       : st==='pending' ? '<span class="b w">待客户确认</span>'
       : '<span class="b n">—</span>';
}

/* ---------- 需求详情顶部：生效状态 / 版本 / 链接 / 匹配是否需更新 ---------- */
function demandStateBar(d){
  const av = activeVer(d), pv = pendingVer(d), lk = mainLink(d.id);
  const stale = matchNeedsUpdate(d);
  const stamp = MATCH_STAMP[d.id] || {};
  return `<div class="card" style="margin-bottom:14px"><div class="card-b">
    <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">
      ${av?`<span class="b g">生效 ${esc(av.v)}</span>`:'<span class="b r">未生效</span>'}
      ${pv?`<span class="b w">${esc(pv.v)} 待客户确认</span>`:''}
      ${confirmB(d.confirm)}
      ${lk?`<span class="b ${lk.state==='有效'?'i':'n'}">只读链接 ${esc(lk.state)}</span>`:'<span class="b w">无只读链接</span>'}
      ${stale?`<span class="b r">匹配结果需更新</span>`:`<span class="b g">匹配依据 ${esc(stamp.ver||'—')}</span>`}
      <div class="sp" style="flex:1"></div>
      <button class="btn xs" onclick="openVers('${d.id}')">版本历史</button>
      <button class="btn xs" onclick="openConfirm('${d.id}')">确认单</button>
    </div>
    ${!av?`<div class="note r" style="margin-top:10px">该需求尚无生效版本，<b>不得作为匹配与推荐依据</b>。需完成客户确认并在我方登记后方可生效。</div>`:''}
    ${stale&&av?`<div class="note w" style="margin-top:10px">需求条件已变更：当前匹配结果依据 ${esc(stamp.ver||'—')}，需按 ${esc(av.v)} 重算。</div>`:''}
  </div></div>`;
}

/* ---------- 需求确认单（代登记）抽屉 ---------- */
function demandConfirmDrawer(id){
  const d = D(id);
  const av = activeVer(d), pv = pendingVer(d);
  const lk = mainLink(d.id);
  const vers = versOf(d);
  const std = stdOf(d.stdId);
  const rowsByDom = F47_L1.map(dom=>{
    const items = F47.filter(f=>f.l1===dom.id);
    return `<div class="sec" style="margin-top:2px">
      <div class="sec-t"><span class="b n">${dom.mark}</span> ${esc(dom.name)} <span class="xs mut">${items.length} 项</span></div>
      <div class="tbl-wrap" style="border-radius:9px"><table>
        <thead><tr><th style="width:38px">#</th><th>字段</th><th style="width:76px">分级</th>
          <th>标准值（${esc(d.stdId||'—')}）</th><th>本单调整</th><th style="width:104px">客户确认</th></tr></thead>
        <tbody>${items.map(f=>{
          const ov = overrideOf(d, f.no);
          const base = (std.vals && std.vals[f.no]!=null) ? stdVal(f.no, std.vals[f.no]) : '<span class="mut">未填</span>';
          return `<tr>
            <td class="mono xs mut">${f.no}</td>
            <td class="sm">${esc(f.name)}<div class="t-sub">${esc(f.l2)}</div></td>
            <td><span class="b ${f.level==='一级'?'r':f.level==='二级'?'w':'n'}" style="font-size:10.5px">${esc(f.level)}</span></td>
            <td class="sm mut">${base}</td>
            <td class="sm">${ov?`<span style="color:var(--accent2);font-weight:600">${esc(ov.to)}</span>
              <div class="t-sub">${esc(ov.why)}</div>`:'<span class="mut">—</span>'}</td>
            <td>${confTag(confStateOf(d, f.no))}</td></tr>`;
        }).join('')}</tbody></table></div></div>`;
  }).join('');

  openDrawerW(`<div class="dr-h"><div><h3>需求确认单 · ${esc(d.post)}</h3>
    <div class="sub">${esc(d.client)} · ${esc(d.project)} · <span class="mono">${esc(d.code)}</span></div></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="dr-b">

    <div class="card" style="margin-bottom:14px"><div class="card-b">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="b ${av?'g':'w'}">${av?('生效版本 '+av.v):'无生效版本'}</span>
        ${pv?`<span class="b r">${pv.v} 待客户确认</span>`:''}
        ${confirmB(d.confirm)}
        <span class="sp" style="flex:1"></span>
        <button class="btn xs" onclick="openVers('${d.id}')">版本历史（${vers.length}）</button>
        ${lk?`<button class="btn xs" onclick="openCustLinkDemo('${lk.tok}')">打开只读确认单</button>`
             :`<button class="btn xs" onclick="regenLink('${d.id}')">生成只读链接</button>`}
      </div>
      <div class="note" style="margin-top:11px">客户<b>不登录系统</b>。我方按客户线下反馈（微信 / 会议 / 电话）逐项登记；<b>关键条件变更后必须重新确认</b>，旧版确认不自动继承给新版。生效版本才可用于 AI 匹配。</div>
      ${lk?`<div class="xs mut" style="margin-top:8px">只读链接 <span class="mono">${esc(lk.tok)}</span> · ${esc(lk.at)} 生成 · 有效期至 ${esc(lk.expire)} · 已查看 ${lk.views} 次
        <span class="link" style="margin-left:8px" onclick="revokeLinkUI('${lk.tok}')">撤销</span></div>`
        :`<div class="xs" style="margin-top:8px;color:var(--bad)">尚未生成只读链接，客户手上没有可核对的确认单</div>`}
    </div></div>

    <div class="sec" style="padding-top:0"><div class="sec-t">条件来源：标准 ≠ 客户级 ≠ 本单调整</div>
      <div class="tbl-wrap" style="border-radius:9px"><table>
        <thead><tr><th>字段</th><th>岗位标准标准</th><th>客户级</th><th>本单调整</th><th>生效值</th></tr></thead>
        <tbody>${[3,7,19,22,25,26,32].map(no=>{
          const f = f47Of(no), ov = overrideOf(d, no), base = (std.vals && std.vals[no]!=null) ? stdVal(no, std.vals[no]) : '—';
          const cli = f.layer==='client' ? '客户模板' : '—';
          return `<tr><td class="sm"><b>${esc(f.name)}</b></td>
            <td class="sm mut">${esc(base)}</td>
            <td class="xs mut">${esc(cli)}</td>
            <td class="sm">${ov?`<span style="color:var(--accent2);font-weight:600">${esc(ov.to)}</span>`:'<span class="mut">—</span>'}</td>
            <td class="sm">${ov?esc(ov.to):esc(base)}</td></tr>`;
        }).join('')}</tbody></table></div>
      <div class="note" style="margin-top:9px">本单调整只作用于这一张需求，<b>不回写标准岗位标准</b>；标准改了要升版本，已发出的确认单不回溯。</div>
    </div>

    <div class="sec"><div class="sec-t">47 项逐项确认</div>
      <div class="tri-legend" style="margin-bottom:10px">图例：${confTag('agree')} 客户已确认 · ${confTag('pending')} 待客户确认</div>
      ${rowsByDom}</div>
  </div>
  <div class="dr-f">
    <button class="btn" onclick="closeAll()">关闭</button>
    ${d.confirm==='已确认'
      ? `<button class="btn" onclick="confirmReg('${d.id}','change')">标记条件已变更，需重新确认</button>`
      : `<button class="btn pri" onclick="confirmReg('${d.id}','ok')">登记客户确认（按 ${pv?pv.v:(av?av.v:'v1.0')} 生效）</button>`}
  </div>`);
}

/* ---------- 版本历史 ---------- */
function openVers(did){
  const d = D(did);
  const vers = versOf(d).slice().reverse();
  openDrawer(`<div class="dr-h"><div><h3>需求版本 · ${esc(d.post)}</h3>
    <div class="sub">${esc(d.client)} · 条件变更生成新版本，旧版记录保留</div></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="dr-b">
    ${vers.map(v=>`<div class="card" style="margin-bottom:11px"><div class="card-h">
      <div><h3 class="mono" style="font-size:14px">${esc(v.v)}</h3>
        <div class="sub">${esc(v.at)} · ${esc(v.by)} · ${esc(v.way)}</div></div>
      <span class="b ${v.status==='生效'?'g':v.status==='待客户确认'||v.status==='待重新确认'?'w':v.status==='已被取代'?'n':'r'}">${esc(v.status)}</span>
    </div><div class="card-b">
      <div class="sm mut">${esc(v.note||'')}</div>
      ${(v.changes||[]).length?`
        <div class="sec-t" style="margin-top:11px">变更 ${v.changes.length} 项</div>
        <div class="tbl-wrap" style="border-radius:8px"><table>
          <thead><tr><th>字段</th><th>旧值</th><th>新值</th></tr></thead>
          <tbody>${v.changes.map(c=>`<tr><td class="sm">${esc(c.f)}</td>
            <td class="sm mut">${esc(c.from)}</td><td class="sm"><b>${esc(c.to)}</b></td></tr>`).join('')}</tbody>
        </table></div>`:'<div class="xs mut" style="margin-top:8px">首版，无字段变更</div>'}
      ${v.status==='待重新确认'?`<div class="note r" style="margin-top:10px">旧版（生效中）的确认<b>不自动继承</b>到本版。重新确认前，本版不作为匹配依据。</div>`:''}
    </div></div>`).join('')}
    <div class="note">同一字段在三个地方出现时必须可辨认来源：岗位标准标准（跨客户共用）、客户级条件（该客户模板）、本单调整（只此一单）。原标准永远不会被本单覆盖。</div>
  </div>
  <div class="dr-f"><button class="btn" onclick="closeAll()">关闭</button></div>`);
}

/* ---------- 登记动作（真实改状态） ---------- */
function confirmReg(did, act){
  const d = D(did);
  if(act === 'ok'){
    const pv = pendingVer(d);
    if(pv){
      versOf(d).forEach(v=>{ if(v.status==='生效') v.status='已被取代'; });
      pv.status = '生效'; pv.at = '2026-11-14 08:20'; pv.by = '金诚（代客户登记）'; pv.way = '微信';
    }
    d.confirm = '已确认';
    const av = activeVer(d);
    MATCH_STAMP[did] = {ver: av?av.v:'—', at:'2026-11-14 08:20', stale:true};
    closeAll(); refreshTable();
    toast(`已登记确认，${av?av.v:''} 生效 · 旧匹配结果已标记「需更新」`);
    return;
  }
  /* 标记条件变更 */
  showAsk('标记为「条件已变更，需重新确认」','变更后旧的客户确认作废，需生成新版本重新确认；已发出的匹配结果同时失效。', ()=>{
    const cur = activeVer(d);
    const base = cur ? cur.v : 'v1.0';
    const next = 'v'+(Number(String(base).replace('v','').split('.')[0])+1)+'.0';
    versOf(d).push({v:next, status:'待重新确认', at:'2026-11-14 08:20', by:'金诚', way:'待客户反馈',
      n:47, note:'我方发起变更，等待客户重新确认',
      changes:[{f:'工效条款', from:'按原版本', to:'待客户确认'}]});
    d.confirm = '变更待重确认';
    MATCH_STAMP[did] = {ver:base, at:'2026-11-14 08:20', stale:true};
    closeAll(); refreshTable();
    toast('已生成 '+next+'，状态改为「变更待重确认」；匹配结果需更新');
  });
}
function showAsk(title, body, onOk){
  openModal(`<div class="md-h"><div><h3>${esc(title)}</h3></div><button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b"><div class="note r">${esc(body)}</div></div>
  <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" id="askOk">确认</button></div>`);
  document.getElementById('askOk').onclick = ()=>{ onOk(); };
}

/* ---------- 受控链接 ---------- */
function regenLink(did){
  const d = D(did);
  const pv = pendingVer(d), av = activeVer(d);
  const ver = pv ? pv.v : (av ? av.v : 'v1.0');
  const tok = genLink(did, ver, S.who || '金诚');
  closeAll(); refreshTable();
  toast('已生成只读链接 '+tok+'（有效期 7 天）');
}
function revokeLinkUI(tok){
  showAsk('撤销该只读链接？','撤销后客户打开链接将无法查看与确认，需要重新生成。已登记的历史确认记录不受影响。', ()=>{
    revokeLink(tok, '我方主动撤销');
    closeAll(); refreshTable();
    toast('链接已撤销');
  });
}

/* 链接管理页（R01 / R02） */
function clinkPage(){
  const f = S.f.lk || '全部';
  const list = CLINKS.filter(l=>f==='全部' || l.state===f);
  const rows = list.map(l=>{
    const d = D(l.demandId);
    const tone = l.state==='有效'?'g':l.state==='已失效'?'n':'r';
    const expired = l.state==='有效' && l.expire < '2026-11-14';
    return `<tr>
      <td><div class="mono sm">${esc(l.tok)}</div><div class="t-sub">${esc(l.mode)}</div></td>
      <td><div class="sm">${esc(d.client)} · ${esc(d.post)}</div><div class="t-sub">${esc(d.project)}</div></td>
      <td><span class="mono sm">${esc(l.ver)}</span></td>
      <td><span class="b ${expired?'r':tone}">${expired?'已过期':esc(l.state)}</span>
        ${l.why?`<div class="t-sub">${esc(l.why)}</div>`:''}</td>
      <td class="sm">${esc(l.by)}<div class="t-sub">${esc(l.at)}</div></td>
      <td class="mono sm">${esc(l.expire)}</td>
      <td class="num">${l.views}</td>
      <td><div class="acts">
        ${l.state==='有效'?`<span class="link" onclick="openCustLinkDemo('${l.tok}')">打开</span>
          <span class="link" onclick="copyLinkText('${l.tok}')">复制</span>
          <span class="link" onclick="revokeLinkUI('${l.tok}')">撤销</span>`
          :`<span class="link" onclick="regenLink('${l.demandId}')">重新生成</span>`}
      </div></td></tr>`;
  }).join('');
  return `<div class="page">
    ${head('客户确认链接','受控只读确认单 · 客户不登录系统 · 链接可失效可撤销',
      `<button class="btn pri" onclick="genLinkPick()">＋ 生成链接</button>`)}
    ${stats([
      {lab:'链接总数', val:CLINKS.length, unit:'条'},
      {lab:'有效', val:CLINKS.filter(l=>l.state==='有效'&&l.expire>='2026-11-14').length, unit:'条', accent:true},
      {lab:'已失效 / 已撤销', val:CLINKS.filter(l=>l.state!=='有效').length, unit:'条'},
      {lab:'未生成链接的需求', val:DEMANDS.filter(d=>!mainLink(d.id)).length, unit:'个'},
    ])}
    ${toolbar({q:'搜索链接 / 客户 / 岗位',
      chips:['全部','有效','已失效','已撤销'].map(k=>({k:'lk', v:k==='全部'?'':k, label:k})),
      right:`<span class="sm mut">${list.length} 条</span>`})}
    <div class="tbl-wrap"><table>
      <thead><tr><th>链接</th><th>需求 / 岗位</th><th>版本</th><th>状态</th><th>生成人</th><th>有效期至</th><th>查看</th><th>操作</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8"><div class="empty">没有链接</div></td></tr>'}</tbody></table></div>
    ${pager(list.length)}
    <div class="note" style="margin-top:12px">只读链接只展示<b>该条需求</b>：不含内部人才库、其他客户需求、合同价与利润。失效 / 撤销后打开会提示明确原因，无法继续确认。</div>
  </div>`;
}
function copyLinkText(tok){
  const url = 'https://demo.ronggan.local/confirm#' + tok;
  if(navigator.clipboard) navigator.clipboard.writeText(url).then(()=>toast('已复制：'+url), ()=>toast(url));
  else toast(url);
}
function genLinkPick(){
  openModal(`<div class="md-h"><div><h3>生成只读确认链接</h3><p>选择需求与版本，客户只看到这一条</p></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="field"><label>需求</label>
      <select id="lkD">${DEMANDS.map(d=>{const v=pendingVer(d)||activeVer(d);
        return `<option value="${d.id}">${esc(d.client)} · ${esc(d.post)} · ${v?v.v:'无版本'}</option>`;}).join('')}</select></div>
    <div class="note">生成后有效期 7 天；撤销或过期后客户打开只能看到失效说明。</div>
  </div>
  <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" onclick="regenLink(document.getElementById('lkD').value)">生成</button></div>`);
}

PAGES.clinks = { R01: clinkPage, R02: clinkPage };
