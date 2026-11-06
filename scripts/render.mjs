#!/usr/bin/env node
/**
 * render.mjs — 生成 GitHub 个人主页的全部素材（README + 6 个 SVG）
 *
 * 视觉语言：水墨（墨黑 / 宣纸白 / 银灰 / 一点朱砂）
 * 意象：明月圆窗（头像）/ 八卦细环 / 北斗七星 / 远山云雾 / 闲章
 *
 * 用法：
 *   node scripts/render.mjs           # 用脚本内置数据快照渲染（离线可用）
 *   node scripts/render.mjs --fetch   # 先从 GitHub API 拉最新数据，再渲染
 *
 * 零依赖，Node 18+。生成目标：
 *   README.md
 *   assets/hero.svg      首屏横幅（动效）
 *   assets/stack.svg     技术栈
 *   assets/projects.svg  精选作品
 *   assets/dashboard.svg 数据面板
 *   assets/footer.svg    页脚
 *   assets/divider.svg   分隔线
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
const USER = 'Sakura7301';

/* ------------------------------------------------------------------ *
 * 配色 / 字体
 * ------------------------------------------------------------------ */
const C = {
  bg0: '#14171B',       // 雾灰墨（比纯黑亮一档）
  bg1: '#1C2025',
  panel: '#1A1D22',
  line: '#3A4046',
  text: '#F3EFE4',       // 宣纸白
  sub: '#DAD5C8',
  muted: '#ABA89E',
  dim: '#88857C',
  faint: '#6E6B63',
  silver: '#DEE2E6',
  silverDim: '#ADB4BA',
  ink1: '#24282D',
  ink2: '#2F353B',
  ink3: '#495157',
  cinnabar: '#C2492F',   // 朱砂（只做印章 / 少量点缀）
  cinnabarSoft: '#E28B74',
  paper: '#F5F0E5',
};
const F = {
  sans: "'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans SC','WenQuanYi Zen Hei',sans-serif",
  mono: "'JetBrains Mono','Cascadia Code','SFMono-Regular',Consolas,'Liberation Mono',monospace",
};
const BAR_COLORS = ['#EDE9DE', '#C3C9CE', '#959DA4', '#6C747C', '#4B535A']; // 墨分五色

/* ------------------------------------------------------------------ *
 * 数据快照（2026-11-06 抓取）。--fetch 时会自动更新。
 * ------------------------------------------------------------------ */
const SNAPSHOT = {
  updatedAt: '2026-11-06',
  user: {
    login: USER,
    name: '玄安',
    bio: 'I believe that technology makes dreams greater.',
    location: 'ShangHai',
    followers: 39,
    publicRepos: 75,
    createdAt: '2020-12-17',
  },
  totals: { ownRepos: 13, stars: 218 },
  langs: [
    { name: 'C', bytes: 2238714 },
    { name: 'Python', bytes: 1489939 },
    { name: 'JavaScript', bytes: 402758 },
    { name: 'C++', bytes: 328212 },
    { name: 'HTML', bytes: 65266 },
    { name: 'CSS', bytes: 21384 },
    { name: 'Shell', bytes: 18246 },
    { name: 'Assembly', bytes: 15478 },
    { name: 'Makefile', bytes: 11861 },
    { name: 'Dockerfile', bytes: 3103 },
    { name: 'QMake', bytes: 580 },
  ],
};

const FEATURED = [
  { repo: 'MeiHuaYi', desc: 'DSH 梅花易数插件：起卦 · 排盘 · 断卦', lang: 'JavaScript', tag: 'DSH 插件', stars: 1 },
  { repo: 'Notes', desc: '学习笔记与知识库，写给自己也写给同路人', lang: 'Markdown', tag: '知识库', stars: 134 },
  { repo: 'sakuraTools', desc: 'chatgpt-on-wechat 多功能聚合插件', lang: 'Python', tag: '微信机器人', stars: 34 },
  { repo: 'OnlieProgrammingServer', desc: '在线评测系统：服务端 + 客户端', lang: 'C++', tag: 'OJ 系统', stars: 12 },
  { repo: 'Weaver', desc: 'EchoWeaver AI —— 多端 AI 应用实践', lang: 'Python', tag: 'AI 应用', stars: 6 },
  { repo: 'sakura-mqtt', desc: '跨平台轻量 MQTT 客户端，支持 32 路连接', lang: 'C', tag: 'IoT', stars: 3 },
];

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const CJK_RE = /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]/;
const isCJK = (ch) => CJK_RE.test(ch);

function textWidth(str, fs, { mono = false, tracking = 0 } = {}) {
  let w = 0;
  for (const ch of str) w += isCJK(ch) ? fs : fs * (mono ? 0.6 : 0.56);
  return w + Math.max(0, [...str].length - 1) * tracking;
}

/** 确定性伪随机，保证每次生成的 SVG 一致 */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wrapCJK(str, fs, maxWidth, maxLines = 2) {
  const lines = [];
  let line = '';
  for (const ch of str) {
    const next = line + ch;
    if (textWidth(next, fs) > maxWidth && line) {
      lines.push(line);
      line = ch;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    const joined = lines.join('');
    if (joined.length < [...str].length) {
      let last = lines[maxLines - 1];
      while (textWidth(last + '…', fs) > maxWidth && last.length > 1) last = last.slice(0, -1);
      lines[maxLines - 1] = last + '…';
    }
  }
  return lines;
}

function pill(x, y, label, o = {}) {
  const fs = o.fs ?? 10.5;
  const h = o.h ?? 26;
  const padX = o.padX ?? 13;
  const dotW = o.dot ? 11 : 0;
  const w = Math.ceil(textWidth(label, fs) + padX * 2 + dotW);
  const dot = o.dot
    ? `<circle cx="${x + padX + 2.5}" cy="${y + h / 2}" r="2.6" fill="${o.dot}"/>`
    : '';
  const text = `<text x="${x + padX + dotW}" y="${(y + h / 2 + fs * 0.35).toFixed(1)}" font-size="${fs}" font-family="${F.sans}" fill="${o.color ?? C.sub}"${o.bold ? ' font-weight="600"' : ''}>${esc(label)}</text>`;
  return {
    width: w,
    svg: `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${o.fill ?? 'rgba(255,255,255,0.025)'}" stroke="${o.stroke ?? 'rgba(255,255,255,0.10)'}"/>${dot}${text}`,
  };
}

/** SVG 通用骨架：圆角深色面板 + 内容 */
function frame({ w, h, rx = 16, inner, defs = '', style = '', bg = 'url(#panelBg)' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
<defs>
<linearGradient id="panelBg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${C.bg1}"/>
<stop offset="1" stop-color="${C.bg0}"/>
</linearGradient>
<clipPath id="frame"><rect x="0" y="0" width="${w}" height="${h}" rx="${rx}"/></clipPath>
<radialGradient id="panelLight" cx="0.1" cy="0" r="1.1">
<stop offset="0" stop-color="#F5F0E5" stop-opacity="0.055"/>
<stop offset="0.65" stop-color="#F5F0E5" stop-opacity="0.012"/>
<stop offset="1" stop-color="#F5F0E5" stop-opacity="0"/>
</radialGradient>
${defs}
</defs>
<style><![CDATA[
${style}
]]></style>
<g clip-path="url(#frame)">
<rect width="${w}" height="${h}" fill="${bg}"/>
<rect width="${w}" height="${h}" fill="url(#panelLight)"/>
${inner}
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${rx}" fill="none" stroke="rgba(255,255,255,0.10)"/>
</g>
</svg>`;
}

/** 头像（base64 内嵌，GitHub 的 <img> 环境下才能显示） */
function avatarDataUri() {
  for (const [file, mime] of [['avatar.jpg', 'image/jpeg'], ['avatar.png', 'image/png']]) {
    const p = join(ASSETS, file);
    if (existsSync(p)) return `data:${mime};base64,${readFileSync(p).toString('base64')}`;
  }
  return '';
}

/** 局部：远山与云雾 */
function landscape(W, H) {
  const farTop = 'M0 340 L0 316 C 110 308 190 298 270 300 C 350 302 420 290 500 284 C 580 278 640 290 710 294 C 780 298 832 288 880 284';
  const nearTop = 'M0 340 L0 330 C 90 324 170 316 250 318 C 340 320 420 310 500 306 C 580 302 650 312 720 314 C 790 316 844 308 880 306';
  return `
<g mask="url(#mtnMask)">
  <path d="${farTop} L880 340 Z" fill="#2C343B" opacity="0.95"/>
  <path d="${nearTop} L880 340 Z" fill="#171A1E"/>
  <path d="${farTop}" fill="none" stroke="rgba(243,239,228,0.20)" stroke-width="0.9"/>
  <path d="${nearTop}" fill="none" stroke="rgba(243,239,228,0.12)" stroke-width="0.8"/>
  <ellipse cx="660" cy="306" rx="250" ry="24" fill="url(#mistGlow)"/>
  <ellipse cx="430" cy="316" rx="180" ry="18" fill="url(#mistGlow)"/>
</g>`;
}

/* ------------------------------------------------------------------ *
 * 1. hero.svg —— 首屏横幅
 * ------------------------------------------------------------------ */
function buildHero(d) {
  const W = 880, H = 340;
  const av = { x: 116, y: 194, r: 74 };
  const R = rng(20201106);
  const avatar = avatarDataUri();

  // 北斗七星（银白细星）
  const bowl = [[302, 54], [338, 44], [352, 76], [318, 88]];
  const handle = [[388, 80], [426, 66], [462, 52]];
  const segs = [
    [bowl[0], bowl[1]], [bowl[1], bowl[2]], [bowl[2], bowl[3]], [bowl[3], bowl[0]],
    [bowl[3], handle[0]], [handle[0], handle[1]], [handle[1], handle[2]],
  ];
  const dipperLines = segs.map(([a, b]) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="rgba(243,239,228,0.20)" stroke-width="0.9" stroke-linecap="round"/>`).join('');
  const dipperStars = [...bowl, ...handle].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i < 4 ? 1.9 : 1.5}" fill="${C.silver}" style="animation:twinkle ${(3 + i * 0.35).toFixed(1)}s ease-in-out infinite;animation-delay:-${(i * 0.7).toFixed(1)}s"/>`).join('');

  // 墨屑 / 飞白
  let dust = '';
  for (let i = 0; i < 26; i++) {
    const x = (R() * W).toFixed(0);
    const y = (R() * H).toFixed(0);
    const r = (0.4 + R() * 1.0).toFixed(2);
    const op = (0.08 + R() * 0.28).toFixed(2);
    const dur = (10 + R() * 12).toFixed(1);
    const del = (R() * 12).toFixed(1);
    dust += `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.paper}" style="animation:drift ${dur}s ease-in-out infinite;animation-delay:-${del}s" opacity="${op}"/>\n`;
  }

  // 飞鸟：几笔淡墨
  const birds = `<g stroke="rgba(243,239,228,0.50)" stroke-width="1" fill="none" stroke-linecap="round">
  <path d="M566 118 C 571 111 577 111 582 117 C 587 111 593 111 598 118"/>
  <path d="M608 96 C 612 90 617 90 621 95 C 625 90 630 90 634 96"/>
  <path d="M586 140 C 589 136 592 136 595 139 C 598 136 601 136 604 140"/>
</g>`;

  const pills = [];
  let px = 218;
  for (const it of [
    { label: '嵌入式工程师', dot: C.cinnabarSoft },
    { label: '游戏开发', dot: C.silverDim },
    { label: '智能体开发者', dot: C.silverDim },
  ]) {
    const p = pill(px, 292, it.label, { dot: it.dot, h: 24, fs: 10 });
    pills.push(p.svg);
    px += p.width + 9;
  }

  const inner = `
<g class="wash">
  <ellipse class="au a1" cx="820" cy="20" rx="240" ry="150" fill="url(#washCool)"/>
  <ellipse class="au a2" cx="150" cy="330" rx="240" ry="150" fill="url(#washWarm)"/>
  <ellipse class="au a3" cx="500" cy="150" rx="280" ry="170" fill="url(#washInk)"/>
</g>
<rect width="${W}" height="${H}" fill="url(#grain)" opacity="0.6"/>
<rect width="${W}" height="${H}" fill="url(#vignette)"/>

<g>
  <circle cx="800" cy="104" r="86" fill="url(#moonHalo)"/>
  <circle cx="800" cy="104" r="44" fill="url(#moonDisc)"/>
  <circle cx="800" cy="104" r="44" fill="none" stroke="rgba(243,239,228,0.16)" stroke-width="0.8"/>
</g>

${dipperLines}
${dipperStars}
<g class="dust">${dust}</g>
${birds}
${landscape(W, H)}

<g>
  <circle cx="${av.x}" cy="${av.y}" r="118" fill="url(#avHalo)"/>
  ${avatar ? `<image x="${av.x - av.r}" y="${av.y - av.r}" width="${av.r * 2}" height="${av.r * 2}" href="${avatar}" preserveAspectRatio="xMidYMid slice" clip-path="url(#avClip)"/>` : ''}
  <circle cx="${av.x}" cy="${av.y}" r="${av.r}" fill="url(#avVig)"/>
  <circle cx="${av.x}" cy="${av.y}" r="${av.r}" fill="none" stroke="rgba(243,239,228,0.55)" stroke-width="1.3"/>
  <circle cx="${av.x}" cy="${av.y}" r="${av.r + 8}" fill="none" stroke="rgba(243,239,228,0.16)" stroke-width="1"/>
</g>

<g>
  <text x="218" y="116" font-family="${F.mono}" font-size="9.5" letter-spacing="3.4" fill="${C.dim}">SAKURA7301  ·  SHANGHAI  ·  CN</text>
  <text class="name" x="214" y="194" font-family="${F.sans}" font-size="72" font-weight="800" fill="url(#nameGrad)" letter-spacing="4">${esc(d.user.name)}</text>
  <text x="218" y="222" font-family="${F.mono}" font-size="13" letter-spacing="10.5" fill="${C.silverDim}">XUAN AN</text>
  <text x="218" y="258" font-family="${F.sans}" font-size="18" fill="${C.text}" letter-spacing="0.8">知其不可奈何，而安之若命</text>
  <text x="218" y="276" font-family="${F.mono}" font-size="9" letter-spacing="1.6" fill="${C.dim}">— 庄子</text>
  ${pills.join('\n  ')}
</g>

<g stroke="rgba(243,239,228,0.30)" stroke-width="1.1" fill="none" stroke-linecap="round">
  <path d="M17 34 V17 H34"/>
  <path d="M863 34 V17 H846"/>
  <path d="M17 306 V323 H34"/>
  <path d="M863 306 V323 H846"/>
</g>
<rect x="0" y="${H - 2}" width="${W}" height="2" fill="url(#barGrad)"/>
`;

  const defs = `
<linearGradient id="nameGrad" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#FBF7EC"/>
  <stop offset="0.55" stop-color="#E6E0D0"/>
  <stop offset="1" stop-color="#B9B4A6"/>
</linearGradient>
<clipPath id="avClip"><circle cx="${av.x}" cy="${av.y}" r="${av.r}"/></clipPath>
<radialGradient id="avHalo"><stop offset="0" stop-color="#F5F0E5" stop-opacity="0.20"/><stop offset="0.55" stop-color="#F5F0E5" stop-opacity="0.06"/><stop offset="1" stop-color="#F5F0E5" stop-opacity="0"/></radialGradient>
<radialGradient id="avVig" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0.64" stop-color="#14171B" stop-opacity="0"/>
  <stop offset="1" stop-color="#14171B" stop-opacity="0.45"/>
</radialGradient>
<radialGradient id="moonDisc"><stop offset="0" stop-color="#F5F0E5" stop-opacity="0.16"/><stop offset="0.75" stop-color="#F5F0E5" stop-opacity="0.06"/><stop offset="1" stop-color="#F5F0E5" stop-opacity="0.02"/></radialGradient>
<radialGradient id="moonHalo"><stop offset="0" stop-color="#F5F0E5" stop-opacity="0.10"/><stop offset="1" stop-color="#F5F0E5" stop-opacity="0"/></radialGradient>
<radialGradient id="washCool"><stop offset="0" stop-color="#3A4A57" stop-opacity="0.55"/><stop offset="1" stop-color="#3A4A57" stop-opacity="0"/></radialGradient>
<radialGradient id="washWarm"><stop offset="0" stop-color="#3A3226" stop-opacity="0.45"/><stop offset="1" stop-color="#3A3226" stop-opacity="0"/></radialGradient>
<radialGradient id="washInk"><stop offset="0" stop-color="#2A323A" stop-opacity="0.55"/><stop offset="1" stop-color="#2A323A" stop-opacity="0"/></radialGradient>
<radialGradient id="mistGlow"><stop offset="0" stop-color="#CBD1D6" stop-opacity="0.18"/><stop offset="1" stop-color="#CBD1D6" stop-opacity="0"/></radialGradient>
<radialGradient id="vignette" cx="0.5" cy="0.5" r="0.78">
  <stop offset="0.4" stop-color="${C.bg0}" stop-opacity="0"/>
  <stop offset="1" stop-color="${C.bg0}" stop-opacity="0.55"/>
</radialGradient>
<linearGradient id="mtnMaskG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0.30" stop-color="#000"/>
  <stop offset="0.52" stop-color="#fff"/>
</linearGradient>
<mask id="mtnMask"><rect width="${W}" height="${H}" fill="url(#mtnMaskG)"/></mask>
<linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#F5F0E5" stop-opacity="0"/>
  <stop offset="0.4" stop-color="#F5F0E5" stop-opacity="0.6"/>
  <stop offset="0.72" stop-color="#C2492F" stop-opacity="0.8"/>
  <stop offset="1" stop-color="#C2492F" stop-opacity="0"/>
</linearGradient>
<pattern id="grain" width="24" height="24" patternUnits="userSpaceOnUse">
  <circle cx="1" cy="1" r="0.8" fill="${C.paper}" opacity="0.06"/>
</pattern>
`;

  const style = `
@keyframes twinkle{0%,100%{opacity:0.18}50%{opacity:0.9}}
@keyframes drift{0%,100%{transform:translate(0,0);opacity:0.4}50%{transform:translate(5px,-12px);opacity:0.85}}
@keyframes wash1{0%,100%{transform:translate(0,0)}50%{transform:translate(-40px,22px)}}
@keyframes wash2{0%,100%{transform:translate(0,0)}50%{transform:translate(34px,-18px)}}
@keyframes wash3{0%,100%{transform:translate(0,0)}50%{transform:translate(22px,24px)}}
.au{filter:blur(48px)}
.a1{animation:wash1 22s ease-in-out infinite}
.a2{animation:wash2 26s ease-in-out infinite}
.a3{animation:wash3 19s ease-in-out infinite}
.name{filter:drop-shadow(0 0 18px rgba(243,239,228,0.16))}
`;

  return frame({
    w: W, h: H, inner, defs, style, rx: 18,
    bg: 'url(#heroBg)',
  }).replace('</defs>', '<linearGradient id="heroBg" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#262C34"/><stop offset="0.55" stop-color="#1A1E23"/><stop offset="1" stop-color="#171A1E"/></linearGradient></defs>');
}

/* ------------------------------------------------------------------ *
 * 2. dashboard.svg —— GitHub 数据面板
 * ------------------------------------------------------------------ */
function buildDashboard(d) {
  const W = 880, H = 300;
  const langs = d.langs.slice(0, 5);
  const totalBytes = d.langs.reduce((a, b) => a + b.bytes, 0);
  const pct = (b) => (b / totalBytes) * 100;

  const stats = [
    { v: d.user.publicRepos, label: 'PUBLIC REPOS · 公开仓库' },
    { v: d.totals.ownRepos, label: 'ORIGINAL REPOS · 原创仓库' },
    { v: d.totals.stars, label: 'STARS EARNED · 获得星标' },
    { v: d.user.followers, label: 'FOLLOWERS · 关注者' },
  ];
  const cards = stats.map((s, i) => {
    const x = 24 + (i % 2) * 210;
    const y = 62 + Math.floor(i / 2) * 92;
    return `<g>
  <rect x="${x}" y="${y}" width="198" height="80" rx="12" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.10)"/>
  <text x="${x + 18}" y="${y + 40}" font-family="${F.sans}" font-size="27" font-weight="800" fill="url(#numGrad)">${s.v}</text>
  <text x="${x + 18}" y="${y + 62}" font-family="${F.mono}" font-size="8.5" letter-spacing="1.1" fill="${C.muted}">${esc(s.label)}</text>
</g>`;
  }).join('\n');

  const bars = langs.map((l, i) => {
    const y = 92 + i * 31;
    const w = Math.max(18, (pct(l.bytes) / 100) * 250);
    const col = BAR_COLORS[i % BAR_COLORS.length];
    return `<g>
  <text x="456" y="${y + 12}" font-family="${F.sans}" font-size="11" fill="${C.text}">${esc(l.name)}</text>
  <rect x="536" y="${y + 4}" width="250" height="8" rx="4" fill="rgba(255,255,255,0.07)"/>
  <rect x="536" y="${y + 4}" width="${w.toFixed(1)}" height="8" rx="4" fill="${col}" opacity="0.9"/>
  <text x="856" y="${y + 12}" text-anchor="end" font-family="${F.mono}" font-size="9.5" fill="${C.muted}">${pct(l.bytes).toFixed(1)}%</text>
</g>`;
  }).join('\n');

  const inner = `
<g>
  <circle cx="26" cy="26" r="3.4" fill="${C.cinnabar}" opacity="0.85"/><circle cx="40" cy="26" r="3.4" fill="${C.silver}" opacity="0.65"/><circle cx="54" cy="26" r="3.4" fill="${C.ink3}"/>
  <text x="70" y="30" font-family="${F.mono}" font-size="10" letter-spacing="1.4" fill="${C.dim}">github · stats snapshot</text>
  <text x="${W - 24}" y="30" text-anchor="end" font-family="${F.mono}" font-size="9" letter-spacing="1.2" fill="${C.faint}">SYNC ${esc(d.updatedAt)}</text>
  <line x1="24" y1="48" x2="${W - 24}" y2="48" stroke="rgba(255,255,255,0.10)"/>
</g>
${cards}
<g>
  <text x="456" y="72" font-family="${F.mono}" font-size="9" letter-spacing="1.8" fill="${C.dim}">TOP LANGUAGES · 自有仓库代码量</text>
  ${bars}
</g>
<text x="24" y="${H - 20}" font-family="${F.mono}" font-size="8.5" fill="${C.faint}">byte-weighted · own repositories only · 由 scripts/render.mjs 生成</text>
<text x="${W - 24}" y="${H - 20}" text-anchor="end" font-family="${F.mono}" font-size="8.5" fill="${C.faint}">SINCE ${esc(d.user.createdAt)}</text>
`;

  return frame({
    w: W, h: H, inner, rx: 16,
    defs: `<linearGradient id="numGrad" x1="0" y1="1" x2="0.8" y2="0"><stop offset="0" stop-color="#B9B4A6"/><stop offset="1" stop-color="#F4F0E6"/></linearGradient>`,
  });
}

/* ------------------------------------------------------------------ *
 * 3. projects.svg —— 精选作品
 * ------------------------------------------------------------------ */
function buildProjects(d) {
  const W = 880, H = 306;
  const cards = d.featured.map((p, i) => {
    const x = 24 + (i % 3) * 282;
    const y = 48 + Math.floor(i / 3) * 124;
    const descLines = wrapCJK(p.desc, 10.5, 236, 2);
    const tagFs = 8.5;
    const tagW = Math.ceil(textWidth(p.tag, tagFs) + 18);
    const nameFs = 12.5;
    const name = p.repo;
    const maxNameW = 268 - 16 - 16 - 52;
    let shownName = name;
    while (textWidth(shownName, nameFs) > maxNameW && shownName.length > 4) shownName = shownName.slice(0, -1);
    if (shownName !== name) shownName = shownName.slice(0, -1) + '…';
    return `<g>
  <rect x="${x}" y="${y}" width="268" height="110" rx="12" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.10)"/>
  <rect x="${x + 14}" y="${y + 1}" width="240" height="1.2" rx="0.6" fill="url(#cardTop)" opacity="0.85"/>
  <text x="${x + 16}" y="${y + 30}" font-family="${F.mono}" font-size="${nameFs}" font-weight="600" fill="${C.text}">${esc(shownName)}</text>
  <text x="${x + 252}" y="${y + 30}" text-anchor="end" font-family="${F.mono}" font-size="10.5" fill="${C.cinnabarSoft}">★ ${p.stars}</text>
  ${descLines.map((ln, k) => `<text x="${x + 16}" y="${y + 54 + k * 17}" font-family="${F.sans}" font-size="10.5" fill="#9B978B">${esc(ln)}</text>`).join('\n  ')}
  <circle cx="${x + 18}" cy="${y + 92}" r="2.6" fill="${C.silverDim}"/>
  <text x="${x + 27}" y="${y + 95.5}" font-family="${F.sans}" font-size="9.5" fill="${C.muted}">${esc(p.lang)}</text>
  <rect x="${x + 268 - 16 - tagW}" y="${y + 82}" width="${tagW}" height="18" rx="9" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)"/>
  <text x="${x + 268 - 16 - tagW / 2}" y="${y + 94.5}" text-anchor="middle" font-family="${F.sans}" font-size="${tagFs}" fill="${C.sub}">${esc(p.tag)}</text>
</g>`;
  }).join('\n');

  const inner = `
<text x="24" y="30" font-family="${F.mono}" font-size="9.5" letter-spacing="2" fill="${C.dim}">FEATURED · 精选作品</text>
<text x="${W - 24}" y="30" text-anchor="end" font-family="${F.mono}" font-size="9" letter-spacing="1.2" fill="${C.faint}">6 / ${d.user.publicRepos} PUBLIC REPOS</text>
${cards}
`;

  return frame({
    w: W, h: H, inner, rx: 16,
    defs: `<linearGradient id="cardTop" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E9E5DA" stop-opacity="0.5"/><stop offset="0.5" stop-color="#E9E5DA" stop-opacity="0.14"/><stop offset="1" stop-color="#E9E5DA" stop-opacity="0"/></linearGradient>`,
  });
}

/* ------------------------------------------------------------------ *
 * 4. stack.svg —— 技术栈
 * ------------------------------------------------------------------ */
function buildStack() {
  const W = 880, H = 192;
  const rows = [
    { label: 'LANG', color: C.silver, y: 52, items: ['Python', 'C', 'C++', 'Assembly', 'JavaScript', 'TypeScript'] },
    { label: 'TOOLBOX', color: C.silverDim, y: 98, items: ['Linux', 'Git', 'MQTT', 'TLS', 'Agent × LLM', '插件架构'] },
    { label: 'FOCUS', color: C.cinnabarSoft, y: 144, items: ['嵌入式 · 协议', 'DSH 插件生态', '游戏开发'] },
  ];

  const rowsSvg = rows.map((r) => {
    let x = 104;
    const parts = r.items.map((t) => {
      const p = pill(x, r.y, t, { dot: r.color, h: 26, fs: 10.5 });
      x += p.width + 10;
      return p.svg;
    });
    return `<text x="24" y="${r.y + 17}" font-family="${F.mono}" font-size="9" letter-spacing="1.6" fill="${C.dim}">${r.label}</text>
${parts.join('\n')}`;
  }).join('\n');

  const inner = `
<text x="24" y="28" font-family="${F.mono}" font-size="9.5" letter-spacing="2" fill="${C.dim}">TECH STACK · 技术栈</text>
<text x="${W - 24}" y="28" text-anchor="end" font-family="${F.mono}" font-size="9" letter-spacing="1.2" fill="${C.faint}">长期使用 &amp; 正在折腾</text>
${rowsSvg}
`;

  return frame({ w: W, h: H, inner, rx: 16 });
}

/* ------------------------------------------------------------------ *
 * 5. footer.svg —— 页脚（落款 · 卷轴角框）
 * ------------------------------------------------------------------ */
function buildFooter(d) {
  const W = 880, H = 124;
  const R = rng(7301);

  const specks = Array.from({ length: 5 }, () => {
    const x = (60 + R() * (W - 120)).toFixed(0);
    const y = (R() * 70).toFixed(0);
    const r = (0.7 + R() * 1.0).toFixed(2);
    const dur = (11 + R() * 8).toFixed(1);
    const del = (R() * 10).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.paper}" style="animation:drift ${dur}s ease-in-out infinite;animation-delay:-${del}s" opacity="0.30"/>`;
  }).join('');

  const corners = (color, right) => `<g stroke="${color}" stroke-width="1.1" fill="none" stroke-linecap="round">
  <path d="M${right ? W - 18 : 18} 26 V18 H${right ? W - 26 : 26}"/>
  <path d="M${right ? W - 18 : 18} ${H - 26} V${H - 18} H${right ? W - 26 : 26}"/>
</g>`;

  const inner = `
<rect width="${W}" height="${H}" fill="url(#grain2)" opacity="0.5"/>
${specks}
${corners('rgba(243,239,228,0.30)', false)}
${corners('rgba(243,239,228,0.18)', true)}
<ellipse cx="${W / 2}" cy="66" rx="260" ry="44" fill="url(#footGlow)"/>
<text x="${W / 2}" y="56" text-anchor="middle" font-family="${F.sans}" font-size="13" fill="${C.sub}" letter-spacing="1.2">${esc(d.user.bio)}</text>
<text x="${W / 2}" y="80" text-anchor="middle" font-family="${F.mono}" font-size="9" letter-spacing="2.4" fill="${C.dim}">SAKURA7301 · ${esc(d.user.location.toUpperCase())} · EST. 2020</text>
<text x="${W / 2}" y="104" text-anchor="middle" font-family="${F.mono}" font-size="8.5" letter-spacing="3" fill="${C.faint}">THANKS FOR VISITING</text>
<rect x="0" y="0" width="${W}" height="2" fill="url(#barGrad2)"/>
`;

  const defs = `
<radialGradient id="footGlow"><stop offset="0" stop-color="#F5F0E5" stop-opacity="0.08"/><stop offset="1" stop-color="#E9E5DA" stop-opacity="0"/></radialGradient>
<linearGradient id="barGrad2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F5F0E5" stop-opacity="0"/><stop offset="0.45" stop-color="#F5F0E5" stop-opacity="0.36"/><stop offset="0.65" stop-color="#C2492F" stop-opacity="0.6"/><stop offset="1" stop-color="#B8402B" stop-opacity="0"/></linearGradient>
<pattern id="grain2" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" fill="${C.paper}" opacity="0.06"/></pattern>`;

  const style = `
@keyframes drift{0%,100%{transform:translate(0,0);opacity:0.2}50%{transform:translate(4px,-11px);opacity:0.5}}`;

  return frame({ w: W, h: H, inner, defs, style, rx: 16 });
}

/* ------------------------------------------------------------------ *
 * 6. divider.svg —— 分隔线
 * ------------------------------------------------------------------ */
function buildDivider() {
  const W = 880, H = 16;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
<defs>
<linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#F5F0E5" stop-opacity="0"/>
  <stop offset="0.3" stop-color="#E9E5DA" stop-opacity="0.28"/>
  <stop offset="0.5" stop-color="#E9E5DA" stop-opacity="0.16"/>
  <stop offset="0.72" stop-color="#B8402B" stop-opacity="0.22"/>
  <stop offset="1" stop-color="#B8402B" stop-opacity="0"/>
</linearGradient>
<linearGradient id="comet" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/>
  <stop offset="0.85" stop-color="#FFFFFF" stop-opacity="0.7"/>
  <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
</linearGradient>
</defs>
<rect x="0" y="7.2" width="${W}" height="1.4" fill="url(#line)"/>
<rect x="-140" y="6.9" width="140" height="2" rx="1" fill="url(#comet)">
  <animate attributeName="x" from="-140" to="${W}" dur="7s" repeatCount="indefinite"/>
</rect>
</svg>`;
}

/* ------------------------------------------------------------------ *
 * README
 * ------------------------------------------------------------------ */
function buildReadme(d) {
  const notes = d.featured.find((f) => f.repo === 'Notes');
  const topStars = notes ? notes.stars : d.featured[0].stars;
  return `<!-- 本文件由 scripts/render.mjs 生成：文案/数据改好后重新运行 node scripts/render.mjs --fetch 即可 -->

<div align="center">
  <a href="https://github.com/${d.user.login}">
    <img src="assets/hero.svg" width="880" alt="${esc(d.user.name)} · ${d.user.login} — Technology makes dreams greater" />
  </a>
</div>

<div align="center">
<sub><a href="#关于我">关于我</a> · <a href="#技术栈">技术栈</a> · <a href="#精选作品">精选作品</a> · <a href="#数据面板">数据面板</a> · <a href="#最近在忙">最近在忙</a> · <a href="#找到我">找到我</a></sub>
</div>

<img src="assets/divider.svg" width="880" alt="" />

<sub>01 · ABOUT</sub>

## 关于我

> 我是 **${d.user.name}**，坐标${d.user.location === 'ShangHai' ? '上海' : d.user.location}。嵌入式工程师，业余写点游戏。  
> 平时写 C / C++，最近在折腾 Agent 和插件。

- 🔧 **嵌入式**　C / C++ / 汇编，常和协议、性能打交道
- 🎮 **游戏开发**　业余做点玩法原型和小实验
- 🔭 **在折腾**　DSH 插件 —— [梅花易数 MeiHuaYi](https://github.com/${d.user.login}/MeiHuaYi) 已上架
- 🧠 **也在看**　Agent / LLM 工程化，以及 \`chatgpt-on-wechat\` 生态
- ✍️ **笔记**　[Notes](https://github.com/${d.user.login}/Notes) · ${topStars} ★

<sub>02 · STACK</sub>

## 技术栈

<img src="assets/stack.svg" width="880" alt="技术栈：Python / C / C++ / 汇编 / JavaScript / TypeScript" />

<sub>03 · SELECTED WORK</sub>

## 精选作品

<img src="assets/projects.svg" width="880" alt="精选作品：MeiHuaYi、Notes、sakuraTools、OnlieProgrammingServer、Weaver、sakura-mqtt" />

<p align="right"><sub>全部 ${d.user.publicRepos} 个仓库 → <a href="https://github.com/${d.user.login}?tab=repositories">Repositories</a></sub></p>

<sub>04 · STATS</sub>

## 数据面板

<img src="assets/dashboard.svg" width="880" alt="GitHub 数据面板" />

<sub>05 · NOW</sub>

## 最近在忙

- 把梅花易数插件再打磨一下，下一个插件还在想
- 看看 Agent 的记忆、工具调用这些工程问题
- 偶尔回到底层写点 C：MQTT、TLS、协议细节
- 业余做点游戏原型

<sub>06 · CONTACT</sub>

## 找到我

<div align="center">

📮 <a href="mailto:sakuraduck@foxmail.com">sakuraduck@foxmail.com</a>

<a href="https://github.com/${d.user.login}">GitHub</a> · <a href="https://github.com/${d.user.login}/MeiHuaYi">MeiHuaYi</a> · <a href="https://github.com/${d.user.login}/Notes">Notes</a> · <a href="https://github.com/${d.user.login}/sakuraTools">sakuraTools</a> · <a href="https://github.com/${d.user.login}/OnlieProgrammingServer">OnlieProgrammingServer</a>

</div>

<img src="assets/footer.svg" width="880" alt="" />
`;
}

/* ------------------------------------------------------------------ *
 * 数据抓取
 * ------------------------------------------------------------------ */
async function fetchData() {
  const headers = { 'User-Agent': 'profile-render', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const get = async (url) => {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  };

  const user = await get(`https://api.github.com/users/${USER}`);
  const repos = [];
  for (let page = 1; page <= 2; page++) {
    const batch = await get(`https://api.github.com/users/${USER}/repos?per_page=100&page=${page}&sort=updated`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  const own = repos.filter((r) => !r.fork);

  const bytes = {};
  for (const r of own) {
    try {
      const langs = await get(`https://api.github.com/repos/${USER}/${r.name}/languages`);
      for (const [k, v] of Object.entries(langs)) bytes[k] = (bytes[k] || 0) + v;
    } catch { /* 单个仓库失败就跳过 */ }
    await new Promise((res) => setTimeout(res, 60));
  }

  const langs = Object.entries(bytes)
    .map(([name, b]) => ({ name, bytes: b }))
    .sort((a, b) => b.bytes - a.bytes);

  const starMap = Object.fromEntries(repos.map((r) => [r.name, r]));
  const featured = FEATURED
    .filter((f) => starMap[f.repo])
    .map((f) => ({ ...f, stars: starMap[f.repo].stargazers_count ?? f.stars }));

  const fresh = {
    updatedAt: new Date().toISOString().slice(0, 10),
    user: {
      login: user.login,
      name: user.name || '玄安',
      bio: user.bio || SNAPSHOT.user.bio,
      location: user.location || SNAPSHOT.user.location,
      followers: user.followers,
      publicRepos: user.public_repos,
      createdAt: user.created_at.slice(0, 10),
    },
    totals: {
      ownRepos: own.length,
      stars: own.reduce((a, r) => a + r.stargazers_count, 0),
    },
    langs: langs.length ? langs : SNAPSHOT.langs,
    featured,
  };
  return { ...fresh, featured: featured.length ? featured : FEATURED };
}

/* ------------------------------------------------------------------ *
 * main
 * ------------------------------------------------------------------ */
const fetchMode = process.argv.includes('--fetch');
let data = structuredClone({ ...SNAPSHOT, featured: FEATURED });

if (fetchMode) {
  try {
    const fresh = await fetchData();
    data = fresh;
    console.log(`✓ 已拉取 GitHub 最新数据：${data.user.publicRepos} repos / ${data.totals.stars} stars / ${data.user.followers} followers`);
  } catch (e) {
    console.warn(`! 拉取失败（${e.message}），改用内置快照继续渲染`);
  }
}

mkdirSync(ASSETS, { recursive: true });
const files = {
  'assets/hero.svg': buildHero(data),
  'assets/dashboard.svg': buildDashboard(data),
  'assets/projects.svg': buildProjects(data),
  'assets/stack.svg': buildStack(),
  'assets/footer.svg': buildFooter(data),
  'assets/divider.svg': buildDivider(),
  'README.md': buildReadme(data),
};
for (const [rel, content] of Object.entries(files)) {
  writeFileSync(join(ROOT, rel), content);
  console.log(`✓ ${rel}  (${(Buffer.byteLength(content) / 1024).toFixed(1)} KB)`);
}
