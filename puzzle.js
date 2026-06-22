/**
 * 菱形数字谜题 — 核心计算引擎
 *
 * 行结构（0-indexed）:
 *   row0: [leftTop, rightTop]           — 顶部目标和（非行变量）
 *   row1: [a, b, c]                     — 第 2 行
 *   row2: [e, f, g, h]                 — 第 3 行
 *   row3: [i, anchor4, j, k, l]        — 第 4 行（锚点固定）
 *   row4: [edgeLeft, x, y, z, penult, edgeRight] — 第 5 行
 *   row5: [p, anchor6, m]              — 第 6 行（锚点固定）
 *   row6: [bottom]                      — 第 7 行
 */

/** @typedef {Object} PuzzleConfig
 * @property {number} edgeLeft
 * @property {number} penult
 * @property {number} edgeRight
 * @property {number} anchor4
 * @property {number} anchor6
 * @property {number} bottom
 * @property {'easy'|'medium'|'hard'} difficulty
 */

/** @typedef {Object} PuzzleSolution
 * @property {number[][]} rows
 * @property {number} leftTop
 * @property {number} rightTop
 * @property {number} p
 * @property {number} m
 * @property {PuzzleConfig} config
 */

/** 哪些格子在题目中是给定的（true = 显示数字，false = 空白待填） */
const GIVEN_MASK = [
  [true, true], // 顶部目标和
  [false, false, false],
  [false, false, false, false],
  [false, true, false, false, false],
  [true, false, false, false, true, true],
  [false, true, false],
  [true],
];

/**
 * 由 p、m 及配置向上递推全表
 * @param {number} p
 * @param {number} m
 * @param {PuzzleConfig} config
 * @returns {PuzzleSolution}
 */
export function solveFromParams(p, m, config) {
  const { edgeLeft, penult, edgeRight, anchor4, anchor6, bottom } = config;

  const x = anchor4 - anchor6 - p;
  const y = anchor6 + p;
  const z = anchor6 + m;

  const i = edgeLeft + x;
  const j = y + z;
  const k = z + penult;
  const l = penult + edgeRight;

  const e = i + anchor4;
  const f = anchor4 + j;
  const g = j + k;
  const h = k + l;

  const a = e + f;
  const b = f + g;
  const c = g + h;

  const leftTop = a + b;
  const rightTop = b + c;

  const rows = [
    [leftTop, rightTop],
    [a, b, c],
    [e, f, g, h],
    [i, anchor4, j, k, l],
    [edgeLeft, x, y, z, penult, edgeRight],
    [p, anchor6, m],
    [bottom],
  ];

  return { rows, leftTop, rightTop, p, m, config };
}

/**
 * 验证解是否满足全部规则
 * @param {PuzzleSolution} solution
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSolution(solution) {
  const { rows, leftTop, rightTop, p, m, config } = solution;
  const errors = [];
  const [a, b, c] = rows[1];
  const [e, f, g, h] = rows[2];
  const [i, anchor4, j, k, l] = rows[3];
  const [edgeLeft, x, y, z, penult, edgeRight] = rows[4];
  const [rp, anchor6, rm] = rows[5];
  const [bottom] = rows[6];

  const eq = (cond, msg) => { if (!cond) errors.push(msg); };

  eq(leftTop === a + b, `左顶 ${leftTop} ≠ a+b=${a + b}`);
  eq(rightTop === b + c, `右顶 ${rightTop} ≠ b+c=${b + c}`);
  eq(e + f === a, `e+f=${e + f} ≠ a=${a}`);
  eq(f + g === b, `f+g=${f + g} ≠ b=${b}`);
  eq(g + h === c, `g+h=${g + h} ≠ c=${c}`);
  eq(i + anchor4 === e, `i+锚4=${i + anchor4} ≠ e=${e}`);
  eq(anchor4 + j === f, `锚4+j=${anchor4 + j} ≠ f=${f}`);
  eq(j + k === g, `j+k=${j + k} ≠ g=${g}`);
  eq(k + l === h, `k+l=${k + l} ≠ h=${h}`);
  eq(edgeLeft + x === i, `7+x=${edgeLeft + x} ≠ i=${i}`);
  eq(x + y === anchor4, `x+y=${x + y} ≠ 锚4=${anchor4}`);
  eq(y + z === j, `y+z=${y + z} ≠ j=${j}`);
  eq(z + penult === k, `z+右二=${z + penult} ≠ k=${k}`);
  eq(penult + edgeRight === l, `右二+右端=${penult + edgeRight} ≠ l=${l}`);
  eq(anchor6 + p === y, `中行+p=${anchor6 + p} ≠ y=${y}`);
  eq(anchor6 + m === z, `中行+m=${anchor6 + m} ≠ z=${z}`);
  eq(bottom === p + anchor6 + m, `底=${bottom} ≠ p+中+m=${p + anchor6 + m}`);
  eq(rp === p && rm === m, '第 6 行 p、m 不一致');
  eq(anchor4 === config.anchor4, '第 4 行锚点不一致');
  eq(anchor6 === config.anchor6, '第 6 行锚点不一致');

  return { valid: errors.length === 0, errors };
}

/**
 * 检查 p、m 是否使全表为正整数
 */
function isPositiveIntegerGrid(p, m, config) {
  if (!Number.isInteger(p) || !Number.isInteger(m) || p < 1 || m < 1) return false;
  if (p + m !== config.bottom - config.anchor6) return false;

  const sol = solveFromParams(p, m, config);
  return sol.rows.every((row) => row.every((v) => Number.isInteger(v) && v > 0));
}

/**
 * 随机生成一道有效题目
 * @param {Partial<PuzzleConfig>} overrides
 * @returns {PuzzleSolution}
 */
export function generatePuzzle(overrides = {}) {
  const config = {
    edgeLeft: 7,
    penult: 3,
    edgeRight: 5,
    anchor4: 16,
    anchor6: 8,
    bottom: 15,
    difficulty: 'medium',
    ...overrides,
  };

  const sumPM = config.bottom - config.anchor6;
  const maxP = config.anchor4 - config.anchor6 - 1;

  /** @type {number[]} */
  const candidates = [];

  for (let p = 1; p <= Math.min(sumPM - 1, maxP); p++) {
    const m = sumPM - p;
    if (m < 1) continue;
    if (!isPositiveIntegerGrid(p, m, config)) continue;

    if (config.difficulty === 'easy' && (p > 3 || m > 3)) continue;
    if (config.difficulty === 'hard' && (p < 2 || m < 2)) continue;

    candidates.push(p);
  }

  if (candidates.length === 0) {
    throw new Error('无法在给定参数下生成正整数解，请调整锚点或底目标和。');
  }

  const p = candidates[Math.floor(Math.random() * candidates.length)];
  const m = sumPM - p;

  return solveFromParams(p, m, config);
}

/**
 * 题目连线拓扑 [上方行, 上方列, 下方行, 下方列]
 * 行索引: 0=顶目标和, 1=第2行 … 6=第7行
 */
const PUZZLE_LINKS = [
  // 顶目标和 → 第2行
  [0, 0, 1, 0], [0, 0, 1, 1], [0, 1, 1, 1], [0, 1, 1, 2],
  // 第2行 → 第3行
  [1, 0, 2, 0], [1, 0, 2, 1], [1, 1, 2, 1], [1, 1, 2, 2], [1, 2, 2, 2], [1, 2, 2, 3],
  // 第3行 → 第4行
  [2, 0, 3, 0], [2, 0, 3, 1], [2, 1, 3, 1], [2, 1, 3, 2], [2, 2, 3, 2], [2, 2, 3, 3],
  [2, 3, 3, 3], [2, 3, 3, 4],
  // 第4行 → 第5行
  [3, 0, 4, 0], [3, 0, 4, 1], [3, 1, 4, 1], [3, 1, 4, 2], [3, 2, 4, 2], [3, 2, 4, 3],
  [3, 3, 4, 3], [3, 3, 4, 4], [3, 4, 4, 4], [3, 4, 4, 5],
  // 第5行 ↔ 第6行（桥接：y=p+8, z=8+m；x 与 p 不连线）
  [4, 2, 5, 0], [4, 2, 5, 1], [4, 3, 5, 1], [4, 3, 5, 2],
  // 第6行 → 第7行（三数之和）
  [5, 0, 6, 0], [5, 1, 6, 0], [5, 2, 6, 0],
];

/** 桥接连线（第5行与第6行之间）用于差异化样式 */
const BRIDGE_LINKS = new Set(
  [
    [4, 2, 5, 0], [4, 2, 5, 1], [4, 3, 5, 1], [4, 3, 5, 2],
    [5, 0, 6, 0], [5, 1, 6, 0], [5, 2, 6, 0],
  ].map(([a, b, c, d]) => `${a},${b},${c},${d}`),
);

/** sessionStorage 键名 */
export const STORAGE_KEY = 'diamondPuzzleCurrent';

export { GIVEN_MASK, PUZZLE_LINKS, BRIDGE_LINKS };

/**
 * 校验用户填写的空白格
 * @param {import('./puzzle.js').PuzzleSolution} solution
 * @param {(number|null)[][]} userGrid
 */
export function checkUserAnswers(solution, userGrid) {
  const { rows } = solution;
  /** @type {{ row: number, col: number, correct: boolean, expected: number, actual: number|null }[]} */
  const results = [];
  let emptyCount = 0;
  let wrongCount = 0;

  rows.forEach((row, ri) => {
    row.forEach((expected, ci) => {
      if (GIVEN_MASK[ri]?.[ci]) return;

      const actual = userGrid[ri]?.[ci] ?? null;
      const correct = actual !== null && actual === expected;

      if (actual === null || Number.isNaN(actual)) {
        emptyCount += 1;
        results.push({ row: ri, col: ci, correct: false, expected, actual });
      } else if (!correct) {
        wrongCount += 1;
        results.push({ row: ri, col: ci, correct: false, expected, actual });
      } else {
        results.push({ row: ri, col: ci, correct: true, expected, actual });
      }
    });
  });

  const allFilled = emptyCount === 0;
  const allCorrect = allFilled && wrongCount === 0;

  return { allFilled, allCorrect, results, wrongCount, emptyCount };
}
