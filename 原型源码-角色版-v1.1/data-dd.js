/* =============================================================
   数据字典 · 一张表
   -------------------------------------------------------------
   这就是数据库里的 dict_item 表：一行 = 一个字段的可选值。
   全站所有下拉框都从这里取值，人工提前建好，不在业务里临时输入。
   没有客户原话、没有分层解释 —— 只是"字段 → 可选项"。
   ============================================================= */

/* type：单选 / 多选 / 区间 / 词表 / 数字 / 文本
   scope：job 岗位 / client 客户 / order 需求 / sys 系统 */
const DICT_ITEMS = [
  /* ---------- 岗位 ---------- */
  { code:'SEX',      name:'性别',        type:'单选', scope:'job', options:['男','女','男女不限'], note:'默认男女不限' },
  { code:'AGE',      name:'年龄区间',    type:'区间', scope:'job', options:['18-35 岁','18-40 岁','18-45 岁','18-50 岁','不限'], unit:'岁', note:'超过 45 岁给合规提示，不做自动淘汰' },
  { code:'TRADE',    name:'工种',        type:'词表', scope:'job', options:['电工','钳工','调试','品质','数控','仓库','管工','售后'], note:'' },
  { code:'GRADE',    name:'等级',        type:'词表', scope:'job', options:['小工','中工','大工','组长'], note:'' },
  { code:'SHIFT',    name:'班制',        type:'单选', scope:'job', options:['长白班','两班倒','三班两倒','四班三运转','常夜班'], note:'' },
  { code:'STAND',    name:'站立强度',    type:'单选', scope:'job', options:['坐班','站班为主','站坐结合','重体力（≥25kg）','需登高'], note:'' },
  { code:'OVERTIME', name:'加班意愿',    type:'单选', scope:'job', options:['必须能加','可协商','不加班'], note:'' },
  { code:'CLEAN',    name:'无尘服',      type:'单选', scope:'job', options:['不限','普通工衣','防静电服','无尘服','无尘服+风淋'], note:'' },
  { code:'TATTOO',   name:'纹身',        type:'单选', scope:'job', options:['裸露部位不可有','短袖不可见','可遮盖','不限'], note:'' },
  { code:'HEALTH',   name:'健康要求',    type:'多选', scope:'job', options:['无要求','健康证','排除传染病','排除色盲色弱','排除慢性病'], note:'' },
  { code:'EXAM',     name:'体检类型',    type:'单选', scope:'job', options:['不体检','普通入职体检','职业健康体检','指定项目'], note:'' },
  { code:'CERT',     name:'证书',        type:'多选', scope:'job', options:['低压电工证','高压电工证','焊工证','叉车证','登高证','无强制证'], note:'' },
  { code:'SKILL',    name:'技能项',      type:'多选', scope:'job', options:['配盘接线','通电测试','读图','对刀','装夹','量具使用','打孔攻丝','点胶','锡丝焊'], note:'按工种继续补充' },
  { code:'DEVICE',   name:'设备经验',    type:'多选', scope:'job', options:['法兰克系统','线体','治具','伺服','CVD/ALD','AOI','激光追踪仪'], note:'' },
  { code:'DRAWING',  name:'看图能力',    type:'单选', scope:'job', options:['不能看','能看机械图','能看电气图','机械电气都能看'], note:'' },
  { code:'MENTOR',   name:'带徒要求',    type:'单选', scope:'job', options:['不需带徒','可带 1-2 人','需带 3 人以上'], note:'' },
  { code:'LANG',     name:'语言',        type:'多选', scope:'job', options:['普通话','粤语','简单英语'], note:'' },
  { code:'TRAVEL',   name:'出差要求',    type:'区间', scope:'job', options:['不出差','年 30 天内','年 100 天内','长期驻外'], unit:'天/年', note:'' },
  { code:'WAGE',     name:'工价',        type:'区间', scope:'job', options:['20-80 元/时'], unit:'元/时', note:'下限 20、上限 80 为常规区间' },

  /* ---------- 客户 ---------- */
  { code:'SOCIAL',   name:'社保方案',    type:'单选', scope:'client', options:['不缴','单工伤','五险','五险一金','商业险'], note:'' },
  { code:'MEAL',     name:'食宿',        type:'单选', scope:'client', options:['包吃住','包住不包吃','包吃不包住','自理','补贴'], note:'' },
  { code:'DORM',     name:'住宿条件',    type:'单选', scope:'client', options:['4 人间','6 人间','8 人间','夫妻房','无宿舍'], note:'' },
  { code:'SETTLE',   name:'结算方式',    type:'单选', scope:'client', options:['日结','周结','半月结','月结','完工结'], note:'' },
  { code:'HOURS',    name:'月工时',      type:'区间', scope:'client', options:['160-300 时'], unit:'时/月', note:'' },
  { code:'INTERVIEW',name:'面试方式',    type:'单选', scope:'client', options:['现场面试','视频面试','电话面试','免面试'], note:'' },
  { code:'CONTRACT', name:'签订方式',    type:'单选', scope:'client', options:['客户直签','我方代签','劳务派遣','外包'], note:'' },

  /* ---------- 需求 ---------- */
  { code:'URGENCY',  name:'紧急程度',    type:'单选', scope:'order', options:['救火（当天）','急（3 天内）','正常（2 周）','储备（1 月+）'], note:'' },
  { code:'DURATION', name:'工期',        type:'区间', scope:'order', options:['短单 <1 月','1-3 月','3-6 月','半年以上','常年'], unit:'月', note:'' },
  { code:'HEADCOUNT',name:'需求人数',    type:'数字', scope:'order', options:[], note:'直接填数字，不用选项' },
  { code:'PROJECT',  name:'项目性质',    type:'多选', scope:'order', options:['新项目首单','续签','扩编','替补','换供应商','试单'], note:'' },
];

const DD_SCOPE = {
  job:    { name:'岗位', tone:'g' },
  client: { name:'客户', tone:'i' },
  order:  { name:'需求', tone:'w' },
  sys:    { name:'系统', tone:'n' },
};
const DD_TYPE = ['单选','多选','区间','词表','数字','文本'];
const ddOf = code => DICT_ITEMS.find(x=>x.code===code) || {};
