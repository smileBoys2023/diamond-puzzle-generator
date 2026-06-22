import { STORAGE_KEY, checkUserAnswers } from './puzzle.js';
import { renderPuzzleBoard, renderTargets } from './render.js';

const boardEl = document.getElementById('puzzle-board');
const targetsEl = document.getElementById('targets');
const resultEl = document.getElementById('result');

/** @type {import('./puzzle.js').PuzzleSolution | null} */
let solution = null;

function setResult(msg, type = 'info') {
  resultEl.textContent = msg;
  resultEl.className = `status ${type}`;
}

function loadSolution() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.location.href = 'index.html';
    return null;
  }
  try {
    return /** @type {import('./puzzle.js').PuzzleSolution} */ (JSON.parse(raw));
  } catch {
    window.location.href = 'index.html';
    return null;
  }
}

function mountBoard() {
  if (!solution) return;
  targetsEl.innerHTML = renderTargets(solution);
  const { html } = renderPuzzleBoard(solution, 'play');
  boardEl.innerHTML = html;
}

function collectUserGrid() {
  /** @type {(number | null)[][]} */
  const grid = solution.rows.map((row) => row.map(() => null));

  document.querySelectorAll('.cell-input').forEach((el) => {
    const input = /** @type {HTMLInputElement} */ (el);
    const ri = Number(input.dataset.row);
    const ci = Number(input.dataset.col);
    const raw = input.value.trim();
    grid[ri][ci] = raw === '' ? null : Number(raw);
  });

  return grid;
}

function clearInputStyles() {
  document.querySelectorAll('.cell-input').forEach((el) => {
    el.classList.remove('correct', 'wrong');
  });
}

function markResults(results) {
  results.forEach(({ row, col, correct }) => {
    const input = document.getElementById(`cell-${row}-${col}`);
    if (input) input.classList.add(correct ? 'correct' : 'wrong');
  });
}

function verify() {
  if (!solution) return;

  clearInputStyles();
  const userGrid = collectUserGrid();
  const { allFilled, allCorrect, results, wrongCount, emptyCount } = checkUserAnswers(solution, userGrid);

  markResults(results);

  if (!allFilled) {
    setResult(`还有 ${emptyCount} 个空白格未填写，请补全后再验证。`, 'error');
    return;
  }

  if (allCorrect) {
    setResult('恭喜！全部正确！', 'ok');
    return;
  }

  setResult(`有 ${wrongCount} 个格子答案不正确，已用红色标出。`, 'error');
}

function resetInputs() {
  clearInputStyles();
  document.querySelectorAll('.cell-input').forEach((el) => {
    /** @type {HTMLInputElement} */ (el).value = '';
  });
  setResult('已清空填写，请重新作答。', 'info');
}

solution = loadSolution();
mountBoard();

document.getElementById('verify-btn').addEventListener('click', verify);
document.getElementById('reset-btn').addEventListener('click', resetInputs);

document.getElementById('puzzle-board').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verify();
});
