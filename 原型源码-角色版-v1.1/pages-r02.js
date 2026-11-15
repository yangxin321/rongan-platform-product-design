/* ===== R02 客户负责人 ===== */

function r02Interviews(){
  /* v1.3 · RG-012 第二批：去掉「待面试 / 面试通过 / 面试未通过 / 待我确认」四张统计卡。
     第四张与第二张其实是同一个数（都数 node==='面试通过'），本来就重复；
     现在统一改成工具栏的「简历结果」筛选，筛出来的就是那批人，条数由「共 N 人」给。
     搜索框以前也不生效（rows 直接拿 PERSONS），这次一并接上。 */
  const q = (S.f.q||'').trim(), res = S.f.res || '';
  let rows = PERSONS.filter(p=>['待面试','面试通过'].includes(p.node) || p.itvFail);
  if(q) rows = rows.filter(p=>(p.name+D(p.demandId).post+D(p.demandId).client).includes(q));
  if(res==='wait') rows = rows.filter(p=>p.node!=='面试通过' && !p.itvFail);
  if(res==='pass') rows = rows.filter(p=>p.node==='面试通过');
  if(res==='fail') rows = rows.filter(p=>!!p.itvFail);
  const list = rows.map(p=>{
    const ok = p.node==='面试通过';
    const fail = !!p.itvFail;
    const resB = ok? '<span class="b g">通过</span>' : fail? '<span class="b r">未通过</span>' : '<span class="b w">待面</span>';
    const confB = ok? '<span class="b g">已确认</span>' : fail? '<span class="b n">已记录</span>' : '<span class="b w">待我确认</span>';
    const when = ok? '11-12 14:00' : fail? (p.itvAt||'11-13 10:00') : '11-14 09:30';
    return `<tr class="clk" onclick="openPerson('${p.id}')">
      <td><div class="t-name"><span class="arc-link" onclick="event.stopPropagation();openArchive('${p.personId}','resume')">${esc(p.name)}</span></div><div class="t-sub">${p.age}岁 · ${esc(p.skills[0])}</div></td>
      <td><div class="sm">${esc(D(p.demandId).post)}</div><div class="t-sub">${esc(D(p.demandId).client)}</div></td>
      <td class="mono sm">${when}</td>
      <td><span class="b n">${p.owner}</span></td>
      <td>${resB}</td>
      <td>${confB}</td>
      <td><div class="acts">
        <span class="link" onclick="event.stopPropagation();openArchive('${p.personId}','resume')">看简历</span>
        ${ok||fail?'':`<span class="link" onclick="event.stopPropagation();itvMark('${p.id}','pass')">记通过</span>
          <span class="link" onclick="event.stopPropagation();itvMark('${p.id}','fail')">记未通过</span>`}
        ${ok?'<span class="link" onclick="event.stopPropagation();toast(\'已代客户确认面试通过\')">确认结果</span>':''}
      </div></td></tr>`;
  }).join('');
  const nWait = PERSONS.filter(p=>p.node==='待面试').length;
  const nOk = PERSONS.filter(p=>p.node==='面试通过').length;
  const nFail = PERSONS.filter(p=>p.itvFail).length;
  return `<div class="page">
    ${head('面试管理','线下面试留痕 · 结果分「通过 / 未通过」，客户确认后对工人公开', `<button class="btn" onclick="toast('已导出面试排期')">导出排期</button>`)}
    ${toolbar({q:'搜索姓名 / 岗位', filters:[
      {k:'res',opts:[
        {v:'',label:`全部面试 · ${nWait+nOk+nFail}`},
        {v:'wait',label:`待面 · ${nWait}`},
        {v:'pass',label:`通过 · ${nOk}（待我确认 ${nOk}）`},
        {v:'fail',label:`未通过 · ${nFail}`},
      ]}
    ], right:`<span class="sm mut">共 ${rows.length} 人</span>`})}
    <div class="tbl-wrap"><table>
      <thead><tr><th>候选人</th><th>需求</th><th>面试时间</th><th>招聘专员</th><th>结果</th><th>客户确认</th><th>操作</th></tr></thead>
      <tbody>${list || '<tr><td colspan="7"><div class="empty">当前筛选下没有面试记录</div></td></tr>'}</tbody></table></div>
    ${pager(rows.length)}
  </div>`;
}
/* 记面试结果：通过 → 进待入职；未通过 → 已淘汰但留痕 */
function itvMark(pid, r){
  const p = P(pid); if(!p) return;
  if(r==='pass'){ p.node='面试通过'; p.itvAt = TODAY+' 14:00'; toast(`${p.name} · 面试通过，等客户确认后转待入职`); }
  else { p.node='已淘汰'; p.status='无意向'; p.itvFail=true; p.itvAt = TODAY+' 14:00';
    p.reason = p.reason || '面试未通过'; toast(`${p.name} · 面试未通过，已记录（可回查，不再进漏斗）`); }
  render();
}

PAGES.interviews = {R02:r02Interviews};

/* ===== E01 工人端 ===== */
function phoneWrap(body, tab){
  const tabs = [['jobs','找工作','▤'],['progress','我的进度','◍'],['todos','待办','✓'],['mine','我的','◉']];
  return `<div class="page" style="padding-top:20px">
    <div class="page-head" style="max-width:none"><div><h2>工人端（小程序）</h2>
      <p>工人不看分数、不看其他候选人，只看自己的进度和下一步该做什么</p></div>
      <div class="page-actions"><span class="b n">E01 · 张建国</span></div></div>
    <div class="phone-wrap"><div class="phone">
      <div class="ph-status"><span>9:41</span><span>●●● ▮</span></div>
      <div class="ph-body">${body}</div>
      <div class="ph-tabbar">${tabs.map(t=>`<button class="${tab===t[0]?'on':''}" onclick="go('${t[0]}')"><span style="font-size:15px">${t[2]}</span>${t[1]}</button>`).join('')}</div>
    </div></div>
  </div>`;
}

function e01Jobs(){
  const body = `
    <div style="background:linear-gradient(160deg,#d9541e,#b94d2c);padding:20px 18px 26px;color:#fff">
      <div style="font-size:13px;opacity:.85">你好，张建国</div>
      <div style="font-size:19px;font-weight:600;margin-top:3px">今天有 3 个岗位适合你</div>
      <div style="margin-top:14px;background:rgba(255,255,255,.18);border-radius:9px;padding:9px 12px;font-size:12.5px">搜索岗位 / 城市 / 工价</div>
    </div>
    <div style="padding:0 14px;margin-top:-14px">
      ${[['售后运维工程师','立讯精密 · 东莞松山湖','32-38 元/时','12 人 · 急招','匹配你的电气调试经验'],
         ['CNC 操作工','领益智造 · 东莞长安','30-36 元/时','15 人','你会 FANUC 系统'],
         ['装配调试技师','华工激光 · 武汉','30-34 元/时','8 人','激光设备经验优先']].map((j,i)=>`
        <div class="ph-card" style="margin:10px 0">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div><h4>${j[0]}</h4><div class="pc-sub">${j[1]}</div></div>
            ${i===0?'<span class="b a">推荐</span>':''}
          </div>
          <div class="ph-kv"><span style="color:var(--accent);font-weight:600">${j[2]}</span><span>${j[3]}</span></div>
          <div style="font-size:11.5px;color:var(--ink3);margin-top:8px">${j[4]}</div>
          <div class="ph-btns"><button class="ph-btn">看详情</button><button class="ph-btn pri" onclick="toast('已报名，招聘专员会联系你')">立即报名</button></div>
        </div>`).join('')}
    </div>`;
  return phoneWrap(body,'jobs');
}

function e01Progress(){
  const steps = [['已报名','11-10 完成'],['资料补全','11-11 已提交'],['已推荐给客户','11-12'],['面试','11-14 09:30 松山湖'],['体检','待安排'],['入职','待安排']];
  const body = `
    <div class="ph-head"><h3>我的进度</h3><p>立讯精密 · 售后运维工程师</p></div>
    <div class="ph-card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="width:38px;height:38px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-size:16px">◍</div>
        <div><div style="font-size:14px;font-weight:600">正在面试阶段</div><div class="pc-sub">还有 2 步就到岗</div></div>
      </div>
      ${steps.map((s,i)=>`<div style="display:flex;gap:10px;padding:7px 0">
        <div style="width:18px;text-align:center">
          <div style="width:14px;height:14px;border-radius:50%;background:${i<3?'var(--good)':i===3?'var(--accent)':'var(--line2)'};margin:2px auto 0"></div>
        </div>
        <div style="flex:1;padding-bottom:4px">
          <div style="font-size:13px;font-weight:${i===3?'600':'400'};color:${i>3?'var(--ink4)':'var(--ink)'}">${s[0]}</div>
          <div style="font-size:11.5px;color:var(--ink3)">${s[1]}</div>
        </div>
      </div>`).join('')}
      <div class="ph-btns"><button class="ph-btn pri" onclick="toast('已记住面试时间')">面试须知</button><button class="ph-btn">联系专员</button></div>
    </div>
    <div class="ph-card">
      <h4 style="font-size:13px">面试提醒</h4>
      <div class="pc-sub" style="margin-top:4px">11 月 14 日 09:30 · 东莞松山湖科技路 8 号</div>
      <div style="font-size:11.5px;color:var(--ink3);margin-top:6px">请携带身份证、低压电工证原件</div>
    </div>`;
  return phoneWrap(body,'progress');
}

function e01Todos(){
  const body = `
    <div class="ph-head"><h3>待办</h3><p>2 项需要你处理</p></div>
    ${[['补充资料','还差 3 项：低压电工证照片、上一份工作证明、期望到岗时间','去补全','11-14 前'],
       ['确认面试','11-14 09:30 松山湖现场面试，请确认是否到场','确认到场','今天'],
       ['体检安排','面试通过后开放','—','暂不可用']].map((t,i)=>`
      <div class="ph-card" style="${i===2?'opacity:.55':''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <h4>${t[0]}</h4><span class="b ${i===1?'r':'w'}">${t[3]}</span></div>
        <div class="pc-sub" style="margin-top:5px;line-height:1.6">${t[1]}</div>
        ${i<2?`<div class="ph-btns"><button class="ph-btn pri" onclick="toast('${t[2]}')">${t[2]}</button></div>`:''}
      </div>`).join('')}`;
  return phoneWrap(body,'todos');
}

function e01Mine(){
  const body = `
    <div style="background:#fff;padding:18px;display:flex;align-items:center;gap:12px">
      <div style="width:52px;height:52px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-size:20px;font-weight:600">张</div>
      <div><div style="font-size:16px;font-weight:600">张建国</div>
        <div class="pc-sub">男 · 34岁 · 电气调试 8 年</div></div>
      <div style="flex:1"></div><span class="b g">资料 92%</span>
    </div>
    <div class="ph-card">
      <h4 style="font-size:13px">我的资料</h4>
      <div class="ph-kv"><span>电话 138****6621</span><span>期望城市 东莞</span><span>期望薪资 35 元/时</span><span>可到岗 12 月初</span></div>
      <div class="ph-btns"><button class="ph-btn" onclick="toast('进入资料编辑')">编辑资料</button></div>
    </div>
    ${[['我的报名','3 个'],['已入职记录','1 段'],['我的证书','低压电工证'],['帮助与反馈','']].map(m=>`
      <div style="background:#fff;padding:14px 18px;border-bottom:1px solid var(--line2);display:flex;justify-content:space-between;font-size:13.5px">
        <span>${m[0]}</span><span class="mut">${m[1]} ›</span></div>`).join('')}`;
  return phoneWrap(body,'mine');
}

PAGES.jobs = {E01:e01Jobs};
PAGES.progress = {E01:e01Progress};
PAGES.todos = {E01:e01Todos};
PAGES.mine = {E01:e01Mine};
