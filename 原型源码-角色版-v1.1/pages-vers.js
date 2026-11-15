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
function verBadge(v){
  if(!v) return '';
  const tone = VER_TONE[v.status] || 'n';
  return `<span class="b ${tone}">${esc(v.v)} ${esc(v.status)}</span>`;
}
function demandStateBar(d, opts){
  opts = opts || {};
  const av = activeVer(d), ov = openVer(d), lk = mainLink(d.id);
  const stale = matchNeedsUpdate(d);
  const stamp = MATCH_STAMP[d.id] || {};
  const nv = versOf(d).length;
  /* 一行说完「现在算哪一版、客户确认到哪、链接在不在、匹配依据旧不旧」，细节都进变更历史 */
  return `<div class="ver-line">
    ${av?`<span class="b g">生效 ${esc(av.v)}</span>`:'<span class="b r">未生效</span>'}
    ${av?`<span class="xs mut">${esc((av.at||'').slice(0,10))} · ${esc(av.by||'—')}</span>`:''}
    ${ov?verBadge(ov):''}
    ${confirmB(d.confirm)}
    ${stale?`<span class="b r">匹配结果需更新</span>`:`<span class="b g">匹配依据 ${esc(stamp.ver||'—')}</span>`}
    ${lk?`<span class="b ${lk.state==='有效'?'i':'n'}">只读链接 ${esc(lk.state)}</span>`:`<span class="b w">无只读链接</span>`}
    <div class="sp"></div>
    ${opts.noBtn?'':`<button class="btn xs" onclick="dmToggleEdit()">${DM.edit?'完成编辑':'编辑这一单'}</button>
      <button class="btn xs" onclick="openVers('${d.id}')">变更历史（${nv} 版）</button>
      <button class="btn xs" onclick="openConfirm('${d.id}')">确认单</button>`}
  </div>
  ${!av?`<div class="note r" style="margin-top:9px">该需求尚无生效版本，<b>不得作为匹配与推荐依据</b>。需客户线下反馈、我方代登记，并经内部审核通过后方可生效。</div>`:''}
  ${ov&&ov.status==='待内部审核'?`<div class="note w" style="margin-top:9px">${esc(ov.v)} 已代登记客户反馈，<b>等待内部审核</b>；审核通过前不生效，旧版 ${esc((av||{}).v||'—')} 仍为匹配依据。</div>`:''}
  ${ov&&ov.status==='已退回'?`<div class="note r" style="margin-top:9px">${esc(ov.v)} 已被内部<b>退回</b>：${esc(ov.auditNote||'—')} 需补充客户依据后重新送审。</div>`:''}
  ${stale&&av?`<div class="note w" style="margin-top:9px">需求条件已变更：当前匹配结果依据 ${esc(stamp.ver||'—')}，需按 ${esc(av.v)} 重算。</div>`:''}`;
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
            <td><span class="b ${f.level==='一级'?'r':f.level==='二级'?'w':'n'}" style="font-size:12px">${esc(f.level)}</span></td>
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
        ${pv?verBadge(pv):''}
        ${confirmB(d.confirm)}
        <span class="sp" style="flex:1"></span>
        <button class="btn xs" onclick="openVers('${d.id}')">版本历史（${vers.length}）</button>
        ${lk?`<button class="btn xs" onclick="openCustLinkDemo('${lk.tok}')">打开只读确认单</button>`
             :`<button class="btn xs" onclick="regenLink('${d.id}')">生成只读链接</button>`}
      </div>
      <div class="note" style="margin-top:11px">客户<b>不登录系统</b>，只查看这份只读确认单，通过微信 / 会议 / 电话口头反馈；我方按客户原话<b>代登记</b>，登记后经<b>内部审核</b>通过才生效。系统里不存在「客户点击确认」的记录。</div>
      ${lk?`<div class="xs mut" style="margin-top:8px">只读链接 <span class="mono">${esc(lk.tok)}</span> · ${esc(lk.at)} 生成 · 有效期至 ${esc(lk.expire)} · 已查看 ${lk.views} 次
        <span class="link" style="margin-left:8px" onclick="revokeLinkUI('${lk.tok}')">撤销</span></div>`
        :`<div class="xs" style="margin-top:8px;color:var(--bad)">尚未生成只读链接，客户手上没有可核对的确认单</div>`}
    </div></div>

    ${regBlock(d, pv||av, !pv)}


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
    ${pv&&pv.status==='待内部审核'?`<button class="btn pri" onclick="auditDrawer('${d.id}')">内部审核 ${esc(pv.v)}</button>`:''}
    ${pv&&pv.status==='已退回'?`<button class="btn pri" onclick="regDrawer('${d.id}')">补充反馈并重新送审</button>`:''}
    ${pv&&(pv.status==='待客户确认'||pv.status==='待重新确认')
      ? `<button class="btn pri" onclick="regDrawer('${d.id}')">代登记客户反馈（${esc(pv.v)}）</button>`:''}
    ${(d.confirm==='已确认'||av)&&!pv?`<button class="btn pri" onclick="confirmReg('${d.id}','change')">标记条件已变更 → 新版本</button>
      <span class="xs mut" style="align-self:center;max-width:320px">已生效、没有待处理版本：不对生效版本重复登记送审，先开新版本再登记</span>`:''}
  </div>`);
}

/* 审核历史：一轮一行，按时间正序（第 1 轮 → 最新） */
function auditHistHtml(v, compact){
  const l = auditsOf(v);
  if(!l.length) return '';
  const rows = l.map((a,i)=>`<div class="sm" style="padding:6px 0;border-bottom:1px solid var(--line2)">
      <span class="b ${a.act==='back'?'r':'g'}">第 ${i+1} 轮 · ${a.act==='back'?'退回':'通过'}</span>
      <span class="xs mut">　${esc(a.by||'—')} · ${esc(a.at||'—')}${a.reg?` · ${esc(a.reg)}`:''}</span>
      <div class="xs ${a.act==='back'?'':'mut'}" style="margin-top:2px">${esc(a.note||'—')}</div>
    </div>`).join('');
  return `<div class="sec-t" style="margin-top:${compact?'8px':'11px'}">审核记录 ${l.length} 轮（不覆盖，逐轮保留）</div>
    <div style="margin-top:2px">${rows}</div>`;
}

/* ---------- 代登记记录展示（8 字段，两个时间两个人分开看） ---------- */
function regTable(r){
  const miss = regMissing(r);
  return `<div class="tbl-wrap" style="border-radius:9px"><table>
    <thead><tr><th style="width:132px">登记项</th><th>内容</th></tr></thead>
    <tbody>
      <tr><td class="sm mut">对应需求版本</td><td class="sm mono">${esc(r.ver)}</td></tr>
      <tr><td class="sm mut">客户反馈人</td><td class="sm"><b>${esc(r.fbPerson)}</b><div class="t-sub">客户侧，不是我方对接人</div></td></tr>
      <tr><td class="sm mut">反馈渠道</td><td class="sm">${esc(r.fbChannel)}</td></tr>
      <tr><td class="sm mut">反馈发生时间</td><td class="sm"><b>${esc(r.fbAt)}</b><div class="t-sub">客户实际说话的时间</div></td></tr>
      <tr><td class="sm mut">反馈内容 / 结论</td><td class="sm">${esc(r.fbContent)}</td></tr>
      <tr><td class="sm mut">依据附件或记录</td><td class="sm">${esc(r.fbAttach)}</td></tr>
      <tr><td class="sm mut">我方登记人</td><td class="sm">${esc(r.regBy)}<div class="t-sub">我方录入，不是客户</div></td></tr>
      <tr><td class="sm mut">登记时间</td><td class="sm"><b>${esc(r.regAt)}</b><div class="t-sub">系统录入时间，晚于反馈时间</div></td></tr>
    </tbody></table></div>
    ${miss.length?`<div class="note r" style="margin-top:9px">缺 ${miss.length} 项：${miss.map(esc).join('、')}。<b>缺项不允许送审。</b></div>`:''}`;
}
function regBlock(d, v, isEffective){
  if(!v) return '';
  const r = lastReg(d.id, v.v), hist = regsOfVer(d.id, v.v);
  const tone = v.audit==='已通过'?'g':v.audit==='已退回'?'r':v.audit==='待审核'?'w':'n';
  /* R1-3：已生效且没有待处理版本时，这里只做只读回看，不再引导「再登记一次送审」 */
  const empty = isEffective
    ? `<div class="note">该版本已是生效版本，<b>不再对生效版本重复登记送审</b>。客户有新反馈时，走「标记条件已变更 → 生成新版本 → 代登记 → 内部审核」。</div>`
    : `<div class="note w">该版本还没有代登记记录。客户口头反馈回来后，点「代登记客户反馈」逐项录入，才能送内部审核。</div>`;
  return `<div class="sec" style="padding-top:0"><div class="sec-t">客户反馈代登记 · ${esc(v.v)}
      <span class="b ${tone}">${esc(v.audit||'未送审')}</span>
      <span class="sp" style="flex:1"></span>
      <span class="xs mut">共 ${hist.length} 条记录</span></div>
    ${r?regTable(r):empty}
    ${v.auditNote?`<div class="note ${v.audit==='已退回'?'r':'i'}" style="margin-top:9px"><b>${v.audit==='已退回'?'退回意见':'审核意见'}</b>：${esc(v.auditNote)}${v.auditBy?`　— ${esc(v.auditBy)} · ${esc(v.auditAt||'')}`:''}</div>`:''}
    ${auditsOf(v).length>1?auditHistHtml(v, true):''}
  </div>`;
}

/* ---------- 代登记表单（客户线下反馈 → 我方录入） ---------- */
function regDrawer(did, ver){
  const d = D(did);
  const vers = versOf(d);
  const target = (ver && vers.find(x=>x.v===ver)) || openVer(d) || vers[vers.length-1];
  const prev = lastReg(d.id, target.v) || {};
  const redo = target.status === '已退回';
  const now = nowTs();
  const val = (k, dft) => esc(prev[k]!=null && prev[k]!=='' ? prev[k] : (dft||''));
  openDrawerW(`<div class="dr-h"><div><h3>代登记客户反馈 · ${esc(d.post)}</h3>
    <div class="sub">${esc(d.client)} · 对应版本 <b class="mono">${esc(target.v)}</b> · 客户线下反馈，由我方录入</div></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="dr-b">
    <div class="note r" style="margin-bottom:14px">
      这不是客户点出来的记录。<b>客户从不登录、不点击。</b>下面每个字段都是我方按客户原话抄录，
      系统会同时保留<b>客户什么时候说的</b>和<b>我在什么时候抄进来的</b>，两者都要有依据才能送审。
    </div>
    ${redo?`<div class="note w" style="margin-bottom:14px">上一轮被退回（${esc((lastBack(target)||{}).at||'—')} · ${esc((lastBack(target)||{}).by||'—')}）：${esc((lastBack(target)||{}).note||'—')}
      <br>补充后重新提交，前面几轮的退回意见不删除，作为历史保留（本版已审 ${auditsOf(target).length} 轮）。</div>`:''}

    <div class="sec" style="padding-top:0"><div class="sec-t">必填 8 项</div>
    <div class="frow">
      <div class="field"><label>对应需求版本 <i>*</i></label>
        <input id="rg_ver" value="${esc(target.v)}" readonly style="background:var(--bg2);font-family:var(--mono)">
        <div class="hint">客户手上那份只读确认单是哪个版本，就只能登记到哪个版本</div></div>
      <div class="field"><label>客户反馈人 <i>*</i></label>
        <input id="rg_fbPerson" value="${val('fbPerson')}" placeholder="例：张工（立讯·设备部）">
        <div class="hint">客户侧的说话人，不是我方对接人</div></div>
    </div>
    <div class="frow">
      <div class="field"><label>反馈渠道 <i>*</i></label>
        <select id="rg_fbChannel">${REG_CHANNELS.map(c=>`<option ${prev.fbChannel===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label>反馈发生时间 <i>*</i></label>
        <input id="rg_fbAt" value="${val('fbAt')}" placeholder="2026-11-13 09:12">
        <div class="hint">客户实际说话的时间，不是我录入的时间</div></div>
    </div>
    <div class="field"><label>反馈内容 / 确认结论 <i>*</i></label>
      <textarea id="rg_fbContent" placeholder="逐项写清客户改了什么、确认了什么；能写原话就写原话">${esc(prev.fbContent||'')}</textarea>
      <div class="hint">「都行」「再谈」这类没有落到具体值的反馈，审核会被退回</div></div>
    <div class="field"><label>依据附件或记录 <i>*</i></label>
      <input id="rg_fbAttach" value="${val('fbAttach')}" placeholder="例：微信聊天记录截图 2 张（arch/xxx.png）/ 会议纪要编号 / 通话录音编号">
      <div class="hint">没有可查证的东西就不算依据</div></div>
    <div class="frow">
      <div class="field"><label>我方登记人 <i>*</i></label>
        <input id="rg_regBy" value="${esc(prev.regBy || S.who || '金诚')}"></div>
      <div class="field"><label>登记时间 <i>*</i></label>
        <input id="rg_regAt" value="${esc(prev.regAt || now)}">
        <div class="hint">系统录入时间，不得早于反馈时间</div></div>
    </div>
    <div id="rg_err"></div>
    </div>
  </div>
  <div class="dr-f">
    <button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" onclick="regSave('${d.id}','${esc(target.v)}')">保存并送内部审核</button>
  </div>`);
}

function regSave(did, ver){
  const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const rec = {
    id:newRegId(), demandId:did, ver:ver,
    fbPerson:g('rg_fbPerson'), fbChannel:g('rg_fbChannel'), fbAt:g('rg_fbAt'),
    fbContent:g('rg_fbContent'), fbAttach:g('rg_fbAttach'),
    regBy:g('rg_regBy'), regAt:g('rg_regAt'), audit:'待审核',
  };
  const miss = regMissing(rec);
  const err = [];
  if(miss.length) err.push(`还有 ${miss.length} 项没填：${miss.join('、')}`);
  /* 时间按值比，不按字符串比；格式不合法直接拦下，不猜 */
  const fbOk = !!normTs(rec.fbAt), rgOk = !!normTs(rec.regAt);
  if(rec.fbAt && !fbOk) err.push('反馈发生时间格式不对，应为 2026-11-13 09:12');
  if(rec.regAt && !rgOk) err.push('登记时间格式不对，应为 2026-11-13 09:12');
  if(fbOk && rgOk){
    const ord = tsOrderOk(rec.fbAt, rec.regAt);
    if(!ord.ok) err.push(ord.why);
    rec.fbAt = normTs(rec.fbAt);
    rec.regAt = normTs(rec.regAt);
  }
  if(err.length){
    const box = document.getElementById('rg_err');
    if(box) box.innerHTML = `<div class="note r">${err.map(esc).join('<br>')}</div>`;
    toast('登记未保存：'+err[0]);
    return;
  }
  /* 上一轮的退回意见已经追加在 version.audits 里，这里不再覆盖写 prevAudit —— 
     退回几轮就留几条，补充送审不清空历史。 */
  addReg(rec);
  const d = D(did), v = versOf(d).find(x=>x.v===ver);
  if(v){
    v.status = '待内部审核'; v.audit = '待审核'; v.auditNote = ''; v.auditBy = ''; v.auditAt = '';
  }
  if(!activeVer(d)) d.confirm = '待内部审核';
  closeAll(); refreshTable();
  toast(`已代登记 ${rec.id}，${ver} 送内部审核（审核通过前不生效）`);
}

/* ---------- 内部审核 ---------- */
function auditDrawer(did){
  const d = D(did);
  const v = openVer(d);
  if(!v) return toast('没有待审核的版本');
  const r = lastReg(d.id, v.v);
  const miss = regMissing(r);
  openDrawerW(`<div class="dr-h"><div><h3>内部审核 · ${esc(d.post)}</h3>
    <div class="sub">${esc(d.client)} · ${esc(v.v)} · 审核人 ${esc(S.who||'王浩')}</div></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="dr-b">
    <div class="note" style="margin-bottom:14px">审核的不是「客户有没有同意」，而是<b>这条代登记是否站得住</b>：客户是谁、什么时候说的、原话是什么、有没有可查的依据、改的值是否写死。<b>依据不全不得通过。</b></div>
    ${r?regTable(r):`<div class="note r">该版本没有代登记记录，不能审核通过。</div>`}
    ${(v.changes||[]).length?`<div class="sec"><div class="sec-t">本版变更 ${v.changes.length} 项</div>
      <div class="tbl-wrap" style="border-radius:9px"><table><thead><tr><th>字段</th><th>旧值</th><th>新值</th></tr></thead>
        <tbody>${v.changes.map(c=>`<tr><td class="sm">${esc(c.f)}</td><td class="sm mut">${esc(c.from)}</td><td class="sm"><b>${esc(c.to)}</b></td></tr>`).join('')}</tbody></table></div></div>`:''}
    <div class="sec"><div class="sec-t">审核结论</div>
      <div class="field"><label>退回原因（选「退回」时必填）</label>
        <textarea id="au_note" placeholder="例：反馈未落到具体日期，且缺客户原话截图"></textarea></div>
      <div class="note w">退回后该版本标记「已退回」，不生效；旧版 ${esc((activeVer(d)||{}).v||'—')} 继续作为匹配依据。补充反馈后可再次送审。</div>
    </div>
  </div>
  <div class="dr-f">
    <button class="btn" onclick="closeAll()">关闭</button>
    <button class="btn" onclick="auditAct('${d.id}','back')">退回补充</button>
    <button class="btn pri" ${miss.length?'disabled style="opacity:.45;cursor:not-allowed"':''}
      onclick="auditAct('${d.id}','pass')">审核通过并生效</button>
  </div>`);
}

/* 每轮审核都追加到 version.audits，并把结论回写到被审的那条代登记记录 ——
   退回几轮就留几轮意见，补充送审不清历史。 */
function auditAppend(v, rec, act, by, at, note){
  v.audits = Array.isArray(v.audits) ? v.audits : [];
  v.audits.push({act, by, at, note, reg: rec ? rec.id : null});
  if(rec){
    rec.audit = act==='pass' ? '已通过' : '已退回';
    rec.auditBy = by; rec.auditAt = at; rec.auditNote = note;
  }
  return v.audits[v.audits.length-1];
}

function auditAct(did, act){
  const d = D(did), v = openVer(d);
  if(!v) return toast('没有待审核的版本');
  const r = lastReg(d.id, v.v), miss = regMissing(r);
  const at = nowTs(), by = S.who || '王浩';
  if(act === 'pass'){
    if(miss.length) return toast('缺 '+miss.length+' 项登记依据，不能通过：'+miss[0]);
    /* 送审时校验过的时间，通过时再校验一次：记录可能被后续改动 */
    const ord = tsOrderOk(r.fbAt, r.regAt);
    if(!ord.ok) return toast('该登记记录不可通过：'+ord.why);
    versOf(d).forEach(x=>{ if(x.status==='生效') x.status = '已被取代'; });
    v.status = '生效'; v.audit = '已通过'; v.auditBy = by; v.auditAt = at;
    v.auditNote = '代登记依据齐全，第 '+(r?r.id:'—')+' 条记录与变更项一致';
    auditAppend(v, r, 'pass', by, at, v.auditNote);
    v.by = (r?r.regBy:by)+'（代客户登记）'; v.way = r?r.fbChannel:'—'; v.at = r?r.regAt:at;
    d.confirm = '已确认';
    MATCH_STAMP[did] = {ver:v.v, at:at, stale:true};
    closeAll(); refreshTable();
    toast(`${v.v} 已生效；匹配结果标为「需更新」`);
    return;
  }
  const note = (document.getElementById('au_note')||{}).value || '';
  if(!note.trim()) { toast('退回必须写原因'); return; }
  v.status = '已退回'; v.audit = '已退回'; v.auditBy = by; v.auditAt = at; v.auditNote = note.trim();
  auditAppend(v, r, 'back', by, at, note.trim());
  if(!activeVer(d)) d.confirm = '已退回';
  closeAll(); refreshTable();
  toast(`${v.v} 已退回，需补充客户依据后重新送审`);
}

/* ---------- 版本历史（抽屉已停用，统一走独立页 #demand/<id>/history） ----------
   抽屉和详情页各渲染一套版本信息，改一处漏一处；而且抽屉关掉就没了地址。
   现在只留一个入口：需求明细 / 确认单里的「变更历史」都跳同一页（openDmHistory）。 */
function openVers(did){ openDmHistory(did); }

/* ---------- 登记动作 ----------
   v1.2 修订：不再「点一下直接生效」。
   代登记 → 待内部审核 → 审核通过才生效；依据不全时既不能送审也不能通过。 */
function confirmReg(did, act){
  const d = D(did);
  if(act === 'ok'){ return regDrawer(did); }
  /* 已有未结版本（待客户确认 / 待重新确认 / 待内部审核 / 已退回）时不再生成新版本。
     否则第二次点会算出同一个 v2.0，追加两个同号版本：regSave 用 find 取第一个送审，
     openVer / auditAct 取最后一个审核 —— 被送审和被审核不是同一个对象（AGENTS R2）。 */
  const ov = openVer(d);
  if(ov){
    toast(`已有未结版本 ${ov.v}（${ov.status}），请先完成该版的客户反馈 → 代登记 → 内部审核，再发起下一次变更`);
    return openVers(did);
  }
  /* 标记条件变更 */
  showAsk('标记为「条件已变更，需重新确认」','变更后旧的客户确认作废，需生成新版本重新走「客户反馈 → 我方代登记 → 内部审核」；已发出的匹配结果同时失效。', ()=>{
    /* 弹窗停留期间状态可能变化（如另一处已生成版本），落笔前再确认一次 */
    if(openVer(d)){ closeAll(); toast('已有未结版本，未重复生成'); return openVers(did); }
    const cur = activeVer(d);
    const base = cur ? cur.v : 'v1.0';
    const next = 'v'+(Number(String(base).replace('v','').split('.')[0])+1)+'.0';
    versOf(d).push({v:next, status:'待重新确认', audit:'未送审', at:nowTs(), by:'金诚', way:'待客户反馈',
      n:47, note:'我方发起变更，等待客户反馈', audits:[],
      changes:[{f:'工效条款', from:'按原版本', to:'待客户确认'}],
      /* 新版条件先留在待确认版本上；生效前不参与匹配（gateOf 读的是生效版本） */
      gate:(function(g){ return Object.assign({}, g, {skill:(g.skill||[]).slice(), cert:(g.cert||[]).slice()}); })(gateOf(d))});
    d.confirm = activeVer(d) ? '变更待重确认' : '待客户确认';
    MATCH_STAMP[did] = {ver:base, at:nowTs(), stale:true};
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
    const expired = linkExpired(l);
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
        ${l.state==='有效' && !expired?`<span class="link" onclick="openCustLinkDemo('${l.tok}')">打开</span>
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
