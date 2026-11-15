/* ===== 档案详情（人）／AI 找候选人／记录联系（含录音解析） ===== */

/* -------------------------------------------------------------
   人详情：一个抽屉，四个页签（2026-11-14 定 · P0-0）
   -------------------------------------------------------------
   以前是两个抽屉并存：openPerson（投递详情，只有进度）与 openArchive（档案详情，有简历）。
   两个标题长得一模一样，点进去内容完全不同 —— 这就是"有些名字点进去不是我想的那个"。
   现在统一成 openHuman(personId)，所有入口都往这里走：

     简历明细（默认）  候选人自己给的，可对客户
     人才画像          我们的判断，仅内部（内部日常看这个更多，所以紧挨简历）
     本次投递          这一单谈到哪
     沟通记录          跨投递、跨专员合并

   页签记住上次停留（localStorage），他每天推进度，不想每次翻到第三个。
   ------------------------------------------------------------- */

const HU_TABS = [
  {k:'resume',  n:'简历明细', tip:'候选人自己给的'},
  {k:'portrait',n:'人才画像', tip:'我们的判断 · 仅内部'},
  {k:'apply',   n:'本次投递', tip:'这一单谈到哪'},
  {k:'talk',    n:'沟通记录', tip:'跨投递合并'},
];
let HU = {pid:null, appId:null, tab:'resume'};

function huMemGet(){ try{ return localStorage.getItem('rg-human-tab')||'resume'; }catch(e){ return 'resume'; } }
function huMemSet(t){ try{ localStorage.setItem('rg-human-tab', t); }catch(e){} }

/* 空态判断与状态标 */
function archiveState(p){
  const act = activeAppsOf(p.id);
  if(p.blacklist) return {label:'黑名单', tone:'r'};
  if(appsOf(p.id).some(a=>a.node==='已入职')) return {label:'已入职', tone:'g'};
  if(act.length) return {label:'投递中 · ' + act.length + ' 个需求', tone:'i'};
  return {label:'空闲可捞', tone:'g'};
}

/* 统一入口：openArchive(personId, tab) / openPerson(appId) 都到这里 */
function openHuman(pid, tab, appId){
  HU.pid = pid;
  if(appId) HU.appId = appId;
  const cur = HU.appId ? P(HU.appId) : null;
  if(!cur || cur.personId!==pid){
    const act = activeAppsOf(pid);
    HU.appId = (act[0]||appsOf(pid)[0]||{}).id || null;
  }
  HU.tab = tab || huMemGet();
  huPaint();
}
function huPaint(){ openDrawer(huHtml()); }
function huSetTab(t){ HU.tab = t; huMemSet(t); huPaint(); }
function huAppTo(appId){ HU.appId = appId; HU.tab = 'apply'; huMemSet('apply'); huPaint(); }
/* 兼容入口：全站所有「点人名」都收口到 openHuman */
function openArchive(id, tab){ openHuman(id, tab); }
function openPerson(id){
  const a = P(id);
  openHuman(a ? a.personId : id, null, a ? id : null);
}
function huCopy(id){ toast('档案编号 ' + id + ' 已复制'); }

/* 补全链接：APP 推送之外，还要能复制到微信手动发 —— 候选人未必看 APP 通知 */
function copyFillLink(pid){
  const url = 'https://rg.zhaopin.local/fill/' + (pid||'') + '?t=' + Math.random().toString(36).slice(2,8);
  const done = () => toast('补全链接已复制，可直接粘贴到微信发给候选人');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(done).catch(()=>{ fallbackCopy(url); done(); });
  } else { fallbackCopy(url); done(); }
}
function fallbackCopy(txt){
  const ta = document.createElement('textarea');
  ta.value = txt; ta.style.cssText = 'position:fixed;left:-9999px';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
}

function huHtml(){
  const p = appPerson(HU.pid), st = archiveState(p);
  const apps = appsOf(p.id), cs = contactsOf(p.id);
  const last = cs[0];
  const days = t => Math.round((new Date(TODAY+'T00:00:00') - new Date(t.slice(0,10)+'T00:00:00'))/86400000);
  const ago = last ? days(last.time) : null;
  const appsN = apps.filter(a=>a.status==='跟进中').length;

  const vf = verifyOf(p.id);
  const pendN = [vf.city&&vf.city.wantState!=='已确认', vf.arrive&&vf.arrive.state!=='已确认',
    vf.night&&vf.night.state!=='已确认愿意', !(vf.certs||[]).some(c=>c.state==='ok')].filter(Boolean).length;
  const badge = {resume:'', verify: pendN, portrait:'', apply: appsN||apps.length, talk: cs.length};

  const body = HU.tab==='resume' ? huResume(p)
    : HU.tab==='verify' ? huVerify(p)
    : HU.tab==='portrait' ? huPortrait(p)
    : HU.tab==='apply' ? huApply(p)
    : huTalk(p, cs, apps);

  return `
    <div class="dr-h"><div>
      <h3>${esc(p.name)} <span class="xs mut" style="font-weight:400">${p.gender} · ${p.age}岁 · ${esc(p.phone)}</span></h3>
      <div class="sub">档案 <span class="arc-link mono" onclick="huCopy('${esc(p.id)}')">${esc(p.id)}</span>
        · 当前跟进人 <b>${esc(p.follower||p.createdBy||'—')}</b>
        · 进入 ${esc(p.createdAt)}（${days(p.createdAt)} 天前）</div></div>
      <button class="dr-x" onclick="closeAll()">×</button></div>
    <div class="dr-b">
      <div class="arc-top">
        <span class="b ${st.tone}">${esc(st.label)}</span>
        <span class="b n">${esc(p.channel)}</span>
        ${last?`<span class="sm ${ago>60?'arc-late':ago>30?'arc-warn':''}">最近沟通 ${last.time.slice(5)}（${ago} 天前）</span>`:'<span class="sm mut">尚无沟通记录</span>'}
        <span class="sm mut">沟通 ${cs.length} 次</span>
        <div class="sp"></div>
        <span class="sm mut">点姓名到处都能进这一页</span>
      </div>

      <div class="arc-tabs">
        ${HU_TABS.map(t=>`<span class="arc-tab ${HU.tab===t.k?'on':''}" onclick="huSetTab('${t.k}')">
          ${t.n}${badge[t.k]!==''?` <i class="vis n">${badge[t.k]}</i>`:''}
          ${t.k==='portrait'?'<i class="vis no">仅内部</i>':t.k==='resume'?'<i class="vis ok">可对客户</i>':''}
        </span>`).join('')}
      </div>

      ${body}
    </div>
    <div class="dr-f"><button class="btn" onclick="closeAll()">关闭</button>
      <button class="btn" onclick="openModal(transferModal('${esc(p.id)}'))">转交跟进</button>
      <button class="btn" onclick="openModal(followModal('${esc(p.id)}','archive'),'md-lg')">记录联系</button>
      <button class="btn pri" onclick="openModal(poolPickBatch('${esc(HU.appId||p.id)}'))">捞入批次</button></div>`;
}

/* ---------- 页签 1 · 简历明细 ---------- */
function huResume(p){
  const ups = uploadsOf(p.id), files = filesOf(p.id), apps = appsOf(p.id);
  const cur = apps.filter(a=>a.status==='跟进中');
  const his = apps.filter(a=>a.status!=='跟进中');
  return `
    <div class="sec"><div class="sec-t">进入系统</div>
      <dl class="kv">
        <div><dt>建档时间</dt><dd>${esc(p.createdAt)}</dd></div>
        <div><dt>来源渠道</dt><dd>${esc(p.channel)} <span class="xs mut">${esc((CH(p.channel)||{}).type||'')}</span></dd></div>
        <div><dt>建档人</dt><dd>${esc(p.createdBy)}</dd></div>
        <div><dt>当前跟进人</dt><dd>${esc(p.follower||p.createdBy)} <span class="xs mut">${p.follower&&p.follower!==p.createdBy?'（已转交，见沟通记录）':'（与建档人一致）'}</span></dd></div>
        <div><dt>首次进入方式</dt><dd>${esc(p.entryMode)}</dd></div>
      </dl>
    </div>

    <div class="sec"><div class="sec-t">基础信息与意愿<span class="perm">城市与到岗需分别确认</span></div>
      <dl class="kv">
        <div><dt>技能</dt><dd class="sm">${p.skills.map(esc).join(' / ')} <span class="xs mut">技能名不等于持证</span></dd></div>
        <div><dt>期望薪资</dt><dd class="sm">${esc(p.expect||'32-36 元/时')}</dd></div>
        <div><dt>现居地</dt><dd class="sm">${esc((verifyOf(p.id).city||{}).live || p.city || '—')}
          <span class="xs mut">${esc((verifyOf(p.id).city||{}).liveState||'')}</span></dd></div>
        <div><dt>愿意工作城市</dt><dd class="sm">${(()=>{ const c=verifyOf(p.id).city||{};
          return (c.want||[]).length ? esc(c.want.join('、'))+' '+tri('ok') : '<span class="mut">未确认</span> '+tri('pend'); })()}</dd></div>
        <div><dt>可到岗</dt><dd class="sm">${(()=>{ const v=verifyOf(p.id).arrive||{};
          return v.date ? esc(v.date)+' '+tri('ok') : '<span class="mut">未确认</span> '+tri('pend'); })()}</dd></div>
        <div><dt>资料完整度</dt><dd><div class="barline" style="max-width:180px"><div class="bar ${p.complete>=85?'g':p.complete<65?'w':''}"><i style="width:${p.complete}%"></i></div><b>${p.complete}%</b></div></dd></div>
      </dl>
      <div class="note" style="margin-top:8px">现居地不推断异地意愿，投递状态不推断可到岗 —— 详见「核实依据」页签。</div>
    </div>

    <div class="sec"><div class="sec-t">原始简历（${files.length} 版）<span class="perm">内部全员可见</span></div>
      ${files.map(f=>`<div class="res-file">
        <span class="rf-kind">${esc(f.kind)}</span>
        <div style="flex:1"><div class="sm"><b>${esc(f.name)}</b> <span class="xs mut">第 ${f.ver} 版 · ${esc(f.size)}</span></div>
          <div class="xs mut">${esc(f.time)} · ${esc(f.uploader)} 上传${f.online?'':' · 平台来源，无原件（仅结构化字段）'}</div></div>
        <span class="link xs" onclick="toast('打开原件预览（演示）')">预览</span>
        <span class="link xs" onclick="toast('已开始下载')">下载</span>
      </div>`).join('')||'<div class="mut sm">暂无原件（BOSS 导出的数据行不含附件）</div>'}
      <div class="note" style="margin-top:9px">简历版本<b>不覆盖</b>，每次上传留一版，可回溯他报的薪资、补的证书什么时候变过。</div>
      <div class="note" style="margin-top:6px"><b>查看权限：内部全员</b> —— 不分归属，任一专员都能看原件（避免"人不在我名下就查不到底子"）。候选人本人可在工人端看自己的简历；原始原件仅内部使用，不外发。</div>
    </div>

    <div class="sec"><div class="sec-t">上传履历（共 ${ups.length} 次）</div>
      <div class="tl">${ups.map(u=>`<div class="tl-item"><div class="tl-d">${esc(u.time)} · ${esc(u.staff)} · ${esc(u.channel)}</div>
        <div class="tl-t">第 ${u.ver} 版 · ${esc(u.file)} <span class="xs mut">解析出 ${u.factors} 项</span></div>
        <div class="xs" style="color:var(--accent2)">${esc(u.diff)}</div></div>`).join('')}</div>
    </div>

    <div class="sec"><div class="sec-t">投递关系（${apps.length} 条）</div>
      ${cur.map(a=>`<div class="app-row" onclick="huAppTo('${a.id}')">
        <div style="flex:1"><div class="sm"><b>${esc(D(a.demandId).post)}</b> <span class="xs mut">· ${esc(D(a.demandId).client)}</span></div>
          <div class="xs mut mono">${a.batchId?esc(B(a.batchId).code):'人才池捞入'} · ${esc(a.owner)} · ${esc(a.channel)}</div></div>
        ${tierChip(a.tier)} ${nodeB(a.node)}<span class="link xs">看这一单</span></div>`).join('')}
      ${his.length?`<div class="sec-t" style="margin-top:12px">历史投递</div>
        ${his.map(a=>`<div class="app-row dim" onclick="huAppTo('${a.id}')">
          <div style="flex:1"><div class="sm"><b>${esc(D(a.demandId).post)}</b> <span class="xs mut">· ${esc(D(a.demandId).client)}</span></div>
            <div class="xs mut">结束原因：${esc(a.node==='已淘汰'?'客户/专员判定不匹配':'已关闭')} · 负责人 ${esc(a.owner)}</div></div>
          ${nodeB(a.node)}<span class="link xs">看这一单</span></div>`).join('')}`:'<div class="mut sm" style="margin-top:8px">无历史投递</div>'}
    </div>`;
}

/* ---------- 页签 2 · 核实依据（证书 / 城市 / 到岗 / 夜班） ---------- */
/* 按姓名索引：同一手机号重复投递复用同一档案 id，硬编码 PE00X 会错位 */
const VER_CONFLICT = {
  '马长青':[{need:'电工特种作业操作证是否在有效期',
          a:'简历技能栏写「电工证书」', b:'2026-11-13 电话：「证过期了，正在复审」'}],
  '陈志强':[{need:'低压电工证证件信息是否可辨',
          a:'简历附件上传了证书照片', b:'照片模糊，证件号与发证日期看不清'}],
};
function huVerify(p){
  const v = verifyOf(p.id);
  const certs = v.certs || [], c = v.city || {}, a = v.arrive || {}, n = v.night || {};
  const certState = certs.some(x=>x.state==='ok') ? 'ok' : certs.some(x=>x.state==='no') ? 'no'
    : certs.length ? 'pend' : 'pend';
  const gaps = [];
  if(c.wantState !== '已确认') gaps.push('愿意工作城市');
  if(!(a.date && a.state==='已确认')) gaps.push('可到岗时间');
  if(n.state !== '已确认愿意' && n.state !== '已确认不愿') gaps.push('夜班意愿');
  if(!certs.some(x=>x.state==='ok')) gaps.push('已核验的证书');

  const row = (label, state, need, got, src, ev, at, note) => `
    <div class="tri-row">
      <div class="tr-l"><b>${esc(label)}</b><div class="xs mut">要求：${esc(need)}</div></div>
      <div class="tr-v">${tri(state)}<div class="sm" style="margin-top:3px">${esc(got)}</div>
        <div class="tr-n">${src?`来源：${esc(src)}`:'来源：—'}${ev?` · 原文：${esc(ev)}`:''}${at&&at!=='—'?` · 确认于 ${esc(at)}`:''}
        ${note?`<br>${esc(note)}`:''}</div></div>
    </div>`;

  return `
  <div class="note" style="margin-bottom:14px">核实依据只记录<b>客户明示的硬条件</b>，每条都要有来源。技能关键词<b>不等于</b>持证；现居地<b>不推断</b>异地意愿；投递状态<b>不推断</b>可到岗。</div>

  <div class="sec"><div class="sec-t">证书<span class="perm">独立字段 · 需核验</span></div>
    ${certs.length ? certs.map(x=>row(x.name, x.state, '客户要求的有效证件', 
        x.state==='ok'?'已核验证件有效':x.state==='no'?'候选人明确表示不满足':'待核验',
        x.src, x.ev, x.at, x.state==='pend'?'证据不足，未核验前不得视为持证':'' )).join('')
      : `<div class="tri-row"><div class="tr-l"><b>无证书记录</b><div class="xs mut">要求：按岗位</div></div>
          <div class="tr-v">${tri('pend')}<div class="sm" style="margin-top:3px">没有可核验的证书</div>
          <div class="tr-n">技能栏出现「电工」「电工证书」等词，<b>不得</b>据此判定持证；需索要证件照片并核验。</div></div></div>`}
    ${v.certNote?`<div class="note w" style="margin-top:8px">${esc(v.certNote)}</div>`:''}
  </div>

  <div class="sec"><div class="sec-t">工作城市<span class="perm">现居 ≠ 愿意去</span></div>
    ${row('现居地', c.liveState==='已核实'?'ok':'pend', '—', c.live||'—', c.src, '', c.at, '现居地本身不做匹配依据')}
    ${row('愿意工作城市', c.wantState==='已确认'?'ok':'pend', '客户岗位所在城市',
        (c.want||[]).length ? c.want.join('、') : '未确认',
        c.src, '', c.at, c.wantState==='已确认'?'':'意愿缺失时一律待确认，不按现居地推断')}
  </div>

  <div class="sec"><div class="sec-t">可到岗时间<span class="perm">须候选人确认</span></div>
    ${row('可到岗日期', a.state==='已确认'?'ok':'pend', '需求最晚报到日',
        a.date ? a.date+' 起可到岗' : '未确认', a.src, '', a.at,
        a.state==='已确认'?'':'没有候选人确认的时间就不算可到岗，与是否有进行中投递无关')}
  </div>

  <div class="sec"><div class="sec-t">夜班意愿</div>
    ${row('夜班', n.state==='已确认愿意'?'ok':n.state==='已确认不愿'?'no':'pend', '客户班制',
        n.state||'未确认', n.src, '', n.at, n.state==='已确认不愿'?'候选人明确拒绝，属已确认不符合':'')}
  </div>

  ${(VER_CONFLICT[p.name]||[]).length?`<div class="sec"><div class="sec-t">信息冲突<span class="perm">待核实</span></div>
    ${VER_CONFLICT[p.name].map(x=>`<div class="note r"><b>${esc(x.need)}</b><br>
      · ${esc(x.a)}<br>· ${esc(x.b)}<br><span class="xs">两条记录不一致，暂按「信息待确认」处理，不静默选取有利值。</span></div>`).join('')}
  </div>`:''}

  <div class="sec"><div class="sec-t">信息缺口（${gaps.length}）</div>
    ${gaps.length ? `<div class="sm">${gaps.map(g=>`<span class="b w" style="margin:0 6px 6px 0">${esc(g)}</span>`).join('')}</div>
      <div class="note" style="margin-top:8px">缺口不会被自动当作「符合」或「不符合」，在匹配里统一显示为<b>信息待确认</b>。</div>`
      : `<div class="sm">硬条件依据齐全，可进入匹配判断。</div>`}
  </div>`;
}

/* ---------- 页签 3 · 人才画像 ---------- */
function huPortrait(p){
  const pts = ptOf(p.id);
  const dims = ['稳定性','意向','履约','适配','风险'];
  const stale = t => (new Date(TODAY) - new Date(t.updated.slice(0,10)))/86400000 > 90;
  return `
    <div class="note" style="margin-bottom:14px">
      <b>画像 = 我们对这个人的判断，不是他填的简历。</b><br>
      候选人看不到这一页；标签只写<b>可验证的行为</b>，不写主观评价，每条都能追溯到一次沟通。
    </div>

    <div class="sec"><div class="sec-t">事实层（与简历同源）</div>
      <dl class="kv">
        <div><dt>技能</dt><dd class="sm">${p.skills.map(esc).join(' / ')}</dd></div>
        <div><dt>期望薪资</dt><dd class="sm">${esc(p.expect||'32-36 元/时')}</dd></div>
        <div><dt>可到岗</dt><dd class="sm">${esc(p.arrive||'随时')}</dd></div>
        <div><dt>资料完整度</dt><dd class="sm">${p.complete}%</dd></div>
      </dl>
    </div>

    <div class="sec"><div class="sec-t">判断层（AI 推断 + 专员确认）<span class="perm">内部全员可见</span></div>
      ${dims.map(d=>{
        const list = pts.filter(t=>t.dim===d);
        if(!list.length) return '';
        return `<div class="pt-dim"><div class="pt-dim-n">${d}</div>
          ${list.map(t=>`<div class="pt-tag ${d==='风险'?'risk':''} ${stale(t)?'stale':''}">
            <div class="pt-h"><b>${esc(t.val)}</b>
              <span class="pt-conf c${t.conf==='高'?'h':t.conf==='中'?'m':'l'}">${esc(t.conf)}置信</span>
              ${stale(t)?'<span class="b n">已过期</span>':''}</div>
            <div class="pt-b">${esc(t.basis)}</div>
            <div class="pt-m">来源 ${esc(t.src)} · ${esc(t.by)} 确认 · 更新 ${esc(t.updated.slice(5,10))}</div>
          </div>`).join('')}
        </div>`;
      }).join('')}
      <div class="note" style="margin-top:9px"><b>风险标签对内部全员开放</b>（含管理员、招聘专员、客户负责人）——推荐时同步显示「曾被谁淘汰、为什么」，避免同一人被反复推给同一个客户。对外（候选人、客户正式材料）一律不出示。</div>
    </div>

    <div class="sec"><div class="sec-t">证据层</div>
      <div class="sm mut">每个判断都挂到具体沟通，点标签可回看原文与录音片段；超过 90 天未更新自动标灰「已过期」。</div>
      ${contactsOf(p.id).slice(0,3).map(c=>`<div class="ev-row">
        <span class="xs mono mut">${esc(c.time.slice(5))}</span>
        <span class="sm">${esc(c.purpose)} · ${esc(c.concl)}</span>
        <span class="link xs" onclick="openModal(followModal('${p.id}','archive'),'md-lg')">回听</span></div>`).join('')}
    </div>

    <div class="sec"><div class="sec-t">合规</div>
      <div class="note r">画像判断<b>仅辅助人工决策</b>，不得作为自动淘汰依据；不得对候选人展示或外发。</div>
      <div class="note" style="margin-top:6px">录音/截图：<b>长期保留</b>（本期不做自动清理）；候选人明确要求删除时按删除申请处理。录音仅内部使用，不得外发。</div>
    </div>`;
}

/* ---------- 页签 3 · 本次投递 ---------- */
function huApply(p){
  const apps = appsOf(p.id);
  if(!apps.length) return `<div class="empty">这个人还没有任何投递 —— 从人才池「捞入批次」后会生成第一条</div>`;
  const id = HU.appId || apps[0].id;
  const a = P(id);
  if(!a) return `<div class="empty">投递记录不存在</div>`;

  const idx = NODES.indexOf(a.node);
  const steps = [
    {n:'匹配', desc: a.tier? `档位 ${a.tier} · ${a.score} 分 · 已通过硬门槛` : '尚未运行匹配',
      ops:[`<button class="btn xs" onclick="toast('已重算，档位 ${a.tier||'B'}')">重算</button>`,`<button class="btn xs" onclick="toast('打开逐维度依据')">看依据</button>`]},
    {n:'触达', desc: a.lastContact==='—'? '尚未联系' : `上次 ${a.lastContact.slice(5)} · ${a.lastType}`,
      ops:[`<button class="btn xs" onclick="openModal(followModal('${a.id}'))">记录联系</button>`,`<button class="btn xs danger" onclick="toast('已标为无意向，人员回到人才池')">标无意向</button>`]},
    {n:'补全复核', desc: a.node==='补全中'? '已发链接，等待提交' : (idx>=3? '已复核通过' : '未开始'),
      ops:[`<button class="btn xs" onclick="toast('补全链接已发送 → 候选人 APP 收到一条待办')">发补全链接</button>`,
        `<button class="btn xs" onclick="copyFillLink('${a.personId}')">复制链接</button>`,
        `<button class="btn xs" onclick="toast('复核通过，12 项因子已更新')">复核通过</button>`]},
    {n:'面试', desc: ['待面试','面试通过'].includes(a.node)? (a.node==='面试通过'?'客户已确认通过':'已约面试，等待到面') : '未提报',
      ops:[`<button class="btn xs" onclick="toast('已提报客户，等待排期')">提报面试</button>`,`<button class="btn xs" onclick="toast('已登记面试结果')">登记结果</button>`]},
    {n:'入职安排', desc: a.node==='待入职'? '已确认，等待报到' : (a.node==='已入职'?'已报到':'未开始'),
      ops:[`<button class="btn xs" onclick="toast('已推进到下一段')">推进</button>`,`<button class="btn xs danger" onclick="toast('已跳票，人员回到人才池')">跳票回池</button>`]},
    {n:'体检与建档', desc: a.node==='已入职'? '体检通过，档案已建' : '未开始',
      ops:[`<button class="btn xs" onclick="toast('体检报告已审核')">审核体检</button>`,`<button class="btn xs" onclick="toast('员工档案已建立')">完成建档</button>`]},
  ];
  const stepState = i => {
    const map = {'新入库':0,'已匹配':1,'触达中':2,'补全中':3,'待面试':4,'面试通过':4,'待入职':5,'已入职':6,'已淘汰':1};
    const cur = map[a.node]||0;
    return i<cur? 'done' : i===cur? 'now' : 'todo';
  };
  const fl = FOLLOWS.filter(f=>f.personId===a.id).sort((x,y)=>y.time.localeCompare(x.time));
  const d = D(a.demandId);

  return `
    <div class="sec"><div class="sec-t">这一单</div>
      <div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:13px 15px">
        <div class="sm"><b class="arc-link" onclick="openDemand('${a.demandId}')">${esc(d.post)}</b>
          <span class="xs mut">· ${esc(d.client)} · ${esc(d.project)}</span></div>
        <div class="xs mut mono" style="margin-top:3px">${esc(d.code)} · ${a.batchId?esc(B(a.batchId).code):'人才池捞入'} · 负责人 ${esc(a.owner)}</div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:9px">
          ${tierChip(a.tier)} ${nodeB(a.node)} ${statB(a.status)}
          <span class="xs mut">匹配分 ${a.score}</span>
          <div class="sp"></div>
          <button class="btn xs" onclick="openModal(transferModal('${esc(p.id)}'))">转交这一单</button>
        </div>
      </div>
    </div>

    ${apps.length>1?`<div class="sec"><div class="sec-t">同一个人共 ${apps.length} 条投递 · 点一下原地切换</div>
      <div class="chips">
        ${apps.map(x=>`<span class="chip ${x.id===a.id?'on':''}" onclick="huAppTo('${x.id}')">
          ${esc(D(x.demandId).post)}${x.status==='跟进中'?'':' · 已结束'}</span>`).join('')}
      </div>
      <div class="xs mut" style="margin-top:7px">每条投递的分数、进度、负责人各自独立，切换不重开抽屉。</div>
    </div>`:''}

    <div class="sec"><div class="sec-t">进度（每个节点都能操作）</div>
      <div class="flow">${steps.map((s,i)=>`
        <div class="flow-item ${stepState(i)}">
          <div class="fv">${i<stepState(0)?'':i+1}</div>
          <div class="fb"><div class="ft"><span class="fn">${s.n}</span>
            ${stepState(i)==='now'?'<span class="b a">当前</span>':''}</div>
            <div class="fd">${s.desc}</div>
            <div class="fops">${stepState(i)==='todo'? '':s.ops.join('')}</div>
          </div>
        </div>`).join('')}</div>
    </div>

    <div class="sec"><div class="sec-t">这一单的联系记录（${fl.length}）</div>
      ${fl.length? `<div class="tl">${fl.map(f=>`<div class="tl-item hot"><div class="tl-d">${f.time} · ${f.type} · ${esc(f.staff)}</div>
        <div class="tl-t">${esc(f.note)}</div></div>`).join('')}</div>`
      : '<div class="mut sm">这一单还没有联系记录</div>'}
    </div>`;
}

/* ---------- 页签 4 · 沟通记录 ---------- */
function huTalk(p, cs, apps){
  const today = TODAY;
  const days = t => Math.round((new Date(today+'T00:00:00') - new Date(t.slice(0,10)+'T00:00:00'))/86400000);
  const last = cs[0], first = cs[cs.length-1];
  const next = cs.map(c=>c.next).filter(Boolean).sort()[0];
  const tr = transfersOf(p.id);
  return `
    <div class="sec"><div class="sec-t">汇总</div>
      <div class="talk-sum">
        <div><b>${cs.length}</b><span>共沟通</span></div>
        <div><b>${first?first.time.slice(5,10):'—'}</b><span>首次</span></div>
        <div><b>${last?days(last.time)+' 天前':'—'}</b><span>最近一次</span></div>
        <div><b>${next?next.slice(5):'—'}</b><span>下次跟进</span></div>
      </div>
      ${last && days(last.time)>30 ? `<div class="note w" style="margin-top:10px">已 ${days(last.time)} 天未联系${days(last.time)>60?'（超过 60 天，建议回访或回池）':''}</div>`:''}
    </div>

    <div class="sec"><div class="sec-t">时间线（跨投递、跨专员合并）</div>
      <div class="note" style="margin-bottom:10px">同一个人被不同专员、在不同需求下聊过，全部合成一条时间线——避免下一个人重复问“期望多少薪资”“什么时候能到岗”。</div>
      <div class="tl">${cs.map(c=>`<div class="tl-item ${c.time.slice(0,10)===today?'hot':''}">
        <div class="tl-d">${esc(c.time)} · ${esc(c.type)} · ${esc(c.staff)}${c.demandId?' · '+esc(D(c.demandId).post):' · 未关联需求'}</div>
        <div class="tl-t"><span class="b a" style="margin-right:6px">${esc(c.purpose)}</span>${esc(c.concl)}</div>
        <div class="xs mut" style="margin-top:2px">${c.next?'下次跟进 '+esc(c.next.slice(5)):'未设下次跟进'}
          ${c.appId?` · <span class="link" onclick="huAppTo('${c.appId}')">这次对应的投递</span>`:''}</div>
      </div>`).join('')||'<div class="mut sm">暂无沟通记录</div>'}</div>
    </div>

    ${tr.length?`<div class="sec"><div class="sec-t">转交记录（${tr.length}）</div>
      <div class="tl">${tr.map(t=>`<div class="tl-item"><div class="tl-d">${esc(t.at)}</div>
        <div class="tl-t">${esc(t.from)} → <b>${esc(t.to)}</b></div>
        <div class="xs mut">原因：${esc(t.why)}</div></div>`).join('')}</div>
      <div class="xs mut" style="margin-top:6px">转交历史不可删除；转回自己也算一条。</div>
    </div>`:''}`;
}

/* ---------- 转交跟进 ---------- */
function transferModal(pid){
  const p = appPerson(pid);
  const staff = ['李文静','陈曦','王浩','金诚'].filter(n=>n!==(p.follower||p.createdBy));
  return `<div class="md-h"><div><h3>转交跟进 · ${esc(p.name)}</h3>
    <p>当前跟进人 ${esc(p.follower||p.createdBy)} · 转交后原负责人不再收到该人的待办</p></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="frow">
      <div class="field"><label>转给<i>*</i></label>
        <select id="trTo">${staff.map(n=>`<option>${n}</option>`).join('')}</select></div>
      <div class="field"><label>转交范围</label>
        <select id="trScope"><option>只转这一条投递</option><option>这个人全部投递</option></select></div>
    </div>
    <div class="field"><label>原因<i>*</i></label>
      <select id="trWhy"><option>我请假 / 不在岗</option><option>人太多跟不过来</option><option>技能不匹配，换人更合适</option><option>其他（写在备注）</option></select></div>
    <div class="field"><label>备注</label><input id="trNote" placeholder="例：我请假两天，先让她跟，回来转回"></div>
    <div class="note">转交会写一条流水（谁转给谁、时间、原因），<b>不可删除</b>；想收回就再转一次给自己，同样留痕。</div>
  </div>
  <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" onclick="trDo('${esc(pid)}')">确认转交</button></div>`;
}
function trDo(pid){
  const to = document.getElementById('trTo').value;
  const why = document.getElementById('trWhy').value;
  const note = (document.getElementById('trNote').value||'').trim();
  const p = appPerson(pid);
  const from = p.follower || p.createdBy;
  p.follower = to;
  TRANSFERS.unshift({personId:pid, from, to, at:TODAY+' '+new Date().toTimeString().slice(0,5), why: note?why+' · '+note:why});
  closeAll();
  huPaint();
  toast(`已转交：${from} → ${to}，流水已记`);
}

/* ---------------- AI 找候选人 ---------------- */
let AI = {did:null, age:'', city:'', cert:'', arrived:'', picked:{}};

function aiFindModal(){
  AI = {did:(AI.did || (DEMANDS.find(d=>d.id!=='D6')||{}).id), age:AI.age||'', city:AI.city||'', cert:AI.cert||'', arrived:AI.arrived||'', picked:{}};
  const dem = DEMANDS.filter(d=>d.status==='招聘中');
  const r = aiRank(AI.did);
  const groups = ['S','A','B','C','D'];
  return `<div class="md-h"><div><h3>AI 找候选人</h3>
    <p>选需求 → 硬条件预筛 → AI 跑全池 → 你只负责勾选采纳</p></div>
    <button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="field"><label>目标需求<i>*</i></label>
      <select onchange="AI.did=this.value;aiRefresh()">${dem.map(d=>`<option value="${d.id}" ${d.id===AI.did?'selected':''}>${esc(d.post)} · ${esc(d.client)} · 缺口 ${d.head-d.hired}</option>`).join('')}</select>
      <div class="hint">硬门槛走结构化筛选（不走 AI）：城市 / 年龄 / 证书 / 可到岗</div></div>

    <div class="ai-pre">
      <select onchange="AI.city=this.value;aiRefresh()"><option value="">全部城市</option>${[...new Set(DEMANDS.map(d=>d.city))].map(c=>`<option ${AI.city===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
      <select onchange="AI.age=this.value;aiRefresh()"><option value="">全部年龄</option><option value="35" ${AI.age==='35'?'selected':''}>35 岁以下</option><option value="45" ${AI.age==='45'?'selected':''}>45 岁以下</option></select>
      <select onchange="AI.cert=this.value;aiRefresh()"><option value="">证书不限</option><option ${AI.cert==='电工'?'selected':''}>需电工证</option><option ${AI.cert==='焊工'?'selected':''}>需焊工证</option></select>
      <select onchange="AI.arrived=this.value;aiRefresh()"><option value="">到岗不限</option><option ${AI.arrived==='now'?'selected':''}>本周可到</option></select>
    </div>

    <div class="ai-flow" id="aiFlow">${aiFlowHtml(r)}</div>
    <div id="aiList">${aiListHtml(r)}</div>
  </div>
  <div class="md-f"><span class="sm mut" id="aiSel" style="margin-right:auto">已选 0 人</span>
    <button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" id="aiGo" onclick="aiAdopt()">捞入批次</button></div>`;
}

/* 召回 + 打分（演示口径：技能命中 + 完成度 + 履历稳定） */
function aiRank(did){
  const d = D(did);
  const keys = {
    D1:['售后','设备','调试','电气','PLC'], D2:['激光','装配','光路','光电'], D3:['IQC','检验','卡尺','千分尺','品质'],
    D4:['电工','船舶','舾装','船厂'], D5:['总装','装配','流水线','组装'], D6:['售后','3C','客服'],
    D7:['CNC','对刀','FANUC','三菱','加工中心'], D8:['钳工','装配','光伏','机修'],
  }[did] || [];
  let pool = PEOPLE.filter(p=>!p.blacklist);
  const total = pool.length;
  if(AI.city) pool = pool.filter(p=>(p.city||'').includes(AI.city.split('·')[0]));
  if(AI.age) pool = pool.filter(p=>p.age<=Number(AI.age));
  if(AI.cert==='电工') pool = pool.filter(p=>p.skills.some(s=>s.includes('电工'))||p.skills.some(s=>s.includes('电气')));
  if(AI.cert==='焊工') pool = pool.filter(p=>p.skills.some(s=>s.includes('焊')));
  if(AI.arrived==='now') pool = pool.filter(p=>!activeAppsOf(p.id).length);
  const pre = pool.length;

  const scored = pool.map(p=>{
    const hit = keys.filter(k=>p.skills.some(s=>s.includes(k)||k.includes(s)));
    let score = 52 + hit.length*13 + Math.round((p.complete-70)/4);
    const apps = appsOf(p.id);
    if(apps.some(a=>a.node==='已入职')) score = 0;
    score = Math.max(0, Math.min(97, score));
    const tier = score>=85?'S':score>=80?'A':score>=60?'B':score>=40?'C':'D';
    const bad = apps.find(a=>a.node==='已淘汰'||a.status==='无意向');
    return {p, score, tier, hit, total, pre, bad,
      short: hit.length>=keys.length? '' : '未命中：'+keys.filter(k=>!hit.includes(k)).slice(0,2).join('、')};
  }).filter(x=>x.p.id && x.score>0).sort((a,b)=>b.score-a.score).slice(0,14);
  return {list:scored, total, pre, keys};
}

function aiFlowHtml(r){
  return `<div class="ai-stat"><span>全池 <b>${r.total}</b> 人</span><span class="ar">→</span>
    <span>硬条件预筛 <b>${r.pre}</b> 人</span><span class="ar">→</span>
    <span>AI 精排 <b>${r.list.length}</b> 人</span>
    <span class="mut xs" style="margin-left:auto">技能命中 ${esc((r.keys||[]).join('、'))}</span></div>`;
}

function aiListHtml(r){
  const groups = ['S','A','B','C','D'];
  return groups.map(g=>{
    const list = r.list.filter(x=>x.tier===g);
    if(!list.length) return '';
    const label = {S:'强匹配',A:'匹配',B:'可用',C:'需补强',D:'不建议'}[g];
    return `<div class="ai-grp"><div class="ai-grp-h">
        <span class="tier ${g}">${g}</span><span class="sm">${label}</span>
        <span class="sm mut">${list.length} 人</span>
        <span class="link xs" style="margin-left:auto" onclick="aiPickGroup('${g}')">${g==='S'||g==='A'?'全选本组':''}</span>
      </div>
      ${list.map(x=>`<div class="ai-row">
        <input type="checkbox" class="ai-ck" ${AI.picked[x.p.id]?'checked':''} onchange="aiPick('${x.p.id}',this.checked)">
        <div style="flex:1;min-width:0">
          <div class="sm"><b class="arc-link" onclick="openArchive('${x.p.id}','portrait')">${esc(x.p.name)}</b>
            <span class="xs mut">${x.p.age}岁 · ${esc(x.p.channel)} · ${x.p.complete}%</span>
            ${x.bad?`<span class="b w" title="推荐时带避坑提示">避坑</span>`:''}</div>
          <div class="xs mut">${x.hit.length?`命中 ${esc(x.hit.join('、'))}`:''}${x.short?' · '+esc(x.short):''}</div>
          ${x.bad?`<div class="ai-pit">曾被 ${esc(x.bad.owner)} 淘汰：${esc(x.bad.reason||'期望薪资超出上限')}（${esc(x.bad.lastContact.slice(5,10))}）</div>`:''}
        </div>
        <div class="ai-score"><b>${x.score}</b><span>${x.tier}</span></div>
      </div>`).join('')}</div>`;
  }).join('') + (r.list.length?'':'<div class="mut sm" style="padding:14px">没有符合条件的候选人，放宽预筛条件试试</div>');
}

function aiRefresh(){
  const r = aiRank(AI.did);
  document.getElementById('aiFlow').innerHTML = aiFlowHtml(r);
  document.getElementById('aiList').innerHTML = aiListHtml(r);
  aiSum();
}
function aiPick(id, on){ if(on) AI.picked[id]=true; else delete AI.picked[id]; aiSum(); }
function aiPickGroup(g){
  aiRank(AI.did).list.filter(x=>x.tier===g).forEach(x=>AI.picked[x.p.id]=true);
  aiRefresh();
}
function aiSum(){
  const n = Object.keys(AI.picked).length;
  const el = document.getElementById('aiSel'), go = document.getElementById('aiGo');
  if(el) el.textContent = '已选 ' + n + ' 人';
  if(go) go.textContent = n? '捞入批次（'+n+'）+ 生成投递' : '先勾选候选人';
}
function aiAdopt(){
  const n = Object.keys(AI.picked).length;
  if(!n) return toast('请先勾选候选人');
  closeAll();
  toast('已采纳 '+n+' 人：写入批次并生成投递，AI 推荐已留痕');
}

/* ---------------- 记录联系（含 MP3 / 截图 AI 解析） ---------------- */
function followModal(pid, from){
  const p = P(pid) || appPerson(pid) || {name:'该人员', id:pid};
  const isArch = from==='archive';
  return `<div class="md-h"><div><h3>记录联系 · ${esc(p.name)}</h3>
    <p>可手填，也可上传录音 / 截图让 AI 解析，确认后回写画像</p></div><button class="dr-x" onclick="closeAll()">×</button></div>
  <div class="md-b">
    <div class="frow">
      <div class="field"><label>联系方式<i>*</i></label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${['电话','微信','线下见面','短信'].map((t,i)=>`<span class="chip ${i===0?'on':''}" onclick="pickChip(this)">${t}</span>`).join('')}
        </div></div>
      <div class="field"><label>沟通目的<i>*</i></label>
        <select>${PURPOSES.map(x=>`<option>${x}</option>`).join('')}</select></div>
    </div>

    <div class="field"><label>沟通结论<i>*</i></label>
      <textarea placeholder="例：接受 12 月初到岗，约周四上午线下面试">接受 12 月初到岗，约周四上午线下面试</textarea>
      <div class="hint">必填。时间线上只写“打了个电话”对下一个人没有价值</div></div>

    <div class="field"><label>上传录音 / 截图（选填）</label>
      <div class="up-drop">
        <div class="up-t">MP3 / m4a 录音 · 微信截图 · 现场照片</div>
        <div class="xs mut">单条 ≤ 20 分钟 · 单张 ≤ 10MB</div>
        <div class="up-files">
          <span class="up-file">通话录音_1113.mp3 <i>12:40</i> <b>解析完成</b></span>
          <span class="up-file">微信截图_1113.png <i>—</i> <b>解析完成</b></span>
        </div>
      </div>
      <label class="up-consent"><input type="checkbox" checked> 已告知对方并取得同意（录音属敏感个人信息，未勾选不允许上传）</label>
      <div class="hint" style="margin-top:6px">手机端上传<b>本期不做</b>：录音请先在手机上导出/传到电脑，再从电脑端这条记录上传。录音长期保留，候选人要求删除时按删除申请处理。</div>
    </div>

    <div class="ai-res">
      <div class="ai-res-h">AI 解析结果 · 抽出 6 项，<b>4 项待确认</b>
        <span class="xs mut" style="margin-left:auto">高置信默认勾选，低置信默认不勾</span></div>
      <div class="ai-item"><span class="ai-q">“我这边下个月初就能走，周四上午过去看看”</span>
        <div class="ai-v"><span class="b g">可到岗 12-05</span><span class="link xs">确认</span><span class="link xs mut">忽略</span></div></div>
      <div class="ai-item"><span class="ai-q">“工资能不能到 36”</span>
        <div class="ai-v"><span class="b w">期望薪资 36 元/时（档案记 32-36，不覆盖）</span><span class="link xs">确认</span><span class="link xs mut">忽略</span></div></div>
      <div class="ai-item"><span class="ai-q">“加班太多我可能不太行，最好别排夜班”</span>
        <div class="ai-v"><span class="b w">画像判断 · 适配：不接受夜班（低置信，默认不勾）</span><span class="link xs">确认</span><span class="link xs mut">忽略</span></div></div>
      <div class="ai-item"><span class="ai-q">“周四上午十点，我准时到”</span>
        <div class="ai-v"><span class="b i">待办：11-14 10:00 面试提醒</span><span class="link xs">确认</span><span class="link xs mut">忽略</span></div></div>
      <div class="xs mut" style="margin-top:8px">事实类需你确认才写入（不静默覆盖）；判断类只进画像并标「AI 推断」；待办类自动进首页重点关注。原文录音与转写全文留在这条记录上，可回听。</div>
    </div>

    <div class="frow">
      <div class="field"><label>下次跟进</label><input type="date" value="2026-11-14"></div>
      <div class="field"><label>标记重点</label><select><option>不标记</option><option>标记为重点关注</option></select></div>
    </div>
  </div>
  <div class="md-f"><button class="btn" onclick="closeAll()">取消</button>
    <button class="btn pri" onclick="closeAll();toast('已保存：时间线 +1 条，画像 2 项已更新，待办已生成')">保存并回写</button></div>`;
}
