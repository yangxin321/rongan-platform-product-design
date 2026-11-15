#!/usr/bin/env node
/* =======================================================================
   .pr-sync.mjs · 拉取 GitHub PR 审查意见，只输出「新增」项
   -----------------------------------------------------------------------
   用法：
     node .pr-sync.mjs                 检查新意见（不更新游标，纯看）
     node .pr-sync.mjs --mark          检查并更新游标（处理完再 mark）
     node .pr-sync.mjs --all           忽略游标，全量列出
     node .pr-sync.mjs --reply <id> <文本|@文件>   回复某条评论
     node .pr-sync.mjs --watch [分钟]  常驻轮询（默认 5 分钟），有新意见就打印
   环境：
     GITHUB_TOKEN  或  ~/.workbuddy/.gh-token
   游标：.pr-sync-state.json（不入库）
   ======================================================================= */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = process.env.PR_REPO || 'yangxin321/rongan-platform-product-design';
const PR = Number(process.env.PR_NUMBER || 5);
const STATE = path.join(HERE, '.pr-sync-state.json');

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  const p = path.join(os.homedir(), '.workbuddy', '.gh-token');
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  throw new Error('缺少 token：设 GITHUB_TOKEN 或写 ~/.workbuddy/.gh-token');
}
const TOKEN = token();

async function api(p, method = 'GET', body) {
  const r = await fetch('https://api.github.com' + p, {
    method,
    headers: {
      Authorization: 'token ' + TOKEN,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'pr-sync',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : {};
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return {}; }
}
function saveState(s) { fs.writeFileSync(STATE, JSON.stringify(s, null, 2)); }

/* 拉全量：审查结论 + 行内评论 + 会话评论，统一成一条条意见 */
async function collect() {
  const [pr, reviews, inline, conv] = await Promise.all([
    api(`/repos/${REPO}/pulls/${PR}`),
    api(`/repos/${REPO}/pulls/${PR}/reviews?per_page=100`),
    api(`/repos/${REPO}/pulls/${PR}/comments?per_page=100`),
    api(`/repos/${REPO}/issues/${PR}/comments?per_page=100`),
  ]);
  const items = [];
  for (const r of reviews) {
    if (!r.body || !r.body.trim()) continue;              // 只有状态的 review 跳过
    items.push({
      kind: 'review', id: 'rv' + r.id, at: r.submitted_at, who: r.user.login,
      state: r.state, where: '审查结论', body: r.body,
    });
  }
  for (const c of inline) {
    items.push({
      kind: 'inline', id: 'ic' + c.id, at: c.created_at, who: c.user.login,
      where: `${c.path}:${c.original_line || c.line || ''}`.replace(/:$/, ''),
      body: c.body, replyTo: c.in_reply_to_id || null, line: c.original_line || c.line,
      path: c.path, cid: c.id,
    });
  }
  for (const c of conv) {
    items.push({
      kind: 'conv', id: 'cv' + c.id, at: c.created_at, who: c.user.login,
      where: '会话', body: c.body, cid: c.id,
    });
  }
  items.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return { pr, items };
}

const SEV = b => {
  const t = (b || '').toLowerCase();
  if (/blocker|阻断|严重|必须改/.test(t)) return 'BLOCKER';
  if (/should-fix|建议改|应修/.test(t)) return 'SHOULD';
  if (/nit|措辞|间距/.test(t)) return 'NIT';
  return '—';
};

function render(it) {
  const head = `[${SEV(it.body)}] ${it.who} · ${it.where} · ${it.at}`;
  return `${head}\n${'-'.repeat(Math.min(72, head.length))}\n${it.body.trim()}\n`;
}

async function cmdCheck({ mark = false, all = false }) {
  const { pr, items } = await collect();
  const st = loadState();
  const seen = new Set(all ? [] : (st.seen || []));
  const fresh = items.filter(i => !seen.has(i.id));

  console.log(`PR #${PR} ${pr.state} · head ${pr.head.sha.slice(0, 8)} · mergeable ${pr.mergeable}`);
  console.log(`全部 ${items.length} 条，新增 ${fresh.length} 条${all ? '（--all 忽略游标）' : ''}\n`);

  if (!fresh.length) {
    console.log('没有新意见。');
    return { fresh, items };
  }
  for (const it of fresh) console.log(render(it));

  const cnt = { BLOCKER: 0, SHOULD: 0, NIT: 0, '—': 0 };
  fresh.forEach(i => cnt[SEV(i.body)]++);
  console.log('统计：BLOCKER %d · SHOULD %d · NIT %d · 未标 %d', cnt.BLOCKER, cnt.SHOULD, cnt.NIT, cnt['—']);
  console.log(cnt.BLOCKER > 0 ? '结论：需修改' : '结论：可以进入验收（无 blocker）');

  if (mark) {
    saveState({ seen: [...new Set([...seen, ...fresh.map(i => i.id)])], at: new Date().toISOString() });
    console.log('\n已更新游标 ->', path.basename(STATE));
  } else {
    console.log('\n（未更新游标；处理完请加 --mark）');
  }
  return { fresh, items };
}

async function cmdReply(id, text) {
  const body = text.startsWith('@') ? fs.readFileSync(text.slice(1), 'utf8') : text;
  /* id 三种写法：
       ic<数字> → 强制行内回复（线程内）
       cv<数字> → 强制会话评论
       <数字>   → 自动判断：是 review comment 就线程内回复，否则当会话评论
     裸数字曾被当成会话评论，回复跑出线程、丢失上下文，故加自动判断。 */
  let isInline = /^ic/.test(id);
  if (!isInline && !/^cv/.test(id)) {
    try {
      /* 注意：取单条行内评论是 /pulls/comments/{id}（不带 PR 号），
         而回复是 /pulls/{PR}/comments/{id}/replies —— 两者路径不同，别混用 */
      await api(`/repos/${REPO}/pulls/comments/${id}`);
      isInline = true;
    } catch (e) { isInline = false; }
  }
  if (isInline) {
    const cid = Number(id.replace(/^ic/, ''));
    const r = await api(`/repos/${REPO}/pulls/${PR}/comments/${cid}/replies`, 'POST', { body });
    console.log('已回复行内评论:', r.html_url);
  } else {
    const r = await api(`/repos/${REPO}/issues/${PR}/comments`, 'POST', { body });
    console.log('已发表会话评论:', r.html_url);
  }
}

async function cmdWatch(min) {
  const ms = Math.max(1, min) * 60000;
  console.log(`每 ${min} 分钟检查一次 PR #${PR}，Ctrl+C 退出`);
  const tick = async () => {
    try {
      const { fresh } = await cmdCheck({ mark: false });
      if (fresh.length) {
        console.log(`\n>>> ${new Date().toLocaleTimeString()} 发现 ${fresh.length} 条新意见，游标未动，交给处理流程`);
      } else {
        console.log(`[${new Date().toLocaleTimeString()}] 无新增`);
      }
    } catch (e) { console.error('轮询失败：', e.message); }
  };
  await tick();
  setInterval(tick, ms);
}

const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const val = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };

try {
  if (has('--reply')) await cmdReply(argv[argv.indexOf('--reply') + 1], argv[argv.indexOf('--reply') + 2]);
  else if (has('--watch')) await cmdWatch(Number(val('--watch')) || 5);
  else await cmdCheck({ mark: has('--mark'), all: has('--all') });
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
