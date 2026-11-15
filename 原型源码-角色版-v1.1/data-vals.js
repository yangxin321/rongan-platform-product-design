/* =============================================================
   数据字典（值域池 ValueDicts）
   -------------------------------------------------------------
   这一层只放「值」的定义，不放「谁在用」。
   三类结构：
     ENUM  枚举：只能从列表里选（男 / 女 / 男女均可）
     RANGE 区间：给上下限 + 单位（18–40 岁）
     TERM  词表：有层级的固定名称（钳工大工 / 钳工中工 / 钳工小工）
   因子与岗位要素只引用这里的 id，不各自写死一份选项 ——
   改一次字典，引用它的因子、清单、标准岗位标准同时变。
   ============================================================= */
const VD_TYPES = { ENUM:'枚举', RANGE:'区间', TERM:'词表' };

/* 字典 id → 要素池里的条件键（用于算「被几份清单引用」） */
const VD_COND_KEY = {
  'VD-EXP':'经验年限', 'VD-AGE':'年龄', 'VD-EDU':'学历', 'VD-SEX':'性别',
  'VD-SHIFT':'班次', 'VD-DORM':'住宿', 'VD-CERT':'职业证书',
  'VD-WAGE':'工价', 'VD-LOAD':'负重上限', 'VD-VISION':'身高视力',
};

const VAL_DICTS = [
  /* ---------------- 枚举 ---------------- */
  { id:'VD-SEX', name:'性别', type:'ENUM', ver:'v1.0', status:'已发布', owner:'金诚', cat:'人员属性',
    items:[
      { v:'男',     std:true,  note:'' },
      { v:'女',     std:true,  note:'' },
      { v:'男女均可', std:false, note:'只在需求侧成立；落到人员档案必须收敛成男或女' },
    ],
    note:'客户说"男女均可"是招人条件，不是人的属性。同一条字典里两种含义必须标出来，否则人员档案会出现"男女均可"这种值。' },

  { id:'VD-EDU', name:'学历', type:'ENUM', ver:'v1.0', status:'已发布', owner:'金诚', cat:'人员属性',
    items:[
      { v:'初中', std:true }, { v:'高中', std:true }, { v:'中专', std:true },
      { v:'大专', std:true }, { v:'本科及以上', std:true },
    ],
    note:'清单里现在写的是"初中及以上"，建议统一成"初中" + 单独一个「最低学历」算子，不要每个值都自带"及以上"。' },

  { id:'VD-SHIFT', name:'班次', type:'ENUM', ver:'v1.0', status:'已发布', owner:'金诚', cat:'工作条件',
    items:[
      { v:'常白班', std:true }, { v:'两班倒', std:true }, { v:'三班倒', std:true },
      { v:'夜班', std:true }, { v:'轮班', std:true },
    ],
    note:'' },

  { id:'VD-DORM', name:'住宿', type:'ENUM', ver:'v1.0', status:'已发布', owner:'金诚', cat:'工作条件',
    items:[
      { v:'免费 4 人间', std:true }, { v:'免费 6 人间', std:true },
      { v:'单人间或补贴', std:true }, { v:'自理', std:true },
    ],
    note:'' },

  { id:'VD-CERT', name:'职业证书', type:'ENUM', ver:'v1.1', status:'已发布', owner:'金诚', cat:'准入资质',
    items:[
      { v:'低压电工证', std:true }, { v:'高压电工证', std:true }, { v:'焊工证', std:true },
      { v:'叉车证', std:true }, { v:'高处作业证', std:true }, { v:'特种设备证', std:true },
    ],
    note:'证书是准入项，只判有无，不进算分。' },

  { id:'VD-YESNO', name:'是否接受', type:'ENUM', ver:'v1.0', status:'已发布', owner:'金诚', cat:'工作条件',
    items:[{ v:'接受', std:true }, { v:'不接受', std:true }, { v:'可协商', std:true }],
    note:'出差、加班、驻场这类布尔项共用一套值，不要各写各的"能接受 / 可以 / 没问题"。' },

  /* ---------------- 区间 ---------------- */
  { id:'VD-AGE', name:'年龄', type:'RANGE', ver:'v1.1', status:'已发布', owner:'金诚', cat:'人员属性',
    min:18, max:40, unit:'岁', soft:45, hard:60,
    segs:[{ k:'客户常见', v:'18–40' }, { k:'可放宽', v:'18–45' }, { k:'高危区', v:'>45' }],
    note:'上限超过 45 触发合规提示，且不得作为自动淘汰条件；只能当派生筛选并留审计痕迹。' },

  { id:'VD-EXP', name:'经验年限', type:'RANGE', ver:'v1.0', status:'已发布', owner:'金诚', cat:'人员属性',
    min:0, max:30, unit:'年',
    segs:[{ k:'小工', v:'≤1 年' }, { k:'中工', v:'2–5 年' }, { k:'大工', v:'5 年以上' }],
    note:'"同岗经验"和"总工龄"是两件事，这里指的是前者。' },

  { id:'VD-WAGE', name:'工价', type:'RANGE', ver:'v1.1', status:'已发布', owner:'金诚', cat:'交易条件',
    min:20, max:80, unit:'元/时',
    segs:[{ k:'小工', v:'26–32' }, { k:'中工', v:'36–45' }, { k:'大工', v:'50–65' }],
    note:'按小时计价；月薪口径另开一条字典，不要混在一个字段里。' },

  { id:'VD-LOAD', name:'负重上限', type:'RANGE', ver:'v1.0', status:'草稿', owner:'金诚', cat:'体能要求',
    min:0, max:50, unit:'kg',
    segs:[{ k:'常规', v:'≤25' }, { k:'重体力', v:'≤50' }],
    note:'替代"身体健康、能吃苦"这类不可判定表述 —— 用可测量的体能要求，合规风险也低。' },

  { id:'VD-VISION', name:'身高视力', type:'RANGE', ver:'v1.0', status:'草稿', owner:'金诚', cat:'体能要求',
    min:4.0, max:5.2, unit:'（裸眼视力）',
    segs:[{ k:'常规', v:'≥4.8' }],
    note:'高危项。除特殊工种（如高空、精密外观检验）外不建议单独设限。' },

  /* ---------------- 词表 ---------------- */
  { id:'VD-POST', name:'岗位名称（工种 × 等级）', type:'TERM', ver:'v1.1', status:'已发布', owner:'金诚', cat:'岗位命名',
    tree:[
      { node:'钳工', items:['钳工小工','钳工中工','钳工大工'] },
      { node:'电工', items:['电工小工','电工中工','电工大工'] },
    ],
    note:'由 工种 × 等级 组合生成，不允许手填。手填就会出现"装配钳工""钳工师傅""钳工会打表"这类同义不同名，匹配器就得靠猜。' },

  { id:'VD-GRADE', name:'岗位等级', type:'TERM', ver:'v1.0', status:'已发布', owner:'金诚', cat:'岗位命名',
    tree:[
      { node:'三档', items:['小工','中工','大工'] },
    ],
    note:'等级不是标签，是一根尺上的三个刻度，能比大小 —— 所以能写"要求 ≥ 中工"。' },

  { id:'VD-TRADE', name:'工种', type:'TERM', ver:'v1.0', status:'已发布', owner:'金诚', cat:'岗位命名',
    tree:[
      { node:'T1 机械', items:['钳工'] },
      { node:'T1 电气', items:['电工'] },
    ],
    note:'新增工种要同步定它的能力因子，否则这个工种建不出清单。' },
];

const vdOf = id => VAL_DICTS.find(x=>x.id===id) || {};

/* 枚举项总数 / 词表名称总数 */
function vdCount(d){
  if(d.type==='ENUM') return d.items.length;
  if(d.type==='TERM') return d.tree.reduce((a,g)=>a+g.items.length,0);
  return 0;
}
/* 取值区间的展示文本 */
const vdRange = d => `${d.min}–${d.max} ${d.unit}`;

/* 被引用：扫要素清单的准入/条件条目；岗位命名类字典被清单的「名称/等级/工种」引用 */
function vdUsedLists(id){
  if(id==='VD-POST')  return ELEMENT_STDS.map(s=>s.name);
  if(id==='VD-GRADE') return ELEMENT_STDS.map(s=>s.name+'（'+s.grade+'）');
  if(id==='VD-TRADE') return ELEMENT_STDS.map(s=>s.name);
  const k = VD_COND_KEY[id];
  if(!k) return [];
  return ELEMENT_STDS.filter(s=>(ELEMENT_CONDS[s.id]||[]).some(c=>c.k===k)).map(s=>s.name);
}
/* 是否已进要素池（进了池就是"可被清单直取"，只是还没人取） */
function vdInPool(id){
  const k = VD_COND_KEY[id];
  return !!(k && ELEMENT_POOL.some(p=>p.k===k));
}
/* 一致性：清单里写的值，是否都能在字典里找到（只对枚举做，区间不查） */
function vdConflicts(id){
  const d = vdOf(id), k = VD_COND_KEY[id];
  if(!d.id || d.type!=='ENUM' || !k) return [];
  const vals = new Set();
  ELEMENT_STDS.forEach(s=>(ELEMENT_CONDS[s.id]||[]).filter(c=>c.k===k).forEach(c=>vals.add(c.v)));
  return [...vals].filter(v=>!d.items.some(it=>v===it.v || v.startsWith(it.v)));
}
