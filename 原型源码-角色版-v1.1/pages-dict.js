/* =============================================================
   R01 · 数据字典 —— 一张表的增删改查
   -------------------------------------------------------------
   一行 = 一个字段的可选值集合。全站下拉框都从这张表取值。
   页面只有：搜索 + 用处筛选 + 表格 + 编辑抽屉 + 新增。
   ============================================================= */

function r01Dicts(){
  const q = (S.f.q||'').trim().toLowerCase();
  const sc = S.f.dsc || '';

  let list = DICT_ITEMS.slice();
  if(sc) list = list.filter(x=>x.scope===sc);
  if(q) list = list.filter(x=>(x.code+' '+x.name+' '+x.options.join(' ')).toLowerCase().includes(q));

  const rows = list.map((d,i)=>`<tr class="clk" onclick="ddEdit('${d.code}')">
    <td class="sm mut mono">${DICT_ITEMS.indexOf(d)+1}</td>
    <td><div class="t-name">${esc(d.name)}</div><div class="t-sub mono">${esc(d.code)}</div></td>
    <td><span class="tg" style="padding:2px 7px;font-size:13px">${esc(d.type)}</span></td>
    <td>${ddVals(d)}</td>
    <td><span class="b ${DD_SCOPE[d.scope].tone}">${esc(DD_SCOPE[d.scope].name)}</span></td>
    <td onclick="event.stopPropagation()"><div class="acts">
      <span class="link" onclick="ddEdit('${d.code}')">编辑</span>
      <span class="link mut" onclick="ddDel('${d.code}')">删除</span>
    </div></td>
  </tr>`).join('');

  return `<div class="page">
    ${head('数据字典', `全站下拉框的取值都来自这一张表。一行 = 一个字段 + 一组可选值，人工提前建好，业务里只选不填。`,
      `<button class="btn" onclick="ddSchema()">表结构</button>
       <button class="btn" onclick="toast('已导出 CSV')">导出</button>
       <button class="btn pri" onclick="ddNew()">＋ 新增字段</button>`)}

    <div class="toolbar">
      <div class="search"><span>⌕</span><input id="q" placeholder="搜字段名 / 编码 / 选项" value="${esc(S.f.q||'')}" oninput="setQ(this.value)"></div>
      <div class="chips">
        <span class="chip ${sc===''?'on':''}" onclick="setF('dsc','')">全部 ${DICT_ITEMS.length}</span>
        ${Object.keys(DD_SCOPE).filter(k=>DICT_ITEMS.some(x=>x.scope===k)).map(k=>
          `<span class="chip ${sc===k?'on':''}" onclick="setF('dsc','${k}')">${esc(DD_SCOPE[k].name)} ${DICT_ITEMS.filter(x=>x.scope===k).length}</span>`).join('')}
      </div>
      <div class="sp"></div>
      <span class="sm mut">${list.length} 个字段</span>
    </div>

    <div class="tbl-wrap"><table>
      <thead><tr><th style="width:44px">#</th><th>字段</th><th style="width:80px">类型</th><th>可选值</th><th style="width:70px">用处</th><th style="width:110px">操作</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="empty">没有匹配的字段</td></tr>'}</tbody></table></div>
  </div>`;
}

/* 可选值展示：几项就给几个标签，超过 5 个折叠 */
function ddVals(d){
  if(d.type==='数字') return '<span class="sm mut">—  填数字，无需选项</span>';
  if(d.type==='文本') return '<span class="sm mut">—  自由填写</span>';
  if(d.type==='区间'){
    return `<b class="sm mono">${esc(d.options[0]||'')}</b>`
      + (d.options.length>1?`<div class="t-sub">常用档：${esc(d.options.slice(1,4).join(' / '))}</div>`:'');
  }
  const show = d.options.slice(0,5);
  return `<div class="tags">${show.map(v=>`<span class="tg" style="padding:2px 7px;font-size:13px">${esc(v)}</span>`).join('')}
    ${d.options.length>5?`<span class="tg" style="padding:2px 7px;font-size:13px;color:var(--accent);border-color:var(--accent-line)">+${d.options.length-5}</span>`:''}</div>`;
}

/* ---------------- 编辑抽屉 ---------------- */
function ddEdit(code){
  const d = ddOf(code);
  if(!d.code) return toast('字典项不存在');
  window.__DD__ = { mode:'edit', code, draft:JSON.parse(JSON.stringify(d)) };
  ddPaint();
}
function ddNew(){
  window.__DD__ = { mode:'new', code:null, draft:{ code:'', name:'', type:'单选', scope:'job', options:[], note:'' } };
  ddPaint();
}
function ddPaint(){
  const w = window.__DD__, d = w.draft;
  openDrawer(`<div class="dr-h"><div><h3>${w.mode==='new'?'新增字段':'编辑 · '+esc(d.name)}</h3>
      <div class="sub">${w.mode==='new'?'建一个字段，填上它能选的值':'改完保存，全站下拉框立刻跟着变'}</div></div>
      <button class="dr-x" onclick="closeAll()">×</button></div>
    <div class="dr-b">
      <div class="frow">
        <div class="field"><label>字段名<i>*</i></label>
          <input id="ddName" value="${esc(d.name)}" placeholder="例：性别" oninput="ddSet('name',this.value)"></div>
        <div class="field"><label>编码<i>*</i></label>
          <input id="ddCode" class="mono" value="${esc(d.code)}" placeholder="例：SEX" ${w.mode==='new'?'':'disabled'} oninput="ddSet('code',this.value)"></div>
      </div>
      <div class="frow">
        <div class="field"><label>类型</label>
          <select onchange="ddSet('type',this.value)">
            ${DD_TYPE.map(t=>`<option ${d.type===t?'selected':''}>${t}</option>`).join('')}
          </select></div>
        <div class="field"><label>用处</label>
          <select onchange="ddSet('scope',this.value)">
            ${Object.keys(DD_SCOPE).map(k=>`<option value="${k}" ${d.scope===k?'selected':''}>${esc(DD_SCOPE[k].name)}</option>`).join('')}
          </select></div>
      </div>
      <div class="field"><label>可选值 · 一行一个<i>*</i></label>
        <textarea class="dd-ta" placeholder="男&#10;女&#10;男女不限" oninput="ddSet('options',this.value)">${esc(d.options.join('\n'))}</textarea>
        <div class="hint">${d.type==='区间'?'区间类第一行写范围（20-80 元/时），后面几行写常用档':d.type==='数字'||d.type==='文本'?'这两类不需要选项，留空即可':'保存后按这里的顺序出现在下拉框里'}</div></div>
      <div class="field"><label>说明</label>
        <input value="${esc(d.note||'')}" placeholder="可选，写一句口径" oninput="ddSet('note',this.value)"></div>
      ${w.mode==='edit'?`<div class="note w"><b>改值的影响。</b>已被需求引用的字段，删掉某个选项后历史需求仍保留原值，只在下拉框里不再出现。</div>`:''}
    </div>
    <div class="dr-f">
      <button class="btn" onclick="closeAll()">取消</button>
      <button class="btn pri" onclick="ddSave()">保存</button>
    </div>`);
}
function ddSet(k, v){
  const d = window.__DD__.draft;
  if(k==='options') d.options = String(v).split('\n').map(x=>x.trim()).filter(Boolean);
  else d[k] = v;
}
function ddSave(){
  const w = window.__DD__, d = w.draft;
  if(!d.name.trim()) return toast('字段名不能为空');
  if(!d.code.trim()) return toast('编码不能为空');
  if(w.mode==='new' && ddOf(d.code.trim()).code) return toast('编码已存在：'+d.code);

  const val = { code:d.code.trim(), name:d.name.trim(), type:d.type, scope:d.scope,
    options:d.options.slice(), note:(d.note||'').trim() };

  if(w.mode==='new'){ DICT_ITEMS.push(val); toast('已新增 '+val.name); }
  else {
    const i = DICT_ITEMS.findIndex(x=>x.code===w.code);
    if(i>=0) DICT_ITEMS[i] = val;
    toast('已保存 '+val.name);
  }
  window.__DD__ = null;
  closeAll();
  render();
}
function ddDel(code){
  const d = ddOf(code);
  if(!d.code) return;
  openModal(`<div class="md-h"><div><h3>删除字典项</h3>
      <p>确定删掉「${esc(d.name)}」吗？删了下拉框里就没有这个字段了</p></div>
      <button class="dr-x" onclick="closeAll()">×</button></div>
    <div class="md-b"><div class="note w"><b>${esc(d.code)}</b> · ${esc(d.type)} · ${d.options.length} 个可选值</div>
      <div class="t-sub" style="margin-top:8px">已经用它填过的需求单不会被清空，只是以后不能再选。</div></div>
    <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
      <button class="btn pri" onclick="ddDelDo('${d.code}')">确认删除</button></div>`);
}
function ddDelDo(code){
  const i = DICT_ITEMS.findIndex(x=>x.code===code);
  if(i>=0){ const n = DICT_ITEMS[i].name; DICT_ITEMS.splice(i,1); toast('已删除 '+n); }
  closeAll(); render();
}

/* ---------------- 表结构 ---------------- */
function ddSchema(){
  const fields = [
    ['id','bigint · 自增','主键'],
    ['code','varchar(32) · 唯一','字段编码，如 SEX / AGE / TRADE'],
    ['name','varchar(64)','字段名，如 性别 / 年龄区间'],
    ['type','varchar(16)','单选 · 多选 · 区间 · 词表 · 数字 · 文本'],
    ['options','json',"可选值，如 [\"男\",\"女\",\"男女不限\"]"],
    ['scope','varchar(16)','用处：job 岗位 / client 客户 / order 需求'],
    ['sort','int','下拉框里的排序'],
    ['status','tinyint','1 启用 · 0 停用'],
  ];
  const sql = `CREATE TABLE dict_item (
  id       bigint       PRIMARY KEY AUTO_INCREMENT,
  code     varchar(32)  NOT NULL UNIQUE COMMENT '字段编码',
  name     varchar(64)  NOT NULL        COMMENT '字段名',
  type     varchar(16)  NOT NULL        COMMENT '单选/多选/区间/词表/数字/文本',
  options  json                         COMMENT '可选值数组',
  scope    varchar(16)  NOT NULL        COMMENT 'job/client/order',
  sort     int          DEFAULT 0,
  status   tinyint      DEFAULT 1,
  KEY idx_scope (scope)
) COMMENT '数据字典：一行一个字段的取值集合';`;

  openModal(`<div class="md-h"><div><h3>这张表在数据库里长这样</h3>
      <p>dict_item · 全站下拉框只读这一张表</p></div>
      <button class="dr-x" onclick="closeAll()">×</button></div>
    <div class="md-b">
      <div class="tbl-wrap"><table><thead><tr><th>字段</th><th>类型</th><th>说明</th></tr></thead>
        <tbody>${fields.map(f=>`<tr><td class="mono sm">${f[0]}</td><td class="sm mut">${f[1]}</td><td class="sm">${esc(f[2])}</td></tr>`).join('')}</tbody>
      </table></div>
      <div style="margin-top:12px;font-family:var(--mono);font-size:13px;white-space:pre;overflow:auto;background:var(--bg2);border:1px solid var(--line2);border-radius:8px;padding:12px;line-height:1.75">${esc(sql)}</div>
      <div class="note i" style="margin-top:12px">
        <b>一个字段一行，值放 json。</b>选项少、改动少，不值得为值单开一张子表；
        真要拆就拆成 <span class="mono">dict_option(dict_id, value, sort)</span>，页面上其他都不变。
      </div>
    </div>
    <div class="md-f"><button class="btn" onclick="closeAll()">关闭</button>
      <button class="btn pri" onclick="toast('建表语句已复制')">复制建表语句</button></div>`, 'md-lg');
}

PAGES.dicts = {R01:r01Dicts};
