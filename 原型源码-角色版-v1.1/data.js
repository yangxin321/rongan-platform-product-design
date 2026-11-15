/* ===== 融敢平台 · 角色版 数据层 ===== */
const TODAY = '2026-11-13';

const STAFF = [
  {id:'U4', name:'李文静', role:'R04', post:'招聘专员', phone:'139****2201', team:'东莞一组'},
  {id:'U5', name:'陈曦',   role:'R04', post:'招聘专员', phone:'137****8834', team:'上海一组'},
  {id:'U6', name:'王浩',   role:'R04', post:'招聘专员', phone:'136****5512', team:'苏州一组'},
  {id:'U1', name:'金诚',   role:'R01', post:'总经理',   phone:'138****0001', note:'兼客户负责人'},
];

const DEMANDS = [
  {id:'D1', code:'XQ-20261110-01', client:'立讯精密', cs:'立讯', ps:'售后', project:'3C非标设备售后运维', post:'售后运维工程师', head:12, hired:4, price:'32-38 元/时', city:'东莞·松山湖', deadline:'2026-12-15', valid:'2026-11-10 ~ 2026-12-20', confirm:'已确认', alloc:'已分完', status:'招聘中', pinned:true,
   req:['大专以上，机电/自动化相关','2 年以上非标设备调试经验','能接受客户现场驻场','持低压电工证（加分）'], owner:'李文静'},
  {id:'D2', code:'XQ-20261109-02', client:'华工激光', cs:'华工', ps:'装配', project:'激光追踪仪产线扩产', post:'装配调试技师', head:8, hired:2, price:'30-34 元/时', city:'武汉·东湖高新', deadline:'2026-12-08', valid:'2026-11-09 ~ 2026-12-12', confirm:'已确认', alloc:'部分分配', status:'招聘中', pinned:true,
   req:['中专以上，机械/光电相关','激光设备装配经验 1 年以上','能看懂装配图与工艺卡'], owner:'王浩'},
  {id:'D3', code:'XQ-20261108-03', client:'宁德时代', cs:'宁德', ps:'IQC', project:'宜宾基地 IQC 扩编', post:'IQC 检验员', head:5, hired:1, price:'26-30 元/时', city:'宜宾·临港', deadline:'2026-11-30', valid:'2026-11-08 ~ 2026-12-05', confirm:'已确认', alloc:'部分分配', status:'招聘中', pinned:false,
   req:['高中以上，视力正常','来料检验经验 1 年以上','会用卡尺/千分尺'], owner:'李文静'},
  {id:'D4', code:'XQ-20261106-04', client:'江南造船', cs:'江南', ps:'船舶', project:'船舶电气舾装分包', post:'船舶电工', head:15, hired:5, price:'38-45 元/时', city:'上海·长兴岛', deadline:'2026-11-28', valid:'2026-11-06 ~ 2026-12-10', confirm:'已确认', alloc:'已分完', status:'招聘中', pinned:true,
   req:['持电工特种作业操作证','船厂或重工行业经验','能适应船坞高低温作业','45 岁以下'], owner:'陈曦'},
  {id:'D5', code:'XQ-20261105-05', client:'海尔智家', cs:'海尔', ps:'总装', project:'青岛中德生态园产线', post:'总装装配工', head:20, hired:8, price:'24-28 元/时', city:'青岛·黄岛', deadline:'2026-12-20', valid:'2026-11-05 ~ 2026-12-25', confirm:'已确认', alloc:'部分分配', status:'招聘中', pinned:false,
   req:['18-40 岁，身体健康','有流水线装配经验优先','可接受两班倒'], owner:'李文静'},
  {id:'D6', code:'XQ-20261103-06', client:'比亚迪电子', cs:'比亚迪', ps:'售后', project:'3C 结构件售后', post:'售后技术员', head:6, hired:6, price:'28-32 元/时', city:'深圳·坪山', deadline:'2026-11-15', valid:'2026-11-03 ~ 2026-11-20', confirm:'已确认', alloc:'已分完', status:'已完成', pinned:false,
   req:['中专以上','3C 组装或售后经验','能出差'], owner:'陈曦'},
  {id:'D7', code:'XQ-20261102-07', client:'领益智造', cs:'领益', ps:'CNC', project:'东莞 CNC 加工中心', post:'CNC 操作工', head:15, hired:3, price:'30-36 元/时', city:'东莞·长安', deadline:'2026-12-01', valid:'2026-11-02 ~ 2026-12-05', confirm:'变更待重确认', alloc:'部分分配', status:'招聘中', pinned:false,
   req:['会看图纸，能独立对刀','FANUC / 三菱系统经验','2 年以上加工经验'], owner:'王浩'},
  {id:'D8', code:'XQ-20261101-08', client:'阿特斯阳光', cs:'阿特斯', ps:'装配', project:'光伏组件装配扩产', post:'装配钳工', head:20, hired:2, price:'26-30 元/时', city:'苏州·常熟', deadline:'2026-12-25', valid:'2026-11-01 ~ 2026-12-30', confirm:'待客户确认', alloc:'未分配', status:'待分配', pinned:false,
   req:['有钳工基础，会使用常用工具','光伏或电子装配经验优先','能长期稳定'], owner:'王浩'},
];

const ALLOCS = [
  {demandId:'D1', staff:'李文静', qty:5, hired:2, target:'2026-12-10', status:'进行中'},
  {demandId:'D1', staff:'陈曦',   qty:4, hired:1, target:'2026-12-12', status:'进行中'},
  {demandId:'D1', staff:'王浩',   qty:3, hired:1, target:'2026-12-15', status:'进行中'},
  {demandId:'D2', staff:'王浩',   qty:5, hired:2, target:'2026-12-05', status:'进行中'},
  {demandId:'D2', staff:'陈曦',   qty:3, hired:0, target:'2026-12-08', status:'进行中'},
  {demandId:'D3', staff:'李文静', qty:3, hired:1, target:'2026-11-28', status:'进行中'},
  {demandId:'D3', staff:'王浩',   qty:2, hired:0, target:'2026-11-30', status:'进行中'},
  {demandId:'D4', staff:'陈曦',   qty:8, hired:3, target:'2026-11-25', status:'进行中'},
  {demandId:'D4', staff:'李文静', qty:4, hired:1, target:'2026-11-26', status:'进行中'},
  {demandId:'D4', staff:'王浩',   qty:3, hired:1, target:'2026-11-28', status:'进行中'},
  {demandId:'D5', staff:'李文静', qty:12, hired:5, target:'2026-12-15', status:'进行中'},
  {demandId:'D5', staff:'王浩',   qty:8, hired:3, target:'2026-12-18', status:'进行中'},
  {demandId:'D6', staff:'陈曦',   qty:6, hired:6, target:'2026-11-14', status:'已完成'},
  {demandId:'D7', staff:'王浩',   qty:10, hired:2, target:'2026-11-28', status:'进行中'},
  {demandId:'D7', staff:'陈曦',   qty:5, hired:1, target:'2026-12-01', status:'进行中'},
  {demandId:'D8', staff:'王浩',   qty:20, hired:2, target:'2026-12-22', status:'进行中'},
];

/* ===== V7：需求挂「岗位描述」 =====
   以前"岗位名称"是自由文本，跟画像/描述对不上，评分器只能按名字模糊猜。
   现在需求存三个字段：
     jdId      引用哪份描述（标准本体）
     jdVer     引用时的标准版本 —— 标准升版后能判"这一单用的是哪一版"
     jdOverride 本单差异，只存 diff，不复制全文（V9）
*/
const JD_LINK = { D8:{ jdId:'JD-QG-D2', jdVer:'v1.0' } };
const JD_OVERRIDE = {
  D8:{ /* 阿特斯这一单：客户加了句"要看懂装配图"，砍掉孔加工，把修配提到 D3，工价改 28–32 */
    add:[{ fid:'P10', d:'D2', gate:'必填', from:'customer',
           src:'客户原话：得能看懂装配图，别到时候图纸都问我' }],
    del:['P5'],
    tier:{ P9:'D3' },
    cond:{ '工价':'28–32 元/时' },
    notNeed:[],
    by:'金诚', at:'11-13 15:20',
  },
};
DEMANDS.forEach(d=>{
  const l = JD_LINK[d.id] || {};
  d.jdId = l.jdId || null;
  d.jdVer = l.jdVer || null;
  d.jdOverride = l.jdId ? (JD_OVERRIDE[d.id] || null) : null;
});
/* 客户级默认描述（V11）：勾了「另存为该客户默认」就落在这里，下次建同类需求直接带出 */
const CUSTOMER_JD = { '阿特斯阳光':{ jdId:'JD-QG-D2', from:'D8', at:'11-13 15:20' } };

const BATCHES = [
  {id:'B1', code:'立讯售后-1113-01', demandId:'D1', owner:'李文静', date:'2026-11-13', boss:18, manual:2, pool:5, touched:15, intent:6, interview:3, arrived:1, status:'进行中'},
  {id:'B12',code:'立讯售后-1113-02', demandId:'D1', owner:'李文静', date:'2026-11-13', boss:0, manual:6, pool:0, touched:0, intent:0, interview:0, arrived:0, status:'进行中'},
  {id:'B2', code:'江南船舶-1113', demandId:'D4', owner:'陈曦', date:'2026-11-13', boss:22, manual:0, pool:3, touched:12, intent:4, interview:2, arrived:0, status:'进行中'},
  {id:'B3', code:'领益CNC-1113', demandId:'D7', owner:'王浩', date:'2026-11-13', boss:14, manual:1, pool:2, touched:9, intent:3, interview:1, arrived:1, status:'进行中'},
  {id:'B11',code:'宁德IQC-1113', demandId:'D3', owner:'李文静', date:'2026-11-13', boss:9, manual:0, pool:3, touched:5, intent:2, interview:0, arrived:0, status:'进行中'},
  {id:'B4', code:'立讯售后-1112', demandId:'D1', owner:'李文静', date:'2026-11-12', boss:20, manual:3, pool:4, touched:24, intent:8, interview:4, arrived:2, status:'已关闭'},
  {id:'B5', code:'江南船舶-1112', demandId:'D4', owner:'陈曦', date:'2026-11-12', boss:26, manual:0, pool:2, touched:26, intent:7, interview:3, arrived:1, status:'已关闭'},
  {id:'B6', code:'华工装配-1112', demandId:'D2', owner:'王浩', date:'2026-11-12', boss:11, manual:2, pool:1, touched:14, intent:5, interview:2, arrived:1, status:'已关闭'},
  {id:'B7', code:'宁德IQC-1112', demandId:'D3', owner:'李文静', date:'2026-11-12', boss:9, manual:0, pool:3, touched:12, intent:3, interview:1, arrived:0, status:'已关闭'},
  {id:'B8', code:'江南船舶-1111', demandId:'D4', owner:'陈曦', date:'2026-11-11', boss:19, manual:1, pool:2, touched:20, intent:6, interview:2, arrived:1, status:'已关闭'},
  {id:'B9', code:'阿特斯装配-1111', demandId:'D8', owner:'王浩', date:'2026-11-11', boss:12, manual:0, pool:5, touched:16, intent:4, interview:1, arrived:0, status:'已关闭'},
  {id:'B10',code:'海尔总装-1110', demandId:'D5', owner:'李文静', date:'2026-11-10', boss:16, manual:2, pool:6, touched:22, intent:5, interview:2, arrived:1, status:'已关闭'},
];

/* name, gender, age, phone, skills, demandId, batchId, node, tier, score, lastContact, lastType, nextFollow, owner, status */
const RAW_P = [
['张建国','男',34,'138****6621','PLC,电气调试','D1','B1','待面试','A',86,'2026-11-13 09:20','电话','2026-11-14','李文静','跟进中'],
['李海涛','男',29,'137****3345','非标设备,售后','D1','B1','面试通过','S',91,'2026-11-13 10:05','电话','2026-11-15','李文静','跟进中'],
['王秀兰','女',31,'135****7788','电气装配,接线','D1','B1','已入职','A',84,'2026-11-12 16:40','微信','—','李文静','已入职'],
['陈志强','男',37,'136****1129','PLC,伺服','D1','B1','补全中','B',72,'2026-11-13 09:55','电话','2026-11-14','李文静','跟进中'],
['刘明辉','男',26,'139****4452','售后,客户现场','D1','B1','触达中','B',68,'2026-11-13 08:30','电话','2026-11-12','李文静','跟进中'],
['赵鹏','男',33,'138****9910','非标设备,调试','D1','B4','待入职','A',88,'2026-11-12 17:10','微信','2026-11-16','陈曦','跟进中'],
['周文杰','男',28,'137****2234','电气调试','D1','B4','已淘汰','D',34,'2026-11-11 15:20','电话','—','李文静','无意向'],
['孙丽娟','女',30,'135****6677','售后,文员','D1','B1','已匹配','B',63,'2026-11-13 09:10','短信','2026-11-14','王浩','跟进中'],

['吴国强','男',41,'138****8801','船舶电气,舾装','D4','B2','面试通过','S',93,'2026-11-13 10:30','电话','2026-11-15','陈曦','跟进中'],
['郑海峰','男',38,'137****5566','电工,船厂','D4','B2','待面试','A',87,'2026-11-13 09:40','电话','2026-11-14','陈曦','跟进中'],
['马长青','男',44,'136****3311','电工证书,重工','D4','B2','补全中','B',70,'2026-11-13 11:00','微信','2026-11-14','陈曦','跟进中'],
['高建军','男',36,'139****7742','船舶电工','D4','B5','已入职','A',85,'2026-11-12 14:00','线下见面','—','陈曦','已入职'],
['林志远','男',32,'138****1109','电气舾装','D4','B5','待入职','A',82,'2026-11-12 15:30','电话','2026-11-16','陈曦','跟进中'],
['黄伟','男',27,'137****9943','电工,PLC','D4','B8','触达中','B',66,'2026-11-11 10:20','电话','2026-11-14','陈曦','跟进中'],
['徐立新','男',45,'135****2287','船厂电工','D4','B2','已淘汰','C',48,'2026-11-13 08:50','电话','—','陈曦','无意向'],
['何俊','男',35,'136****6605','船舶电气','D4','B5','已入职','A',80,'2026-11-10 09:00','线下见面','—','陈曦','已入职'],

['曹敏','女',28,'139****3318','CNC,对刀','D7','B3','待面试','A',83,'2026-11-13 09:15','电话','2026-11-14','王浩','跟进中'],
['谢天成','男',31,'138****7726','FANUC,加工中心','D7','B3','新入库','B',61,'—','—','2026-11-14','王浩','跟进中'],
['罗建华','男',39,'137****1145','CNC 编程','D7','B3','已匹配','A',81,'2026-11-13 10:50','电话','2026-11-14','王浩','跟进中'],
['邓小刚','男',25,'135****9982','CNC 操作','D7','B3','已入职','B',64,'2026-11-12 11:20','微信','—','王浩','已入职'],

['袁春梅','女',26,'136****4471','IQC,卡尺','D3','B7','面试通过','A',85,'2026-11-12 16:20','电话','2026-11-15','李文静','跟进中'],
['傅强','男',30,'139****8834','来料检验','D3','B7','待面试','B',71,'2026-11-12 15:00','微信','2026-11-14','李文静','跟进中'],
['苏文','女',24,'138****6620','IQC,千分尺','D3','B7','补全中','B',69,'2026-11-12 14:10','短信','2026-11-14','李文静','跟进中'],
['钟海燕','女',33,'137****3390','品质检验','D3','B7','已入职','A',84,'2026-11-10 09:30','线下见面','—','李文静','已入职'],

['彭国栋','男',42,'135****7761','装配,钳工','D5','B10','触达中','B',62,'2026-11-10 16:00','电话','2026-11-14','李文静','跟进中'],
['汪丽','女',29,'136****2205','流水线,组装','D5','B10','已入职','B',60,'2026-11-09 10:00','微信','—','李文静','已入职'],
['冯建','男',34,'138****5533','总装,装配','D5','B10','已匹配','C',56,'2026-11-10 09:20','电话','2026-11-14','李文静','跟进中'],
['蒋琴','女',27,'139****1128','电子装配','D5','B10','触达中','B',65,'2026-11-11 09:40','电话','2026-11-14','李文静','跟进中'],
['韩磊','男',31,'137****9907','装配工','D5','B10','已匹配','C',52,'2026-11-10 14:30','短信','2026-11-14','李文静','跟进中'],

['范志刚','男',33,'135****4432','激光装配,光路','D2','B6','待面试','A',86,'2026-11-12 11:00','电话','2026-11-14','王浩','跟进中'],
['石磊','男',28,'136****8871','装配调试','D2','B6','面试通过','A',82,'2026-11-12 13:20','电话','2026-11-15','王浩','跟进中'],
['唐雪','女',25,'138****2249','光电,装配','D2','B6','补全中','B',73,'2026-11-12 10:10','微信','2026-11-14','王浩','跟进中'],
['严峰','男',36,'139****6673','激光设备','D2','B6','已入职','A',80,'2026-11-11 09:00','线下见面','—','王浩','已入职'],
['崔浩','男',29,'137****1198','机械装配','D2','B6','触达中','B',67,'2026-11-12 15:40','电话','2026-11-14','王浩','跟进中'],

['潘玉','女',27,'135****3350','售后,客服','D6','—','已入职','A',81,'2026-11-08 10:00','微信','—','陈曦','已入职'],
['武强','男',30,'136****7724','3C 组装','D6','—','已入职','B',71,'2026-11-07 14:00','电话','—','陈曦','已入职'],
['白杨','男',24,'138****9931','售后技术','D6','—','已入职','A',80,'2026-11-07 16:30','线下见面','—','陈曦','已入职'],
['殷红','女',32,'139****4408','装配钳工','D8','B9','触达中','B',66,'2026-11-11 10:30','电话','2026-11-14','王浩','跟进中'],
['葛亮','男',37,'137****2276','钳工,装配','D8','B9','已匹配','B',63,'2026-11-11 15:00','微信','2026-11-14','王浩','跟进中'],
['邱实','男',26,'135****8834','电子装配','D8','B9','新入库','C',58,'—','—','2026-11-14','王浩','跟进中'],
/* 演示：同一个人挂在不同需求的批次里（手机号与 P7 / P1 相同，会被合并成同一份档案） */
['周文杰','男',28,'137****2234','装配,钳工','D8','—','已匹配','B',63,'2026-11-12 10:00','电话','2026-11-14','王浩','跟进中'],
['张建国','男',34,'138****6621','非标设备,CNC','D7','B3','触达中','B',68,'2026-11-12 14:00','电话','2026-11-14','王浩','跟进中'],
];

/* 人才池额外人员：name, gender, age, phone, skills, source, lastActive, complete, status */
const RAW_POOL = [
['秦志国','男',35,'138****1102','PLC,伺服,电气调试','BOSS','2026-11-13',92,'在池'],
['冯晓丽','女',28,'137****2245','IQC,品质,卡尺','门店','2026-11-12',78,'在池'],
['邓超','男',31,'136****9931','CNC,FANUC,对刀','BOSS','2026-11-13',85,'在池'],
['许文强','男',39,'139****6614','船舶电工,舾装','历史库','2026-11-10',71,'在池'],
['雷军华','男',33,'135****4407','激光装配,光路调试','BOSS','2026-11-11',88,'在池'],
['曾小燕','女',26,'138****8852','电子装配,焊接','转介绍','2026-11-09',64,'在池'],
['方志明','男',42,'137****3391','钳工,装配,机修','历史库','2026-11-08',80,'在池'],
['谭琳','女',24,'136****1163','售后,客服,文员','门店','2026-11-12',59,'在池'],
['韦建国','男',45,'139****7728','电工,持证,重工','BOSS','2026-11-06',90,'在池'],
['严红梅','女',30,'135****9945','装配,质检','转介绍','2026-11-05',66,'在池'],
['孔祥','男',28,'138****2251','CNC,三菱系统','BOSS','2026-11-13',87,'在池'],
['邵军','男',34,'137****6602','总装,流水线','门店','2026-11-07',55,'在池'],
['常晓东','男',29,'136****4419','激光,光电,调试','历史库','2026-11-04',76,'在池'],
['万丽娟','女',31,'135****3327','IQC,来料检验','BOSS','2026-11-12',82,'在池'],
['卢建平','男',40,'139****1136','船舶电气,电工证','历史库','2026-11-03',73,'在池'],
['安静','女',27,'138****9982','装配,电子','门店','2026-11-09',61,'在池'],
];

/* 重点关注：系统推送 + 手动标记 */
const FOCUS = [
  {id:'F1', type:'system', kind:'审批', staff:'李文静', title:'陈志强 的资料补全待复核', sub:'提交于 11-13 09:55 · 电气调试 6 年 · 待你确认 12 项因子', level:'accent', act:'去复核', target:'person:P4'},
  {id:'F2', type:'system', kind:'超期', staff:'陈曦', title:'黄伟 已 2 个月未联系', sub:'上次联系 2026-09-13 · 船舶电工 · 曾表示 12 月可到岗', level:'warn', act:'去联系', target:'person:P14'},
  {id:'F3', type:'system', kind:'面试', staff:'王浩', title:'曹敏 面试未通过待处理', sub:'客户反馈 11-12 16:20 · 原因：期望薪资超上限 2 元/时', level:'bad', act:'处理', target:'person:P17'},
  {id:'F4', type:'system', kind:'时效', staff:'陈曦', title:'船舶电工岗位 15 天后到期，缺口 10 人', sub:'最迟到岗 2026-11-28 · 当前已入职 5 / 需求 15', level:'bad', act:'看需求', target:'demand:D4'},
  {id:'F5', type:'manual', kind:'手动', staff:'李文静', title:'张建国 —— 重点跟进', sub:'置顶原因：客户现场经验匹配度最高，本周内必须推到面试', level:'accent', act:'看人员', target:'person:P1'},
];

/* 联系记录 */
const FOLLOWS = [
  {personId:'P1', time:'2026-11-13 09:20', type:'电话', staff:'李文静', note:'沟通到岗时间，接受 12 月初，约周四面试'},
  {personId:'P2', time:'2026-11-13 10:05', type:'电话', staff:'李文静', note:'面试通过，等体检安排，已加微信'},
  {personId:'P9', time:'2026-11-13 10:30', type:'电话', staff:'陈曦', note:'确认船厂经验 6 年，愿接受长兴岛驻场'},
  {personId:'P10', time:'2026-11-13 09:40', type:'电话', staff:'陈曦', note:'约明天上午线下面试，提醒带电工证原件'},
  {personId:'P17', time:'2026-11-13 09:15', type:'电话', staff:'王浩', note:'CNC 8 年，期望 38 元/时，客户上限 36，待议'},
  {personId:'P18', time:'2026-11-13 11:00', type:'微信', staff:'王浩', note:'刚入库，已发资料补全链接'},
  {personId:'P4', time:'2026-11-13 09:55', type:'电话', staff:'李文静', note:'补全 12 项因子，等复核'},
  {personId:'P11', time:'2026-11-13 11:00', type:'微信', staff:'陈曦', note:'补全电工证照片，等复核'},
  {personId:'P21', time:'2026-11-12 16:20', type:'电话', staff:'李文静', note:'面试通过，等客户确认'},
  {personId:'P29', time:'2026-11-13 08:30', type:'电话', staff:'李文静', note:'客户现场经验不足，标为备选'},
  {personId:'P31', time:'2026-11-12 11:00', type:'电话', staff:'王浩', note:'激光装配 4 年，约面试'},
  {personId:'P12', time:'2026-11-12 14:00', type:'线下见面', staff:'陈曦', note:'门店面谈，已签约，11-18 到岗'},
];

const LOGS = [
  {time:'2026-11-13 11:00', staff:'陈曦', role:'R04', act:'记录联系', obj:'马长青', detail:'微信 · 补全电工证照片'},
  {time:'2026-11-13 10:50', staff:'王浩', role:'R04', act:'运行匹配', obj:'批次 XQ-20261113-07-A', detail:'17 人 → 出 S0 / A2 / B9 / C5 / D1'},
  {time:'2026-11-13 10:30', staff:'陈曦', role:'R04', act:'记录联系', obj:'吴国强', detail:'电话 · 约 11-15 线下面试'},
  {time:'2026-11-13 10:05', staff:'李文静', role:'R04', act:'记录联系', obj:'李海涛', detail:'电话 · 面试通过，等体检'},
  {time:'2026-11-13 09:40', staff:'李文静', role:'R04', act:'新建批次', obj:'XQ-20261113-01-A', detail:'关联需求 D1 · 售后运维工程师'},
  {time:'2026-11-13 09:20', staff:'陈曦', role:'R04', act:'上传简历', obj:'批次 XQ-20261113-04-A', detail:'BOSS 导出 22 份，去重后 22 份'},
  {time:'2026-11-12 17:10', staff:'金诚', role:'R01', act:'分配需求', obj:'D1 售后运维工程师', detail:'李文静 5 / 陈曦 4 / 王浩 3，合计 12'},
  {time:'2026-11-12 16:40', staff:'李文静', role:'R04', act:'推进入职', obj:'王秀兰', detail:'待入职 → 已入职 · 11-18 报到'},
  {time:'2026-11-12 15:00', staff:'金诚', role:'R01', act:'发布需求', obj:'D7 CNC 操作工', detail:'变更后重新发布，旧评分失效'},
  {time:'2026-11-12 09:30', staff:'金诚', role:'R01', act:'调整权限', obj:'角色 R04', detail:'新增「人才池导出」权限'},
];

/* 画像因子（47 项精简展示分组） */
const FACTOR_GROUPS = [
  {name:'A 基本信息', n:8, items:['姓名','性别','年龄','籍贯','现居地','婚姻状况','身份证','联系电话']},
  {name:'B 技能与经验', n:14, items:['主技能','技能年限','第二技能','设备品牌','工艺类型','行业背景','项目经历','带班经验','识图能力','对刀/调机','编程能力','语言能力','驾驶技能','其他证书']},
  {name:'C 证书与资质', n:9, items:['电工证','焊工证','叉车证','高空作业证','特种设备证','安全培训证','职业资格等级','学历证书','体检报告']},
  {name:'D 意愿与匹配', n:16, items:['期望岗位','期望城市','可到岗时间','可接受驻场','可接受倒班','可接受出差','期望薪资','最低薪资','薪资结构偏好','住宿需求','餐饮需求','社保要求','合同期限','离职原因','上一份工作','求职动机']},
];

const TIERS = {S:'85 分以上 · 强匹配', A:'80-84 · 匹配', B:'60-79 · 可用', C:'40-59 · 需补强', D:'40 分以下 · 不建议'};
const NODES = ['新入库','已匹配','触达中','补全中','待面试','面试通过','待入职','已入职','已淘汰'];

/* ---- 构建对象 ---- */
const PERSONS = RAW_P.map((r,i)=>({
  id:'P'+(i+1), name:r[0], gender:r[1], age:r[2], phone:r[3], skills:r[4].split(','),
  demandId:r[5], batchId:r[6], node:r[7], tier:r[8], score:r[9],
  lastContact:r[10], lastType:r[11], nextFollow:r[12], owner:r[13], status:r[14]
}));
const POOL = RAW_POOL.map((r,i)=>({
  id:'K'+(i+1), name:r[0], gender:r[1], age:r[2], phone:r[3], skills:r[4].split(','),
  source:r[5], lastActive:r[6], complete:r[7], status:r[8]
}));

/* ===== 第 1 层：人员档案（全局唯一，按手机号去重） ===== */
const PEOPLE = [];
const PE_IDX = {};
function upsertPerson(base){
  const key = base.phone;
  if(PE_IDX[key]){
    const ex = PE_IDX[key];
    (base.skills||[]).forEach(s=>{ if(!ex.skills.includes(s)) ex.skills.push(s); });
    return ex.id;
  }
  const person = {
    id:'PE'+String(PEOPLE.length+1).padStart(3,'0'),
    name:base.name, gender:base.gender, age:base.age, phone:base.phone,
    skills:[...(base.skills||[])],
    source:base.source||'BOSS', lastActive:base.lastActive||TODAY,
    complete:base.complete|| (68+((PEOPLE.length*7)%30))
  };
  PEOPLE.push(person); PE_IDX[key]=person;
  return person.id;
}
PERSONS.forEach(p=>{ p.personId = upsertPerson(p); });
POOL.forEach(k=>{ k.personId = upsertPerson(k); });

/* 第 2 层：投递 = 人员 × 需求的一次参与，PERSONS 每条即一条投递 */
const appPerson = pid => PEOPLE.find(x=>x.id===pid) || {name:'—',skills:[],phone:'—',id:'—'};
const appsOf = pid => PERSONS.filter(p=>p.personId===pid);
const appsOfPersonId = appsOf;
const activeAppsOf = pid => appsOf(pid).filter(p=>p.status==='跟进中');
const otherApps = p => appsOf(p.personId).filter(x=>x.id!==p.id);
const hasMultiApp = p => otherApps(p).length>0;

/* 批次命名：公司简称+岗位简称-月日[-序号] */
function batchName(demandId, date, seq){
  const d = DEMANDS.find(x=>x.id===demandId);
  if(!d) return '—';
  const md = date.slice(5,7)+date.slice(8,10);
  return seq ? `${d.cs}${d.ps}-${md}-${String(seq).padStart(2,'0')}` : `${d.cs}${d.ps}-${md}`;
}
/* 同需求同日已有批次数量，用于判断是否需要补序号 */
function nextSeq(demandId, date){
  const same = BATCHES.filter(b=>b.demandId===demandId && b.date===date);
  if(!same.length) return 0;
  return same.length+1;
}

const D = id => DEMANDS.find(d=>d.id===id) || {post:'—',code:'—',client:'—',city:'—'};
const B = id => BATCHES.find(b=>b.id===id) || {code:'—',owner:'—'};
const P = id => PERSONS.find(p=>p.id===id);
const allocOf = id => ALLOCS.filter(a=>a.demandId===id);
const personsOf = id => PERSONS.filter(p=>p.demandId===id);
const batchesOf = id => BATCHES.filter(b=>b.demandId===id);
