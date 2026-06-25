/**
 * 菱形数字谜题 — 核心计算引擎
 *
 * 行结构（0-indexed）:
 *   row0: [leftTop, rightTop]           — 顶部目标和（非行变量）
 *   row1: [a, b, c]                     — 第 2 行
 *   row2: [e, f, g, h]                 — 第 3 行
 *   row3: [i, anchor4, j, k, l]        — 第 4 行（锚点）
 *   row4: [edgeLeft, x, y, z, penult, edgeRight] — 第 5 行
 *   row5: [p, anchor6, m]              — 第 6 行（锚点）
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
 * @property {boolean[][]} [givenMask] — 每题随机，true 为已知格
 */

const empty = (v) => v === null || v === undefined || v === '' || Number.isNaN(v);

/** 兼容旧题目的默认已知格（固定锚点位置） */
const DEFAULT_GIVEN_MASK = [
  [true, true],
  [false, false, false],
  [false, false, false, false],
  [false, true, false, false, false],
  [true, false, false, false, true, true],
  [false, true, false],
  [true],
];

/** @deprecated 使用 solution.givenMask */
const GIVEN_MASK = DEFAULT_GIVEN_MASK;

const GIVEN_COUNT_BY_DIFFICULTY = {
  /** 在必要锚点之外额外给出的格子数 */
  easy: [6, 11],
  medium: [0, 3],
  hard: [0, 0],
};

/**
 * 结构锚点位置 [行, 列] — 每题必须给出（定义题目参数）
 * row0: 顶部目标和；row3: 锚4；row4: 左端/右二/右端；row5: 锚6；row6: 底
 */
const ANCHOR_CELL_POSITIONS = [
  [0, 0], [0, 1],
  [3, 1],
  [4, 0], [4, 4], [4, 5],
  [5, 1],
  [6, 0],
];

/** 创建必要锚点已知格掩码 */
export function createRequiredAnchorMask(rows) {
  return rows.map((row, ri) =>
    row.map((_, ci) => ANCHOR_CELL_POSITIONS.some(([r, c]) => r === ri && c === ci)),
  );
}

/** 是否包含全部必要锚点 */
export function hasRequiredAnchors(givenMask) {
  return ANCHOR_CELL_POSITIONS.every(([ri, ci]) => givenMask[ri]?.[ci] === true);
}

/** 创建空白已知格掩码（仅顶部目标和为已知） */
export function createBlankGivenMask(rows) {
  return rows.map((row, ri) => row.map(() => ri === 0));
}

/** 检查候选解是否与已知格一致 */
function gridMatchesClues(rows, mask, referenceRows) {
  for (let ri = 0; ri < rows.length; ri++) {
    for (let ci = 0; ci < rows[ri].length; ci++) {
      if (!mask[ri]?.[ci]) continue;
      if (rows[ri][ci] !== referenceRows[ri][ci]) return false;
    }
  }
  return true;
}

/**
 * 统计与已知格兼容的解的数量（枚举所有有效 p）
 * @returns {{ count: number, matchingP: number[] }}
 */
export function countSolutionsMatchingClues(config, givenMask, referenceRows, difficulty = 'medium') {
  const candidates = findValidPMCandidates(config, difficulty);
  /** @type {number[]} */
  const matchingP = [];

  for (const p of candidates) {
    const m = config.bottom - config.anchor6 - p;
    const sol = solveFromParams(p, m, config);
    if (gridMatchesClues(sol.rows, givenMask, referenceRows)) {
      matchingP.push(p);
    }
  }

  return { count: matchingP.length, matchingP };
}

/** 不同有效 p 之间数值有差异的格子（用于保证唯一解） */
function cellsThatDifferBetweenCandidates(config, difficulty) {
  const candidates = findValidPMCandidates(config, difficulty);
  if (candidates.length <= 1) return [];

  const grids = candidates.map((p) =>
    solveFromParams(p, config.bottom - config.anchor6 - p, config).rows,
  );

  /** @type {[number, number][]} */
  const diffCells = [];
  for (let ri = 0; ri < grids[0].length; ri++) {
    for (let ci = 0; ci < grids[0][ri].length; ci++) {
      const values = new Set(grids.map((g) => g[ri][ci]));
      if (values.size > 1) diffCells.push([ri, ci]);
    }
  }
  return diffCells;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function countGivenInMask(mask) {
  return mask.flat().filter(Boolean).length;
}

/** 必要锚点单独给出时是否已能唯一确定解 */
function configSupportsUniqueWithAnchors(config, difficulty) {
  const candidates = findValidPMCandidates(config, difficulty);
  if (candidates.length === 0) return false;
  if (candidates.length === 1) return true;

  const p = candidates[0];
  const sol = solveFromParams(p, config.bottom - config.anchor6 - p, config);
  const anchorMask = createRequiredAnchorMask(sol.rows);
  return countSolutionsMatchingClues(config, anchorMask, sol.rows, difficulty).count === 1;
}

/**
 * 生成保证唯一解的已知格掩码（必要锚点始终给出）
 */
export function generateUniqueGivenMask(config, solution, difficulty) {
  const { rows } = solution;
  const [minExtra, maxExtra] = GIVEN_COUNT_BY_DIFFICULTY[difficulty] || GIVEN_COUNT_BY_DIFFICULTY.medium;
  const discriminating = cellsThatDifferBetweenCandidates(config, difficulty).filter(
    ([ri, ci]) => !ANCHOR_CELL_POSITIONS.some(([r, c]) => r === ri && c === ci),
  );

  /** 可选额外已知格（非锚点） */
  const optionalPool = [];
  rows.forEach((row, ri) => {
    row.forEach((_, ci) => {
      if (!ANCHOR_CELL_POSITIONS.some(([r, c]) => r === ri && c === ci)) {
        optionalPool.push([ri, ci]);
      }
    });
  });

  for (let attempt = 0; attempt < 80; attempt++) {
    const mask = createRequiredAnchorMask(rows);

    if (countSolutionsMatchingClues(config, mask, rows, difficulty).count !== 1) {
      for (const [ri, ci] of shuffleArray(discriminating.length ? discriminating : optionalPool)) {
        if (mask[ri][ci]) continue;
        mask[ri][ci] = true;
        if (countSolutionsMatchingClues(config, mask, rows, difficulty).count === 1) break;
      }
    }

    if (countSolutionsMatchingClues(config, mask, rows, difficulty).count !== 1) continue;

    const targetExtra = randomIn([minExtra, maxExtra]);
    let added = 0;
    for (const [ri, ci] of shuffleArray(optionalPool)) {
      if (added >= targetExtra) break;
      if (mask[ri][ci]) continue;
      mask[ri][ci] = true;
      if (countSolutionsMatchingClues(config, mask, rows, difficulty).count !== 1) {
        mask[ri][ci] = false;
      } else {
        added += 1;
      }
    }

    if (
      hasRequiredAnchors(mask)
      && countSolutionsMatchingClues(config, mask, rows, difficulty).count === 1
    ) {
      return mask;
    }
  }

  return buildDeterministicUniqueMask(config, solution, difficulty, minExtra, maxExtra);
}

/** 确定性兜底：必要锚点 + 逐步添加直至唯一 */
function buildDeterministicUniqueMask(config, solution, difficulty, minExtra, maxExtra) {
  const { rows } = solution;
  const mask = createRequiredAnchorMask(rows);
  const discriminating = cellsThatDifferBetweenCandidates(config, difficulty);

  const pool = [];
  rows.forEach((row, ri) => row.forEach((_, ci) => pool.push([ri, ci])));

  for (const [ri, ci] of [...discriminating, ...pool]) {
    if (countSolutionsMatchingClues(config, mask, rows, difficulty).count === 1) break;
    if (!mask[ri][ci]) mask[ri][ci] = true;
  }

  let added = 0;
  for (const [ri, ci] of pool) {
    if (added >= maxExtra) break;
    if (mask[ri][ci]) continue;
    mask[ri][ci] = true;
    if (countSolutionsMatchingClues(config, mask, rows, difficulty).count !== 1) {
      mask[ri][ci] = false;
    } else {
      added += 1;
    }
  }

  while (
    added < minExtra
    && countSolutionsMatchingClues(config, mask, rows, difficulty).count === 1
  ) {
    const next = pool.find(([ri, ci]) => !mask[ri][ci]);
    if (!next) break;
    const [ri, ci] = next;
    mask[ri][ci] = true;
    if (countSolutionsMatchingClues(config, mask, rows, difficulty).count !== 1) {
      mask[ri][ci] = false;
      break;
    }
    added += 1;
  }

  if (countSolutionsMatchingClues(config, mask, rows, difficulty).count !== 1) {
    throw new Error('无法为当前参数构建含必要锚点的唯一解题目');
  }

  return mask;
}

/** 验证题目已知格是否对应唯一解且含必要锚点 */
export function validatePuzzleUniqueness(solution) {
  const { config, rows, givenMask, p } = solution;
  if (!givenMask) return { unique: false, count: 0, hasAnchors: false };

  if (!hasRequiredAnchors(givenMask)) {
    return { unique: false, count: 0, hasAnchors: false, matchingP: [] };
  }

  const difficulty = config.difficulty || 'medium';
  const { count, matchingP } = countSolutionsMatchingClues(config, givenMask, rows, difficulty);
  return {
    unique: count === 1 && matchingP[0] === p,
    hasAnchors: true,
    count,
    matchingP,
  };
}

/**
 * @deprecated 使用 generateUniqueGivenMask
 * 随机生成已知格位置（不保证唯一解）
 */
export function generateRandomGivenMask(difficulty, rows) {
  const mask = createBlankGivenMask(rows);
  const pool = [];
  rows.forEach((row, ri) => {
    if (ri === 0) return;
    row.forEach((_, ci) => pool.push([ri, ci]));
  });
  const [minG, maxG] = GIVEN_COUNT_BY_DIFFICULTY[difficulty] || GIVEN_COUNT_BY_DIFFICULTY.medium;
  const count = Math.min(pool.length - 1, randomIn([minG, maxG]));
  shuffleArray(pool).slice(0, count).forEach(([ri, ci]) => { mask[ri][ci] = true; });
  return mask;
}

/** @param {PuzzleSolution} solution */
export function getGivenMask(solution) {
  if (solution.givenMask?.length === solution.rows.length) {
    return solution.givenMask;
  }
  return DEFAULT_GIVEN_MASK;
}

const DIFFICULTY_RANGES = {
  easy: { anchor6: [3, 8], anchor4Extra: [4, 14], bottomExtra: [3, 7], edge: [2, 6] },
  medium: { anchor6: [5, 12], anchor4Extra: [6, 22], bottomExtra: [4, 16], edge: [3, 10] },
  hard: { anchor6: [8, 18], anchor4Extra: [10, 38], bottomExtra: [6, 26], edge: [5, 14] },
};

function randomIn([min, max]) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

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
 * 检查 p、m 是否使全表为正整数
 */
function isPositiveIntegerGrid(p, m, config) {
  if (!Number.isInteger(p) || !Number.isInteger(m) || p < 1 || m < 1) return false;
  if (p + m !== config.bottom - config.anchor6) return false;

  const sol = solveFromParams(p, m, config);
  return sol.rows.every((row) => row.every((v) => Number.isInteger(v) && v > 0));
}

/**
 * 枚举满足难度约束的有效 p 值
 * @param {PuzzleConfig} config
 * @param {'easy'|'medium'|'hard'} [difficulty]
 */
export function findValidPMCandidates(config, difficulty = 'medium') {
  const { anchor4, anchor6, bottom } = config;
  const sumPM = bottom - anchor6;
  const maxP = anchor4 - anchor6 - 1;

  /** @type {number[]} */
  const candidates = [];

  for (let p = 1; p <= Math.min(sumPM - 1, maxP); p++) {
    const m = sumPM - p;
    if (m < 1) continue;
    if (!isPositiveIntegerGrid(p, m, config)) continue;
    if (difficulty === 'easy' && (p > 3 || m > 3)) continue;
    if (difficulty === 'hard' && (p < 2 || m < 2)) continue;
    candidates.push(p);
  }

  return candidates;
}

/**
 * 随机生成一组有效题目参数（锚点、边缘数、底目标和）
 * @param {'easy'|'medium'|'hard'} [difficulty]
 */
export function generateRandomConfig(difficulty = 'medium', maxAttempts = 400) {
  const ranges = DIFFICULTY_RANGES[difficulty] || DIFFICULTY_RANGES.medium;

  for (let i = 0; i < maxAttempts; i++) {
    const anchor6 = randomIn(ranges.anchor6);
    const anchor4 = anchor6 + randomIn(ranges.anchor4Extra);
    const bottom = anchor6 + randomIn(ranges.bottomExtra);
    if (bottom <= anchor6 + 2) continue;

    const config = {
      edgeLeft: randomIn(ranges.edge),
      penult: randomIn(ranges.edge),
      edgeRight: randomIn(ranges.edge),
      anchor4,
      anchor6,
      bottom,
      difficulty,
    };

    if (!configSupportsUniqueWithAnchors(config, difficulty)) continue;

    return config;
  }

  throw new Error('无法随机生成有效题目参数，请重试。');
}

/**
 * 由顶部目标和反推 p（m = sumPM - p）
 */
export function solvePFromTargets(config, targets) {
  const { edgeLeft, penult, edgeRight, anchor4, anchor6, bottom } = config;
  const sumPM = bottom - anchor6;
  const { leftTop, rightTop } = targets;

  const pFromLeft = (edgeLeft + 4 * anchor4 + 6 * anchor6 + 4 * sumPM + penult - leftTop) / 2;
  const pFromRight = (anchor4 + 9 * anchor6 + 6 * sumPM + 4 * penult + edgeRight - rightTop) / 3;

  const hasLeft = !empty(leftTop);
  const hasRight = !empty(rightTop);

  if (hasLeft && hasRight) {
    if (pFromLeft !== pFromRight) {
      throw new Error(
        `左顶 ${leftTop} 与右顶 ${rightTop} 矛盾：分别要求 p=${pFromLeft} 和 p=${pFromRight}`,
      );
    }
    if (!Number.isInteger(pFromLeft)) {
      throw new Error(`顶部目标和 ${leftTop}/${rightTop} 无法得到整数 p（计算得 ${pFromLeft}）`);
    }
    return { p: pFromLeft, m: sumPM - pFromLeft, sumPM };
  }

  if (hasLeft) {
    if (!Number.isInteger(pFromLeft)) {
      throw new Error(`左顶 ${leftTop} 无法得到整数 p（计算得 ${pFromLeft}）`);
    }
    return { p: pFromLeft, m: sumPM - pFromLeft, sumPM };
  }

  if (hasRight) {
    if (!Number.isInteger(pFromRight)) {
      throw new Error(`右顶 ${rightTop} 无法得到整数 p（计算得 ${pFromRight}）`);
    }
    return { p: pFromRight, m: sumPM - pFromRight, sumPM };
  }

  return null;
}

/**
 * 统一求解入口（生成器与计算器共用）
 */
export function solveDiamondPuzzle(options = {}) {
  const {
    edgeLeft,
    penult,
    edgeRight,
    anchor4,
    anchor6,
    bottom,
    leftTop: targetLeft,
    rightTop: targetRight,
    p: givenP,
    m: givenM,
    difficulty = 'medium',
  } = options;

  if ([edgeLeft, penult, edgeRight, anchor4, anchor6, bottom].some((v) => empty(v))) {
    throw new Error('请填写完整的锚点、边缘数与底目标和');
  }

  const config = {
    edgeLeft: Number(edgeLeft),
    penult: Number(penult),
    edgeRight: Number(edgeRight),
    anchor4: Number(anchor4),
    anchor6: Number(anchor6),
    bottom: Number(bottom),
    difficulty,
  };

  const sumPM = config.bottom - config.anchor6;

  let p = givenP;
  let m = givenM;
  let solvedFrom = 'default';

  if (!empty(p) && !empty(m)) {
    p = Number(p);
    m = Number(m);
    solvedFrom = 'pm';
  } else if (!empty(p)) {
    p = Number(p);
    m = sumPM - p;
    solvedFrom = 'p';
  } else if (!empty(m)) {
    m = Number(m);
    p = sumPM - m;
    solvedFrom = 'm';
  } else {
    const fromTargets = solvePFromTargets(config, {
      leftTop: targetLeft,
      rightTop: targetRight,
    });
    if (fromTargets) {
      ({ p, m } = fromTargets);
      solvedFrom = 'tops';
    } else {
      const candidates = findValidPMCandidates(config, difficulty);
      if (candidates.length === 0) {
        throw new Error('当前参数下无有效正整数解，请调整锚点或底目标和');
      }
      p = candidates[0];
      m = sumPM - p;
      solvedFrom = 'auto';
    }
  }

  if (!Number.isInteger(p) || !Number.isInteger(m)) {
    throw new Error(`p、m 须为整数，当前 p=${p}，m=${m}`);
  }

  if (p + m !== sumPM) {
    throw new Error(`p + m 应等于 ${sumPM}（底目标和 − 第6行锚点），当前为 ${p + m}`);
  }

  const solution = solveFromParams(p, m, config);
  const { leftTop, rightTop, rows } = solution;

  const targetMismatch = [];
  if (!empty(targetLeft) && leftTop !== Number(targetLeft)) {
    targetMismatch.push(`左顶配置 ${targetLeft} ≠ 计算值 ${leftTop}`);
  }
  if (!empty(targetRight) && rightTop !== Number(targetRight)) {
    targetMismatch.push(`右顶配置 ${targetRight} ≠ 计算值 ${rightTop}`);
  }
  if (targetMismatch.length && solvedFrom === 'pm') {
    throw new Error(`手动指定的 p、m 与顶部目标和矛盾：${targetMismatch.join('；')}`);
  }

  return {
    top: { left: leftTop, right: rightTop },
    targets: {
      left: empty(targetLeft) ? null : Number(targetLeft),
      right: empty(targetRight) ? null : Number(targetRight),
    },
    row2: { a: rows[1][0], b: rows[1][1], c: rows[1][2] },
    row3: { e: rows[2][0], f: rows[2][1], g: rows[2][2], h: rows[2][3] },
    row4: { i: rows[3][0], anchor4, j: rows[3][2], k: rows[3][3], l: rows[3][4] },
    row5: {
      edgeLeft: rows[4][0],
      x: rows[4][1],
      y: rows[4][2],
      z: rows[4][3],
      penult: rows[4][4],
      edgeRight: rows[4][5],
    },
    row6: { p, anchor6, m },
    row7: { bottom: config.bottom },
    rows,
    params: { p, m, sumPM, solvedFrom },
    config,
  };
}

/** @param {ReturnType<typeof solveDiamondPuzzle>} result */
export function verifyResult(result) {
  const { top, row2, row3, row4, row5, row6, row7 } = result;
  const { a, b, c } = row2;
  const { e, f, g, h } = row3;
  const { i, anchor4, j, k, l } = row4;
  const { edgeLeft, x, y, z, penult, edgeRight } = row5;
  const { p, anchor6, m } = row6;
  const { bottom } = row7;

  const checks = [
    ['左顶 = a + b', top.left, a + b],
    ['右顶 = b + c', top.right, b + c],
    ['e + f = a', e + f, a],
    ['f + g = b', f + g, b],
    ['g + h = c', g + h, c],
    ['i + 锚4 = e', i + anchor4, e],
    ['锚4 + j = f', anchor4 + j, f],
    ['j + k = g', j + k, g],
    ['k + l = h', k + l, h],
    ['左端 + x = i', edgeLeft + x, i],
    ['x + y = 锚4', x + y, anchor4],
    ['y + z = j', y + z, j],
    ['z + 右二 = k', z + penult, k],
    ['右二 + 右端 = l', penult + edgeRight, l],
    ['锚6 + p = y', anchor6 + p, y],
    ['锚6 + m = z', anchor6 + m, z],
    ['底 = p + 锚6 + m', p + anchor6 + m, bottom],
  ];

  const details = checks.map(([name, actual, expected]) => ({
    name,
    ok: actual === expected,
    actual,
    expected,
  }));

  const failed = details.filter((d) => !d.ok);
  return { ok: failed.length === 0, details, failed };
}

/** 转为渲染器可用的 PuzzleSolution 结构 */
export function toPuzzleSolution(result, givenMask = null) {
  return {
    rows: result.rows,
    leftTop: result.top.left,
    rightTop: result.top.right,
    p: result.params.p,
    m: result.params.m,
    config: result.config,
    ...(givenMask ? { givenMask } : {}),
  };
}

/**
 * 根据已生成题目（含随机已知格）计算完整答案
 * @param {PuzzleSolution} puzzle
 */
export function solveFromStoredPuzzle(puzzle) {
  if (!puzzle?.config || puzzle.p == null || puzzle.m == null) {
    throw new Error('题目数据不完整，请先在首页生成题目');
  }

  const { config, p, m, givenMask } = puzzle;
  const result = solveDiamondPuzzle({
    ...config,
    p,
    m,
    leftTop: puzzle.leftTop,
    rightTop: puzzle.rightTop,
    difficulty: config.difficulty || 'medium',
  });

  const answer = toPuzzleSolution(result, givenMask ?? puzzle.givenMask);
  const v = verifyResult(result);

  return { result, answer, puzzle, verify: v };
}

/** 统计已知格与空白格数量 */
export function countGivenCells(solution) {
  const mask = getGivenMask(solution);
  const given = mask.flat().filter(Boolean).length;
  return { given, blank: mask.flat().filter((v) => !v).length };
}

/**
 * 验证解是否满足全部规则
 * @param {PuzzleSolution} solution
 */
export function validateSolution(solution) {
  const result = solveDiamondPuzzle({
    ...solution.config,
    p: solution.p,
    m: solution.m,
  });
  const v = verifyResult(result);
  const uniqueness = validatePuzzleUniqueness(solution);
  const errors = v.failed.map((d) => `${d.name}: ${d.actual} ≠ ${d.expected}`);
  if (!uniqueness.hasAnchors) {
    errors.push('缺少必要锚点（第4/6行锚点、第5行边缘数、底目标和）');
  }
  if (!uniqueness.unique) {
    errors.push(`已知格对应 ${uniqueness.count} 个解，非唯一解`);
  }
  return {
    valid: v.ok && uniqueness.unique && uniqueness.hasAnchors,
    errors,
    uniqueness,
  };
}

/**
 * 随机生成一道有效题目（保证已知格对应唯一解）
 * @param {{ difficulty?: 'easy'|'medium'|'hard' }} [options]
 */
export function generatePuzzle(options = {}) {
  const difficulty = options.difficulty || 'medium';
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const config = generateRandomConfig(difficulty);
    const candidates = findValidPMCandidates(config, difficulty);
    if (candidates.length === 0) continue;

    const p = candidates[Math.floor(Math.random() * candidates.length)];
    const m = config.bottom - config.anchor6 - p;
    const solution = solveFromParams(p, m, config);
    const givenMask = generateUniqueGivenMask(config, solution, difficulty);
    const puzzle = { ...solution, givenMask };

    const { unique, hasAnchors } = validatePuzzleUniqueness(puzzle);
    if (unique && hasAnchors) return puzzle;
  }

  throw new Error('无法生成唯一解题目，请重试。');
}

const PUZZLE_LINKS = [
  [0, 0, 1, 0], [0, 0, 1, 1], [0, 1, 1, 1], [0, 1, 1, 2],
  [1, 0, 2, 0], [1, 0, 2, 1], [1, 1, 2, 1], [1, 1, 2, 2], [1, 2, 2, 2], [1, 2, 2, 3],
  [2, 0, 3, 0], [2, 0, 3, 1], [2, 1, 3, 1], [2, 1, 3, 2], [2, 2, 3, 2], [2, 2, 3, 3],
  [2, 3, 3, 3], [2, 3, 3, 4],
  [3, 0, 4, 0], [3, 0, 4, 1], [3, 1, 4, 1], [3, 1, 4, 2], [3, 2, 4, 2], [3, 2, 4, 3],
  [3, 3, 4, 3], [3, 3, 4, 4], [3, 4, 4, 4], [3, 4, 4, 5],
  [4, 2, 5, 0], [4, 2, 5, 1], [4, 3, 5, 1], [4, 3, 5, 2],
  [5, 0, 6, 0], [5, 1, 6, 0], [5, 2, 6, 0],
];

const BRIDGE_LINKS = new Set(
  [
    [4, 2, 5, 0], [4, 2, 5, 1], [4, 3, 5, 1], [4, 3, 5, 2],
    [5, 0, 6, 0], [5, 1, 6, 0], [5, 2, 6, 0],
  ].map(([a, b, c, d]) => `${a},${b},${c},${d}`),
);

export const STORAGE_KEY = 'diamondPuzzleCurrent';

export { GIVEN_MASK, PUZZLE_LINKS, BRIDGE_LINKS };

/**
 * 校验用户填写的空白格
 */
export function checkUserAnswers(solution, userGrid) {
  const { rows } = solution;
  const mask = getGivenMask(solution);
  /** @type {{ row: number, col: number, correct: boolean, expected: number, actual: number|null }[]} */
  const results = [];
  let emptyCount = 0;
  let wrongCount = 0;

  rows.forEach((row, ri) => {
    row.forEach((expected, ci) => {
      if (mask[ri]?.[ci]) return;

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
