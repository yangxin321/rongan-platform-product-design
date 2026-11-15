/* ===== 客户因子（CUSTOMER_FACTORS）=====
   客户说的是方言，系统要的是普通话。
   一条 = 客户口径 → 标准因子映射；原文必须保留（当证据，不进评分）。
   W1 裁决：挂客户，不挂项目 —— 一个客户的用人习惯跨项目一致；项目级允许覆盖。
   W3 裁决：原话永久留，标「证据 · 不参与评分」，90 天可归档不可删。
*/

/* 四态：ok 明确 / miss 缺值（知道要什么不知道多少）/ vague 模糊（不可判定词）/ none 未提 */
const CUST_ST = {
  ok:   { n:'明确', c:'g', i:'✔' },
  miss: { n:'缺值', c:'w', i:'⚠' },
  vague:{ n:'模糊', c:'w', i:'？' },
  none: { n:'未提', c:'r', i:'✘' },
};

const CUSTS = ['江南造船','立讯精密'];

const CUST_FACTORS = {
  '江南造船': {
    id:'CF-JN-01', customer:'江南造船', project:'船舶电气舾装分包', post:'船舶电工',
    owner:'陈曦', upd:'11-13 15:05',
    segs:[
      { at:'11-13 14:20', src:'微信', txt:'江南这边电工要 15 个，能上手接线柜的，最好在船厂干过' },
      { at:'11-13 14:32', src:'微信', txt:'电工证必须有，没证进不了坞' },
      { at:'11-13 15:05', src:'电话', txt:'工价 38 到 45，包住不包吃，能接受两班倒吗——他们说尽量白班' },
    ],
    items:[
      { dim:'资质', k:'职业证书', v:'低压/高压电工证，必须持证', st:'ok', req:true,
        std:'职业证书 = 电工特种作业操作证', raw:'电工证必须有，没证进不了坞',
        q:'电工证这边是只要低压，还是高压才算？' },
      { dim:'经验', k:'行业背景', v:'船厂 / 重工行业', st:'ok', req:false,
        std:'行业背景 ≥ 船舶 / 重工', raw:'最好在船厂干过',
        q:'' },
      { dim:'技能', k:'电箱装配', v:'未给档位（"能上手接线柜"）', st:'vague', req:true,
        std:'E3 ≥ D2（按图独立完成控制柜内布线、压端子）', raw:'能上手接线柜的',
        q:'"能上手接线柜"，是按图独立干完一整台柜，还是有人带、只做其中一段？' },
      { dim:'班次', k:'班次', v:'"尽量白班" vs "能接受两班倒" 互相矛盾', st:'vague', req:true,
        std:'班次 = 枚举（白班 / 两班倒）', raw:'能接受两班倒吗——他们说尽量白班',
        q:'班次到底是白班还是两班倒？这两个说法对不上，我们按哪个报价？' },
      { dim:'经验', k:'经验年限', v:'知道要船厂经验，没给年限', st:'miss', req:true,
        std:'经验年限 ≥ ?', raw:'最好在船厂干过',
        q:'船厂经验您这边最低要几年？1 年、3 年还是 5 年以上？' },
      { dim:'条件', k:'工价', v:'38–45 元/时', st:'ok', req:true,
        std:'工价 = 38–45 元/时', raw:'工价 38 到 45', q:'' },
      { dim:'条件', k:'住宿', v:'包住不包吃', st:'ok', req:false,
        std:'住宿 = 免费 / 餐食 = 自理', raw:'包住不包吃', q:'' },
      { dim:'条件', k:'年龄', v:'未提', st:'none', req:true,
        std:'年龄 = 区间（高危项，见合规提示）', raw:'',
        q:'年龄这边有要求吗？我们默认 18–45 岁，超龄的要不要？' },
      { dim:'条件', k:'学历', v:'未提', st:'none', req:false,
        std:'学历 = 初中及以上', raw:'',
        q:'学历要不要卡？初中以上行不行？' },
      { dim:'资质', k:'体能 / 作业环境', v:'未提（船坞高低温、高空）', st:'none', req:true,
        std:'体能要求：可船坞高低温作业、可高空作业', raw:'',
        q:'船坞里高低温、高空作业这些，有没有体检或者禁忌要求？' },
    ],
  },

  '立讯精密': {
    id:'CF-LX-02', customer:'立讯精密', project:'3C非标设备售后运维', post:'售后运维工程师',
    owner:'金诚', upd:'11-13 11:40',
    segs:[
      { at:'11-13 11:22', src:'微信', txt:'售后这个岗我要能上手就能干的，别给我刚毕业的' },
      { at:'11-13 11:40', src:'微信', txt:'能出差，客户现场驻场那种，短的一个月' },
    ],
    items:[
      { dim:'经验', k:'经验年限', v:'≥ 2 年', st:'ok', req:true,
        std:'经验年限 ≥ 2 年', raw:'别给我刚毕业的', q:'' },
      { dim:'技能', k:'设备调试', v:'未给档位（"上手就能干"）', st:'vague', req:true,
        std:'非标设备调试 ≥ D2', raw:'我要能上手就能干的',
        q:'"上手就能干"是指能独立调一台整机，还是能配合别人调？' },
      { dim:'条件', k:'出差', v:'可长期出差，单次约 1 个月', st:'ok', req:true,
        std:'出差 = 可出差（单次 1–3 个月）', raw:'短的一个月', q:'' },
      { dim:'条件', k:'工价', v:'未提', st:'miss', req:true,
        std:'工价 = 区间（按小时）', raw:'', q:'工价这边给到多少？32–38 行不行？' },
      { dim:'条件', k:'班次', v:'未提', st:'none', req:true,
        std:'班次 = 枚举', raw:'', q:'现场是白班还是跟着客户产线走两班倒？' },
      { dim:'资质', k:'职业证书', v:'低压电工证（加分）', st:'ok', req:false,
        std:'职业证书 = 低压电工证（加分项）', raw:'最好有电工证', q:'' },
    ],
  },
};

const custOf = name => CUST_FACTORS[name] || CUST_FACTORS[CUSTS[0]];

/* 待补清单严重度：未提的必填 > 模糊 > 缺值（W4：没补完也能建草稿，但拦住"发布"） */
function custGaps(c){
  const rank = it => it.st==='none' ? (it.req?0:3) : it.st==='vague' ? 1 : it.st==='miss' ? 2 : 9;
  return c.items.filter(it=>it.st!=='ok').sort((a,b)=>rank(a)-rank(b));
}
function custStat(c){
  const g = k => c.items.filter(i=>i.st===k).length;
  return { total:c.items.length, ok:g('ok'), miss:g('miss'), vague:g('vague'), none:g('none'),
           blocked:c.items.filter(i=>i.st!=='ok'&&i.req).length };
}
