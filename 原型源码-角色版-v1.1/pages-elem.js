/* =============================================================
   R01 · 要素清单（ElementList）—— 标准岗位标准下的「字段配置」
   -------------------------------------------------------------
   一份清单 = 一个工种 × 一个等级「要问哪些字段」。
   只记字段号，不存任何值 —— 值在「标准岗位标准」上填。

   注意：清单不再有独立菜单入口。
   因为一份清单就是一个标准岗位标准的字段骨架，列表页即「标准岗位标准」（pages-std.js）。
   这里只在标准岗位标准详情里点「基于清单」时进入，配置这一份清单勾哪些字段。
   ============================================================= */

function r01Elements(){
  const sid = S.f.el;
  /* 没有选中清单 → 回标准岗位标准列表，不再单独出一份清单列表 */
  if(!sid) return sjListPage();
  const s = elListOf(sid);
  if(!s.id){ S.f.el = null; return sjListPage(); }
  if(!window.__EL__ || window.__EL__.sid!==sid) elInit(sid);
  return elBody(s, window.__EL__);
}

/* ---------------- 编辑态 ---------------- */
function openElements(sid){
  S.page = 'elements';
  S.f.el = sid;
  S.f.sj = null;
  window.__EL__ = null;
  window.__SJ__ = null;
  closeAll();
  render();
}
function elBack(){ window.__EL__ = null; S.f.el = null; go('std'); }
function elInit(sid){
  const s = elListOf(sid);
  window.__EL__ = { sid, picks:s.picks.slice(), draft:s.picks.slice(), q:'', dirty:false };
}
function elPaint(){
  const m = document.getElementById('main');
  if(!m) return render();
  m.innerHTML = r01Elements();
}
function elQ(v){ window.__EL__.q = v; elPaint(); }
/* 勾 / 取消一个字段 */
function elTog(no){
  const d = window.__EL__;
  const i = d.draft.indexOf(no);
  if(i>=0) d.draft.splice(i,1); else d.draft.push(no);
  d.dirty = d.draft.slice().sort().join() !== d.picks.slice().sort().join();
  elPaint();
}
/* 整组全选 / 全不选 */
function elGroup(l2, on){
  const d = window.__EL__;
  const nos = F47_JOB.filter(x=>x.l2===l2).map(x=>x.no);
  if(on){ nos.forEach(n=>{ if(!d.draft.includes(n)) d.draft.push(n); }); }
  else { d.draft = d.draft.filter(n=>!nos.includes(n)); }
  d.dirty = d.draft.slice().sort().join() !== d.picks.slice().sort().join();
  elPaint();
}
function elCancel(){ const d = window.__EL__; d.draft = d.picks.slice(); d.dirty = false; elPaint(); }
function elSave(){
  const d = window.__EL__, s = elListOf(d.sid);
  s.picks = d.draft.slice();
  s.ver = bumpVer(s.ver);
  s.updated = '11-13';
  d.picks = d.draft.slice(); d.dirty = false;
  toast(`已保存为 ${s.ver} · 引用它的 ${listUsedBy(s.id)} 个标准岗位标准不回溯，旧评分失效`);
  elPaint();
}
function elNew(){ toast('新建标准岗位标准时一并建清单 —— 先选工种与等级，再从 47 项里框字段'); }

/* ---------------- 详情：只勾字段，不填值 ---------------- */
function elBody(s, d){
  const q = (d.q||'').trim().toLowerCase();
  const dirty = d.dirty;
  const users = stdsOfList(s.id);

  /* 按 6 个域 → 21 个组渲染，每组只列岗位级字段 */
  const blocks = F47_L1.map(dom=>{
    const groups = dom.groups.map(g=>{
      const items = F47_JOB.filter(f=>f.l2===g);
      if(!items.length) return '';
      const inGroup = items.filter(f=>!q || (f.name+f.vals.join('')).toLowerCase().includes(q));
      if(!inGroup.length) return '';
      const pickedN = items.filter(f=>d.draft.includes(f.no)).length;
      const all = pickedN===items.length;
      return `<div class="el-grp">
        <div class="el-grp-h">
          <b>${esc(g)}</b>
          <span class="sm mut">${pickedN}/${items.length}</span>
          <div class="sp"></div>
          <span class="el-grp-a" onclick="elGroup('${esc(g)}',${all?'0':'1'})">${all?'全不选':'全选'}</span>
        </div>
        <div class="el-fields">${inGroup.map(f=>{
          const on = d.draft.includes(f.no);
          return `<label class="el-f${on?' on':''}" onclick="elTog(${f.no})">
            <span class="el-no">${f.no}</span>
            <span class="el-fn">${esc(f.name)}</span>
            <span class="el-meta">${esc(GATE_OF_LEVEL[f.level]||'')} · ${esc(f.type)}</span>
          </label>`;
        }).join('')}</div>
      </div>`;
    }).join('');
    if(!groups) return '';
    const domN = F47_JOB.filter(f=>f.l1===dom.id).length;
    const domP = F47_JOB.filter(f=>f.l1===dom.id && d.draft.includes(f.no)).length;
    return `<div class="el-dom">
      <div class="el-dom-h"><span class="el-dom-m">${esc(dom.mark)}</span>
        <b>${esc(dom.name)}</b><span class="sm mut">${domP}/${domN}</span></div>
      ${groups}
    </div>`;
  }).join('');

  return `<div class="page">
    <div class="crumb"><span class="link" onclick="elBack()">← 标准岗位标准</span><span class="mut">/</span>
      <span class="link" onclick="openStd('${users[0]?users[0].id:''}')">${esc(users[0]?users[0].name:'标准岗位标准')}</span><span class="mut">/</span>
      <b>要素清单</b></div>
    ${head('要素清单 · '+esc(s.name),
      xpl('勾的就是这个标准岗位标准要问的字段。<b>这里没有值</b> —— 要问几档、什么范围，全在标准岗位标准上填。',
        esc(s.note||'')) + ` <span class="mono xs mut">${esc(s.id)} · ${esc(s.ver)} · ${esc(s.status)}</span>`,
      `<button class="btn" onclick="elCancel()" ${dirty?'':'disabled'}>放弃</button>
       <button class="btn pri" onclick="elSave()">保存为 ${esc(bumpVer(s.ver))}</button>`)}

    <div class="el-bar">
      <span class="b ${d.draft.length?'g':'n'}">已选 ${d.draft.length} / ${F47_JOB.length} 个岗位级字段</span>
      <span class="sm mut">一级 = PASS 硬门槛 · 二级 = 必填 · 三级 = 加分</span>
      ${dirty?'<span class="b a">有未保存改动</span>':''}
      <div class="sp"></div>
      <div class="search" style="width:200px"><span>⌕</span>
        <input placeholder="搜字段" value="${esc(d.q||'')}" oninput="elQ(this.value)"></div>
    </div>

    ${blocks || '<div class="tbl-wrap"><div class="empty">没有匹配的字段</div></div>'}

    <div class="note i" style="margin-top:14px">
      <b>为什么清单里不放值。</b>同一份「装配电工 大工」清单，兴禾要两班倒、思锐要长白班洁净区 —— 如果值写进清单，就得给每家客户各建一份清单，
      清单很快会变成几十份、没人维护。值放到标准岗位标准，清单只留一份。
      ${users.length>1?`<br>现在这份清单被 <b>${users.length}</b> 个标准岗位标准引用：${users.map(u=>esc(u.name)).join(' / ')}。`:''}
    </div>
    <div class="note w" style="margin-top:10px">
      <b>改这里会发生什么。</b>保存后清单版本 +1，引用它的 ${listUsedBy(s.id)} 个标准岗位标准会提示"基于旧版清单"；
      已发出的客户确认单<b>不回溯</b>，仍按当时那一版判定。
    </div>
  </div>`;
}

PAGES.elements = {R01:r01Elements};
