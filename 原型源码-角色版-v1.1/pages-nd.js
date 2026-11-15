/* =============================================================
   新建需求 · 四步向导
   -------------------------------------------------------------
   录音定义（2026-11-13）：**需求 = 标准岗位标准 + 人 / 时间 / 钱**。

   ① 选对象：按工种分组，选一个「标准岗位标准」（显示版本 / 清单 / PASS 必填 加分）
   ② 看并改：把要素 + 标准值摊开，可逐项改；改动只存差异（本单快照），标准本身不动
   ③ 填三样：人数 / 最迟到岗 / 工期 / 工价（人 / 时间 / 钱）
   ④ 生成需求：需求 = 标准快照 + 本单差异 + 人/时间/钱

   旧版第一步选的是「岗位描述 JOB_DESCS」—— 那是上一代对象，与本层定义无关，已整条替换。
   ============================================================= */

const ND_STEPS = ['选标准岗位标准', '看并改', '人 / 时间 / 钱', '核对生成'];

/* ---------- 状态 ---------- */
function ndState(){
  if(!window.__ND__) ndInit('');
  return window.__ND__;
}
function ndReset(){ window.__ND__ = null; }
function ndInit(pre){
  window.__ND__ = {
    step:1, sid:'', draft:{}, dirty:{},
    client:'', project:'', people:'', price:'', city:'',
    deadline:'2026-12-25', term:'3 个月'
  };
  const sid = ndSidOf(pre);
  if(sid) ndLoad(sid);
  window.__ND__.step = 1;
  return window.__ND__;
}
/* pre 可能是标准岗位标准 id（SJ-），也可能是老调用方传的岗位描述 id（JD-），统一归一 */
function ndSidOf(pre){
  const cand = [pre, S.f && S.f.ndStd, S.f && S.f.ndJd].filter(Boolean);
  for(const c of cand){
    if(stdOf(c).id) return c;
    const m = stdOf(String(c).replace('JD-','SJ-'));
    if(m.id) return m.id;
  }
  return '';
}
function ndLoad(sid){
  const st = ndState(), s = stdOf(sid);
  st.sid = sid;
  st.draft = JSON.parse(JSON.stringify(s.vals||{}));
  st.dirty = {};
}
/* 统一入口：所有「新建需求 / 新建确认单 / 客户单转需求」都走这里 */
function ndEnter(pre, fill){
  ndInit(pre||'');
  const st = ndState();
  if(fill) Object.keys(fill).forEach(k=>{ if(fill[k]!=null && fill[k]!=='') st[k]=fill[k]; });
  ndPaint();
}
function ndPick(sid){
  if(ndState().sid === sid) return;
  ndLoad(sid);
  ndPaint();
}
function ndGo(n){
  ndSync();
  ndState().step = n;
  ndPaint();
}
function ndPaint(){
  openModal(ndHtml(), 'md-lg');
  const b = document.querySelector('.md-b');
  if(b) b.scrollTop = 0;
}
/* 把当前步的 DOM 值收回状态（跨步保持） */
function ndSync(){
  const st = ndState(), g = id => { const el = document.getElementById(id); return el ? el.value : null; };
  [['ndClient','client'],['ndProject','project'],['ndPeople','people'],['ndPrice','price'],
   ['ndCity','city'],['ndDeadline','deadline'],['ndTerm','term']].forEach(([id,k])=>{
    const v = g(id); if(v!=null) st[k] = v;
  });
}
/* 某一项改动后只刷该行标记与顶部条，不整块重绘 —— 避免输入框失焦 */
function ndSet(no, v){
  const st = ndState(), s = stdOf(st.sid), f = f47Of(no);
  const base = s.vals ? s.vals[no] : null;
  st.draft[no] = v;
  if(JSON.stringify(v) === JSON.stringify(base)) delete st.dirty[no];
  else st.dirty[no] = true;
  const m = document.getElementById('ndm-' + no);
  if(m) m.innerHTML = ndMark(f, base, v);
  const bar = document.getElementById('ndBar');
  if(bar) bar.innerHTML = ndBarInner(st);
}

/* ---------- 外壳 ---------- */
function ndHtml(){
  const st = ndState(), n = st.step, s = st.sid ? stdOf(st.sid) : {};
  const body = n===1 ? ndS1(st) : n===2 ? ndS2(st,s) : n===3 ? ndS3(st,s) : ndS4(st,s);
  const sub = ['先从标准库里挑一个，需求不能凭空建','标准值可以改 —— 改的只是这一单','人数、到岗时间、工期、工价',
    '核对：标准快照 + 本单调整 + 人/时间/钱'][n-1];
  return `<div class="md-h"><div><h3>新建需求 · 第 ${n} 步</h3><p>${sub}</p></div>
    <button class="dr-x" onclick="ndReset();closeAll()">×</button></div>
  <div class="md-b">${ndStepBar(st)}${body}</div>
  <div class="md-f">${ndFoot(st, s)}</div>`;
}
function ndStepBar(st){
  return `<div class="nd-steps">${ND_STEPS.map((t,i)=>{
    const k = i+1, cls = k===st.step ? 'on' : (k<st.step ? 'done' : '');
    return `<div class="nd-step ${cls}"><i>${k<st.step?'✓':k}</i><span>${t}</span></div>`;
  }).join('')}</div>`;
}
function ndFoot(st, s){
  const cancel = `<button class="btn" onclick="ndReset();closeAll()">取消</button>`;
  if(st.step===1){
    return `${cancel}<button class="btn pri${st.sid?'':' dis'}" onclick="${st.sid?'ndGo(2)':''}" ${st.sid?'':'disabled'}>下一步 · 看并改</button>`;
  }
  if(st.step===4){
    return `<button class="btn" onclick="ndGo(3)">← 上一步</button>
      <button class="btn pri" onclick="ndCreate()">生成需求</button>`;
  }
  return `<button class="btn" onclick="ndGo(${st.step-1})">← 上一步</button>
    <button class="btn pri" onclick="ndGo(${st.step+1})">下一步 · ${ND_STEPS[st.step]}</button>`;
}

/* ---------- 第 1 步：选标准岗位标准 ---------- */
function ndS1(st){
  const trades = [...new Set(STD_JOBS.map(x=>x.trade))];
  const groups = trades.map(t=>{
    const g = STD_JOBS.filter(x=>x.trade===t);
    return `<div class="nd-grp">
      <div class="nd-grp-h"><b class="sm">${esc(t)}</b><span class="xs mut">${g.length} 个标准岗位标准</span></div>
      <div class="nd-cards">${g.map(s=>ndCard(s, s.id===st.sid)).join('')}</div>
    </div>`;
  }).join('');

  return `<div class="frow">
      <div class="field"><label>客户</label><input id="ndClient" value="${esc(st.client)}" placeholder="例：立讯精密" onchange="ndState().client=this.value"></div>
      <div class="field"><label>项目</label><input id="ndProject" value="${esc(st.project)}" placeholder="例：3C非标设备售后运维" onchange="ndState().project=this.value"></div>
    </div>
    <div class="sec-t" style="margin:4px 0 8px">选一个标准岗位标准 <span style="color:var(--bad)">*</span></div>
    ${groups}
    <div class="note i" style="margin-top:6px"><b>为什么第一步选它。</b>
      需求不能凭空建 —— 一个需求 = <b>一份标准岗位标准 + 人 / 时间 / 钱</b>。标准岗位标准 = 岗位要素清单 +
      一套标准值，选中即锁定这一单的评分口径；标准日后升版，这一单仍按选中的那一版算。</div>`;
}
function ndCard(s, on){
  const l = elListOf(s.list), picks = l.picks||[];
  const c = {PASS:0, 必填:0, 加分:0};
  picks.forEach(no=>{ const g = GATE_OF_LEVEL[f47Of(no).level]; if(c[g]!=null) c[g]++; });
  return `<div class="nd-card${on?' on':''}" onclick="ndPick('${s.id}')">
    <div class="nm"><b>${esc(s.name)}</b>
      <span class="b ${s.status==='已发布'?'g':'w'}">${esc(s.status)}</span></div>
    <div class="mt mono">${esc(s.id)} · ${esc(s.ver)}</div>
    <div class="mt">基于岗位要素清单
      <span class="link mono" onclick="event.stopPropagation();ndReset();closeAll();openElements('${s.list}')">${esc(s.list)}</span>
      · ${picks.length} 项</div>
    <div class="mt">PASS ${c.PASS} · 必填 ${c.必填} · 加分 ${c.加分} · 已填标准值 ${stdFilled(s)}/${picks.length}</div>
  </div>`;
}

/* ---------- 第 2 步：看并改 ---------- */
function ndS2(st, s){
  if(!s.id) return `<div class="note w">没有选中标准岗位标准，请回到上一步。</div>`;
  const l = elListOf(s.list), picks = l.picks||[];

  const blocks = F47_L1.map(dom=>{
    const groups = dom.groups.map(g=>{
      const items = picks.map(no=>f47Of(no)).filter(f=>f.l2===g);
      if(!items.length) return '';
      const rows = items.map(f=>{
        const v = st.draft[f.no], base = s.vals ? s.vals[f.no] : null;
        return `<tr>
          <td><span class="fid">${f.no}</span> <b class="sm">${esc(f.name)}</b>
            <div class="t-sub">${esc(f.type)} · ${esc(GATE_OF_LEVEL[f.level]||'')}</div></td>
          <td>${ndEditor(f, v)}</td>
          <td id="ndm-${f.no}" style="min-width:112px">${ndMark(f, base, v)}</td>
        </tr>`;
      }).join('');
      return `<div class="el-grp">
        <div class="el-grp-h"><b>${esc(g)}</b><span class="sm mut">${items.length} 项</span></div>
        <div class="tbl-wrap"><table class="sj-tbl"><tbody>${rows}</tbody></table></div>
      </div>`;
    }).join('');
    if(!groups) return '';
    return `<div class="el-dom">
      <div class="el-dom-h"><span class="el-dom-m">${esc(dom.mark)}</span><b>${esc(dom.name)}</b></div>
      ${groups}</div>`;
  }).join('');

  return `<div class="el-bar" id="ndBar">${ndBarInner(st)}</div>
    <div class="note" style="margin-bottom:12px">左边是<b>要问的字段</b>（来自岗位要素清单），中间是这一单的值。
      改中间只影响这一单 —— 标准岗位标准本身不动，也不会因为这一单去升版。</div>
    ${blocks}`;
}
function ndBarInner(st){
  const s = stdOf(st.sid), l = elListOf(s.list), picks = (l.picks||[]).length;
  const nd = Object.keys(st.dirty).length;
  return `<span class="b ${nd?'w':'g'}">本单调整 ${nd} 项</span>
    <span class="sm mut">基于 ${esc(s.name||'—')} <b class="mono">${esc(s.ver||'')}</b> ·
      清单 <span class="mono">${esc(s.list||'')}</span> · ${picks} 项</span>
    ${nd?'<span class="sm mut">其余项同标准</span>':''}
    <div class="sp"></div>
    <span class="sm mut">改完点下一步，差异会写成这一单的快照</span>`;
}
/* 值与标准值的对照标记 */
function ndMark(f, base, v){
  const same = JSON.stringify(base) === JSON.stringify(v);
  if(same) return `<span class="xs mut">同标准</span>`;
  return `<span class="b a">已改</span> <span class="xs mut">原：${esc(stdVal(f.no, base) || '未定')}</span>`;
}
/* 编辑器：枚举 → select；多选 → 文本域式输入；区间/数字 → input */
function ndEditor(f, v){
  const isEnum = ['枚举','词表'].includes(f.type) && !Array.isArray(v);
  if(isEnum){
    const opts = (f.vals||[]).slice(), cur = v==null?'':String(v);
    if(cur && !opts.includes(cur)) opts.unshift(cur);
    return `<select class="ed-in" onchange="ndSet(${f.no},this.value)">
      <option value="" ${cur?'':'selected'}>— 未定 —</option>
      ${opts.map(o=>`<option value="${esc(o)}" ${o===cur?'selected':''}>${esc(o)}</option>`).join('')}
    </select>`;
  }
  if(Array.isArray(v) || f.type==='多选'){
    const cur = Array.isArray(v) ? v.join(' · ') : (v||'');
    return `<input class="ed-in" value="${esc(cur)}" placeholder="多个值用 · 分隔"
      onchange="ndSet(${f.no}, this.value.split('·').map(x=>x.trim()).filter(Boolean))">`;
  }
  return `<input class="ed-in" value="${esc(v==null?'':v)}" placeholder="填这一单的值"
    onchange="ndSet(${f.no}, this.value)">`;
}

/* ---------- 第 3 步：人 / 时间 / 钱 ---------- */
function ndS3(st, s){
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
      <div class="ndbx"><div class="lab">人</div><div class="val">${esc(st.people||'—')}<small>人</small></div><div class="foot">这一单要几个人</div></div>
      <div class="ndbx"><div class="lab">时间</div><div class="val" style="font-size:15px">${esc(st.deadline||'—')}</div><div class="foot">最迟到岗 · 工期 ${esc(st.term||'—')}</div></div>
      <div class="ndbx"><div class="lab">钱</div><div class="val" style="font-size:15px">${esc(st.price||'—')}</div><div class="foot">工价（元/时）</div></div>
    </div>
    <div class="frow">
      <div class="field"><label>需求人数 <i>*</i></label><input id="ndPeople" type="number" value="${esc(st.people)}" placeholder="20" onchange="ndState().people=this.value"></div>
      <div class="field"><label>工价（元/时）</label><input id="ndPrice" value="${esc(st.price)}" placeholder="26-30" onchange="ndState().price=this.value">
        <div class="hint">${s.id?'标准值：'+esc(stdVal(32, (s.vals||{})[32]) || '未定'):''}</div></div>
    </div>
    <div class="frow">
      <div class="field"><label>最迟到岗 <i>*</i></label><input id="ndDeadline" type="date" value="${esc(st.deadline)}" onchange="ndState().deadline=this.value"></div>
      <div class="field"><label>工期</label><input id="ndTerm" value="${esc(st.term)}" placeholder="例：3 个月 / 长期" onchange="ndState().term=this.value"></div>
    </div>
    <div class="field"><label>工作地点</label><input id="ndCity" value="${esc(st.city)}" placeholder="例：苏州·常熟" onchange="ndState().city=this.value"></div>
    <div class="note">这里填的是<b>这一单的三样东西</b>：几个人、什么时候要到、给多少钱。
      前两步定的标准值不动 —— 同一份标准岗位标准，下一单可以填不同的人数与工价。</div>`;
}

/* ---------- 第 4 步：核对生成 ---------- */
function ndS4(st, s){
  const l = elListOf(s.list), picks = l.picks||[];
  const keys = Object.keys(st.dirty);
  const diffs = keys.length ? keys.map(no=>{
    const f = f47Of(no);
    return `<div class="sm" style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--line2)">
      <span class="b a" style="flex-shrink:0">已改</span>
      <div style="flex:1"><b>${esc(f.name)}</b>
        <div class="xs mut">标准：${esc(stdVal(no,(s.vals||{})[no])||'未定')}　→　本单：${esc(stdVal(no, st.draft[no])||'未定')}</div></div>
    </div>`;
  }).join('') : '<div class="sm mut">没有改动，整单沿用标准值。</div>';

  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
      <div class="ndbx"><div class="lab">标准快照</div><div class="val" style="font-size:15px">${esc(s.ver||'—')}</div><div class="foot">${esc(s.name||'—')}</div></div>
      <div class="ndbx"><div class="lab">本单调整</div><div class="val">${keys.length}<small>项</small></div><div class="foot">其余 ${picks.length-keys.length} 项同标准</div></div>
      <div class="ndbx"><div class="lab">人 · 时间 · 钱</div><div class="val">${esc(st.people||'—')}<small>人</small></div><div class="foot">${esc(st.deadline||'—')} · ${esc(st.price||'待报价')}</div></div>
    </div>
    <div class="sec-t">① 选中的标准岗位标准</div>
    <div class="kv" style="background:#fff;border:1px solid var(--line);border-radius:9px;padding:11px 13px;margin-bottom:12px">
      <div><dt>标准岗位标准</dt><dd>${esc(s.name||'—')} <span class="mono xs mut">${esc(s.id||'')} · ${esc(s.ver||'')}</span></dd></div>
      <div><dt>岗位要素清单</dt><dd class="mono">${esc(s.list||'—')} <span class="xs mut">${picks.length} 项</span></dd></div>
      <div><dt>客户 / 项目</dt><dd>${esc(st.client||'待定')} · ${esc(st.project||'待定')}</dd></div>
      <div><dt>工作地点</dt><dd>${esc(st.city||'待定')}</dd></div>
    </div>
    <div class="sec-t">② 本单调整（${keys.length} 项）</div>
    <div style="background:#fff;border:1px solid var(--line);border-radius:9px;padding:11px 13px;margin-bottom:12px">${diffs}</div>
    <div class="sec-t">③ 人 / 时间 / 钱</div>
    <div style="background:#fff;border:1px solid var(--line);border-radius:9px;padding:11px 13px">
      <div class="sm" style="display:flex;justify-content:space-between"><span class="mut">需求人数</span><b>${esc(st.people||'—')} 人</b></div>
      <div class="sm" style="display:flex;justify-content:space-between;margin-top:6px"><span class="mut">最迟到岗</span><b class="mono">${esc(st.deadline||'—')}</b></div>
      <div class="sm" style="display:flex;justify-content:space-between;margin-top:6px"><span class="mut">工期</span><b>${esc(st.term||'—')}</b></div>
      <div class="sm" style="display:flex;justify-content:space-between;margin-top:6px"><span class="mut">工价</span><b class="mono">${esc(st.price||'待报价')}</b></div>
    </div>
    <div class="note w" style="margin-top:12px"><b>生成后是「待客户确认」。</b>
      确认通过前不会出现在招聘专员的需求列表里。之后标准岗位标准升版，这一单仍按
      <b>${esc(s.ver||'—')}</b> 这一版算，只提示「标准已升版」，历史评分不回溯。</div>`;
}

/* ---------- 生成 ---------- */
/* 条件的否定表达不是值，是「没有要求」：
   标准值里真实存在 26:['无强制证']（SJ-IQC-S2）、14:'无硬性要求'。
   不归一化就会造出一个名叫「无强制证」的必备证书，全员证书项进待确认（AGENTS R5）。 */
const ND_NONE = /^(无|无硬性|无硬性要求|不限|无要求|无证书要求|无强制证|无强制证书|无硬性证书|无需证书|不需要证书|不强制|无夜班)$/;
const ndIsNone = x => {
  const t = String(x == null ? '' : x).trim();
  /* 允许带括号说明：「无强制证（岗前培训即可）」同样是没有要求 */
  return ND_NONE.test(t) || ND_NONE.test(t.replace(/[（(][^()（）]*[)）]/g, '').trim());
};
const ndArr = v => {
  if(Array.isArray(v)) return v.map(x=>String(x).trim()).filter(x=>x && !ndIsNone(x));
  if(!v) return [];
  return String(v).split(/[、,，/;；·\s]+/).map(x=>x.trim()).filter(x=>x && !ndIsNone(x));
};

/* 条件快照：把「选中的标准岗位标准 + 本单调整」落成一份 gate。
   客户只读页与匹配都只读这一份 —— 不生成快照，缺的条件会被当成「无要求」，
   客户看到「—／无硬性要求／不需要夜班」，却不是自己填的那一套。 */
function ndGate(st, s){
  const val = no => {
    const v = st.draft[no];
    if(v === '' || v == null) return (s.vals||{})[no];
    return v;
  };
  const arr = ndArr;
  const raw = no => String(val(no)==null?'':val(no)).trim();

  /* 年龄：'18-45' / '18~40' / '不限' → [18,45] / null（null = 客户未设限，不参与否决）
     标准值里实际写的是 en dash（'18–45'，SJ-IQC-S2 等），只认 ASCII '-' 会把「客户明示上限」
     当成「无限制」，超过上限的人在年龄项被判符合（AGENTS R8）。破折号几种写法都要认。 */
  const ageRaw = raw(10);
  const m = ageRaw.match(/(\d{2})\s*[-–—−－~～至到]\s*(\d{2})/);
  let age = m ? [+m[1], +m[2]] : null;
  if(!age){
    /* 「45 岁以下 / 18 岁以上」也是客户明示条件，不能因为没有区间号就丢掉 */
    const hi = ageRaw.match(/(\d{2})\s*岁?\s*(以下|以内)/);
    const lo = ageRaw.match(/(\d{2})\s*岁?\s*(以上|起)/);
    if(hi) age = [0, +hi[1]];
    else if(lo) age = [+lo[1], 99];
  }

  /* 性别：只有明确「男 / 女」才是硬条件；「男女不限 / 女工优先」按不限处理 */
  const gRaw = raw(11);
  const gender = /^男$/.test(gRaw) ? '男' : /^女$/.test(gRaw) ? '女' : '不限';

  /* 夜班：两班倒 / 三班 / 常夜才需要确认夜班意愿，长白班 / 不限不需要 */
  const night = /两班倒|三班|四班|常夜|夜班/.test(raw(19)) ? '需要' : '不需要';

  /* 证书：**逐张**判断强制属性。
     第 26 项是多选，一段文本里可能既有「低压电工证（不强制）」又有「登高证」；
     按整段文本判断会把整单证书降成加分，连新加的必备证也一起被排除（R5 漏判）。
     这里拆成 cert（证名）+ certOpt（其中标了优先/加分的那几张），
     certMust 保留为兼容字段：全部都是必备时 true。 */
  const certRaw = raw(26);
  const certItems = ndArr(certRaw).map(txt => {
    const opt = /优先|非强制|不强制|加分|非必须/.test(txt);
    const name = String(txt).replace(/[（(][^()（）]*[)）]/g, '').trim() || String(txt).trim();
    return { name, must: !opt };
  });
  const cert = certItems.map(x => x.name);
  const certOpt = certItems.filter(x => !x.must).map(x => x.name);
  const certMust = certItems.length > 0 && certOpt.length === 0;

  return {
    city: st.city || '',
    age, ageRaw, gender, night,
    trade: raw(22) || s.trade || '',
    skill: arr(val(25)),
    cert, certMust, certOpt,
    arriveBy: st.deadline || '',
    /* 快照出处，便于回溯「这个值是从哪份标准、哪一版来的」 */
    from: {stdId:s.id, stdVer:s.ver, list:s.list, at:TODAY},
  };
}

function ndCreate(){
  ndSync();
  const st = ndState(), s = stdOf(st.sid);
  if(!s.id) return toast('还没选标准岗位标准');
  if(!st.people) return toast('还没填需求人数');

  const ov = Object.keys(st.dirty).map(no=>({no:+no, from:(s.vals||{})[no], to:st.draft[no]}));
  const req = [];
  const trade = st.draft[22] || s.trade, grade = st.draft[23] || s.grade;
  req.push(`${trade} · ${grade} · 独立作业`);
  if(Array.isArray(st.draft[25]) && st.draft[25].length) req.push('技能：' + st.draft[25].slice(0,5).join('、'));
  /* 「无强制证」不是证书名，不进需求摘要 */
  const reqCert = ndArr(Array.isArray(st.draft[26]) ? st.draft[26] : (s.vals||{})[26]);
  if(reqCert.length) req.push('证书：' + reqCert.join('、'));
  if(st.draft[29]) req.push(String(st.draft[29]));
  if(st.draft[19]) req.push('班制：' + st.draft[19]);

  const id = 'DX' + (DEMANDS.length + 1);
  DEMANDS.unshift({
    id, code: 'XQ-' + TODAY.replace(/-/g,'') + '-' + String(DEMANDS.length+1).padStart(2,'0'),
    client: st.client || '待定客户', cs: (st.client||'待定').slice(0,2), ps: trade,
    project: st.project || '待定项目', post: s.name, head: +st.people || 0, hired: 0,
    price: st.price || '待报价', city: st.city || '待定',
    deadline: st.deadline, valid: st.deadline + ' ~ 待定', confirm: '待客户确认',
    alloc: '未分配', status: '待客户确认', pinned: false, req,
    owner: S.who || '李文静', isNew: true,
    stdId: s.id, stdVer: s.ver, stdList: s.list, stdOverride: ov
  });
  ndReset();
  closeAll();
  /* v1.2：新需求=待客户确认，先立版本、再发受控只读链接；未确认前不生效
     条件快照必须当场生成：客户只读页、审核后的匹配读的都是这一份 */
  const gate = ndGate(st, s);
  DEMAND_GATE[id] = Object.assign({}, gate, {skill:gate.skill.slice(), cert:gate.cert.slice()});
  DEMAND_VERS[id] = [{v:'v1.0', status:'待客户确认', at:'2026-11-14 08:20',
    by:(S.who||'李文静')+'（代客户登记）', way:'链接已发出', n:47, note:'新建需求，客户尚未反馈', changes:[],
    audits:[], gate:Object.assign({}, gate, {skill:gate.skill.slice(), cert:gate.cert.slice()})}];
  MATCH_STAMP[id] = {ver:'—', at:'2026-11-14 08:20', stale:true};
  const tok = genLink(id, 'v1.0', S.who||'李文静');
  toast(`需求已生成：${s.name} · ${st.people} 人 · 标准 ${s.ver}${ov.length?' · 本单调整 '+ov.length+' 项':''} · 待客户确认 · 链接 ${tok}`);
  go('demands');
}

/* ---------- 需求详情里的「标准快照」段 ---------- */
function stdSection(d, bare){
  const s = stdOf(d.stdId) || {};
  const ov = d.stdOverride || [];
  const l = elListOf(d.stdList || s.list), picks = (l.picks||[]).length;
  const stale = s.ver && d.stdVer && s.ver !== d.stdVer;
  const inner = `<div style="background:#fff;border:1px solid var(--line);border-radius:9px;padding:12px 14px">
      <div class="sm"><b>${esc(s.name || d.post)}</b>
        <span class="mono xs mut">${esc(d.stdId||'')} · 本单用 ${esc(d.stdVer||'—')}</span></div>
      <div class="xs mut" style="margin-top:3px">基于岗位要素清单 <span class="mono">${esc(d.stdList||'')}</span> · ${picks} 项</div>
      ${stale? `<div class="note w" style="margin-top:8px">标准已升版到 <b>${esc(s.ver)}</b>，本单仍按 ${esc(d.stdVer)} 算 —— 历史评分不回溯。</div>`:''}
      <div style="margin-top:9px">
        <div class="xs mut" style="margin-bottom:4px">本单调整 ${ov.length} 项${ov.length?'，其余同标准':'，整单沿用标准值'}</div>
        ${ov.map(o=>`<div class="sm" style="padding:5px 0;border-bottom:1px solid var(--line2)">
          <span class="b a">已改</span> <b>${esc(f47Of(o.no).name)}</b>
          <span class="xs mut">　${esc(stdVal(o.no,o.from)||'未定')} → ${esc(stdVal(o.no,o.to)||'未定')}</span></div>`).join('')}
      </div>
    </div>`;
  return bare ? inner : `<div class="sec"><div class="sec-t">标准岗位标准（本单快照）</div>${inner}</div>`;
}
