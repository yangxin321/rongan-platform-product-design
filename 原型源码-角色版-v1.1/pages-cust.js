/* ===== 客户需求确认（V16–V22）=====
   把「客户嘴里的话」变成「能进系统的结构化要求」。
   链路顺序固定：先收话 → 再成单 → 后建需求（不能反）。
*/

/* 「AI 解析」用的第二段示例：演示增量合并（同一条覆盖、新条追加、已 ✔ 的不许被冲掉） */
const PARSE_MORE = {
  '江南造船': {
    at:'11-13 15:32', src:'微信',
    txt:'还有个事，超龄的也能商量，干得动就行，五十几岁的我们也用过。学历不看。',
    items:[
      { dim:'条件', k:'年龄', v:'"干得动就行"（不可判定）', st:'vague', req:true,
        std:'年龄 = 区间（高危项）', raw:'干得动就行，五十几岁的我们也用过',
        q:'"干得动"我们没法判定 —— 定成 18–50 岁可以吗？' },
      { dim:'条件', k:'学历', v:'不限', st:'ok', req:false,
        std:'学历 = 不限', raw:'学历不看', q:'' },
    ],
  },
  '立讯精密': {
    at:'11-13 11:52', src:'微信',
    txt:'工价按 34 到 40 走吧，班次跟着客户产线，两班倒居多。',
    items:[
      { dim:'条件', k:'工价', v:'34–40 元/时', st:'ok', req:true,
        std:'工价 = 34–40 元/时', raw:'工价按 34 到 40 走吧', q:'' },
      { dim:'条件', k:'班次', v:'跟随客户产线，两班倒居多', st:'ok', req:true,
        std:'班次 = 两班倒', raw:'跟着客户产线，两班倒居多', q:'' },
    ],
  },
};

/* ===== 客户需求确认 · 列表页 + 原话独立页（v1.3 · RG-012 · 2026-11-15）=====
   以前是「左栏贴原话 + 右栏按维度纵向分组的解析卡片墙 + 顶部四张统计卡」。
   客户的一句话被拆成十几张卡，扫不动、也没法按「还缺什么」排序。
   现在：
     列表 #custreq            一条需求项一行：需求项 / 客户原话摘要 / 整理后的条件 / 待确认内容 / 确认状态 / 操作
     原文 #custreq/<id>/raw   某个需求项的原文与对应关系；多段原话按「时间 / 渠道 / 记录人 / 原文」列表；录入原话也收在这里
   四态（明确 / 缺值 / 模糊 / 未提）沿用原有语义，只换表达，不改规则。
   原话段落与需求项的对应关系只认字面包含，认不出的标「待关联」，不编造。 */

const CR = { cid:null, item:'', back:null };

function custById(id){ return Object.keys(CUST_FACTORS).map(k=>CUST_FACTORS[k]).find(c=>c.id===id) || null; }
function custRank(it){ return it.st==='none' ? (it.req?0:3) : it.st==='vague' ? 1 : it.st==='miss' ? 2 : 9; }

/* 进入某个需求项的原文页 */
function openCustRaw(cid, item){
  const from = S.page;
  markScrollOut();                  /* 先记住列表滚到哪了，render 之后就是 0 了 */
  /* 浏览器后退回列表时 CR.cid 还留着，只比 ID 的话第二次进来会沿用第一次的筛选与滚动 */
  if(CR.cid !== cid || from !== 'custreqRaw') CR.back = snapshotHere();
  CR.cid = cid; CR.item = item || '';
  S.page = 'custreqRaw';
  closeAll(); render(); setMainScroll(0);
  navHash(routeHash(), 'push');
}
/* 原文页返回：回到进来时的列表并还原客户与筛选 */
function crBack(){
  const b = CR.back;
  CR.cid = null; CR.item = ''; CR.back = null;
  if(b && b.page && b.page !== 'custreqRaw' && restoreSnap(b)){
    render(); setMainScroll(b.scroll || 0);
    navHash(routeHash(), 'replace');
    return;
  }
  go('custreq');
}

/* ---------- 列表 ---------- */
function r0xCustReq(){
  const name = S.f.cust || CUSTS[0];
  const c = custOf(name);
  const st = custStat(c);
  const ST = CUST_ST;

  const q = (S.f.q||'').trim(), cst = S.f.cst || '', creq = S.f.creq || '';
  let items = c.items.slice().sort((a,b)=>custRank(a)-custRank(b));   /* 没定的排前面 */
  if(q) items = items.filter(i=>(i.k+i.dim+i.std+i.v+(i.q||'')).includes(q));
  if(cst) items = items.filter(i=>i.st===cst);
  if(creq) items = items.filter(i=>i.req && i.st!=='ok');

  const brief = t => !t ? '' : (t.length > 22 ? t.slice(0,22) + '…' : t);
  const rows = items.map(i=>{
    const s = ST[i.st];
    return `<tr>
      <td><div class="t-name"><b>${esc(i.k)}</b>${i.req?'<span class="b r" style="margin-left:6px">必填</span>':''}</div>
        <div class="t-sub">${esc(i.dim)}</div></td>
      <td class="sm">${i.raw
        ? `<span title="${esc(i.raw)}">${esc(brief(i.raw))}</span>`
        : '<span class="mut">未提 · 客户没说过</span>'}</td>
      <td class="sm">${esc(i.std)}${i.std2?' <span class="b g">已标准化</span>':''}</td>
      <td class="sm">${esc(i.q||'—')}</td>
      <td><span class="stb ${s.c}">${s.i} ${s.n}</span></td>
      <td><div class="acts">
        <span class="link" onclick="openCustRaw('${esc(c.id)}','${esc(i.k)}')">查看原文</span>
        ${i.st!=='ok'?`<span class="link" onclick="custScript('${esc(name)}')">问客户</span>`:''}
      </div></td>
    </tr>`;
  }).join('');

  return `<div class="page">
    ${head('客户需求确认',
      `放在 ${esc(c.customer)} 名下 · 先收话 → 再成单 → 后建需求 · 客户说的是方言，系统要的是普通话`,
      `<button class="btn" onclick="custScript('${esc(name)}')">生成问客户的话术</button>
       <button class="btn" onclick="openCustRaw('${esc(c.id)}','')">＋ 贴客户原话</button>
       <button class="btn pri" onclick="custToDemand('${esc(name)}')">建需求</button>`)}
    ${toolbar({
      q:'搜索需求项 / 原话 / 条件',
      filters:[
        {k:'cst',opts:[{v:'',label:'全部状态'},{v:'ok',label:'明确'},{v:'miss',label:'缺值'},{v:'vague',label:'模糊'},{v:'none',label:'未提'}]},
        {k:'creq',opts:[{v:'',label:'全部条目'},{v:'req',label:'只看必填待补'}]},
      ],
      chips:CUSTS.map(n=>{ const x = custStat(custOf(n));
        return {k:'cust', v:n, label:`${n} · ${x.ok}/${x.total} 明确`}; }),
      right:`<span class="sm mut">共 ${items.length} 项 · 明确 ${st.ok} · 必填待补 ${st.blocked}</span>`
    })}
    <div class="tbl-wrap"><table>
      <thead><tr><th style="width:170px">需求项</th><th>客户原话摘要</th><th>整理后的条件</th><th>待确认内容</th><th style="width:96px">确认状态</th><th style="width:150px">操作</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="empty">当前筛选下没有需求项</td></tr>'}</tbody></table></div>
    ${pager(items.length)}
    <div class="note" style="margin-top:12px">
      <b>四态怎么读：</b>明确＝有值可直接落库 · 缺值＝知道要什么不知道多少 · 模糊＝不可判定词（"熟练""踏实""能吃苦"）· 未提＝必填项压根没问。
      原话<b>永久保留</b>，标「证据 · 不参与评分」；90 天可归档不可删 —— 出纠纷时这是唯一凭据。
      <b>挂客户，不挂项目</b>：一个客户的用人习惯跨项目一致。
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn" onclick="custPromote('${esc(name)}')">把明确项提升为标准口径</button>
      <button class="btn" onclick="custToConfirm('${esc(name)}')">生成确认单（打印用）</button>
    </div>
  </div>`;
}

function setCust(n){ S.f.cust = n; refreshTable(); }

/* ---------- 原话独立页 ---------- */
function custRawPage(){
  const c = custById(CR.cid);
  if(!c) return `<div class="page">
    <div class="pg-back" onclick="go('custreq')">← 返回客户需求确认</div>
    ${head('找不到这条客户需求','地址指向的客户因子不在当前演示数据里')}
    <div class="note w">客户因子 <span class="mono">${esc(CR.cid||'—')}</span> 没有匹配到记录。演示数据存在内存里，刷新后会回到初始状态。
      系统不会自动跳到别的客户需求上。</div>
    <div style="margin-top:12px"><button class="btn pri" onclick="go('custreq')">返回客户需求确认</button></div>
  </div>`;

  const ST = CUST_ST;
  const item = CR.item ? c.items.find(x=>x.k===CR.item) : null;
  const segs = c.segs.map(s=>{
    /* 只认字面：原话被整段包含才算对应，认不出就是「待关联」 */
    const hit = !!(item && item.raw && s.txt.includes(item.raw));
    let tag;
    if(!item) tag = '<span class="mut sm">—</span>';
    else if(hit) tag = '<span class="b g">对应本项</span>';
    else if(!item.raw) tag = '<span class="b w">该项未提 · 无原文</span>';
    else tag = '<span class="b w">待关联</span>';
    return `<tr>
      <td class="mono sm">${esc(s.at)}</td>
      <td><span class="b n">${esc(s.src)}</span></td>
      <td class="sm">${esc(c.owner)}<div class="t-sub">我方登记</div></td>
      <td class="sm" style="line-height:1.7">${esc(s.txt)}</td>
      <td>${tag}</td>
    </tr>`;
  }).join('');

  const headBlock = item ? (()=>{
    const s = ST[item.st];
    return `<div class="sec" style="padding-top:0"><div class="sec-t">这一项 · ${esc(item.k)}
        <span class="stb ${s.c}" style="margin-left:6px">${s.i} ${s.n}</span>
        ${item.req?'<span class="b r" style="margin-left:6px">必填</span>':''}</div>
      <dl class="kv">
        <div><dt>维度</dt><dd>${esc(item.dim)}</dd></div>
        <div><dt>客户说的</dt><dd class="sm">${esc(item.v)}</dd></div>
        <div><dt>整理后的条件</dt><dd class="sm">${esc(item.std)}${item.std2?' <span class="b g">已标准化</span>':''}</dd></div>
        <div><dt>还要问什么</dt><dd class="sm">${esc(item.q||'—')}</dd></div>
      </dl>
      ${item.raw?`<div class="note" style="margin-top:9px">原话：「${esc(item.raw)}」 <span class="xs mut">（证据 · 不参与评分）</span></div>`
        :`<div class="note w" style="margin-top:9px">这一项客户没提过，没有原文可看；下面列的是该客户所有原话段，供你判断要不要补问。</div>`}
    </div>`;
  })() : `<div class="note i" style="margin-top:0">下面是 ${esc(c.customer)} 的全部原话段，按发生时间列出。从列表点「查看原文」可只看某一项。</div>`;

  return `<div class="page">
    <div class="pg-back" onclick="crBack()">← 返回客户需求确认</div>
    ${head(item ? ('客户原话 · ' + esc(item.k)) : '客户原话',
      `${esc(c.customer)} · ${esc(c.project)} · ${esc(c.post)} · 客户因子 <span class="mono">${esc(c.id)}</span>`,
      `<button class="btn" onclick="custScript('${esc(c.customer)}')">生成问客户的话术</button>`)}
    ${headBlock}

    <div class="sec"><div class="sec-t">原话段（${c.segs.length} 段 · 不覆盖、不删除）</div>
      <div class="tbl-wrap"><table>
        <thead><tr><th style="width:104px">时间</th><th style="width:76px">渠道</th><th style="width:104px">记录人</th><th>原文</th><th style="width:132px">与本项关系</th></tr></thead>
        <tbody>${segs || '<tr><td colspan="5" class="empty">还没有原话，下面可以贴第一段</td></tr>'}</tbody></table></div>
      <div class="note" style="margin-top:10px">「对应本项」只按字面判断：原话里完整出现了这一项的原话才算。判断不了的标「待关联」，不硬凑。</div>
    </div>

    <div class="sec"><div class="sec-t">录入新的一段原话</div>
      <div class="cc-card">
        <textarea class="cc-ta" placeholder="把客户说的话原样贴进来，一段会话说一次。不要自己先整理 —— 整理过的话，就查不出「哪些没问到」了。"></textarea>
        <div class="cc-row">
          <select class="sel" style="height:30px"><option>微信</option><option>电话</option><option>会议</option><option>语音转写</option></select>
          <button class="btn sm" onclick="custParse('${esc(c.customer)}')">AI 解析这一段</button>
          <span class="sm mut">解析结果并回列表：同一条覆盖、新条追加、已明确的不会被冲掉</span>
        </div>
      </div>
    </div>
  </div>`;
}

/* 增量合并：同一条覆盖、新条追加、已 ✔ 的不许被冲掉（V19） */
function custParse(name){
  const c = custOf(name);
  const more = PARSE_MORE[name];
  if(!more){ toast('这一段没解析出内容'); return; }
  if(c.segs.some(s=>s.at===more.at)){ toast('这一段已经解析过了'); return; }
  c.segs.push({ at:more.at, src:more.src, txt:more.txt });
  let cover = 0, add = 0, keep = 0;
  more.items.forEach(ni=>{
    const old = c.items.find(x=>x.k===ni.k);
    if(!old){ c.items.push(ni); add++; }
    else if(old.st==='ok'){ keep++; }            /* 已明确的绝不被覆盖 */
    else {
      old.v = ni.v; old.st = ni.st; old.raw = ni.raw; old.std = ni.std; old.q = ni.q;
      old.fill = (old.fill||1)+1;                 /* 第 2 次补填留痕 */
      cover++;
    }
  });
  c.upd = '11-13 15:32';
  refreshTable();
  toast(`已合并第 ${c.segs.length} 段：覆盖 ${cover} 项、新增 ${add} 项、已明确的 ${keep} 项未被覆盖`);
}

/* 一键生成问客户的话术（V18）—— 不留话术，运营还得自己想怎么问 */
function custScript(name){
  const c = custOf(name), gaps = custGaps(c), st = custStat(c);
  const lines = gaps.map((g,i)=>{
    const tag = g.st==='none' ? '还没提到' : g.st==='vague' ? '说法判不了' : '缺具体数字';
    return `${i+1}. ${g.k}（${tag}）：${g.q||'您这边具体是什么要求？'}`;
  }).join('\n');
  const head = `${c.customer} · ${c.post} 这一单，还有 ${gaps.length} 项想跟您对一下：`;
  const tail = `\n\n这些定下来我这边就能出确认单，工价按 ${(c.items.find(x=>x.k==='工价')||{}).v||'谈好的价格'} 走。`;
  openModal(`<div class="md-h"><div><h3>问客户的话术</h3>
      <p>${esc(c.customer)} · ${esc(c.post)} · ${gaps.length} 项待补，其中必填 ${st.blocked} 项</p></div>
      <button class="dr-x" onclick="closeAll()">×</button></div>
    <div class="md-b">
      <pre class="script" id="scriptTxt">${esc(head + '\n' + lines + tail)}</pre>
      <div class="note i">按「未提必填 → 模糊 → 缺值」排的序，一次问完不返工。话术可直接复制发微信。</div>
    </div>
    <div class="md-f"><button class="btn" onclick="closeAll()">关闭</button>
      <button class="btn pri" onclick="toast('话术已复制，可直接发微信')">复制话术</button></div>`, 'md-lg');
}

function custPromote(name){
  const c = custOf(name);
  const oks = c.items.filter(i=>i.st==='ok'&&!i.std2);
  if(!oks.length){ toast('没有可提升的明确项'); return; }
  oks.forEach(i=>{ i.std2 = true; });
  refreshTable();
  toast(`已把 ${oks.length} 条明确口径提交审核 —— 审核通过后进因子库 / 要素池，并标「已标准化」`);
}

function custToConfirm(name){
  const c = custOf(name), st = custStat(c);
  if(st.blocked){
    openModal(`<div class="md-h"><div><h3>还不能出确认单</h3>
      <p>${esc(c.customer)} · ${esc(c.post)} 还有 ${st.blocked} 条必填项没定</p></div>
      <button class="dr-x" onclick="closeAll()">×</button></div>
    <div class="md-b">
      <div class="note w">先收话 → 再成单 → 后建需求，顺序不能反。这 ${st.blocked} 条必填没定就出确认单，等于把"不知道"写进合同。</div>
      <div style="margin-top:10px">${custGaps(c).filter(g=>g.req).map(g=>`<div class="sm" style="padding:5px 0;border-bottom:1px solid var(--line2)"><span class="b r">必填</span> ${esc(g.k)} · ${esc(g.q||'')}</div>`).join('')}</div>
    </div>
    <div class="md-f"><button class="btn" onclick="closeAll()">关闭</button>
      <button class="btn pri" onclick="closeAll();custScript('${esc(name)}')">生成话术去问</button></div>`);
    return;
  }
  toast(`已生成确认单：${c.customer} · ${c.post}（打印用，客户线下确认后由我方登记）`);
}
function custToDemand(name){
  const c = custOf(name);
  const jd = custToJd(name);
  S.f.ndJd = jd;
  closeAll();
  ndEnter(jd, {client:c.customer||name, project:c.project||c.post||''});
  toast(`已按「${c.post}」带出标准岗位标准，第 2 步可逐项改`);
}
/* 客户口径 → 选哪份标准描述（船厂电工≈电工大工；3C 售后≈钳工中工） */
function custToJd(name){
  if(name==='江南造船') return 'JD-DG-D3';
  if(name==='立讯精密') return 'JD-QG-D2';
  return 'JD-QG-D2';
}

PAGES.custreq = { R01:r0xCustReq, R02:r0xCustReq };
PAGES.custreqRaw = { R01:custRawPage, R02:custRawPage };
