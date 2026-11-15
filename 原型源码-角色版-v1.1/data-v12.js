/* =======================================================================
   v1.2 数据与判定层（RG-001 ~ RG-004）
   1. 三态：已核实符合 / 信息待确认 / 已确认不符合
   2. 需求版本（同一需求多版本，只有「生效」版本可用于匹配）
   3. 受控链接（只读确认单，可失效 / 可撤销）
   4. 候选人核实依据（证书 / 城市 / 到岗 / 夜班意愿）
   5. 逐项判定 + 汇总
   说明：本文件全部为演示数据，字段口径见 REVIEW.md
   ======================================================================= */

/* ---------- 1. 三态 ---------- */
const TRI = {
  ok:  { name:'已核实符合', tone:'g', mark:'✓' },
  pend:{ name:'信息待确认', tone:'w', mark:'?' },
  no:  { name:'已确认不符合', tone:'r', mark:'×' },
};
const TRI_RANK = { ok:0, pend:1, no:2 };

function tri(s, extra){
  const m = TRI[s] || TRI.pend;
  return `<span class="b ${m.tone}">${m.mark} ${m.name}${extra?` · ${esc(extra)}`:''}</span>`;
}
function triS(s){ const m = TRI[s] || TRI.pend; return `<span class="b ${m.tone}">${m.mark}</span>`; }
function triSum(list){
  if((list||[]).some(x=>x.state==='no')) return 'no';
  if((list||[]).some(x=>x.state==='pend')) return 'pend';
  return 'ok';
}
const TRI_SUM_TXT = { ok:'全部硬条件已核实符合', pend:'存在信息缺口，暂不可判定', no:'存在已确认不符合的硬条件' };

/* ---------- 2. 需求对候选人的可判定条件 ----------
   47 项里「分级」是字段确认级别；对候选人判定时，凡客户明示的硬条件都进三态。
   19 夜班 / 26 证书 原为「二级·必填」，但属高频误判条件，本版纳入三态，界面仍标注原分级。
   年龄 / 性别 只按客户明示条件比对，不替代能力判断（见 REVIEW.md §3）。            */
const CAND_KEYS = [
  {key:'city',   no:3,  label:'用工地点 / 工作意愿', grade:'一级·PASS'},
  {key:'arrive', no:7,  label:'最晚报到日 / 可到岗时间', grade:'一级·PASS'},
  {key:'age',    no:10, label:'年龄区间', grade:'一级·PASS'},
  {key:'gender', no:11, label:'性别要求', grade:'一级·PASS'},
  {key:'trade',  no:22, label:'工种', grade:'一级·PASS'},
  {key:'skill',  no:25, label:'专业技能项', grade:'一级·PASS'},
  {key:'cert',   no:26, label:'证书要求', grade:'二级·必填'},
  {key:'night',  no:19, label:'夜班', grade:'二级·必填'},
];
const BONUS_KEYS = [
  {key:'exp',    no:27, label:'特殊经验要求'},
  {key:'equip',  no:28, label:'设备 / 工艺经验'},
  {key:'draw',   no:29, label:'独立看图能力'},
  {key:'lang',   no:31, label:'语言 / 沟通要求'},
];

/* 需求侧硬条件（演示口径：由 47 项快照 + 标准岗位标准提炼，非客户原始值） */
const DEMAND_GATE = {
  D1:{ city:'东莞', age:[18,45], gender:'不限', night:'需要', trade:'售后运维',
       skill:['非标设备调试','电气调试','PLC'], cert:['低压电工证'], certMust:false, arriveBy:'2026-12-15' },
  D2:{ city:'武汉', age:[18,40], gender:'不限', night:'不需要', trade:'装配调试',
       skill:['激光装配','装配调试','光路'], cert:[], certMust:false, arriveBy:'2026-12-08' },
  D3:{ city:'宜宾', age:[18,40], gender:'不限', night:'不需要', trade:'品质检验',
       skill:['IQC','来料检验','卡尺'], cert:[], certMust:false, arriveBy:'2026-11-30' },
  D4:{ city:'上海', age:[18,45], gender:'不限', night:'不需要', trade:'船舶电工',
       skill:['船舶电气','电气舾装','船厂'], cert:['电工特种作业操作证'], certMust:true, arriveBy:'2026-11-28' },
  D5:{ city:'青岛', age:[18,40], gender:'不限', night:'需要', trade:'总装装配',
       skill:['总装','装配','流水线'], cert:[], certMust:false, arriveBy:'2026-12-20' },
  D6:{ city:'深圳', age:[18,45], gender:'不限', night:'不需要', trade:'售后技术',
       skill:['3C 组装','售后'], cert:[], certMust:false, arriveBy:'2026-11-15' },
  D7:{ city:'东莞', age:[18,42], gender:'不限', night:'需要', trade:'CNC 操作',
       skill:['CNC','对刀','FANUC'], cert:[], certMust:false, arriveBy:'2026-12-01' },
  D8:{ city:'苏州', age:[18,45], gender:'不限', night:'不需要', trade:'装配钳工',
       skill:['钳工','装配'], cert:[], certMust:false, arriveBy:'2026-12-25' },
};
const TRADE_KW = {
  D1:['售后','客户现场','非标'], D2:['激光','装配','光电'], D3:['IQC','来料','品质','检验'],
  D4:['电工','船舶','电气','舾装','船厂'], D5:['总装','装配','流水线','组装'],
  D6:['售后','3C'], D7:['CNC','加工中心','对刀','编程'], D8:['钳工','装配','钳'],
};

/* ---------- 3. 候选人核实依据（按人员档案 personId 归集） ----------
   certs  ：证书名称独立字段，技能关键词不得推断为持证
   city   ：现居地与愿意工作城市分开记，各自带确认状态
   arrive ：候选人明确确认的可到岗日期
   night  ：夜班意愿
   只有 state 字段决定三态；src/ev/at 用于展示依据来源。                        */
const VERIFY = {};

/* 默认生成：大多数人在某一两项上待确认，避免演示时「全员已核实」的假象 */
(function seedVerify(){
  const CITIES = {D1:'东莞',D2:'武汉',D3:'宜宾',D4:'上海',D5:'青岛',D6:'深圳',D7:'东莞',D8:'苏州'};
  PERSONS.forEach((p,i)=>{
    const w = i % 7;
    const v = {
      certs:[],
      city:{ live:'苏州', liveState:'已核实', want:[CITIES[p.demandId]||'—'], wantState: w===3?'待确认':'已确认',
             src: w===3?'未确认':(i%2?'电话确认':'候选人微信回复'), at:'2026-11-13 10:0'+(i%9) },
      arrive:{ date:'2026-11-2'+(2+(i%6)), state: w===4?'待确认':'已确认',
               src: i%2?'电话确认':'微信确认', at:'2026-11-13 09:3'+(i%9) },
      night:{ state: w===5?'已确认不愿':(w===1?'未确认':'已确认愿意'), src:'电话确认', at:'2026-11-13 10:1'+(i%8) },
    };
    VERIFY[p.personId] = v;
  });
})();

/* 关键样本（对应 RG-003 / RG-004 验收场景）
   注意：按「姓名 → 人员档案 id」定位，不硬编码 PE00X ——
   同一手机号重复投递会复用同一个档案 id，硬编码会错位。 */
const VID = {};
PERSONS.forEach(p=>{ if(!VID[p.name]) VID[p.name] = p.personId; });
const V = n => VID[n];
Object.assign(VERIFY, {
  /* P1 张建国 86 分 · 技能相关、有「电工」技能词但无证书记录、夜班未问清 → 待确认 */
  [V('张建国')]:{ certs:[], certNote:'简历技能栏写「电工」，未附证书照片，不得据此判定持证',
    city:{ live:'苏州', liveState:'已核实', want:['东莞'], wantState:'已确认', src:'电话确认（09:20）', at:'2026-11-13 09:20' },
    arrive:{ date:'2026-11-18', state:'已确认', src:'电话确认', at:'2026-11-13 09:25' },
    night:{ state:'未确认', src:'—', at:'—' } },

  /* P2 王秀兰 84 分 · 全部硬条件已核实（场景 C） */
  /* 李海涛 91 分 · 全部硬条件已核实（场景 C：唯一可推荐样本） */
  [V('李海涛')]:{ certs:[{name:'低压电工证', state:'ok', src:'证书原件核验', ev:'原件拍照 + 应急管理部查询截图，2024-03 发证', at:'2026-11-13 10:05'}],
    city:{ live:'东莞', liveState:'已核实', want:['东莞'], wantState:'已确认', src:'电话确认', at:'2026-11-13 10:05' },
    arrive:{ date:'2026-11-15', state:'已确认', src:'电话确认', at:'2026-11-13 10:06' },
    night:{ state:'已确认愿意', src:'电话确认', at:'2026-11-13 10:06' } },

  [V('王秀兰')]:{ certs:[{name:'低压电工证', state:'ok', src:'简历附件', ev:'证书照片，2024-06 发证，编号 3205***', at:'2026-11-12 10:05'}],
    city:{ live:'东莞', liveState:'已核实', want:['东莞'], wantState:'已确认', src:'入职登记表', at:'2026-11-10 09:00' },
    arrive:{ date:'2026-11-12', state:'已确认', src:'入职登记表', at:'2026-11-10 09:00' },
    night:{ state:'已确认愿意', src:'入职面谈', at:'2026-11-10 09:10' } },

  /* P3 陈志强 72 分 · 有证书照片但未核验（技能名 ≠ 持证） */
  [V('陈志强')]:{ certs:[{name:'低压电工证', state:'pend', src:'简历附件', ev:'照片模糊，证件号与发证日期不可辨', at:'2026-11-13 09:55'}],
    city:{ live:'深圳', liveState:'已核实', want:['东莞'], wantState:'已确认', src:'电话确认', at:'2026-11-13 09:55' },
    arrive:{ date:'2026-11-22', state:'已确认', src:'电话确认', at:'2026-11-13 09:58' },
    night:{ state:'已确认愿意', src:'电话确认', at:'2026-11-13 09:58' } },

  /* P4 刘明辉 68 分 · 到岗未确认 + 城市意愿无记录（场景 D：列信息缺口） */
  [V('刘明辉')]:{ certs:[], city:{ live:'广州', liveState:'已核实', want:[], wantState:'待确认', src:'未确认', at:'—' },
    arrive:{ date:'', state:'待确认', src:'—', at:'—' }, night:{ state:'未确认', src:'—', at:'—' } },

  /* P5 赵鹏 88 分 · 高总分但城市已确认不符合（场景 B） */
  [V('赵鹏')]:{ certs:[{name:'低压电工证', state:'ok', src:'简历附件', ev:'证书照片，2025-01 发证', at:'2026-11-12 17:10'}],
    city:{ live:'深圳', liveState:'已核实', want:['深圳','惠州'], wantState:'已确认',
           src:'候选人微信：「东莞太远，只在深圳、惠州」', at:'2026-11-12 17:12' },
    arrive:{ date:'2026-11-16', state:'已确认', src:'微信确认', at:'2026-11-12 17:12' },
    night:{ state:'已确认愿意', src:'微信确认', at:'2026-11-12 17:13' } },

  /* P8 郑海峰 87 分 · D4 船舶电工，证书已核验，全部符合 */
  [V('郑海峰')]:{ certs:[{name:'电工特种作业操作证', state:'ok', src:'证书原件核验', ev:'原件拍照 + 应急管理部查询截图，2023-08 发证', at:'2026-11-13 09:45'}],
    city:{ live:'南通', liveState:'已核实', want:['上海'], wantState:'已确认', src:'电话确认', at:'2026-11-13 09:40' },
    arrive:{ date:'2026-11-20', state:'已确认', src:'电话确认', at:'2026-11-13 09:42' },
    night:{ state:'已确认愿意', src:'电话确认', at:'2026-11-13 09:42' } },

  /* P9 马长青 70 分 · 技能词含「电工证书」但无证据 → 证书待确认 */
  [V('马长青')]:{ certs:[{name:'电工特种作业操作证', state:'pend', src:'候选人自述', ev:'简历技能栏写「电工证书」，未提供证件', at:'2026-11-13 11:00'}],
    city:{ live:'南通', liveState:'已核实', want:['上海'], wantState:'已确认', src:'微信确认', at:'2026-11-13 11:00' },
    arrive:{ date:'2026-11-25', state:'已确认', src:'微信确认', at:'2026-11-13 11:05' },
    night:{ state:'未确认', src:'—', at:'—' } },

  /* P10 高建军 85 分 · 城市意愿待确认（现居南通，未问是否愿去上海） */
  [V('高建军')]:{ certs:[{name:'电工特种作业操作证', state:'ok', src:'证书原件核验', ev:'原件拍照，2022-05 发证', at:'2026-11-12 14:00'}],
    city:{ live:'南通', liveState:'已核实', want:[], wantState:'待确认', src:'未确认', at:'—' },
    arrive:{ date:'2026-11-22', state:'已确认', src:'电话确认', at:'2026-11-12 14:05' },
    night:{ state:'已确认愿意', src:'电话确认', at:'2026-11-12 14:05' } },

  /* P13 徐立新 48 分 · 证书无、年龄超客户明示区间 */
  [V('徐立新')]:{ certs:[{name:'电工特种作业操作证', state:'no', src:'候选人确认', ev:'「证过期了，还没复审」', at:'2026-11-12 11:20'}],
    city:{ live:'南通', liveState:'已核实', want:['上海'], wantState:'已确认', src:'电话确认', at:'2026-11-12 11:20' },
    arrive:{ date:'2026-11-30', state:'已确认', src:'电话确认', at:'2026-11-12 11:22' },
    night:{ state:'已确认愿意', src:'电话确认', at:'2026-11-12 11:22' } },

  /* P16 谢天成 61 分 · 新入库，资料几乎空白（场景 D） */
  [V('谢天成')]:{ certs:[], city:{ live:'—', liveState:'待确认', want:[], wantState:'待确认', src:'未填', at:'—' },
    arrive:{ date:'', state:'待确认', src:'—', at:'—' }, night:{ state:'未确认', src:'—', at:'—' } },
});

function verifyOf(pid){ return VERIFY[pid] || { certs:[], city:{wantState:'待确认'}, arrive:{state:'待确认'}, night:{state:'未确认'} }; }

/* 匹配用的条件＝**生效版本**的快照；未生效的新版条件一律不得参与判断（AGENTS R4）。
   版本对象上带 gate 就以此为准，否则退回需求基础快照。 */
function gateOf(d){
  const av = activeVer(d);
  const base = DEMAND_GATE[d.id] || {};
  const snap = (av && av.gate) ? av.gate : null;
  return snap ? Object.assign({}, base, snap) : base;
}

/* ---------- 4. 逐项判定 ---------- */
function assessPerson(p, d){
  const g = gateOf(d);
  const v = verifyOf(p.personId);
  const out = [];
  const push = (key, state, need, got, src, ev, at, note)=>{
    const meta = CAND_KEYS.find(k=>k.key===key) || {};
    out.push({ key, no:meta.no, label:meta.label, grade:meta.grade, state, need, got, src, ev, at, note });
  };

  /* 3 用工地点 / 工作意愿 */
  {
    const c = v.city || {};
    let st = 'pend', got = '无记录', note = '缺城市意愿记录';
    if(c.wantState === '已确认' && (c.want||[]).length){
      const hit = (c.want||[]).some(x => (g.city||'').includes(x));
      st = hit ? 'ok' : 'no';
      got = `愿意 ${c.want.join('、')}（现居 ${c.live||'—'}）`;
      note = hit ? '' : `客户地点为 ${g.city}，候选人明确不愿异地`;
    } else if(c.wantState === '待确认'){
      got = `现居 ${c.live||'—'}，愿意城市未确认`; note = '不以现居地推断异地意愿';
    }
    push('city', st, g.city||'—', got, c.src||'—', '', c.at||'—', note);
  }

  /* 7 最晚报到日 / 可到岗时间 */
  {
    const a = v.arrive || {};
    let st = 'pend', got = '未确认到岗日期', note = '不以「无进行中投递」推断可到岗';
    if(a.state === '已确认' && a.date){
      const late = a.date > g.arriveBy;
      st = late ? 'no' : 'ok';
      got = `${a.date} 可到岗`;
      note = late ? `晚于最晚报到日 ${g.arriveBy}` : '';
    }
    push('arrive', st, g.arriveBy||'—', got, a.src||'—', '', a.at||'—', note);
  }

  /* 10 年龄区间（客户明示条件，非能力判断） */
  {
    const [lo,hi] = g.age || [0,99];
    const okAge = p.age >= lo && p.age <= hi;
    push('age', okAge?'ok':'no', `${lo}–${hi} 岁`, `${p.age} 岁`, '人员档案', '',
      '—', okAge ? '仅按客户明示条件比对，不作为能力替代指标' : '超出客户明示年龄区间，已标为待业务与合规复核');
  }

  /* 11 性别要求 */
  {
    const need = g.gender || '不限';
    const st = (need==='不限') ? 'ok' : (p.gender===need?'ok':'no');
    push('gender', st, need, p.gender, '人员档案', '', '—', need==='不限'?'客户未设限制':'客户明示条件');
  }

  /* 22 工种 —— 先分「无资料」与「明确不匹配」，缺资料不等于不符合 */
  {
    /* 老需求有手写关键词表；新建需求没有，就用它自己的条件快照（工种 + 技能项）当关键词，
       否则新需求一建出来，所有有简历的人都会被判成「技能栏未出现关键词」= 不符合。 */
    const kw = TRADE_KW[d.id] || [].concat(g.skill||[], String(g.trade||'').split(/[\s\/·、]+/)).filter(Boolean);
    const skills = p.skills || [];
    const hit = skills.find(s => kw.some(k => s.includes(k)));
    const st = hit ? 'ok' : (skills.length ? 'no' : 'pend');
    push('trade', st, g.trade||'—',
      hit ? `技能含「${hit}」` : (skills.length ? skills.join('、') : '无技能记录'),
      skills.length ? '简历技能栏' : '无来源', '', '—',
      hit ? '' : (skills.length ? '技能栏未出现该工种关键词' : '没有技能资料，不得据此判定不符合'));
  }

  /* 25 专业技能项 —— 需求未设要求时直接符合；无资料待确认 */
  {
    const need = g.skill || [];
    const skills = p.skills || [];
    const hits = need.filter(k => skills.some(s => s.includes(k) || k.includes(s)));
    let st = 'pend', got = '', note = '';
    if(!need.length){
      st = 'ok'; got = '—'; note = '该需求未设专业技能要求';
    } else if(hits.length){
      st = 'ok'; got = `命中 ${hits.join('、')}`;
    } else if(!skills.length){
      got = '无技能记录'; note = '没有技能资料，不得据此判定不符合';
    } else {
      st = 'no'; got = skills.join('、') || '—'; note = '技能项与要求无交集';
    }
    push('skill', st, need.join('、')||'—', got, skills.length ? '简历技能栏' : '无来源', '', '—', note);
  }

  /* 26 证书：独立字段 + 核验状态；技能名不得推断持证 */
  {
    const need = g.cert || [];
    if(!need.length){
      push('cert', 'ok', '无证书要求', '—', '需求快照', '', '—', '该需求未设证书硬条件');
    } else {
      const rec = (v.certs||[]).find(c => need.some(n => c.name.includes(n) || n.includes(c.name)));
      let st = 'pend', got = '无证书记录', note = '技能关键词不得推断为持证';
      if(rec){
        got = `${rec.name}（${rec.state==='ok'?'已核验':rec.state==='no'?'明确不满足':'待核验'}）`;
        st = rec.state === 'ok' ? 'ok' : rec.state === 'no' ? 'no' : 'pend';
        note = rec.state === 'pend' ? '证据不足，需补充证件或核验' : '';
        if(rec.state === 'no') note = '候选人明确表示不满足';
        push('cert', st, need.join('、'), got, rec.src||'—', rec.ev||'', rec.at||'—', note);
      } else {
        if(v.certNote) note = v.certNote;
        push('cert', st, need.join('、'), got, '—', '', '—', note);
      }
    }
  }

  /* 19 夜班 */
  {
    const need = g.night || '不需要';
    const n = v.night || {};
    let st = 'ok', got = '不需要夜班', note = '';
    if(need === '需要'){
      if(n.state === '已确认愿意'){ st='ok'; got='已确认可接受夜班'; }
      else if(n.state === '已确认不愿'){ st='no'; got='明确不接受夜班'; note='候选人明确拒绝'; }
      else { st='pend'; got='夜班意愿未确认'; note='需向候选人确认'; }
    }
    push('night', st, need, got, n.src||'—', '', n.at||'—', note);
  }

  return out;
}

/* 加分项：只影响排序，不参与 Pass 判定 */
function bonusOf(p, d){
  const v = verifyOf(p.personId);
  const list = [];
  const has = kw => (p.skills||[]).some(s => kw.some(k => s.includes(k)));
  list.push({ label:'设备 / 工艺经验', hit: has(['FANUC','激光','船舶','CNC','伺服','线体']), src:'简历技能栏' });
  list.push({ label:'特殊经验要求', hit: has(['非标','船厂','重工','3C']), src:'简历技能栏' });
  list.push({ label:'独立看图能力', hit: has(['图纸','看图','识图']), src:'简历技能栏' });
  list.push({ label:'语言 / 沟通要求', hit: true, src:'面试记录' });
  return list;
}

/* ---------- 5. 需求版本 ---------- */
/* 版本状态机：待客户确认 → 待内部审核 → 生效 → 已被取代
                                   ↘ 已退回 → （补充后）待内部审核
   audit 位单独记「谁审的、何时、什么意见」，与状态分开存 */
const DEMAND_VERS = {
  D1:[
    {v:'v1.0', status:'已被取代', audit:'已通过', at:'2026-11-05 10:20', by:'金诚（代客户登记）', way:'微信', n:47,
     note:'首版，客户口头确认', changes:[]},
    {v:'v1.1', status:'生效', audit:'已通过', at:'2026-11-10 14:20', by:'金诚（代客户登记）', way:'微信', n:47,
     note:'客户上调工价并放宽到岗时间',
     changes:[{f:'工价', from:'30-36 元/时', to:'32-38 元/时'},{f:'最晚报到日', from:'2026-12-08', to:'2026-12-15'}]},
  ],
  D7:[
    {v:'v1.0', status:'生效', audit:'已通过', at:'2026-11-02 09:40', by:'王浩（代客户登记）', way:'电话', n:47,
     note:'旧版仍生效，直至新版确认后自动取代', changes:[],
     gate:{ arriveBy:'2026-11-25' }},
    {v:'v1.1', status:'待重新确认', audit:'未送审', at:'2026-11-12 16:10', by:'王浩', way:'待客户反馈', n:47,
     note:'客户口头改工价与到岗日，尚未回签',
     changes:[{f:'工价', from:'28-32 元/时', to:'30-36 元/时'},{f:'最晚报到日', from:'2026-11-25', to:'2026-12-01'}],
     gate:{ arriveBy:'2026-12-01' }},
  ],
  D8:[
    {v:'v1.0', status:'待客户确认', audit:'未送审', at:'2026-11-01 15:00', by:'王浩', way:'链接已发出', n:47,
     note:'新单，客户尚未反馈', changes:[]},
  ],
};
/* 其余需求：单版本，已生效 */
DEMANDS.forEach(d=>{
  if(!DEMAND_VERS[d.id]){
    DEMAND_VERS[d.id] = [{v:'v1.0', status: d.confirm==='已确认'?'生效':'待客户确认',
      audit: d.confirm==='已确认'?'已通过':'未送审',
      at:'2026-11-0'+(1+Number(d.id.slice(1))%9)+' 10:00', by:'金诚（代客户登记）', way:'微信', n:47,
      note:'首版确认', changes:[]}];
  }
});
/* 演示样本：D3 已代登记、等内部审核（旧版仍生效）；D4 代登记被内部退回 */
DEMAND_VERS.D3.push({v:'v1.1', status:'待内部审核', audit:'待审核', at:'2026-11-13 09:40', by:'金诚', way:'电话', n:47,
  note:'客户电话要求把最晚报到日提前，已按客户原话代登记，等待内部审核',
  changes:[{f:'最晚报到日', from:'2026-11-30', to:'2026-11-28'}],
  /* 版本必须自带条件快照：审核通过后 gateOf 读的就是这一份，不能退回基础值 */
  gate:{arriveBy:'2026-11-28'}});
DEMAND_VERS.D4.push({v:'v1.1', status:'已退回', audit:'已退回', at:'2026-11-12 17:20', by:'金诚', way:'微信', n:47,
  note:'客户只说「到岗时间再谈」，未落到具体日期，第 7 项无法判定',
  auditBy:'王浩', auditAt:'2026-11-12 18:02',
  auditNote:'退回：反馈未落到具体日期，且缺客户原话截图。请补充后重新送审。',
  changes:[{f:'最晚报到日', from:'2026-12-10', to:'再谈（未定）'}]});

const VER_OPEN = ['待客户确认','待重新确认','待内部审核','已退回'];
const VER_TONE = {'生效':'g','待客户确认':'w','待重新确认':'w','待内部审核':'i','已退回':'r','已被取代':'n'};
function versOf(d){ return DEMAND_VERS[d.id] || []; }
function versAll(){ return Object.keys(DEMAND_VERS).reduce((a,k)=>a.concat(DEMAND_VERS[k]),[]); }
function activeVer(d){ const l = versOf(d).filter(v=>v.status==='生效'); return l.length ? l[l.length-1] : null; }
function openVer(d){ const l = versOf(d).filter(v=>VER_OPEN.includes(v.status)); return l.length ? l[l.length-1] : null; }
/* 兼容旧名：pendingVer = 尚未生效的那一版（可能是待确认 / 待审核 / 已退回） */
function pendingVer(d){ return openVer(d); }
function isEffective(d){ return !!activeVer(d); }
function verStatTxt(d){
  const av = activeVer(d), ov = openVer(d);
  if(av) return ov ? `已生效 ${av.v} · ${ov.v} ${ov.status}` : `已生效 ${av.v}`;
  return ov ? `${ov.v} ${ov.status}` : '无生效版本';
}

/* ---------- 5b. 客户反馈代登记记录（RG-002 要求 8 个字段） ----------
   一条记录 = 客户一次线下反馈被我方抄进系统。
   客户不登录、不点击，因此必须能区分：
     · 客户反馈人 ≠ 我方登记人
     · 反馈发生时间 ≠ 系统登记时间
   缺任何一项都不允许送审，更不允许标为有效需求。 */
const REG_CHANNELS = ['微信','电话','会议','邮件','现场'];
const REG_FIELDS = [
  {k:'ver',       n:'对应需求版本',        hint:'客户这次看到的是哪一版'},
  {k:'fbPerson',  n:'客户反馈人',          hint:'客户侧说话的人，不是我方对接人'},
  {k:'fbChannel', n:'反馈渠道',            hint:'微信 / 电话 / 会议 / 邮件 / 现场'},
  {k:'fbAt',      n:'反馈发生时间',        hint:'客户实际说话的时间'},
  {k:'fbContent', n:'反馈内容 / 确认结论',  hint:'客户原话或结论，逐项写清'},
  {k:'fbAttach',  n:'依据附件或记录',      hint:'聊天截图 / 会议纪要 / 通话录音编号'},
  {k:'regBy',     n:'我方登记人',          hint:'谁把这条抄进系统'},
  {k:'regAt',     n:'登记时间',            hint:'系统录入时间，不得早于反馈时间'},
];
const REGS = {};
function regsOf(did){ return REGS[did] || []; }
function regsOfVer(did, ver){ return regsOf(did).filter(r=>r.ver===ver); }
function lastReg(did, ver){ const l = regsOfVer(did, ver); return l.length ? l[l.length-1] : null; }
function regMissing(r){
  r = r || {};
  return REG_FIELDS.filter(f=>!String(r[f.k]==null?'':r[f.k]).trim()).map(f=>f.n);
}
function addReg(rec){
  const did = rec.demandId;
  (REGS[did] = REGS[did] || []).push(rec);
  return rec;
}
function newRegId(){
  const n = Object.keys(REGS).reduce((s,k)=>s+REGS[k].length,0)+1;
  return 'RG-'+String(n).padStart(3,'0');
}

/* ---------- 时间解析 ----------
   两个时间都是人手工敲的自由文本，**不能按字符串比大小**：
   "2026-11-13 9:00" 与 "2026-11-13 10:05" 字符串比较会把 9:00 判成更大（"1" < "9"）。
   统一解析成毫秒数再比；格式不合法直接拒绝，不做猜测。 */
const TS_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})$/;
function parseTs(str){
  const m = TS_RE.exec(String(str==null?'':str).trim());
  if(!m) return NaN;
  const [_, y, mo, d, h, mi] = m.map(Number);
  if(mo<1||mo>12||d<1||d>31||h>23||mi>59) return NaN;
  return Date.UTC(y, mo-1, d, h, mi);
}
/* 规范化成 YYYY-MM-DD HH:mm；解析不了返回空串（不悄悄替换成今天） */
function normTs(str){
  const ms = parseTs(str);
  if(isNaN(ms)) return '';
  const d = new Date(ms);
  const p = n => String(n).padStart(2,'0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
function tsOrderOk(fbAt, regAt){
  const fb = parseTs(fbAt), rg = parseTs(regAt);
  if(isNaN(fb) || isNaN(rg)) return {ok:false, why:'时间格式无法解析，应为 2026-11-13 09:12'};
  if(fb > rg) return {ok:false, why:'登记时间早于反馈发生时间，请核对'};
  return {ok:true};
}

/* 审核历史：每轮「谁、何时、通过还是退回、什么意见」追加保存，不覆盖。
   旧数据只有单个 auditNote 字段，这里补成数组，保证退回意见不丢。 */
versAll().forEach(v=>{
  if(Array.isArray(v.audits)) return;
  v.audits = [];
  if(v.audit === '已通过' || v.audit === '已退回'){
    v.audits.push({act: v.audit==='已退回'?'back':'pass', by:v.auditBy||'—', at:v.auditAt||'—', note:v.auditNote||''});
  }
});
function auditsOf(v){ return (v && Array.isArray(v.audits)) ? v.audits : []; }
function lastBack(v){
  const l = auditsOf(v).filter(a=>a.act==='back');
  return l.length ? l[l.length-1] : null;
}

/* 演示样本：先写 3 条有细节的，其余已生效版本补标准记录 */
[
  {demandId:'D1', ver:'v1.1', fbPerson:'张工（立讯·设备部）', fbChannel:'微信', fbAt:'2026-11-10 11:32',
   fbContent:'工价上调到 32-38 元/时；最晚报到日放宽到 12-15；其余 45 项按我方报的清单执行，不再逐条回。',
   fbAttach:'微信聊天记录截图 2 张（arch/2026-11-10-D1-01.png、-02.png）',
   regBy:'金诚', regAt:'2026-11-10 14:20',
   audit:'已通过', auditBy:'王浩', auditAt:'2026-11-10 15:05', auditNote:'与微信原文逐条核对，工价、到岗日两处变更明确'},
  {demandId:'D1', ver:'v1.0', fbPerson:'张工（立讯·设备部）', fbChannel:'微信', fbAt:'2026-11-05 09:50',
   fbContent:'按报价清单整体确认，工价 30-36 元/时，12-08 前到岗。',
   fbAttach:'微信聊天记录截图 1 张（arch/2026-11-05-D1-01.png）',
   regBy:'金诚', regAt:'2026-11-05 10:20',
   audit:'已通过', auditBy:'王浩', auditAt:'2026-11-05 10:40', auditNote:'首版，依据齐全'},
  {demandId:'D3', ver:'v1.1', fbPerson:'李主管（宁德时代·品质部）', fbChannel:'电话', fbAt:'2026-11-13 09:12',
   fbContent:'「最晚 11-28 要到人，其他不变。」——仅口头，未发文字。',
   fbAttach:'通话录音 RC-20261113-0912（时长 4′12″）',
   regBy:'金诚', regAt:'2026-11-13 09:40',
   audit:'待审核'},
  {demandId:'D4', ver:'v1.1', fbPerson:'周经理（江南造船·生产部）', fbChannel:'微信', fbAt:'2026-11-12 16:40',
   fbContent:'「到岗时间再谈，最近船期紧。」',
   fbAttach:'（未附截图，仅口头转述）',
   regBy:'金诚', regAt:'2026-11-12 17:20',
   audit:'已退回', auditBy:'王浩', auditAt:'2026-11-12 18:02',
   auditNote:'退回：反馈未落到具体日期，且缺客户原话截图'},
].forEach(r=>addReg(Object.assign({id:newRegId()}, r)));

/* 其余：已生效 / 已被取代的版本补一条标准记录，保证列表里每份确认单都能追溯 */
DEMANDS.forEach(d=>{
  versOf(d).filter(v=>v.status==='生效'||v.status==='已被取代').forEach(v=>{
    if(lastReg(d.id, v.v)) return;
    addReg({
      id:newRegId(), demandId:d.id, ver:v.v,
      fbPerson: d.client+' · 对接人', fbChannel: (v.way==='电话'?'电话':v.way==='会议'?'会议':'微信'),
      fbAt: v.at, fbContent: v.note || '客户按我方报价清单整体确认。',
      fbAttach: '微信聊天记录截图 1 张（已归档）',
      regBy: String(v.by||'金诚').replace('（代客户登记）',''), regAt: v.at,
      audit:'已通过', auditBy:'王浩', auditAt:v.at, auditNote:'依据齐全',
    });
  });
});

/* 演示用的「现在」：日期跟 TODAY 一致，时分取真实时钟，避免演示时间倒退 */
function nowTs(){
  const t = new Date(), p = n => String(n).padStart(2,'0');
  return TODAY+' '+p(t.getHours())+':'+p(t.getMinutes());
}

/* ---------- 6. 受控链接 ---------- */
const CLINKS = [
  {tok:'LK-D1-V11', demandId:'D1', ver:'v1.1', state:'有效', at:'2026-11-10 14:05', by:'金诚', views:3, expire:'2026-11-17', mode:'只读确认单'},
  {tok:'LK-D7-V11', demandId:'D7', ver:'v1.1', state:'有效', at:'2026-11-12 16:15', by:'王浩', views:1, expire:'2026-11-19', mode:'只读确认单'},
  {tok:'LK-D8-V10', demandId:'D8', ver:'v1.0', state:'有效', at:'2026-11-01 15:10', by:'王浩', views:0, expire:'2026-11-08', mode:'只读确认单'},
  /* 同单重新生成的一条：首条已过期，这条才是客户现在能打开的 */
  {tok:'LK-D8-V20', demandId:'D8', ver:'v1.0', state:'有效', at:'2026-11-10 09:20', by:'王浩', views:1, expire:'2026-11-17', mode:'只读确认单'},
  {tok:'LK-D3-V10', demandId:'D3', ver:'v1.0', state:'已撤销', at:'2026-11-08 11:20', by:'金诚', views:2, expire:'2026-11-15', mode:'只读确认单',
   why:'客户改由会议确认，链接主动撤销'},
  {tok:'LK-D6-V10', demandId:'D6', ver:'v1.0', state:'已失效', at:'2026-11-03 09:00', by:'金诚', views:5, expire:'2026-11-10', mode:'只读确认单',
   why:'超过有效期，需重新生成'},
];
function linksOf(did){ return CLINKS.filter(l=>l.demandId===did); }
function linkOf(tok){ return CLINKS.find(l=>l.tok===tok); }
function mainLink(did){ const l = linksOf(did).filter(x=>x.state==='有效'); return l.length ? l[0] : null; }
function genLink(did, ver, by){
  const tok = 'LK-'+did+'-'+String(ver).replace('.','').toUpperCase()+'-'+String(CLINKS.length+1);
  CLINKS.unshift({tok, demandId:did, ver, state:'有效', at:'2026-11-14 08:10', by:by||'金诚', views:0, expire:'2026-11-21', mode:'只读确认单'});
  return tok;
}
function revokeLink(tok, why){
  const l = linkOf(tok); if(!l) return;
  l.state = '已撤销'; l.why = why || '手动撤销';
}

/* 外部链接可见范围：只放该需求本身，不放人才库 / 其他需求 / 合同价与利润 */
/* 链接是否已过期：状态写「有效」但有效期已过，也算过期 —— 打开与列表必须用同一个判断 */
function linkExpired(l){ return !!l && l.state === '有效' && !!l.expire && l.expire < TODAY; }
function custLinkPayload(tok){
  const l = linkOf(tok);
  if(!l) return {ok:false, code:'NOTFOUND', msg:'链接不存在'};
  if(l.state === '已失效') return {ok:false, code:'EXPIRED', l, msg:`该链接已于 ${l.expire} 失效，需重新生成`};
  if(l.state === '已撤销') return {ok:false, code:'REVOKED', l, msg:`该链接已撤销${l.why?'：'+l.why:''}`};
  /* 按有效期拒绝：否则列表显示「已过期」、打开却还能看全文，客户侧口径自相矛盾 */
  if(linkExpired(l)) return {ok:false, code:'EXPIRED', l, msg:`该链接有效期至 ${l.expire}，已过期，需重新生成`};
  const d = D(l.demandId);
  const ver = versOf(d).find(v=>v.v===l.ver) || {};
  /* 客户看到的是**当时发出去的那一版**的条件快照，不是当前生效版 */
  const gate = ver.gate ? Object.assign({}, DEMAND_GATE[d.id]||{}, ver.gate) : (DEMAND_GATE[d.id]||{});
  return {ok:true, l, d, gate, ver};
}

/* ---------- 7. 匹配结果所依据的版本（版本一变即标记需更新） ---------- */
const MATCH_STAMP = {};
DEMANDS.forEach(d=>{
  const av = activeVer(d);
  MATCH_STAMP[d.id] = {ver: av?av.v:'—', at:'2026-11-13 18:00', stale: d.confirm!=='已确认'};
});
function matchNeedsUpdate(d){
  const m = MATCH_STAMP[d.id]; if(!m) return true;
  return m.stale || m.ver !== (activeVer(d)||{}).v;
}
