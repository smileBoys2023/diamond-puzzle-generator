import { generatePuzzle, validateSolution, STORAGE_KEY } from './puzzle.js';

const form = document.getElementById('config-form');
const statusEl = document.getElementById('status');

function setStatus(msg, type = 'info') {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const difficulty = /** @type {'easy'|'medium'|'hard'} */ (fd.get('difficulty'));

  try {
    setStatus('正在随机生成题目…', 'info');
    const solution = generatePuzzle({ difficulty });
    const { valid, errors } = validateSolution(solution);
    if (!valid) {
      setStatus(`生成异常：${errors.join('；')}`, 'error');
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(solution));
    window.location.href = 'play.html';
  } catch (err) {
    setStatus(err instanceof Error ? err.message : '生成失败，请重试', 'error');
  }
});
