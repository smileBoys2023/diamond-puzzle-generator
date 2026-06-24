import {
  solveDiamondPuzzle,
  solveFromStoredPuzzle,
  verifyResult,
  toPuzzleSolution,
  countGivenCells,
  STORAGE_KEY,
} from './puzzle.js';
import { renderPuzzleBoard, renderTargets } from './render.js';

const form = document.getElementById('calc-form');
const statusEl = document.getElementById('calc-status');
const resultPanel = document.getElementById('result-panel');
const pmHint = document.getElementById('pm-hint');
const targetsEl = document.getElementById('targets');
const boardEl = document.getElementById('puzzle-board');
const detailTable = document.getElementById('detail-table');
const verifyTable = document.getElementById('verify-table');

const puzzleStatusEl = document.getElementById('puzzle-calc-status');
const puzzleResultPanel = document.getElementById('puzzle-result-panel');
const puzzleTargetsEl = document.getElementById('puzzle-targets');
const puzzleClueBoardEl = document.getElementById('puzzle-clue-board');
const puzzleAnswerBoardEl = document.getElementById('puzzle-answer-board');
const puzzleDetailTable = document.getElementById('puzzle-detail-table');
const puzzleVerifyTable = document.getElementById('puzzle-verify-table');

const ROW_LABELS = [
  '顶部目标和',
  '第 2 行 a, b, c',
  '第 3 行 e, f, g, h',
  '第 4 行 i, 锚, j, k, l',
  '第 5 行',
  '第 6 行 p, 锚, m',
  '第 7 行',
];

const EXAMPLE = {
  edgeLeft: 7,
  penult: 3,
  edgeRight: 5,
  anchor4: 16,
  anchor6: 8,
  bottom: 15,
  leftTop: '',
  rightTop: '',
  p: '',
  m: '',
};

const SOLVED_FROM_LABEL = {
  tops: '由顶部目标和反推',
  p: '由 p 推算 m',
  m: '由 m 推算 p',
  pm: '题目指定 p、m',
  auto: '自动选取有效 p',
};

function setStatus(el, msg, type = 'info') {
  el.textContent = msg;
  el.className = `status ${type}`;
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
    leftTop: parseOptionalInt(fd.get('leftTop')),
    rightTop: parseOptionalInt(fd.get('rightTop')),
    p: parseOptionalInt(fd.get('p')),
    m: parseOptionalInt(fd.get('m')),
  };
}

function fillForm(values) {
  Object.entries(values).forEach(([k, v]) => {
    if (form.elements[k]) form.elements[k].value = v;
  });
  updatePmHint();
}

function updatePmHint() {
  const bottom = Number(form.elements.bottom.value) || 0;
  const anchor6 = Number(form.elements.anchor6.value) || 0;
  pmHint.textContent = `约束：p + m = 底目标和 − 第6行锚点 = ${bottom - anchor6}`;
}

function renderDetailTable(tableEl, result) {
  tableEl.innerHTML = result.rows
    .map(
      (row, i) => `
    <tr>
      <th>${ROW_LABELS[i]}</th>
      <td>${row.map((v) => `<span class="calc-val">${v}</span>`).join('')}</td>
    </tr>`,
    )
    .join('');
}

function renderVerifyTable(tableEl, v) {
  tableEl.innerHTML = `
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

function loadStoredPuzzle() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function runPuzzleCalc() {
  const puzzle = loadStoredPuzzle();
  if (!puzzle) {
    puzzleResultPanel.hidden = true;
    setStatus(puzzleStatusEl, '暂无当前题目，请先在首页生成', 'error');
    return;
  }

  try {
    const { result, answer, verify: v } = solveFromStoredPuzzle(puzzle);
    const { given, blank } = countGivenCells(puzzle);
    const { p, m } = result.params;

    puzzleTargetsEl.innerHTML = renderTargets(puzzle);
    puzzleClueBoardEl.innerHTML = renderPuzzleBoard(puzzle, 'clues').html;
    puzzleAnswerBoardEl.innerHTML = renderPuzzleBoard(answer, 'readonly').html;
    renderDetailTable(puzzleDetailTable, result);
    renderVerifyTable(puzzleVerifyTable, v);

    puzzleResultPanel.hidden = false;
    setStatus(
      puzzleStatusEl,
      v.ok
        ? `计算完成 · 已知 ${given} 格 / 待填 ${blank} 格 · p=${p}, m=${m} · 左顶=${result.top.left}，右顶=${result.top.right}`
        : `验算未通过，请重新生成题目`,
      v.ok ? 'ok' : 'error',
    );
  } catch (err) {
    puzzleResultPanel.hidden = true;
    setStatus(puzzleStatusEl, err instanceof Error ? err.message : '计算失败', 'error');
  }
}

function runManualCalc() {
  try {
    const opts = readForm();
    const result = solveDiamondPuzzle(opts);
    const v = verifyResult(result);
    const solution = toPuzzleSolution(result);

    targetsEl.innerHTML = renderTargets(solution);
    boardEl.innerHTML = renderPuzzleBoard(solution, 'readonly').html;
    renderDetailTable(detailTable, result);
    renderVerifyTable(verifyTable, v);

    resultPanel.hidden = false;

    const { p, m, solvedFrom } = result.params;
    const mode = SOLVED_FROM_LABEL[solvedFrom] || solvedFrom;
    setStatus(
      statusEl,
      v.ok
        ? `计算完成 · ${mode} · p=${p}, m=${m} · 左顶=${result.top.left}，右顶=${result.top.right} · 全部规则通过`
        : `计算完成，但有 ${v.failed.length} 条规则未通过（请检查输入）`,
      v.ok ? 'ok' : 'error',
    );
  } catch (err) {
    resultPanel.hidden = true;
    setStatus(statusEl, err instanceof Error ? err.message : '计算失败', 'error');
  }
}

function fillFormFromPuzzle() {
  const puzzle = loadStoredPuzzle();
  if (!puzzle) {
    setStatus(statusEl, '暂无当前题目，请先在首页生成', 'error');
    return;
  }

  const { config, p, m } = puzzle;
  fillForm({
    edgeLeft: config.edgeLeft,
    penult: config.penult,
    edgeRight: config.edgeRight,
    anchor4: config.anchor4,
    anchor6: config.anchor6,
    bottom: config.bottom,
    leftTop: puzzle.leftTop,
    rightTop: puzzle.rightTop,
    p,
    m,
  });
  setStatus(statusEl, '已填入当前题目的全部参数（含 p、m）', 'info');
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  runManualCalc();
});

form.elements.bottom.addEventListener('input', updatePmHint);
form.elements.anchor6.addEventListener('input', updatePmHint);

document.getElementById('reset-defaults').addEventListener('click', () => {
  fillForm(EXAMPLE);
  setStatus(statusEl, '已恢复示例参数', 'info');
  resultPanel.hidden = true;
});

document.getElementById('load-current').addEventListener('click', fillFormFromPuzzle);
document.getElementById('calc-puzzle-btn').addEventListener('click', runPuzzleCalc);

updatePmHint();

if (loadStoredPuzzle()) {
  runPuzzleCalc();
} else {
  setStatus(puzzleStatusEl, '暂无题目，请先在首页生成', 'info');
  runManualCalc();
}
