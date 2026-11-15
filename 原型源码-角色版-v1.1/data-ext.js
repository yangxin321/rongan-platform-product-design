/* ===== 扩展数据层：渠道字典 / 采集方式 / 简历附件 / 上传履历 / 沟通记录 / 画像判断 ===== */

/* 渠道字典（数据字典可增删；本期只到渠道层，不做明细维度） */
const CHANNELS = [
  {id:'CH1', name:'BOSS 直聘', type:'付费平台', bill:true,  cost:'下载点数 / 份', on:true},
  {id:'CH2', name:'抖音',      type:'内容平台', bill:false, cost:'投流费 / 月',   on:true},
  {id:'CH3', name:'小红书',    type:'内容平台', bill:false, cost:'投流费 / 月',   on:true},
  {id:'CH4', name:'门店/地推', type:'自有',     bill:false, cost:'物料 + 人力',   on:true},
  {id:'CH5', name:'转介绍',    type:'自有',     bill:false, cost:'推荐奖金 / 人', on:true},
  {id:'CH7', name:'机构培训',  type:'合作机构', bill:true,  cost:'按人结算 / 月', on:true},
  {id:'CH8', name:'其他',      type:'自定义',   bill:false, cost:'需填说明',      on:true, needNote:true},
  {id:'CH6', name:'人才池',    type:'内部',     bill:false, cost:'—',            on:true, internal:true},
];
const CH = n => CHANNELS.find(c=>c.name===n) || CHANNELS[0];
const EXT_CHANNELS = () => CHANNELS.filter(c=>!c.internal);

/* 采集方式（系统动作）：怎么进来的 */
const SOURCE_TYPES = ['BOSS下载','手动上传','池内捞入'];

/* 给每条投递补「采集方式 + 业务渠道」 */
const CH_SEQ = ['BOSS 直聘','BOSS 直聘','BOSS 直聘','抖音','BOSS 直聘','门店/地推','小红书','BOSS 直聘','转介绍'];
PERSONS.forEach((p,i)=>{
  const bt = p.batchId ? BATCHES.find(x=>x.id===p.batchId) : null;
  p.sourceType = bt ? (bt.boss>0 ? 'BOSS下载' : '手动上传') : '池内捞入';
  p.channel = bt ? CH_SEQ[i % CH_SEQ.length] : '人才池';
});

/* 档案补：建档时间 / 建档人 / 首次进入方式 / 渠道 */
const SRC_MAP = {'BOSS':'BOSS 直聘','门店':'门店/地推','转介绍':'转介绍','历史库':'人才池'};
const ENTRY_MODES = ['BOSS 文件导入','候选人自投','门店登记','抖音私信','小红书私信','老库迁移'];
const fmtDT = (m,d,h,mi) => '2026-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0') + ' ' + String(h).padStart(2,'0') + ':' + String(mi).padStart(2,'0');
PEOPLE.forEach((p,i)=>{
  const a = PERSONS.find(x=>x.personId===p.id);
  const k = POOL.find(x=>x.personId===p.id);
  p.channel = a ? a.channel : (k ? (SRC_MAP[k.source] || 'BOSS 直聘') : 'BOSS 直聘');
  p.createdAt = fmtDT(i%3===0?10:11, 1+(i*3)%27, 9+(i%9), [5,18,32,47][i%4]);
  p.createdBy = ['李文静','陈曦','王浩','金诚'][i%4];
  const CH_ENTRY = {'BOSS 直聘':'BOSS 文件导入','抖音':'抖音私信','小红书':'小红书私信','门店/地推':'门店登记表','转介绍':'推荐人转交','人才池':'老库迁移'};
  p.entryMode = CH_ENTRY[p.channel] || ENTRY_MODES[i%6];
  p.blacklist = (i===13);
  p.expect = ['32-36 元/时','30-34 元/时','26-30 元/时','35-40 元/时'][i%4];
  p.arrive = ['随时可到','本周可到','12 月初','需 1 个月交接'][i%4];
  p.city = ['东莞·长安','苏州·常熟','上海·长兴岛','青岛·黄岛','宜宾·临港'][i%5];
  p.stay = (i%4!==0);
  /* 当前跟进人：默认 = 建档人，可与建档人不同（P0-10） */
  p.follower = p.createdBy;
});

/* 转交流水：谁把谁从谁手上转给谁，什么原因（不可删，可转回） */
const TRANSFERS = [
  {personId:'PE001', from:'李文静', to:'陈曦', at:'2026-11-09 15:20', why:'我请假两天，先让她跟'},
  {personId:'PE001', from:'陈曦', to:'李文静', at:'2026-11-11 09:05', why:'销假转回'},
];
const transfersOf = pid => TRANSFERS.filter(t=>t.personId===pid).sort((a,b)=>b.at.localeCompare(a.at));

/* 淘汰原因（用于推荐时的避坑提示） */
const CUT_REASONS = ['期望薪资超出上限 2 元/时','不接受驻场','到岗时间太晚（需 1 个月交接）','技能与岗位不符（无对刀经验）','已读不回，触达失败'];
PERSONS.forEach((p,i)=>{
  if(p.node==='已淘汰' || p.status==='无意向') p.reason = CUT_REASONS[i % CUT_REASONS.length];
});
/* 面试未通过：面过了但客户/我方判不合适（区别于"触达就淘汰"）。面试模块要能直接看到"未通过" */
let _if = 0;
PERSONS.forEach(p=>{
  if(p.node==='已淘汰' && _if < 3){ p.itvFail = true; p.itvAt = '2026-11-1'+(2+_if)+' 14:00'; _if++; }
});

/* 简历附件 + 上传履历 */
const RES_FILES = [];
const UPLOADS = [];
PEOPLE.forEach((p,i)=>{
  const nf = 1 + (i%2);
  for(let j=0;j<nf;j++){
    RES_FILES.push({personId:p.id, ver:j+1, name:p.name+'_简历_v'+(j+1)+'.'+(j%2?'pdf':'jpg'),
      kind: j%2?'PDF':'图片', size:(0.3+((i*7+j*3)%9)/10).toFixed(1)+'MB',
      time: fmtDT(11, 3+j*7, 9+(j%6), [12,26,41][j%3]),
      uploader:['李文静','陈曦','王浩'][(i+j)%3], online: p.channel!=='BOSS 直聘'});
  }
  const upN = 1 + (i%3);
  for(let j=0;j<upN;j++){
    const fac = 22 + ((i*7+j*5)%22);
    UPLOADS.push({personId:p.id, ver:j+1,
      time: fmtDT(j===upN-1?11:10, j===upN-1?13-Math.min(12,(i%9)):2+j*5, 9+(j%8), [8,22,35,51][j%4]),
      staff:['李文静','陈曦','王浩'][(i+j)%3], channel:p.channel,
      file:p.name+'_'+(j===0?'原始简历':'补充'+j)+'.'+(j%2?'jpg':'pdf'),
      factors: fac,
      diff: j===0 ? `首次建档，抽取 ${fac} 项` : ['补充：低压电工证','期望薪资 35 → 32','新增技能：伺服调试','补 1 段工作经历'][(i+j)%4]});
  }
});

/* 沟通记录：全局（跨投递跨专员），带目的与结论 */
const PURPOSES = ['首次触达','约面试','催资料','谈薪资','确认到岗','回访','淘汰告知'];
const CONTACTS = [];
FOLLOWS.forEach((f,i)=>{
  const p = PERSONS.find(x=>x.id===f.personId) || {};
  const cut = p.node==='已淘汰' || p.status==='无意向';
  const purpose = cut ? '淘汰告知' : PURPOSES.filter(x=>x!=='淘汰告知')[i%6];
  CONTACTS.push({personId:p.personId, appId:f.personId, time:f.time, type:f.type, staff:f.staff,
    demandId:p.demandId, purpose, concl:f.note,
    next: p.nextFollow==='—'?'':p.nextFollow});
});
PEOPLE.forEach((pe,i)=>{
  if(CONTACTS.some(c=>c.personId===pe.id)) return;
  if(i%2) return;
  const app = PERSONS.find(x=>x.personId===pe.id);
  CONTACTS.push({personId:pe.id, appId:app?app.id:'', time:fmtDT(11, 6+(i%7), 10+(i%6), [10,25,40][i%3]),
    type:['电话','微信','短信'][i%3], staff:['李文静','陈曦','王浩'][i%3],
    demandId: app?app.demandId:'', purpose:PURPOSES[i%7],
    concl:['问了下当前状态，还在看机会','说下周给答复','资料已发，等待回传'][i%3], next:'2026-11-14'});
});
/* 2026-11-15 第十四批：沟通记录页收成「一张表，一行 = 一次沟通」之后，
   演示里必须真的能看到「多次沟通」——否则一行表看不出「多行即多次」，等于没演示。
   给前三条投递各补两次更早的沟通。日期从 TODAY 往前推（演示时钟是 2026-11-13，
   不能按真实日期写死，否则会跟 TODAY 撞在同一天）。 */
const TALK_EXTRA = [
  {back:2, h:15, mi:40, type:'微信', purpose:'约面试',
   concl:'约周四下午到厂面谈，提醒带身份证与证件原件'},
  {back:4, h:9,  mi:20, type:'电话', purpose:'首次触达',
   concl:'电话打通，人在职，月底可离岗；先加微信发了岗位与薪资范围'},
];
const backDay = n => {
  const d = new Date(TODAY + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return [d.getMonth() + 1, d.getDate()];
};
[0,1,2].forEach(k=>{
  const f = FOLLOWS[k];
  if(!f) return;
  const p = PERSONS.find(x=>x.id===f.personId) || {};
  if(!p.personId) return;
  TALK_EXTRA.forEach(e=>{
    const [m, d] = backDay(e.back);
    CONTACTS.push({personId:p.personId, appId:f.personId,
      time:fmtDT(m, d, e.h, e.mi), type:e.type, staff:f.staff,
      demandId:p.demandId, purpose:e.purpose, concl:e.concl, next:''});
  });
});
CONTACTS.sort((a,b)=>b.time.localeCompare(a.time));

/* 画像判断层：只写可验证行为 + 依据 + 来源 + 置信度 + 更新时间 */
const PORTRAIT_POOL = [
  {dim:'稳定性', val:'稳', basis:'平均在职 3 年，近两段均满 2 年以上', conf:'高'},
  {dim:'稳定性', val:'偏跳', basis:'近 3 年换 4 家，最短 2 个月', conf:'中'},
  {dim:'意向', val:'强', basis:'已离职，本周可到岗', conf:'高'},
  {dim:'意向', val:'弱', basis:'在职看机会，只问薪资未谈到岗', conf:'中'},
  {dim:'履约', val:'到面 2/3', basis:'2 次到面、1 次提前 1 天改期并说明原因', conf:'高'},
  {dim:'履约', val:'2 次约面未到', basis:'11-05、11-09 约定面试未到且未回电', conf:'高'},
  {dim:'适配', val:'可倒班', basis:'明确表示可接受两班倒', conf:'高'},
  {dim:'适配', val:'拒绝驻场', basis:'沟通中对长期驻场明确排斥（11-12 电话）', conf:'中'},
  {dim:'风险', val:'3 次议价', basis:'3 次沟通均提出薪资上浮（11-08 / 11-11 / 11-13）', conf:'中'},
  {dim:'风险', val:'同时在谈 2 家', basis:'自述手上有 2 个 offer 在谈', conf:'低'},
  {dim:'风险', val:'履历空档', basis:'2024-03 至 2024-08 空档，未说明原因', conf:'中'},
];
const PORTRAITS = {};
const DIM_ORDER = ['稳定性','意向','履约','适配','风险'];
PEOPLE.forEach((p,i)=>{
  const n = 3 + (i%3);
  const list = [];
  for(let j=0;j<n;j++){
    const dim = DIM_ORDER[(i+j)%DIM_ORDER.length];
    const cand = PORTRAIT_POOL.filter(t=>t.dim===dim && !list.some(x=>x.dim===dim));
    if(!cand.length) continue;
    const t = cand[(i+j)%cand.length];
    list.push(Object.assign({}, t, {updated: fmtDT(11, 5+((i+j)%8), 9+((i+j)%8), [5,30,45][j%3]),
      by:['李文静','陈曦','王浩'][(i+j)%3], src:'11-' + String(5+((i+j)%8)).padStart(2,'0') + ' 沟通'}));
  }
  PORTRAITS[p.id] = list;
});
const ptOf = pid => PORTRAITS[pid] || [];
const contactsOf = pid => CONTACTS.filter(c=>c.personId===pid);
const uploadsOf = pid => UPLOADS.filter(u=>u.personId===pid).sort((a,b)=>b.ver-a.ver);
const filesOf = pid => RES_FILES.filter(f=>f.personId===pid).sort((a,b)=>b.ver-a.ver);

/* 渠道统计 */
const channelCount = arr => { const m={}; arr.forEach(p=>{ m[p.channel]=(m[p.channel]||0)+1; }); return m; };
const chSummary = arr => Object.entries(channelCount(arr)).sort((a,b)=>b[1]-a[1]);
const batchChannels = b => {
  const ps = PERSONS.filter(p=>p.batchId===b.id);
  if(ps.length) return chSummary(ps);
  const out = [];
  if(b.boss) out.push(['BOSS 直聘', b.boss]);
  if(b.manual) out.push(['手动上传', b.manual]);
  if(b.pool) out.push(['人才池', b.pool]);
  return out;
};

/* =======================================================================
   候选人基本信息：学历 / 院校 / 专业 / 意向岗位 / 总工作年限 / 微信 / 邮箱
   -----------------------------------------------------------------------
   这几项是简历头部候选人自己填的资料，不是我们的判断：
     · 不参与硬条件，不进资料核实，不给「符合 / 不符合」；
     · 缺就显示「未填」，不替他补，也不按年龄倒推学历。
   真实简历里本来就参差：学历约七成、邮箱约一半、微信只是一部分人有 ——
   演示数据照这个分布来，否则「未填」这个状态在页面上永远看不到。
   ======================================================================= */
function hrSeed(s){
  let h = 2166136261;
  const t = String(s || '');
  for(let i=0;i<t.length;i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
/* 学历与院校、专业成套出现 —— 简历里不会只有学历没有学校 */
const HR_EDU = {
  '中专':[
    ['东莞市技师学院','机电一体化技术'],
    ['广东省机械技师学院','机械设备装配与自动控制'],
    ['惠州市工程技术学校','机电技术应用'],
    ['深圳市第二高级技工学校','电气自动化设备安装与维修'],
    ['东莞市轻工业学校','数控技术应用'],
  ],
  '大专':[
    ['广东机电职业技术学院','机电一体化技术'],
    ['东莞职业技术学院','数控技术'],
    ['深圳信息职业技术学院','电子信息工程技术'],
    ['广东工贸职业技术学院','工业机器人技术'],
    ['广东交通职业技术学院','电气自动化技术'],
  ],
  '本科':[
    ['广东工业大学','机械设计制造及其自动化'],
    ['东莞理工学院','机械电子工程'],
    ['华南理工大学广州学院','电气工程及其自动化'],
    ['广东技术师范大学','机械设计制造及其自动化'],
  ],
};
/* 学历门槛按岗位实际用人的常见情况估，不是评分：技工岗中专/大专为主，少量本科 */
function hrEduLine(skills){
  const s = (skills||[]).join(',');
  if(/售后|客服|文员/.test(s)) return '大专';
  if(/CNC|IQC|检验|激光|光路|PLC|调试|电子/.test(s)) return '大专';
  return '中专';
}
/* 意向岗位：简历头部那句「求职意向」。按现有技能推，组内轮换，不新造岗位名 */
const HR_JOBS = [
  [/CNC|对刀|加工中心/, ['CNC 操作工','加工中心操作工','数控车工']],
  [/钳工/,                ['装配钳工','机修钳工']],
  [/电工|电气|PLC/,       ['维修电工','设备电气调试员']],
  [/焊/,                  ['氩弧焊工','二保焊工']],
  [/船舶|舾装|船厂/,      ['船舶电工','舾装工']],
  [/激光|光路|光电/,      ['激光装配调试员','光路调试员']],
  [/IQC|检验|品质/,       ['IQC 检验员','品质检验员']],
  [/售后|客服/,           ['售后运维工程师','客户现场服务工程师']],
  [/总装|装配|流水线|组装/,['装配工','总装操作工']],
  [/电子/,                ['电子装配工']],
  [/机修/,                ['机修工']],
  [/文员/,                ['生产文员']],
];
function hrWantJob(skills, seed){
  const pick = t => { for(const [re, list] of HR_JOBS) if(re.test(t)) return list[seed % list.length]; return null; };
  /* 先按主技能定，再退回整串技能 —— 简历上的「求职意向」通常就是主技能那一行，
     一味按整串匹配，会把「会一点 CNC 的电气调试工」写成数控车工。 */
  for(const s of (skills||[])){ const hit = pick(s); if(hit) return hit; }
  return pick((skills||[]).join(',')) || '普工 / 操作工';
}
function hrFill(pe){
  const k = hrSeed(pe.id + pe.name + pe.phone);
  const line = hrEduLine(pe.skills);
  /* 约一成读到本科；另有一小撮简历只写经历不写学历 —— 留出「未填」样本，
     这样「未填」是数据里真会出现的状态，不是只在代码里存在的分支。 */
  const noEdu = (k % 23 === 0);
  const edu = noEdu ? '' : ((k % 10 === 0 && line !== '本科') ? (line === '中专' ? '大专' : '本科') : line);
  const pair = edu ? HR_EDU[edu][k % HR_EDU[edu].length] : null;
  const start = {'中专':19,'大专':21,'本科':22}[edu] || 20;
  const years = Math.max(1, Math.min(35, pe.age - start - (k % 2)));
  const tail = String(pe.phone).replace(/\D/g,'').slice(-8);
  pe.edu = edu;
  pe.school = pair ? pair[0] : '';
  pe.major = pair ? pair[1] : '';
  pe.wantJob = hrWantJob(pe.skills, k);
  pe.years = years;
  /* 微信：招聘场景最常用，但简历里不是人人留；留的人多数就是手机号 */
  pe.wechat = (k % 10 < 7) ? ({same:true, id:pe.phone}) : null;
  if(k % 10 === 0) pe.wechat = {same:false, id:'wxid_' + (k % 9973).toString(36) + tail.slice(-3)};
  /* 邮箱：约一半人有，QQ 邮箱号多为 8 位数字，跟手机尾号不重合也合理 */
  pe.email = (k % 100 < 48) ? (tail + (k % 2 ? '@qq.com' : '@163.com')) : null;
  return pe;
}
PEOPLE.forEach(hrFill);
/* 学历层级：用于筛选与排序，不参与匹配 */
const EDU_LV = {'高中':1,'中专':2,'大专':3,'本科':4};
const hrOf = pid => { const p = appPerson(pid); return p && p.id !== '—' ? p : null; };

/* ---------- 候选人基本信息的展示口径（2026-11-15） ----------
   学历 / 院校 / 专业 / 意向岗位 / 总工作年限 / 微信 / 邮箱，都是「人」自己的基本信息：
   简历上怎么写就怎么录。平台**不核实**、不进硬条件、不产生「符合 / 不符合」，
   也不因为这个人投了某个岗位就改写成岗位名。
   缺项一律写「未填」，不按年龄、技能或投递岗位倒推。 */
const HR_NA = '<span class="mut">未填</span>';
function hrV(v){ return (v===undefined || v===null || String(v).trim()==='') ? HR_NA : esc(String(v)); }
/* 列表一行读完：年限 + 学历在上（筛选先看这两项），意向岗位在下 */
function hrCell(p){
  if(!p) return HR_NA;
  return `<div class="sm">${p.years?`<b>${p.years}</b> 年`:'<span class="mut">年限未填</span>'}${p.edu?' · '+esc(p.edu):''}</div>
    <div class="t-sub">${hrV(p.wantJob)}</div>`;
}
