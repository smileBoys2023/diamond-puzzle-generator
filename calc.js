import { solveDiamondPuzzle, verify, toPuzzleSolution } from './solve.js';
import { renderPuzzleBoard, renderTargets } from './render.js';

const form = document.getElementById('calc-form');
const statusEl = document.getElementById('calc-status');
const resultPanel = document.getElementById('result-panel');
const pmHint = document.getElementById('pm-hint');
const targetsEl = document.getElementById('targets');
const boardEl = document.getElementById('puzzle-board');
const detailTable = document.getElementById('detail-table');
const verifyTable = document.getElementById('verify-table');

const ROW_LABELS = [
  '顶部目标和',
  '第 2 行 a, b, c',
  '第 3 行 e, f, g, h',
  '第 4 行 i, 锚, j, k, l',
  '第 5 行',
  '第 6 行 p, 锚, m',
  '第 7 行',
];

const DEFAULTS = {
  edgeLeft: 7,
  penult: 3,
  edgeRight: 5,
  anchor4: 16,
  anchor6: 8,
  bottom: 15,
  leftTop: 146,
  rightTop: 141,
  p: '',
  m: '',
};

const SOLVED_FROM_LABEL = {
  tops: '由顶部目标和反推',
  p: '由 p 推算 m',
  m: '由 m 推算 p',
  pm: '手动指定 p、m',
  default: '默认 p=2',
};

function setStatus(msg, type = 'info') {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
}

function parseOptionalInt(value) {
  if (value === '' || value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function readForm() {
  const fd = new FormData(form);
  return {
    edgeLeft: Number(fd.get('edgeLeft')),
    penult: Number(fd.get('penult')),
    edgeRight: Number(fd.get('edgeRight')),
    anchor4: Number(fd.get('anchor4')),
    anchor6: Number(fd.get('anchor6')),
    bottom: Number(fd.get('bottom')),
    leftTop: Number(fd.get('leftTop')),
    rightTop: Number(fd.get('rightTop')),
    p: parseOptionalInt(fd.get('p')),
    m: parseOptionalInt(fd.get('m')),
  };
}

function updatePmHint() {
  const bottom = Number(form.elements.bottom.value) || 0;
  const anchor6 = Number(form.elements.anchor6.value) || 0;
  pmHint.textContent = `约束：p + m = 底目标和 − 第6行锚点 = ${bottom - anchor6}`;
}

function renderDetailTable(result) {
  detailTable.innerHTML = result.rows
    .map(
      (row, i) => `
    <tr>
      <th>${ROW_LABELS[i]}</th>
      <td>${row.map((v) => `<span class="calc-val">${v}</span>`).join('')}</td>
    </tr>`,
    )
    .join('');
}

function renderVerifyTable(v) {
  verifyTable.innerHTML = `
    <thead>
      <tr><th>规则</th><th>计算值</th><th>目标值</th><th>结果</th></tr>
    </thead>
    <tbody>
      ${v.details
        .map(
          (d) => `
        <tr class="${d.ok ? 'row-ok' : 'row-fail'}">
          <td>${d.name}</td>
          <td>${d.actual}</td>
          <td>${d.expected}</td>
          <td>${d.ok ? '✓' : '✗'}</td>
        </tr>`,
        )
        .join('')}
    </tbody>`;
}

function runCalc() {
  try {
    const opts = readForm();
    const result = solveDiamondPuzzle(opts);
    const v = verify(result);
    const solution = toPuzzleSolution(result);

    targetsEl.innerHTML = renderTargets(solution);
    boardEl.innerHTML = renderPuzzleBoard(solution, 'readonly').html;
    renderDetailTable(result);
    renderVerifyTable(v);

    resultPanel.hidden = false;

    const { p, m, solvedFrom } = result.params;
    const mode = SOLVED_FROM_LABEL[solvedFrom] || solvedFrom;
    setStatus(
      v.ok
        ? `计算完成 · ${mode} · p=${p}, m=${m} · 左顶=${result.top.left}，右顶=${result.top.right} · 全部规则通过`
        : `计算完成，但有 ${v.failed.length} 条规则未通过（请检查输入）`,
      v.ok ? 'ok' : 'error',
    );
  } catch (err) {
    resultPanel.hidden = true;
    setStatus(err instanceof Error ? err.message : '计算失败', 'error');
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  runCalc();
});

form.elements.bottom.addEventListener('input', updatePmHint);
form.elements.anchor6.addEventListener('input', updatePmHint);

document.getElementById('reset-defaults').addEventListener('click', () => {
  Object.entries(DEFAULTS).forEach(([k, v]) => {
    form.elements[k].value = v;
  });
  updatePmHint();
  setStatus('已恢复默认参数', 'info');
  resultPanel.hidden = true;
});

updatePmHint();
runCalc();
