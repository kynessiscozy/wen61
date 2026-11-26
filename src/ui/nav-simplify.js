/* ============================================================
   导航收敛：底部 Dock 5 项 → 3 个核心入口
   ------------------------------------------------------------
   报告（命盘 / 运势 / 关系） · 问问大师 · 工具

   「命盘 / 运势 / 关系」本质是同一份报告的三个视角，
   所以合并为一个「报告」入口，进入后用顶部分段控件切换，
   并用一句话说明当前视角“回答什么问题”。

   实现：不改任何既有分区与 switchTab 逻辑，只做
   · 隐藏「运势 / 关系」两个 Dock 项（仍在 DOM 中，快捷键与跳转继续可用）
   · 「命盘」项改名「报告」，任一报告分区激活时保持高亮
   · 在报告顶部插入分段控件，转发到原有 switchTab
   ============================================================ */

const REPORT_SECS = ['s-ming', 's-yun', 's-rel'];
const HINTS = {
  's-ming': '你是谁：性格、命局与天赋',
  's-yun':  '什么时候：今年、本月与今日的走势',
  's-rel':  '和谁相处：感情、朋友与家人',
};
const WESTERN_HINTS = {
  's-ming': '你是谁：太阳、月亮与上升的性格画像',
  's-yun':  '什么时候：今日与全年的星象走势',
  's-rel':  '内在密码：生命灵数与关系课题',
};
const LAST_KEY = 'tj_report_last_sec';

const $ = (s, r = document) => r.querySelector(s);
const tabOf = (sec) => document.querySelector(`.tab-item[data-sec="${sec}"]`);
const isWestern = () => !!$('#modeWestern.active');

let lastReportSec = 's-ming';
try { const v = sessionStorage.getItem(LAST_KEY); if (REPORT_SECS.includes(v)) lastReportSec = v; } catch (e) { /* ignore */ }

function activeSec() {
  return $('.sec.active')?.id || '';
}

function buildSeg() {
  const scroll = $('#p2Scroll');
  if (!scroll || $('#reportSeg')) return;
  const seg = document.createElement('div');
  seg.id = 'reportSeg';
  seg.className = 'report-seg';
  seg.hidden = true;
  seg.innerHTML =
    '<div class="report-seg-tabs" role="tablist" aria-label="报告视角">' +
    REPORT_SECS.map((s) => `<button type="button" role="tab" class="report-seg-tab" data-sec="${s}" aria-selected="false"></button>`).join('') +
    '</div><p class="report-seg-hint" id="reportSegHint" aria-live="polite"></p>';
  scroll.insertBefore(seg, $('#p2Inner'));
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('.report-seg-tab');
    if (!b) return;
    const t = tabOf(b.dataset.sec);
    if (t && typeof window.switchTab === 'function') window.switchTab(t);
  });
}

function labelFor(sec) {
  const id = { 's-ming': 'tabLabelMing', 's-yun': 'tabLabelYun', 's-rel': 'tabLabelRel' }[sec];
  return document.getElementById(id)?.textContent?.trim() || '';
}

function sync() {
  const sec = activeSec();
  const inReport = REPORT_SECS.includes(sec);
  if (inReport) {
    lastReportSec = sec;
    try { sessionStorage.setItem(LAST_KEY, sec); } catch (e) { /* ignore */ }
  }
  // Dock：任一报告分区激活时，「报告」入口保持高亮
  const entry = tabOf('s-ming');
  if (entry) {
    const want = inReport;
    if (want && !entry.classList.contains('active')) {
      entry.classList.add('active');
      if (typeof window.moveTabIndicator === 'function') window.moveTabIndicator(entry);
    }
    entry.setAttribute('aria-current', want ? 'page' : 'false');
  }
  // 分段控件
  const seg = $('#reportSeg');
  if (!seg) return;
  seg.hidden = !inReport;
  if (!inReport) return;
  seg.querySelectorAll('.report-seg-tab').forEach((b) => {
    b.textContent = labelFor(b.dataset.sec);
    const on = b.dataset.sec === sec;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const hints = isWestern() ? WESTERN_HINTS : HINTS;
  const hint = $('#reportSegHint');
  if (hint) hint.textContent = hints[sec] || '';
}

export function initNavSimplify() {
  const bar = $('#tabBar');
  if (!bar || bar.dataset.simplified) return;
  bar.dataset.simplified = '1';
  document.body.classList.add('nav-3');

  // 「命盘」项 → 「报告」；保留原 span（含 id）供西方模式改文案时读取，仅隐藏
  const entry = tabOf('s-ming');
  const oldLabel = $('#tabLabelMing');
  if (entry && oldLabel) {
    oldLabel.hidden = true;
    oldLabel.style.display = 'none';
    const lab = document.createElement('span');
    lab.className = 'ig-nav-label';
    lab.textContent = '报告';
    oldLabel.after(lab);
    entry.setAttribute('aria-label', '报告：命盘、运势与关系');
    entry.title = '报告：命盘、运势与关系';
  }
  // 隐藏运势 / 关系 Dock 项
  ['s-yun', 's-rel'].forEach((s) => {
    const t = tabOf(s);
    if (t) { t.classList.add('nav-merged'); t.setAttribute('aria-hidden', 'true'); t.tabIndex = -1; }
  });
  const adv = tabOf('s-adv');
  if (adv) adv.title = '工具：合盘、塔罗、择日等小工具';
  const ai = $('#aiFab');
  if (ai) ai.title = '问问大师：直接用一句话提问';

  // 点「报告」：回到上次停留的报告视角，而不是总跳到命盘
  bar.addEventListener('click', (e) => {
    const t = e.target.closest('.tab-item');
    if (t !== entry) return;
    const sec = activeSec();
    const target = REPORT_SECS.includes(sec) ? null : tabOf(lastReportSec);
    if (target && target !== entry) {
      e.stopImmediatePropagation();
      e.preventDefault();
      window.switchTab(target);
    }
  }, true);

  buildSeg();

  // 任何 Dock 状态变化（含西方模式改文案）都同步
  const mo = new MutationObserver(sync);
  document.querySelectorAll('.tab-item').forEach((t) => mo.observe(t, { attributes: true, attributeFilter: ['class'] }));
  ['tabLabelMing', 'tabLabelYun', 'tabLabelRel'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) mo.observe(el, { childList: true, characterData: true, subtree: true });
  });
  const modeBtn = $('#modeWestern');
  if (modeBtn) mo.observe(modeBtn, { attributes: true, attributeFilter: ['class'] });
  sync();
}
