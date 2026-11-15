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

function r0xCustReq(){
  const name = S.f.cust || CUSTS[0];
  const c = custOf(name);
  const st = custStat(c);
  const gaps = custGaps(c);
  const ST = CUST_ST;

  const custChips = `<div class="toolbar" style="border-top:none">
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${CUSTS.map(n=>{const x=custStat(custOf(n));
        return `<span class="chip ${name===n?'on':''}" onclick="setCust('${n}')">${esc(n)} · ${x.ok}/${x.total} 明确</span>`;}).join('')}
    </div>
    <div class="sp"></div><span class="sm mut">客户因子 ${esc(c.id)} · ${esc(c.owner)} · ${esc(c.upd)}</span>
  </div>`;

  /* ---- 左：原话粘贴区 ---- */
  const segs = c.segs.map((s,i)=>`<div class="seg">
      <div class="seg-h"><span class="b n">第 ${i+1} 段</span><span class="xs mut">${esc(s.at)} · ${esc(s.src)}</span></div>
      <div class="sm" style="line-height:1.7">${esc(s.txt)}</div>
    </div>`).join('');

  const left = `<div class="cc-col">
    <div class="cc-card">
      <div class="cc-t">客户原话 <span class="xs mut">微信原文 / 会议记录 / 语音转写都能贴</span></div>
      <textarea class="cc-ta" placeholder="把客户说的话原样贴进来，可连续贴多段。一段会话说一次，不要自己先整理 —— 整理过的话，就查不出「哪些没问到」了。"></textarea>
      <div class="cc-row">
        <select class="sel" style="height:30px"><option>微信</option><option>电话</option><option>会议</option><option>语音转写</option></select>
        <button class="btn sm" onclick="custParse('${esc(name)}')">AI 解析这一段</button>
      </div>
    </div>
    ${segs}
    <div class="note i">原话<b>永久保留</b>，标「证据 · 不参与评分」。90 天可归档不可删 —— 出纠纷时这是唯一凭据。</div>
  </div>`;

  /* ---- 右：解析结果 ---- */
  const dims = [...new Set(c.items.map(i=>i.dim))];
  const dimBlock = d => {
    const rows = c.items.filter(i=>i.dim===d);
    return `<div class="dimblk">
      <div class="dim-t">${esc(d)} <span class="xs mut">${rows.length} 条 · ${rows.filter(r=>r.st==='ok').length} 明确</span></div>
      ${rows.map(r=>{
        const s = ST[r.st];
        return `<div class="cc-item ${r.st}">
          <div style="display:flex;align-items:flex-start;gap:8px">
            <span class="stb ${s.c}">${s.i} ${s.n}</span>
            <div style="flex:1;min-width:0">
              <div class="sm"><b>${esc(r.k)}</b>${r.req?'<span class="xs mut"> · 必填</span>':''}</div>
              <div class="xs" style="margin-top:2px;color:var(--ink2)">${esc(r.v)}</div>
              <div class="xs mut" style="margin-top:3px">→ ${esc(r.std)}</div>
              ${r.raw?`<div class="xs" style="margin-top:4px;padding-left:7px;border-left:2px solid var(--line)">原话：「${esc(r.raw)}」</div>`:''}
            </div>
            ${r.std2?'<span class="b g" title="已提升为因子库 / 要素池里的标准口径">已标准化</span>':''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  };

  const right = `<div class="cc-col">
    <div class="cc-card">
      <div class="cc-t">解析结果
        <span class="xs mut">${st.total} 条 · 明确 ${st.ok} · 缺值 ${st.miss} · 模糊 ${st.vague} · 未提 ${st.none}</span></div>
      ${dims.map(dimBlock).join('')}
      <div class="note w" style="margin-top:10px">四态怎么读：<b>明确</b>有值可直接落库 · <b>缺值</b>知道要什么不知道多少 · <b>模糊</b>是不可判定词（"熟练""踏实""能吃苦"）· <b>未提</b>必填项压根没问。</div>
    </div>
  </div>`;

  /* ---- 待补清单 ---- */
  const gapRows = gaps.map((g,i)=>{
    const s = ST[g.st];
    const sev = g.st==='none'&&g.req ? '<span class="b r">最急 · 必填没问</span>'
      : g.st==='vague' ? '<span class="b w">次急 · 判不了</span>'
      : g.st==='miss' ? '<span class="b n">可后补 · 缺数值</span>' : '<span class="b n">可选</span>';
    return `<tr>
      <td class="mono xs">${i+1}</td>
      <td>${sev}</td>
      <td class="sm"><b>${esc(g.k)}</b><div class="xs mut">${esc(g.dim)}</div></td>
      <td class="sm">${esc(g.q||'—')}</td>
    </tr>`;
  }).join('');

  return `<div class="page">
    ${head('客户需求确认',
      '先收话 → 再成单 → 后建需求 · 客户说的是方言，系统要的是普通话',
      `<button class="btn" onclick="custScript('${esc(name)}')">生成问客户的话术</button>
       <button class="btn pri" onclick="toast('已新建一条客户需求，等待贴原话')">＋ 新建客户需求</button>`)}
    ${stats([
      {lab:'要求条目', val:st.total, unit:'条', foot:`${esc(c.customer)} · ${esc(c.post)}`},
      {lab:'已明确', val:st.ok, unit:'条', foot:'可直接落库进标准口径'},
      {lab:'待补', val:st.total-st.ok, unit:'条', foot:`其中必填 ${st.blocked} 条`, accent:true},
      {lab:'阻塞发布', val:st.blocked, unit:'条', foot:'不补完可以建草稿，不能发布'},
    ])}
    ${custChips}
    <div class="cc-grid">${left}${right}</div>

    <div class="sec" style="margin-top:18px"><div class="sec-t">待补清单 · 按严重度排（未提必填 > 模糊 > 缺值）
      <span class="b r" style="margin-left:2px">${st.blocked} 条必填待补</span></div>
      <div class="tbl-wrap"><table>
        <thead><tr><th style="width:38px">#</th><th style="width:120px">严重度</th><th style="width:150px">要素</th><th>问客户的话</th></tr></thead>
        <tbody>${gapRows||'<tr><td colspan="4" class="mut sm">全部明确，可以直接成单</td></tr>'}</tbody></table></div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn" onclick="custScript('${esc(name)}')">一键生成话术（可复制发微信）</button>
        <button class="btn" onclick="custPromote('${esc(name)}')">把明确项提升为标准口径</button>
      </div>
    </div>

    <div class="sec"><div class="sec-t">落库：客户因子</div>
      <div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px">
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">
          <div><div class="xs mut">客户因子</div><div class="mono sm">${esc(c.id)}</div></div>
          <div><div class="xs mut">归属客户</div><div class="sm">${esc(c.customer)}</div></div>
          <div><div class="xs mut">对应项目 / 岗位</div><div class="sm">${esc(c.project)} · ${esc(c.post)}</div></div>
          <div><div class="xs mut">记录人</div><div class="sm">${esc(c.owner)}</div></div>
          <div style="flex:1"></div>
          <span class="b ${st.blocked?'w':'g'}">${st.blocked?`${st.blocked} 条必填待补 · 只能存草稿`:'口径完整 · 可发布'}</span>
        </div>
        <div class="note i" style="margin-top:12px">
          <b>挂客户，不挂项目</b>（W1）：一个客户的用人习惯跨项目一致。挂项目的话，同一个客户三个项目要填三遍。<br>
          <b>原话留痕</b>（W3）：每一条都存了客户原话当证据，但原话<b>不进评分</b> —— 评分只认映射出来的标准口径。
        </div>
      </div>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn" onclick="custToConfirm('${esc(name)}')">生成确认单（打印用）</button>
      <button class="btn pri" onclick="custToDemand('${esc(name)}')">建需求（带岗位描述）</button>
    </div>
  </div>`;
}

function setCust(n){ S.f.cust = n; refreshTable(); }

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
