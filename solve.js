/**
 * 菱形数字谜题 — 直接计算引擎
 */

/**
 * 菱形数字谜题 — 直接计算引擎
 */

const empty = (v) => v === null || v === undefined || v === '' || Number.isNaN(v);

/**
 * 由顶部目标和反推 p（m = sumPM - p）
 * 左顶 = edgeLeft + 4·锚4 + 6·锚6 + 4·sumPM - 2p + 右二
 * 右顶 = 锚4 + 9·锚6 + 6·sumPM - 3p + 4·右二 + 右端
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
 * @param {Object} options
 * @param {number} [options.edgeLeft=7]
 * @param {number} [options.penult=3]
 * @param {number} [options.edgeRight=5]
 * @param {number} [options.anchor4=16]
 * @param {number} [options.anchor6=8]
 * @param {number} [options.bottom=15]
 * @param {number} [options.leftTop=146]
 * @param {number} [options.rightTop=141]
 * @param {number|null|undefined} [options.p]
 * @param {number|null|undefined} [options.m]
 */
export function solveDiamondPuzzle(options = {}) {
  const {
    edgeLeft = 7,
    penult = 3,
    edgeRight = 5,
    anchor4 = 16,
    anchor6 = 8,
    bottom = 15,
    leftTop: targetLeft,
    rightTop: targetRight,
    p: givenP,
    m: givenM,
  } = options;

  const config = { edgeLeft, penult, edgeRight, anchor4, anchor6, bottom };
  const sumPM = bottom - anchor6;

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
      p = 2;
      m = sumPM - p;
      solvedFrom = 'default';
    }
  }

  if (!Number.isInteger(p) || !Number.isInteger(m)) {
    throw new Error(`p、m 须为整数，当前 p=${p}，m=${m}`);
  }

  if (p + m !== sumPM) {
    throw new Error(`p + m 应等于 ${sumPM}（底目标和 − 第6行锚点），当前为 ${p + m}`);
  }

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
    row2: { a, b, c },
    row3: { e, f, g, h },
    row4: { i, anchor4, j, k, l },
    row5: { edgeLeft, x, y, z, penult, edgeRight },
    row6: { p, anchor6, m },
    row7: { bottom },
    rows: [
      [leftTop, rightTop],
      [a, b, c],
      [e, f, g, h],
      [i, anchor4, j, k, l],
      [edgeLeft, x, y, z, penult, edgeRight],
      [p, anchor6, m],
      [bottom],
    ],
    params: { p, m, sumPM, solvedFrom },
    config,
  };
}

/** @param {ReturnType<typeof solveDiamondPuzzle>} result */
export function verify(result) {
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
export function toPuzzleSolution(result) {
  return {
    rows: result.rows,
    leftTop: result.top.left,
    rightTop: result.top.right,
    p: result.params.p,
    m: result.params.m,
    config: result.config,
  };
}
