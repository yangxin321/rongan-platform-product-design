/* =============================================================
   R01 · 标准岗位标准（StdJob）
   -------------------------------------------------------------
   标准岗位标准 = 要素清单 + 标准值。
   清单决定"问哪些"，标准决定"要多少"。这一层是 5 家客户真实取值反推出来的。
   页面：列表页（标准列表）+ 详情（逐项填值）。
   ============================================================= */

function r01StdJobs(){
  const sid = S.f.sj;
  if(!sid) return sjListPage();
  const s = stdOf(sid);
  if(!s.id){ S.f.sj = null; return sjListPage(); }
  if(!window.__SJ__ || window.__SJ__.sid!==sid) sjInit(sid);
  return sjBody(s, window.__SJ__);
}

/* ---------------- 列表 ---------------- */
function sjListPage(){
  const tr = S.f.sjtrade || '';
  const q = (S.f.sjq||'').trim().toLowerCase();

  let list = STD_JOBS.slice();
  if(tr) list = list.filter(x=>x.trade===tr);
  if(q) list = list.filter(x=>(x.name+x.id+x.from+x.trade+x.grade).toLowerCase().includes(q));

  const rows = list.map(s=>{
    const l = elListOf(s.list);
    const picked = (l.picks||[]).length;
    const filled = stdFilled(s);
    return `<tr class="clk" onclick="openStd('${s.id}')">
      <td><div class="t-name">${esc(s.name)}</div>
        <div class="t-sub mono">${esc(s.id)} · ${esc(s.ver)}</div></td>
      <td><span class="link" onclick="event.stopPropagation();openElements('${s.list}')">${esc(l.name||s.list)}</span>
        <div class="t-sub mono">${esc(s.list)}</div></td>
      <td><b class="sm">${filled}</b> <span class="sm mut">/ ${picked} 项已填标准值</span>
        <div class="t-sub">${filled===picked?'全部已定':(picked-filled)+' 项还空着'}</div></td>
      <td class="sm mut">${esc(s.from)}</td>
      <td>${s.status==='已发布'?'<span class="b g">已发布</span>':'<span class="b w">草稿</span>'}</td>
      <td onclick="event.stopPropagation()"><div class="acts">
        <span class="link" onclick="openStd('${s.id}')">看标准值</span>
      </div></td>
    </tr>`;
  }).join('');

  return `<div class="page">
    ${head('标准岗位标准', xpl('一行就是一个标准岗位标准：<b>一份要素清单 + 一套标准值</b>。清单说"要问年龄"，标准说"18–45"。<br>这一层的每一组值都是从 5 家客户真实需求单反推的，右侧可追溯到来源单。',
      '一个标准岗位标准 = 一份要素清单 + 一套标准值 · 需求只在这一层之上加人 / 时间 / 钱'),
      `<button class="btn" onclick="toast('已导出标准岗位标准')">导出</button><button class="btn pri" onclick="sjNew()">＋ 新建标准岗位标准</button>`)}
    ${toolbar({
      q:'搜索标准岗位标准 / 来源客户',
      filters:[{k:'sjtrade', opts:[{v:'',label:'全部工种'}].concat(['钳工','电工','数控','品质'].map(t=>({v:t,label:t})))}],
      right:`<span class="sm mut">${list.length} 个标准岗位标准 · 标准值来自 5 家客户</span>`
    })}
    <div class="tbl-wrap"><table>
      <thead><tr><th>标准岗位标准</th><th>基于清单</th><th>标准值</th><th>反推来源</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="empty">没有匹配的标准岗位标准</td></tr>'}</tbody></table></div>
    ${pager(list.length)}
  </div>`;
}

/* ---------------- 编辑态 ---------------- */
function openStd(id){ S.f.sj = id; window.__SJ__ = null; closeAll(); render(); }
function sjBack(){ window.__SJ__ = null; S.f.sj = null; render(); }
function sjInit(sid){
  const s = stdOf(sid);
  window.__SJ__ = { sid, draft:JSON.parse(JSON.stringify(s.vals||{})), dirty:false };
}
function sjPaint(){
  const m = document.getElementById('main');
  if(!m) return render();
  m.innerHTML = r01StdJobs();
}
function sjSet(no, v){
  const d = window.__SJ__, s = stdOf(d.sid);
  d.draft[no] = v;
  d.dirty = JSON.stringify(d.draft) !== JSON.stringify(s.vals||{});
  sjPaint();
}
function sjCancel(){ const s = stdOf(window.__SJ__.sid); window.__SJ__.draft = JSON.parse(JSON.stringify(s.vals||{})); window.__SJ__.dirty = false; sjPaint(); }
function sjSave(){
  const d = window.__SJ__, s = stdOf(d.sid);
  s.vals = JSON.parse(JSON.stringify(d.draft));
  s.ver = bumpVer(s.ver);
  d.dirty = false;
  toast(`已保存为 ${s.ver} · 已发出的确认单不回溯，未发出的评分按新标准重算`);
  sjPaint();
}
function sjNew(){ toast('新建标准岗位标准：先选一份要素清单，再逐项填标准值'); }

/* ---------------- 机器视图：这份标准对应的能力画像 ----------------
   合并决议（2026-11-14 §AD）：画像不再有独立菜单，进标准岗位标准详情当「机器视图」。
   标准值是给人看的口径，画像是给机器算分的口径 —— 同一份能力的两种投影。
   匹配顺序：① id 直配（SJ-QG-D3 → PT-QG-D3）② 工种 × 等级 兜底（组长→D3 / 组员→D2）。 */
function portraitOfStd(s){
  const direct = (typeof PORTRAITS_V2!=='undefined') && PORTRAITS_V2.find(p=>p.id===String(s.id||'').replace('SJ-','PT-'));
  if(direct) return direct;
  const tMap = {'钳工':'T2-QG','电工':'T2-DG'};
  const gMap = {'大工':'D3','中工':'D2','小工':'D1','组长':'D3','组员':'D2'};
  const tid = tMap[s.trade], gd = gMap[s.grade];
  if(!tid || !gd || typeof PORTRAITS_V2==='undefined') return null;
  return PORTRAITS_V2.find(p=>p.trade===tid && p.grade===gd) || null;
}
function sjPortraitHtml(s){
  const p = portraitOfStd(s);
  if(!p) return `<div class="note i" style="margin-bottom:14px">
    <b>机器视图（能力画像）。</b>${esc(s.trade)} × ${esc(s.grade)} 还没有画像 —— 这个工种的能力刻度没建，AI 评分只能靠面试人工判定。去「人才画像因子库」补因子与档位。
  </div>`;
  const g = k => p.pick.filter(x=>x[2]===k).length;
  const metr = p.pick.filter(x=>hasMetric(tierOf(x[0],x[1]))).length;
  const tags = p.pick.map(x=>{
    const f = factorOf(x[0]); const tr = tierOf(x[0], x[1]);
    const gap = isGapTier(tr);
    const num = hasMetric(tr) ? tr.metric : null;
    const color = x[2]==='PASS'?'#A32D2D':x[2]==='加分'?'#3B6D11':'#185FA5';
    const bg = x[2]==='PASS'?'#FCEBEB':x[2]==='加分'?'#EAF3DE':'#E6F1FB';
    return `<span class="tg" style="padding:4px 9px;font-size:11.5px;background:${gap?'var(--bg2)':bg};border-color:${gap?'var(--warn-line)':color};color:${gap?'var(--warn)':color}">${esc(f.name||x[0])} ≥${esc(x[1])} · ${esc(num||tr.label||'待补')}</span>`;
  }).join('');
  return `<div class="card" style="margin-bottom:14px">
    <div class="card-h"><div>
      <h3>机器视图 · ${esc(p.name)} <span class="mono xs mut">${esc(p.id)} · ${esc(p.ver)}</span></h3>
      <div class="sub">上面的标准值是给人（客户/专员）看的口径，这张画像是给机器算分的口径 —— 同一份能力的两种投影，改一边要同步另一边。${metr}/${p.pick.length} 条带精度指标，其余靠面谈。</div>
    </div>
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
        <span class="b r">PASS ${g('PASS')}</span>
        <span class="b i">必填 ${g('必填')}</span>
        <span class="b g">加分 ${g('加分')}</span>
        <span class="link" style="margin-left:8px" onclick="openPortrait('${p.id}')">打开画像 →</span>
      </div></div>
    <div class="card-b"><div class="tags">${tags}</div></div>
  </div>`;
}

/* ---------------- 详情：逐项填值 ---------------- */
function sjBody(s, d){
  const l = elListOf(s.list);
  const picks = l.picks || [];
  const dirty = d.dirty;

  const blocks = F47_L1.map(dom=>{
    const groups = dom.groups.map(g=>{
      const items = picks.map(no=>f47Of(no)).filter(f=>f.l2===g);
      if(!items.length) return '';
      const rows = items.map(f=>{
        const v = d.draft[f.no];
        const empty = v==null || v==='' || (Array.isArray(v)&&!v.length);
        return `<tr>
          <td><span class="fid">${f.no}</span> <b class="sm">${esc(f.name)}</b>
            <div class="t-sub">${esc(f.type)} · ${esc(GATE_OF_LEVEL[f.level]||'')}</div></td>
          <td>${sjEditor(f, v)}</td>
          <td class="sm ${empty?'':'mut'}">${empty?'<span style="color:var(--warn)">未定</span>':esc(sjHint(f,v))}</td>
        </tr>`;
      }).join('');
      const done = items.filter(f=>d.draft[f.no]!=null).length;
      return `<div class="el-grp">
        <div class="el-grp-h"><b>${esc(g)}</b><span class="sm mut">${done}/${items.length}</span></div>
        <div class="tbl-wrap"><table class="sj-tbl"><tbody>${rows}</tbody></table></div>
      </div>`;
    }).join('');
    if(!groups) return '';
    return `<div class="el-dom">
      <div class="el-dom-h"><span class="el-dom-m">${esc(dom.mark)}</span><b>${esc(dom.name)}</b></div>
      ${groups}
    </div>`;
  }).join('');

  const filled = Object.keys(d.draft).filter(k=>d.draft[k]!=null && d.draft[k]!=='').length;

  return `<div class="page">
    <div class="crumb"><span class="link" onclick="sjBack()">← 标准岗位标准</span><span class="mut">/</span>
      <b>${esc(s.name)}</b></div>
    ${head('标准岗位标准 · '+esc(s.name),
      xpl('左边是要问的字段（来自要素清单），右边是<b>标准值</b>。改右边不动清单 —— 这就是"标准不可改、单可改"里先改标准的那一步。',
        esc(s.note||'')) + ` <span class="mono xs mut">${esc(s.id)} · ${esc(s.ver)} · ${esc(s.status)}</span>`,
      `<button class="btn" onclick="sjCancel()" ${dirty?'':'disabled'}>放弃</button>
       <button class="btn pri" onclick="sjSave()">保存为 ${esc(bumpVer(s.ver))}</button>`)}

    <div class="el-bar">
      <span class="b ${filled===picks.length?'g':'w'}">已定 ${filled} / ${picks.length} 项标准值</span>
      <span class="sm mut">基于 <span class="link" onclick="openElements('${s.list}')">${esc(l.name)}</span> · ${esc(l.ver)}</span>
      ${dirty?'<span class="b a">有未保存改动</span>':''}
      <div class="sp"></div>
      <span class="sm mut">反推来源：${esc(s.from)}</span>
    </div>

    ${sjPortraitHtml(s)}

    ${blocks}

    <div class="note i" style="margin-top:14px">
      <b>标准值从哪来的。</b>这一组不是拍脑袋定的 —— 是把 ${esc(s.from)} 那张真实需求单里的对应字段原样搬过来，再把同义写法归一到标准取值。
      5 家客户一共反推出 ${STD_JOBS.length} 份标准岗位标准，其中「装配电工 大工」被兴禾（42–44）与思锐（待报价）各用一次，价格不同、要求相近。
    </div>
    <div class="note w" style="margin-top:10px">
      <b>改档位要提示。</b>改「等级要求」「年龄区间」这类会改变评分口径的字段，保存时提示"已评分的人需要重算"。
      目前原型里做成保存即提示，未做重算队列。
    </div>
  </div>`;
}

/* 值的编辑器：枚举 → select；区间 → input；多选 → 文本域（逗号分隔） */
function sjEditor(f, v){
  const isEnum = ['枚举','词表'].includes(f.type) && !Array.isArray(v);
  if(isEnum){
    const opts = (f.vals||[]).slice();
    const cur = v==null?'':String(v);
    if(cur && !opts.includes(cur)) opts.unshift(cur);
    return `<select class="ed-in" onchange="sjSet(${f.no},this.value)">
      <option value="" ${cur?'':'selected'}>— 未定 —</option>
      ${opts.map(o=>`<option value="${esc(o)}" ${o===cur?'selected':''}>${esc(o)}</option>`).join('')}
    </select>`;
  }
  if(Array.isArray(v) || f.type==='多选'){
    const cur = Array.isArray(v)? v.join(' · ') : (v||'');
    return `<input class="ed-in" value="${esc(cur)}" placeholder="多个值用 · 分隔"
      onchange="sjSet(${f.no}, this.value.split('·').map(x=>x.trim()).filter(Boolean))">`;
  }
  return `<input class="ed-in" value="${esc(v==null?'':v)}" placeholder="填标准值"
    onchange="sjSet(${f.no}, this.value)">`;
}
/* 值旁的第一句说明 */
function sjHint(f, v){
  if(f.type==='区间' && f.unit) return f.unit + ' · ' + (f.syn&&f.syn[0]?('客户原话：'+f.syn[0]):'');
  if(f.syn && f.syn.length) return '原话：' + f.syn[0];
  return f.talent ? '人才侧：' + f.talent : '';
}

PAGES.std = {R01:r01StdJobs};
