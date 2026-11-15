/* ===== 数据字典 v2：工种技能因子 + 岗位能力卡 ===== */
/* 结构说明：
   1) TRADES：T2 工种节点（岗位画像挂这个点）
   2) FACTORS_TRADE：工种技能因子，每条含四件套 + 三档刻度
   3) PORTRAITS_V2：画像 = (T2 工种 × 等级)，每份画像 = 挑哪几条因子 + 各要哪档 + PASS/必填/加分
   4) TRADE_TRANS：小工→中工→大工 的跃迁点
*/

/* 说明文案开关：false = 干净版（只有结构化数据），true = 解释版（带概念说明） */
const XPL = (typeof window !== 'undefined' && typeof window.__XPL__ === 'boolean') ? window.__XPL__ : false;
const xpl = (a, b) => XPL ? a : b;

const GRADES = {
  D1:{ name:'小工', desc:'能做单一动作，不能独立交付一台设备，必须有人带' },
  D2:{ name:'中工', desc:'能独立完成整台设备的装配与调试，可出差' },
  D3:{ name:'大工', desc:'能做难的、能处理超差、能带人' },
};

const TRADES = [
  { id:'T2-QG', code:'QG', name:'钳工', domain:'T1 机械',
    alias:['装配钳工','非标钳工','机械装配工'],
    note:'非标自动化装配主力，精度靠打表保证' },
  { id:'T2-DG', code:'DG', name:'电工', domain:'T1 电气',
    alias:['维修电工','装配电工','电气装配工'],
    note:'控制柜与整机电气装配，会看图是分水岭' },
];

/* ---------- 工种技能因子 ---------- */
/* valueType: 档位 | 名词 | 数值 | 布尔 | 枚举
   operator: ≥ | ⊇ | ＝  */
const FACTORS_TRADE = [

  /* ===== 钳工 ===== */
  { id:'P1', trade:'T2-QG', name:'打表能力', valueType:'档位', operator:'≥',
    question:'能把设备打表校到什么精度？',
    source:'简历锚点 + 面试实操',
    core:true,
    tiers:[
      { d:'D1', label:'看表装夹', metric:'无要求', tool:'磁性表座',
        desc:'装夹工件、固定磁性表座，看懂指针摆动方向',
        limit:'不会调丝杆、导轨',
        anchors:['打表','看表','装夹','配合打表'] },
      { d:'D2', label:'找平校平行', metric:'0.02–0.05mm', tool:'百分表',
        desc:'打表找平、校平行，按偏差加减垫片校正，百分表复检尺寸',
        limit:'不会千分表精密打表',
        anchors:['找平','校平行','加减垫片','百分表','校正导轨'] },
      { d:'D3', label:'精密打表', metric:'≤0.01mm', tool:'千分表',
        desc:'丝杆、双轴模组、同轴过中心、光学平台平面度校正',
        limit:'—',
        anchors:['千分表','丝杆打表','同轴过中心','平面度校正','超差修复'] },
    ]},

  { id:'P2', trade:'T2-QG', name:'划线', valueType:'档位', operator:'≥',
    question:'能划到什么复杂度的线？',
    source:'简历锚点 + 面试实操',
    tiers:[
      { d:'D1', label:'平面划线', metric:'—', tool:'划针/高度尺',
        desc:'能按图纸确定基准、孔位和轮廓线',
        limit:'不会多基准面找正',
        anchors:['划线','平面划线','打样冲'] },
      { d:'D2', label:'达标平板划线', metric:'孔位偏差≤0.2mm', tool:'高度尺',
        desc:'完成平板类零件划线，孔位偏差≤0.2mm',
        limit:'不会箱体立体划线',
        anchors:['平板划线','孔位划线'] },
      { d:'D3', label:'立体划线', metric:'—', tool:'方箱/千斤顶',
        desc:'多基准面找正和空间尺寸分配，完成箱体/支架类立体划线',
        limit:'—',
        anchors:['立体划线','箱体划线','多基准找正'] },
    ]},

  { id:'P3', trade:'T2-QG', name:'锯削', valueType:'档位', operator:'≥',
    question:'下料能做到什么程度？',
    source:'简历锚点',
    basic:true,
    tiers:[
      { d:'D1', label:'选锯条控直线度', metric:'—', tool:'手锯',
        desc:'能按材料选择锯条并控制直线度',
        limit:'断面质量不保证',
        anchors:['锯削','下料','锯床'] },
      { d:'D2', label:'达标下料', metric:'断面垂直度达标', tool:'手锯/锯床',
        desc:'完成棒料、板材下料，断面垂直度达标',
        limit:'—',
        anchors:['下料','断面垂直'] },
      { d:'D3', label:'待补', metric:'—', tool:'—', desc:'（业务待补）', limit:'—', anchors:[] },
    ]},

  { id:'P4', trade:'T2-QG', name:'锉削', valueType:'档位', operator:'≥',
    question:'锉削平面/曲面能做到什么精度？',
    source:'简历锚点 + 面试实操',
    tiers:[
      { d:'D1', label:'平面/曲面锉削', metric:'—', tool:'锉刀',
        desc:'能控制平面度、平行度、垂直度；加工圆弧面、成型面',
        limit:'精度不保证',
        anchors:['锉削','锉配','去毛刺','倒角'] },
      { d:'D2', label:'达标锉削', metric:'平面度≤0.03mm', tool:'锉刀/刀口尺',
        desc:'完成六方体、台阶面加工，平面度≤0.03mm；圆弧配合面锉配贴合均匀',
        limit:'不会高精度研磨',
        anchors:['六方体','台阶面','锉配','贴合'] },
      { d:'D3', label:'待补', metric:'—', tool:'—', desc:'（业务待补）', limit:'—', anchors:[] },
    ]},

  { id:'P5', trade:'T2-QG', name:'孔加工', valueType:'档位', operator:'≥',
    question:'钻孔与铰孔能做到什么精度？',
    source:'简历锚点',
    tiers:[
      { d:'D1', label:'钻孔', metric:'—', tool:'台钻',
        desc:'能控制孔位、孔径和孔距',
        limit:'不会铰孔',
        anchors:['钻孔','打孔','扩孔'] },
      { d:'D2', label:'达标钻孔', metric:'孔距偏差≤0.1mm', tool:'台钻/钻模',
        desc:'完成孔组加工，孔距偏差≤0.1mm',
        limit:'不会 H7 铰孔',
        anchors:['孔组','钻孔','钻模'] },
      { d:'D3', label:'铰孔 H7', metric:'H7 / Ra1.6', tool:'铰刀',
        desc:'能选择铰刀并控制孔径精度与粗糙度，完成 H7 级孔加工',
        limit:'—',
        anchors:['铰孔','H7','铰刀','Ra1.6'] },
    ]},

  { id:'P6', trade:'T2-QG', name:'螺纹加工', valueType:'档位', operator:'≥',
    question:'攻丝与套丝能做到什么程度？',
    source:'简历锚点',
    basic:true,
    tiers:[
      { d:'D1', label:'攻丝', metric:'—', tool:'丝锥',
        desc:'能保证螺纹垂直度和配合顺畅',
        limit:'易烂牙',
        anchors:['攻丝','丝锥','螺纹'] },
      { d:'D2', label:'达标攻丝', metric:'无烂牙、无偏斜', tool:'丝锥/攻丝机',
        desc:'完成盲孔/通孔攻丝，无烂牙、偏斜',
        limit:'不会套丝',
        anchors:['盲孔攻丝','通孔攻丝'] },
      { d:'D3', label:'套丝', metric:'—', tool:'板牙',
        desc:'能控制外螺纹直径和牙型质量，完成圆杆套丝并与螺母正常配合',
        limit:'—',
        anchors:['套丝','板牙','外螺纹'] },
    ]},

  { id:'P7', trade:'T2-QG', name:'刮削与研磨', valueType:'档位', operator:'≥',
    question:'刮研能做到什么精度？',
    source:'简历锚点 + 面试实操',
    tiers:[
      { d:'D1', label:'平面刮削', metric:'—', tool:'刮刀/研具',
        desc:'能通过接触斑点判断平面精度',
        limit:'斑点不达标',
        anchors:['刮削','刮研','铲刮'] },
      { d:'D2', label:'达标刮削', metric:'25×25mm 内斑点达标', tool:'刮刀/平板',
        desc:'完成导轨/平板刮削，25×25mm 内斑点达标',
        limit:'不会精密研磨',
        anchors:['导轨刮削','平板刮削','接触斑点'] },
      { d:'D3', label:'精密研磨', metric:'配合间隙达标', tool:'研磨具',
        desc:'能控制配合间隙和表面粗糙度，完成塞规、环规或精密配合件研磨',
        limit:'—',
        anchors:['研磨','塞规','环规','精密配合'] },
    ]},

  { id:'P8', trade:'T2-QG', name:'传动与轴承装配', valueType:'档位', operator:'≥',
    question:'传动件与轴承能装到什么程度？',
    source:'简历锚点 + 面试追问',
    tiers:[
      { d:'D1', label:'装配到位', metric:'—', tool:'常规工具',
        desc:'带/链传动调张紧，齿轮啮合间隙调整，轴承配合选择与加热装配',
        limit:'跳动/噪声不保证',
        anchors:['皮带','链条','齿轮','轴承','联轴器'] },
      { d:'D2', label:'达标装配', metric:'跳动/噪声达标', tool:'百分表',
        desc:'皮带轮/链轮安装并验收跳动，齿轮箱装配并检验运转噪声，主轴/传动轴轴承装配',
        limit:'不会精密找正',
        anchors:['齿轮箱','主轴轴承','跳动验收','噪声检验'] },
      { d:'D3', label:'精密找正', metric:'同轴度达标', tool:'激光对中仪/百分表',
        desc:'电机-减速机联轴器找正；轴瓦刮研并检验油膜接触斑点',
        limit:'—',
        anchors:['联轴器找正','轴瓦刮研','油膜接触','同轴度'] },
    ]},

  { id:'P9', trade:'T2-QG', name:'修配', valueType:'档位', operator:'≥',
    question:'零件超差时能修到什么程度？',
    source:'简历锚点',
    tiers:[
      { d:'D1', label:'打磨去毛刺', metric:'—', tool:'角磨/锉刀',
        desc:'打磨、修边、去毛刺',
        limit:'不能修尺寸',
        anchors:['打磨','去毛刺','修边'] },
      { d:'D2', label:'修配到尺寸', metric:'尺寸达标', tool:'锉刀/砂纸',
        desc:'锉刀修配、轴套键销修配，修到配合尺寸',
        limit:'不会高精度研磨',
        anchors:['修配','轴套','键销','配作'] },
      { d:'D3', label:'高精度研磨', metric:'间隙达标', tool:'研磨具',
        desc:'高精度研磨、导轨局部修复',
        limit:'—',
        anchors:['研磨','导轨修复','局部修复'] },
    ]},

  { id:'P10', trade:'T2-QG', name:'机械识图', valueType:'档位', operator:'≥',
    question:'能读懂什么层级的机械图？',
    source:'简历锚点 + 面试追问',
    core:true,
    tiers:[
      { d:'D1', label:'零件图', metric:'—', tool:'—',
        desc:'能识读尺寸、公差、粗糙度、技术要求',
        limit:'不会读装配图',
        anchors:['零件图','识图','看图纸'] },
      { d:'D2', label:'装配图', metric:'—', tool:'—',
        desc:'能理解装配关系、配合要求和装配顺序',
        limit:'不会提取加工信息',
        anchors:['装配图','配合要求','装配顺序'] },
      { d:'D3', label:'提取加工信息', metric:'—', tool:'—',
        desc:'完成中等复杂零件图识读并提取加工信息，列装配清单',
        limit:'—',
        anchors:['加工信息','装配清单','工艺分析'] },
    ]},

  { id:'P11', trade:'T2-QG', name:'量具', valueType:'名词', operator:'⊇',
    question:'会用哪些量具？',
    source:'简历锚点 + 面试实操',
    core:true,
    tiers:[
      { d:'D1', label:'常用量具', metric:'—', tool:'—',
        desc:'卡尺、千分尺、磁性表座、刀口尺',
        limit:'不会精密量具',
        anchors:['卡尺','千分尺','刀口尺'] },
      { d:'D2', label:'精密量具', metric:'—', tool:'—',
        desc:'百分表、杠杆表、高度规、塞尺、角度尺',
        limit:'不会高精度量具',
        anchors:['百分表','杠杆表','高度规','塞尺','角度尺'] },
      { d:'D3', label:'高精度量具', metric:'—', tool:'—',
        desc:'千分表、塞规、环规、水平仪',
        limit:'—',
        anchors:['千分表','塞规','环规','水平仪'] },
    ]},

  /* ===== 电工 ===== */
  { id:'E1', trade:'T2-DG', name:'看图能力', valueType:'档位', operator:'≥',
    question:'能独立看懂什么层级的电气图纸？',
    source:'简历锚点 + 面试确认',
    core:true,
    tiers:[
      { d:'D1', label:'点位图', metric:'—', tool:'—',
        desc:'简单点位图、接线图，按图找线接端子',
        limit:'看不懂完整 PLC 原理图',
        anchors:['点位图','接线图','会看图','按图接'] },
      { d:'D2', label:'整套电气图纸', metric:'—', tool:'—',
        desc:'独立看懂全套电气图纸，能按逻辑理解回路',
        limit:'不懂多轴伺服与总线',
        anchors:['电气图纸','原理图','整套图纸'] },
      { d:'D3', label:'多轴+总线图', metric:'—', tool:'—',
        desc:'看懂复杂多轴伺服、总线通讯线路图（EtherCAT/Profinet）',
        limit:'—',
        anchors:['多轴伺服','总线','EtherCAT','Profinet'] },
    ]},

  { id:'E2', trade:'T2-DG', name:'装配独立性', valueType:'档位', operator:'≥',
    question:'布线装配能独立到什么程度？',
    source:'简历锚点',
    tiers:[
      { d:'D1', label:'跟师傅配合', metric:'—', tool:'—',
        desc:'跟师傅布线、加端子、压线',
        limit:'不能独立装整机',
        anchors:['布线','配线','端子','压线'] },
      { d:'D2', label:'独立装整机', metric:'—', tool:'—',
        desc:'独立完成整台设备线路装配、整机布线',
        limit:'不会按机构改线',
        anchors:['独立装配','整机布线','整机接线'] },
      { d:'D3', label:'改线与优化', metric:'—', tool:'—',
        desc:'按机构动作临时改 I/O 线路，优化接线方案',
        limit:'—',
        anchors:['改线','优化接线','I/O'] },
    ]},

  { id:'E3', trade:'T2-DG', name:'电箱装配', valueType:'布尔', operator:'＝',
    question:'能独立装配电箱/控制柜吗？',
    source:'简历锚点',
    tiers:[
      { d:'D1', label:'不会', metric:'—', tool:'—', desc:'不会独立装配电箱', limit:'—', anchors:[] },
      { d:'D2', label:'独立装配', metric:'—', tool:'—', desc:'独立装配控制柜/电箱', limit:'—', anchors:['电箱','控制柜','配电柜'] },
      { d:'D3', label:'待补', metric:'—', tool:'—', desc:'（业务待补）', limit:'—', anchors:[] },
    ]},

  { id:'E4', trade:'T2-DG', name:'仪表使用', valueType:'档位', operator:'≥',
    question:'会用仪表做到什么程度？',
    source:'简历锚点',
    tiers:[
      { d:'D1', label:'基本档位', metric:'—', tool:'万用表',
        desc:'电压档（AC220/DC24）、电阻档测通断',
        limit:'不会绝缘测试',
        anchors:['万用表','AC220','DC24','测通断'] },
      { d:'D2', label:'绝缘测试', metric:'—', tool:'兆欧表',
        desc:'绝缘测试、干扰初步处理',
        limit:'不会伺服接地处理',
        anchors:['绝缘测试','兆欧表','摇表'] },
      { d:'D3', label:'干扰与接地', metric:'—', tool:'示波器',
        desc:'干扰处理、解决设备干扰、伺服接地问题',
        limit:'—',
        anchors:['干扰','屏蔽','伺服接地'] },
    ]},

  { id:'E5', trade:'T2-DG', name:'板级排故', valueType:'档位', operator:'≥',
    question:'故障能定位到什么程度？',
    source:'简历锚点 + 面试追问',
    tiers:[
      { d:'D1', label:'查通断', metric:'—', tool:'万用表',
        desc:'只能测通断，不能定位板级问题',
        limit:'不会排复杂故障',
        anchors:['查通断','测线路'] },
      { d:'D2', label:'板级排故', metric:'—', tool:'万用表/图纸',
        desc:'排除大部分电路板故障：断线、虚焊、传感器无信号',
        limit:'不会疑难故障',
        anchors:['板级','断线','虚焊','传感器无信号'] },
      { d:'D3', label:'疑难定位', metric:'—', tool:'示波器',
        desc:'疑难故障定位、整机疑难处理',
        limit:'—',
        anchors:['疑难故障','整机调试','故障定位'] },
    ]},

  { id:'E6', trade:'T2-DG', name:'气动能力', valueType:'档位', operator:'≥',
    question:'气动系统能做到什么程度？',
    source:'简历锚点',
    tiers:[
      { d:'D1', label:'认识元件', metric:'—', tool:'—',
        desc:'认识气缸、缓冲器、电磁阀、真空发生器',
        limit:'不会查漏',
        anchors:['气缸','电磁阀','真空发生器','气动'] },
      { d:'D2', label:'查漏调缓冲', metric:'—', tool:'—',
        desc:'排查漏气、调气缸缓冲、看懂气路简图',
        limit:'不会气路设计',
        anchors:['查漏','气路简图','调缓冲'] },
      { d:'D3', label:'气路设计', metric:'—', tool:'—',
        desc:'气路设计与改造',
        limit:'—',
        anchors:['气路设计','气路改造'] },
    ]},

  { id:'E7', trade:'T2-DG', name:'现场支持', valueType:'枚举', operator:'≥',
    question:'能否出差到客户现场？',
    source:'简历锚点 + 沟通确认',
    tiers:[
      { d:'D1', label:'厂内配合', metric:'—', tool:'—', desc:'不可出差，仅厂内配合', limit:'—', anchors:[] },
      { d:'D2', label:'可出差', metric:'—', tool:'—', desc:'可出差，客户现场故障复原/排除', limit:'—', anchors:['出差','驻场','现场调试'] },
      { d:'D3', label:'可改造', metric:'—', tool:'—', desc:'可出差并承担现场改造', limit:'—', anchors:['现场改造','客户验收'] },
    ]},

  { id:'E8', trade:'T2-DG', name:'软件工具', valueType:'名词', operator:'⊇',
    question:'会用哪些电气设计软件？',
    source:'简历锚点',
    tiers:[
      { d:'D1', label:'不会', metric:'—', tool:'—', desc:'不用设计软件，仅按图施工', limit:'—', anchors:[] },
      { d:'D2', label:'会看会用', metric:'—', tool:'—', desc:'EPLAN Electric P8 / TIA Portal 能打开查看', limit:'—', anchors:['EPLAN','TIA Portal','博途'] },
      { d:'D3', label:'能改图', metric:'—', tool:'—', desc:'能用 EPLAN / TIA 改图、导出清单', limit:'—', anchors:['EPLAN 改图','TIA 编程','导出BOM'] },
    ]},

  { id:'E9', trade:'T2-DG', name:'PLC 机型', valueType:'名词', operator:'⊇',
    question:'接触过哪些 PLC 机型？',
    source:'简历锚点',
    tiers:[
      { d:'D1', label:'无', metric:'—', tool:'—', desc:'未接触 PLC', limit:'—', anchors:[] },
      { d:'D2', label:'会看', metric:'—', tool:'—', desc:'S7-1200 / S7-1500 能看点位与状态', limit:'—', anchors:['S7-1200','S7-1500','西门子PLC'] },
      { d:'D3', label:'会编程调试', metric:'—', tool:'—', desc:'能编程、下载、在线调试', limit:'—', anchors:['PLC编程','下载程序','在线监控'] },
    ]},

  { id:'E10', trade:'T2-DG', name:'工艺规范', valueType:'名词', operator:'⊇',
    question:'掌握哪些电气施工工艺？',
    source:'简历锚点',
    tiers:[
      { d:'D1', label:'基础工艺', metric:'—', tool:'—', desc:'绑扎、穿管、端子压接', limit:'—', anchors:['绑扎','穿管','压接'] },
      { d:'D2', label:'线束与接地', metric:'—', tool:'—', desc:'线束绑扎、穿管、屏蔽、接地工艺', limit:'—', anchors:['屏蔽','接地','线束'] },
      { d:'D3', label:'无尘车间要求', metric:'—', tool:'—', desc:'无尘车间静电控制与洁净施工要求', limit:'—', anchors:['无尘车间','静电','洁净'] },
    ]},
];

/* ---------- 岗位能力卡：N 清单（等级反查，不是门槛） ---------- */
const TRADE_NLIST = {
  'T2-QG':[
    { id:'N1', text:'不会独立装整机', means:'会了 = 至少中工', risk:'只能配合，需师傅带整机' },
    { id:'N2', text:'不会丝杆/导轨精调', means:'会了 = 至少中工', risk:'精度装配做不了，只能做粗装' },
    { id:'N3', text:'不会千分表打表', means:'会了 = 大工', risk:'高精度场景（光学/激光）接不了' },
    { id:'N4', text:'不能修超差', means:'会了 = 大工', risk:'装配出问题只能返工，不能现场救' },
  ],
  'T2-DG':[
    { id:'N1', text:'不会独立装电箱', means:'会了 = 至少中工', risk:'装错整柜可能烧毁，需师傅复核' },
    { id:'N2', text:'看不懂完整 PLC 原理图', means:'会了 = 至少中工', risk:'只能按点位干，改线看不出联动后果' },
    { id:'N3', text:'不会排复杂故障', means:'会了 = 至少中工', risk:'停机时无法独立恢复，必须等人' },
    { id:'N4', text:'不能出差', means:'会了 = 至少中工', risk:'现场交付用不了' },
  ],
};

/* ---------- 等级跃迁点 ---------- */
const TRADE_TRANS = {
  'T2-QG':[
    { id:'J1', name:'打表', from:'看表、装夹', to:'找平校平行、加减垫片' },
    { id:'J2', name:'整机', from:'配合上下料', to:'独立装配整机' },
    { id:'J3', name:'修配', from:'打磨去毛刺', to:'修配到配合尺寸' },
    { id:'J4', name:'识图', from:'零件图', to:'装配图' },
  ],
  'T2-DG':[
    { id:'J1', name:'看图', from:'点位图', to:'整套电气图纸' },
    { id:'J2', name:'装配', from:'跟师傅配合', to:'独立装整机线路' },
    { id:'J3', name:'电箱', from:'不会', to:'独立装配' },
    { id:'J4', name:'排故', from:'查通断', to:'排除板级故障' },
    { id:'J5', name:'现场', from:'不可出差', to:'可出差 + 现场复原' },
  ],
};

/* ---------- 岗位画像 v2：(T2 工种 × 等级) ---------- */
/* pick: [因子id, 要求档, 分档]  分档 = PASS | 必填 | 加分 */
const PORTRAITS_V2 = [
  { id:'PT-QG-D1', trade:'T2-QG', grade:'D1', name:'钳工 · 小工', ver:'v2.0',
    pick:[['P1','D1','PASS'],['P11','D1','PASS'],
          ['P2','D1','必填'],['P3','D1','必填'],['P4','D1','必填'],['P9','D1','必填']],
    passNote:'会看表装夹、会用常用量具，就不是纯杂工' },

  { id:'PT-QG-D2', trade:'T2-QG', grade:'D2', name:'钳工 · 中工', ver:'v2.0',
    pick:[['P1','D2','PASS'],['P10','D2','PASS'],['P11','D2','PASS'],
          ['P2','D1','必填'],['P4','D2','必填'],['P8','D2','必填'],['P9','D2','必填'],
          ['P5','D2','加分'],['P7','D2','加分']],
    passNote:'打表到 0.02–0.05mm + 能读装配图 + 会用精密量具' },

  { id:'PT-QG-D3', trade:'T2-QG', grade:'D3', name:'钳工 · 大工', ver:'v2.0',
    pick:[['P1','D3','PASS'],['P10','D3','PASS'],['P8','D3','PASS'],
          ['P4','D2','必填'],['P7','D3','必填'],['P9','D3','必填'],
          ['P5','D3','加分'],['P6','D2','加分'],['P2','D3','加分']],
    passNote:'千分表 ≤0.01mm + 能精密找正 + 能修超差' },

  { id:'PT-DG-D1', trade:'T2-DG', grade:'D1', name:'电工 · 小工', ver:'v2.0',
    pick:[['E1','D1','PASS'],['E2','D1','PASS'],['E4','D1','PASS'],
          ['E3','D1','必填'],['E10','D1','必填'],['E6','D1','必填']],
    passNote:'能按点位图施工、会用万用表基本档' },

  { id:'PT-DG-D2', trade:'T2-DG', grade:'D2', name:'电工 · 中工', ver:'v2.0',
    pick:[['E1','D2','PASS'],['E2','D2','PASS'],['E3','D1','PASS'],
          ['E4','D2','必填'],['E5','D2','必填'],['E6','D2','必填'],['E7','D2','必填'],
          ['E8','D2','加分'],['E9','D2','加分'],['E10','D2','加分']],
    passNote:'能读整套电气图纸 + 能独立装整机 + 能装电箱' },

  { id:'PT-DG-D3', trade:'T2-DG', grade:'D3', name:'电工 · 大工', ver:'v2.0',
    pick:[['E1','D3','PASS'],['E2','D3','PASS'],['E5','D3','PASS'],
          ['E3','D2','必填'],['E4','D3','必填'],['E6','D2','必填'],
          ['E8','D3','加分'],['E9','D3','加分'],['E7','D3','加分']],
    passNote:'能读多轴总线图 + 能改 I/O 优化方案 + 能定疑难故障' },
];

/* ---------- 工具函数 ---------- */
const tradeOf = id => TRADES.find(t=>t.id===id) || {};
const factorOf = id => FACTORS_TRADE.find(f=>f.id===id) || {};
const factorsOfTrade = tid => FACTORS_TRADE.filter(f=>f.trade===tid);
const portraitsOfTrade = tid => PORTRAITS_V2.filter(p=>p.trade===tid);
const gradeName = g => (GRADES[g]||{}).name || g;
const tierOf = (fid, d) => (factorOf(fid).tiers||[]).find(t=>t.d===d) || {};

/* 画像完整度：返回三个数，不给百分比 */
function portraitFill(p){
  const g = k => p.pick.filter(x=>x[2]===k);
  return {
    pass:[g('PASS').length, g('PASS').length],
    must:[g('必填').length, g('必填').length],
    plus:[g('加分').length, g('加分').length],
    total:p.pick.length,
  };
}

/* ============================================================
   47 项通用字段的性质分类（2026-11-13 审核）
   结论：47 项里只有 7 条是真因子；其余是标识 / 交易条件 / 证据
   性质取值：
     id      标识 —— 唯一确定一个人，不参与算分
     cond    交易条件 —— 按 J18/Q11 应下沉到职位层
     skill   能力因子 —— 可进画像
     dup     与工种技能因子重复 —— 应删除，避免双重维护
     tag     指向标签库的复合字段 —— 不是原子因子
     cert    证据 —— 证书/材料，可被画像作为持证要求引用
     text    文本材料 —— 只能人工看，不可算分
     bg      背景信息 —— 面谈记录，不进画像
   ============================================================ */
const COMMON_CLASS = {
  '姓名':'id','性别':'cond','年龄':'cond','籍贯':'id','现居地':'cond','婚姻状况':'cond','身份证':'id','联系电话':'id',
  '主技能':'tag','技能年限':'skill','第二技能':'tag','设备品牌':'skill','工艺类型':'skill','行业背景':'skill',
  '项目经历':'text','带班经验':'skill','识图能力':'dup','对刀/调机':'dup','编程能力':'dup','语言能力':'skill','驾驶技能':'skill','其他证书':'cert',
  '电工证':'cert','焊工证':'cert','叉车证':'cert','高空作业证':'cert','特种设备证':'cert','安全培训证':'cert','职业资格等级':'cert','学历证书':'cert','体检报告':'cert',
  '期望岗位':'cond','期望城市':'cond','可到岗时间':'cond','可接受驻场':'cond','可接受倒班':'cond','可接受出差':'cond',
  '期望薪资':'cond','最低薪资':'cond','薪资结构偏好':'cond','住宿需求':'cond','餐饮需求':'cond','社保要求':'cond','合同期限':'cond',
  '离职原因':'bg','上一份工作':'text','求职动机':'bg',
};

const CLASS_META = {
  id:   { name:'标识',     tone:'n', desc:'唯一确定一个人，不参与算分' },
  cond: { name:'交易条件', tone:'w', desc:'按已定规则下沉到职位层，不进画像' },
  skill:{ name:'能力因子', tone:'g', desc:'可进画像，需补观察点/值域/来源/算子' },
  dup:  { name:'与工种因子重复', tone:'r', desc:'工种技能层已有，此处应删除' },
  tag:  { name:'标签库复合项', tone:'i', desc:'不是原子因子，指向标签库' },
  cert: { name:'证据',     tone:'i', desc:'证书/材料，可被画像引用为持证要求' },
  text: { name:'文本材料', tone:'n', desc:'只能人工阅读，不可算分' },
  bg:   { name:'背景信息', tone:'n', desc:'面谈记录，不进画像' },
};

/* 47 项按性质计数 */
function commonClassStat(){
  const out = {};
  FACTOR_GROUPS.forEach(g=>g.items.forEach(it=>{
    const k = COMMON_CLASS[it] || 'skill';
    out[k] = (out[k]||0) + 1;
  }));
  return out;
}
const classOf = name => CLASS_META[COMMON_CLASS[name]||'skill'];

/* =====================================================================
   岗位描述（JD）—— 三层结构的最外层
   ---------------------------------------------------------------------
   层级定义：
     L1 因子库         最小可判定单位（观察点+值域+来源+算子）
     L2 岗位能力画像     挑选因子 + 定档 + 分档 → 机器可算分
     L3 岗位描述（JD）  把 L2 渲染成人能读的段落 → 客户确认单上看的就是它

   关键设计：岗位描述**不是手写文本**。每一句都由 (因子, 档位) 合成，
   句尾挂因子号；改一次因子的指标，所有岗位描述的对应句子同时更新。
   允许存在的自由文本只有三类，且必须显式标注为「不可追溯」：
     ① 岗位定位一句话  ② 工作条件（交易条件，不进因子库） ③ 明确不需要什么
   ===================================================================== */

const JOB_DESCS = [
  { id:'JD-QG-D1', trade:'T2-QG', grade:'D1', portrait:'PT-QG-D1',
    title:'装配钳工（小工 / 辅助）', scene:'非标自动化 · 3C 产线设备', ver:'v1.0', status:'已确认',
    intro:'在师傅带领下配合完成机械装配的辅助工序，负责上料、摆放、初装与现场清理。',
    duties:[['P1','D1','配合'],['P11','D1','自备'],['P2','D1','按图'],['P3','D1','独立'],['P4','D1','独立'],['P9','D1','完成']],
    conds:[['班次','两班倒（8:00–20:00）'],['出差','不要求'],['地点','苏州工业园区'],['住宿','免费 4 人间'],['计价','按小时，27–32 元/时']],
    notNeed:['不需要独立装整机','不需要打表到 0.02mm 以内','不需要看装配图'],
    ownerNote:'这一档招的是"能被带的人"，不是"能干活的人" —— 面试只看两件事：肯学、手不抖。' },

  { id:'JD-QG-D2', trade:'T2-QG', grade:'D2', portrait:'PT-QG-D2',
    title:'装配钳工（中工 / 独立交付）', scene:'非标自动化 · 3C / 锂电产线设备', ver:'v1.0', status:'已确认',
    intro:'独立负责单台非标设备的机械装配与精度调试，能读装配图、能打表找正、能出差现场装机。',
    duties:[['P1','D2','主导'],['P10','D2','独立'],['P11','D2','自备'],['P2','D1','完成'],['P4','D2','完成'],['P8','D2','负责'],['P9','D2','负责'],['P5','D2','完成'],['P7','D2','完成']],
    conds:[['班次','两班倒（8:00–20:00）'],['出差','可长期出差（单次 1–3 个月）'],['地点','苏州 / 常州 / 宁德'],['住宿','免费 4 人间'],['计价','按小时，38–45 元/时']],
    notNeed:['不需要设计工装','不需要带徒弟','不需要处理客户技术方案'],
    ownerNote:'中工是主力档，也是流失最快的档 —— 打表到 0.02mm 的人会自己接私活，报价要留空间。' },

  { id:'JD-QG-D3', trade:'T2-QG', grade:'D3', portrait:'PT-QG-D3',
    title:'装配钳工（大工 / 精密调试）', scene:'非标自动化 · 光学 / 激光 / 精密模组', ver:'v1.0', status:'草稿',
    intro:'负责高精度设备的精密打表与整机精度验收，能处理超差故障、能带人、能代表我方对接客户现场。',
    duties:[['P1','D3','主导'],['P10','D3','独立'],['P8','D3','负责'],['P4','D2','完成'],['P7','D3','主导'],['P9','D3','主导'],['P5','D3','完成'],['P6','D2','完成'],['P2','D3','完成']],
    conds:[['班次','常白班为主，赶工期跟班'],['出差','可长期出差 + 可独立驻场'],['地点','长三角 + 项目地'],['住宿','单人间或补贴'],['计价','按小时，52–65 元/时 或 月薪 1.4–1.8 万']],
    notNeed:['不需要做机械设计','不需要管采购'],
    ownerNote:'这一档的判定不看"会什么"，看"出过什么事、怎么解决的" —— 面试必问超差案例。' },

  { id:'JD-DG-D1', trade:'T2-DG', grade:'D1', portrait:'PT-DG-D1',
    title:'装配电工（小工 / 辅助）', scene:'非标自动化 · 控制柜装配', ver:'v1.0', status:'已确认',
    intro:'按点位图与工艺卡完成控制柜内布线、压端子、贴标签等辅助施工。',
    duties:[['E1','D1','按图'],['E2','D1','完成'],['E4','D1','自备'],['E3','D1','完成'],['E10','D1','遵守'],['E6','D1','完成']],
    conds:[['班次','两班倒'],['出差','不要求'],['地点','苏州工业园区'],['住宿','免费 4 人间'],['计价','按小时，26–31 元/时']],
    notNeed:['不需要读整套电气图','不需要调试伺服','不需要独立上电'],
    ownerNote:'主要看手速和规范：线号是否对、端子是否压到位、有没有剩线头。' },

  { id:'JD-DG-D2', trade:'T2-DG', grade:'D2', portrait:'PT-DG-D2',
    title:'装配电工（中工 / 整机电气）', scene:'非标自动化 · 整机电气装配与调试', ver:'v1.0', status:'已确认',
    intro:'独立完成整机电气装配、上电点检与基础调试，能读整套电气图纸并按图改线。',
    duties:[['E1','D2','独立'],['E2','D2','独立'],['E3','D1','按图'],['E4','D2','自备'],['E5','D2','负责'],['E6','D2','完成'],['E7','D2','完成'],['E8','D2','参与'],['E9','D2','参与'],['E10','D2','遵守']],
    conds:[['班次','两班倒'],['出差','可出差'],['地点','苏州 / 常州'],['住宿','免费 4 人间'],['计价','按小时，36–44 元/时']],
    notNeed:['不需要写 PLC 程序','不需要做电气方案设计'],
    ownerNote:'分水岭是"能不能独立上电" —— 敢上电、上电不炸、炸了能查出来，才叫中工。' },

  { id:'JD-DG-D3', trade:'T2-DG', grade:'D3', portrait:'PT-DG-D3',
    title:'装配电工（大工 / 疑难故障）', scene:'非标自动化 · 多轴 / 总线 / 疑难排查', ver:'v1.0', status:'草稿',
    intro:'负责复杂设备的电气调试与疑难故障定位，能改 I/O、优化方案、带人并输出调试记录。',
    duties:[['E1','D3','主导'],['E2','D3','主导'],['E5','D3','主导'],['E3','D2','独立'],['E4','D3','自备'],['E6','D2','完成'],['E8','D3','负责'],['E9','D3','负责'],['E7','D3','主导']],
    conds:[['班次','常白班为主'],['出差','可长期驻场'],['地点','长三角 + 项目地'],['住宿','单人间或补贴'],['计价','按小时，50–62 元/时']],
    notNeed:['不需要做上位机开发'],
    ownerNote:'看的是排障路径：同样的故障，大工问三个问题就能定位，中工要拆半台机。' },
];

const jdOf = id => JOB_DESCS.find(x=>x.id===id) || {};
const jdOfPortrait = pid => JOB_DESCS.find(x=>x.portrait===pid) || {};
const jdsOfTrade = tid => JOB_DESCS.filter(x=>x.trade===tid);

/* ---- 拼句器：把 (因子, 档位) 合成一句人能读的描述 ---- */
/* 去掉 desc 开头的"能"，让它从"能做什么"变成"做什么" */
const stripNeng = s => String(s||'').replace(/^能/, '');

function jdLine(fid, d){
  const f = factorOf(fid), tr = tierOf(fid, d);
  if(!f.id) return null;
  const gap = isGapTierT(tr);
  /* 名词型（如量具）desc 是一串清单，直接当句子会读成"名词罗列"，加动词框架 */
  const isNoun = f.valueType === '名词';
  const body = isNoun ? `自备并会用${stripNeng(tr.desc)}` : stripNeng(tr.desc);
  return {
    fid, d,
    name: f.name,
    text: gap ? `${f.name}：（该档标准待补，暂不可验收）` : body,
    metric: hasMetricT(tr) ? tr.metric : '',
    limit: (tr.limit && tr.limit!=='—') ? tr.limit : '',
    tool: (tr.tool && tr.tool!=='—') ? tr.tool : '',
    anchors: tr.anchors || [],
    gap,
  };
}
/* 这两个判定放在数据层，页面层直接用 */
function isGapTierT(x){ return !x || !x.label || x.label==='待补'; }
function hasMetricT(x){ return !!(x && x.metric && x.metric!=='—' && x.metric!=='无要求'); }

/* 一个岗位描述的全部可追溯句（按 分档 排序：PASS → 必填 → 加分） */
function jdSentences(jd){
  const p = PORTRAITS_V2.find(x=>x.id===jd.portrait);
  if(!p) return [];
  const order = {PASS:0, 必填:1, 加分:2};
  return p.pick
    .map(x=>({ gate:x[2], ...jdLine(x[0], x[1]) }))
    .filter(Boolean)
    .sort((a,b)=>(order[a.gate]-order[b.gate]));
}

/* =====================================================================
   标准 + 本单差异 合成（V10）
   ---------------------------------------------------------------------
   标准层只读，单层可改；改的只存 diff，渲染时现合成。
   ov = { add:[{fid,d,gate,from,src}], del:[fid], tier:{fid:d}, cond:{k:v}, notNeed:[..] }
   返回的每一句带 adj：{kind:'add'|'tier', from:{d}|null, src, by, at}
   ===================================================================== */
function mergeJd(j, ov){
  const sent = jdSentences(j).map(s=>({ ...s, adj:null }));
  if(!ov) {
    return { sent, conds:(j.conds||[]).map(([k,v])=>({k,v,adj:false})),
             non:(j.notNeed||[]).map(x=>({x,adj:false})), adjN:0 };
  }
  const del = new Set(ov.del||[]);
  const live = sent.filter(s=>!del.has(s.fid)).map(s=>{
    if(ov.tier && ov.tier[s.fid]){
      const nd = ov.tier[s.fid];
      if(nd!==s.d){
        const n = jdLine(s.fid, nd);
        return { ...s, ...n, gate:s.gate,
                 adj:{ kind:'tier', from:s.d, by:ov.by, at:ov.at } };
      }
    }
    return s;
  });
  (ov.add||[]).forEach(a=>{
    const n = jdLine(a.fid, a.d);
    if(!n) return;
    live.push({ ...n, gate:a.gate||'必填',
      adj:{ kind:'add', from:null, src:a.src, by:ov.by, at:ov.at } });
  });
  const conds = (j.conds||[]).map(([k,v])=>{
    const nv = (ov.cond && ov.cond[k]!=null) ? ov.cond[k] : v;
    return { k, v:nv, old:v, adj:nv!==v };
  });
  const non = (j.notNeed||[]).map(x=>{
    const dropped = (ov.notNeed||[]).includes('-' + x);
    return { x, adj:false, dropped };
  });
  (ov.notNeed||[]).filter(x=>x[0]!=='-').forEach(x=>non.push({ x, adj:true }));
  const adjN = live.filter(s=>s.adj).length + conds.filter(c=>c.adj).length + non.filter(x=>x.adj).length;
  return { sent:live, conds, non, adjN };
}

/* 可追溯率：只按「正文句子」算，工作条件不算句子（它是键值对，不是描述）*/
function jdTrace(jd){
  const s = jdSentences(jd);
  const traceable = s.filter(x=>!x.gap).length;
  const gapSentences = s.filter(x=>x.gap).length;
  return {
    sentences: s.length,
    traceable,
    gapSentences,
    withMetric: s.filter(x=>x.metric).length,
    free: 1,                       // 岗位定位一句话，人工撰写
    conds: (jd.conds||[]).length,  // 工作条件（交易条件）
    non: (jd.notNeed||[]).length,  // 明确不需要
    denom: traceable + gapSentences + 1,
    pct: Math.round(traceable / (traceable + gapSentences + 1) * 100),
  };
}

/* =====================================================================
   岗位要素清单（ElementChecklist）
   ---------------------------------------------------------------------
   岗位不是手写的，是「框」出来的：从要素池里框出这个岗位要问什么。
   清单里有两类条目（见《数据字典-四个概念关系》§21）：
     source = factor  能力要素：从因子库投影，一根三档尺 + 锚点，可评分
     source = pool    准入/条件要素：从要素池直取，无尺无锚，只判满足与否
   能力要素这一段＝「岗位能力画像」那张表（同一份数据，改这里等于改画像）；
   准入/条件只在这里出现，永不进算分。
   ===================================================================== */
const ELEMENT_STDS = [
  { id:'ES-QG-D1', trade:'T2-QG', grade:'D1', portrait:'PT-QG-D1', name:'钳工 · 小工',
    ver:'v2.0', status:'已发布', updated:'11-12', owner:'金诚',
    note:'这一档招的是"能被带的人"，能力段只框 6 条，其余全是准入与条件' },
  { id:'ES-QG-D2', trade:'T2-QG', grade:'D2', portrait:'PT-QG-D2', name:'钳工 · 中工',
    ver:'v2.0', status:'已发布', updated:'11-12', owner:'金诚',
    note:'主力档。PASS 三条（打表 / 装配图 / 精密量具）缺一条就不能算中工' },
  { id:'ES-QG-D3', trade:'T2-QG', grade:'D3', portrait:'PT-QG-D3', name:'钳工 · 大工',
    ver:'v2.0', status:'草稿', updated:'11-12', owner:'金诚',
    note:'判的是"出过什么事、怎么解决的"，能力段要求档普遍落在 D3' },
  { id:'ES-DG-D1', trade:'T2-DG', grade:'D1', portrait:'PT-DG-D1', name:'电工 · 小工',
    ver:'v2.0', status:'已发布', updated:'11-12', owner:'金诚',
    note:'按点位图施工，能力段只框 6 条' },
  { id:'ES-DG-D2', trade:'T2-DG', grade:'D2', portrait:'PT-DG-D2', name:'电工 · 中工',
    ver:'v2.0', status:'已发布', updated:'11-12', owner:'金诚',
    note:'分水岭是"能不能独立上电"' },
  { id:'ES-DG-D3', trade:'T2-DG', grade:'D3', portrait:'PT-DG-D3', name:'电工 · 大工',
    ver:'v2.0', status:'草稿', updated:'11-12', owner:'金诚',
    note:'看排障路径：同样故障，大工问三个问题就能定位' },
];

/* 准入 / 条件要素（source = pool）：每条 = 要素 + 取值 + 值类型 + 是否必填 */
const ELEMENT_CONDS = {
  'ES-QG-D1':[
    { k:'经验年限', t:'区间', v:'≤1 年',     req:true,  why:'同岗经验，只认装配类' },
    { k:'年龄',     t:'区间', v:'18–45 岁',  req:true,  why:'高危：见合规提示' },
    { k:'学历',     t:'枚举', v:'初中及以上', req:false, why:'' },
    { k:'健康证明', t:'布尔', v:'需体检报告', req:false, why:'' },
    { k:'班次',     t:'枚举', v:'两班倒',     req:true,  why:'' },
    { k:'住宿',     t:'枚举', v:'免费 4 人间', req:false, why:'' },
    { k:'工价',     t:'区间', v:'27–32 元/时', req:true,  why:'按小时计价' },
  ],
  'ES-QG-D2':[
    { k:'经验年限', t:'区间', v:'2–5 年',     req:true,  why:'同岗经验，只认装配类' },
    { k:'年龄',     t:'区间', v:'20–45 岁',  req:true,  why:'高危：见合规提示' },
    { k:'学历',     t:'枚举', v:'初中及以上', req:false, why:'' },
    { k:'班次',     t:'枚举', v:'两班倒',     req:true,  why:'' },
    { k:'出差',     t:'布尔', v:'可长期出差', req:true,  why:'单次 1–3 个月' },
    { k:'住宿',     t:'枚举', v:'免费 4 人间', req:false, why:'' },
    { k:'工价',     t:'区间', v:'38–45 元/时', req:true,  why:'按小时计价' },
  ],
  'ES-QG-D3':[
    { k:'经验年限', t:'区间', v:'5 年以上',   req:true,  why:'且需精密设备装配经历' },
    { k:'年龄',     t:'区间', v:'25–48 岁',  req:true,  why:'高危：见合规提示' },
    { k:'班次',     t:'枚举', v:'常白班为主', req:false, why:'赶工期跟班' },
    { k:'出差',     t:'布尔', v:'可独立驻场', req:true,  why:'' },
    { k:'住宿',     t:'枚举', v:'单人间或补贴', req:false, why:'' },
    { k:'工价',     t:'区间', v:'52–65 元/时', req:true,  why:'或月薪 1.4–1.8 万' },
  ],
  'ES-DG-D1':[
    { k:'经验年限', t:'区间', v:'≤1 年',     req:true,  why:'' },
    { k:'年龄',     t:'区间', v:'18–45 岁',  req:true,  why:'高危：见合规提示' },
    { k:'职业证书', t:'证书', v:'低压电工证', req:true,  why:'无证不得上岗' },
    { k:'班次',     t:'枚举', v:'两班倒',     req:true,  why:'' },
    { k:'住宿',     t:'枚举', v:'免费 4 人间', req:false, why:'' },
    { k:'工价',     t:'区间', v:'26–31 元/时', req:true,  why:'' },
  ],
  'ES-DG-D2':[
    { k:'经验年限', t:'区间', v:'2–5 年',     req:true,  why:'' },
    { k:'年龄',     t:'区间', v:'20–45 岁',  req:true,  why:'高危：见合规提示' },
    { k:'职业证书', t:'证书', v:'低压电工证', req:true,  why:'无证不得上岗' },
    { k:'班次',     t:'枚举', v:'两班倒',     req:true,  why:'' },
    { k:'出差',     t:'布尔', v:'可出差',     req:true,  why:'' },
    { k:'住宿',     t:'枚举', v:'免费 4 人间', req:false, why:'' },
    { k:'工价',     t:'区间', v:'36–44 元/时', req:true,  why:'' },
  ],
  'ES-DG-D3':[
    { k:'经验年限', t:'区间', v:'5 年以上',   req:true,  why:'' },
    { k:'年龄',     t:'区间', v:'25–48 岁',  req:true,  why:'高危：见合规提示' },
    { k:'职业证书', t:'证书', v:'低压电工证', req:true,  why:'' },
    { k:'出差',     t:'布尔', v:'可长期驻场', req:true,  why:'' },
    { k:'住宿',     t:'枚举', v:'单人间或补贴', req:false, why:'' },
    { k:'工价',     t:'区间', v:'50–62 元/时', req:true,  why:'' },
  ],
};

/* 要素池：可被清单「直取」的准入/条件要素。
   没建因子不代表不能问 —— 只代表判不出分。risk=高 的要走合规提示。 */
const ELEMENT_POOL = [
  { k:'经验年限',   t:'区间', hint:'如 2–5 年',            risk:'' },
  { k:'年龄',       t:'区间', hint:'如 18–45 岁',          risk:'高' },
  { k:'性别',       t:'枚举', hint:'不限 / 男 / 女',        risk:'高' },
  { k:'学历',       t:'枚举', hint:'初中及以上',            risk:'' },
  { k:'职业证书',   t:'证书', hint:'低压电工证 / 焊工证',    risk:'' },
  { k:'健康证明',   t:'布尔', hint:'需提供体检报告',        risk:'' },
  { k:'班次',       t:'枚举', hint:'白班 / 两班倒 / 三班倒 / 夜班', risk:'' },
  { k:'住宿',       t:'枚举', hint:'免费 4 人间 / 补贴 / 自理', risk:'' },
  { k:'出差',       t:'布尔', hint:'是否接受长期出差',      risk:'' },
  { k:'工价',       t:'区间', hint:'如 38–45 元/时',        risk:'' },
  { k:'站立作业',   t:'布尔', hint:'需长时间站立',          risk:'' },
  { k:'负重上限',   t:'区间', hint:'如 ≤25kg',              risk:'' },
  { k:'到岗时间',   t:'区间', hint:'如 7 天内到岗',         risk:'' },
  { k:'无犯罪记录', t:'布尔', hint:'需开具证明',            risk:'高' },
  { k:'身高视力',   t:'区间', hint:'如裸眼 4.8 以上',       risk:'高' },
];

const elStdOf = id => ELEMENT_STDS.find(x=>x.id===id) || {};
/* 能力要素：优先取画像（同一份数据），副本没有画像时取自身快照 */
const elCapsOf = id => {
  const s = elStdOf(id);
  const p = PORTRAITS_V2.find(x=>x.id===s.portrait);
  return p ? p.pick : (s.caps || []);
};
const elCondsOf = id => ELEMENT_CONDS[id] || [];
const elStdOfPortrait = pid => ELEMENT_STDS.find(x=>x.portrait===pid) || null;
/* 清单统计：能力段给四个数，条件段只给条数 —— 条件段不给"分" */
function elStatOf(id){
  const caps = elCapsOf(id), conds = elCondsOf(id);
  const g = k => caps.filter(x=>x[2]===k).length;
  const gap = caps.filter(x=>isGapTierT(tierOf(x[0],x[1]))).length;
  const metr = caps.filter(x=>{ const t=tierOf(x[0],x[1]); return !isGapTierT(t)&&hasMetricT(t); }).length;
  return { cap:caps.length, pass:g('PASS'), must:g('必填'), plus:g('加分'),
           gap, metr, cond:conds.length, condReq:conds.filter(c=>c.req).length };
}
