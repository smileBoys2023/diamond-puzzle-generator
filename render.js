import { GIVEN_MASK, PUZZLE_LINKS, BRIDGE_LINKS } from './puzzle.js';

const CELL_W = 56;
const CELL_H = 44;
const ROW_GAP = 36;
const BRIDGE_GAP = 52;
const PAD = 24;

function rowYPositions(rowCount) {
  const ys = [];
  let y = PAD;
  for (let ri = 0; ri < rowCount; ri++) {
    ys.push(y + CELL_H / 2);
    y += CELL_H + (ri === 4 ? BRIDGE_GAP : ROW_GAP);
  }
  return ys;
}

function nodeKey(ri, ci) {
  return `${ri},${ci}`;
}

/**
 * @param {import('./puzzle.js').PuzzleSolution} solution
 * @param {'play' | 'readonly'} mode
 * @returns {{ html: string, totalW: number, totalH: number, nodeMap: Map<string, object> }}
 */
export function renderPuzzleBoard(solution, mode = 'play') {
  const { rows } = solution;
  const maxCols = 6;
  const rowYs = rowYPositions(rows.length);
  const totalW = maxCols * CELL_W + PAD * 2;
  const totalH = rowYs[rowYs.length - 1] + CELL_H / 2 + PAD;

  /** @type {Map<string, { row: number, col: number, x: number, y: number, value: number, given: boolean }>} */
  const nodeMap = new Map();

  rows.forEach((row, ri) => {
    const rowW = row.length * CELL_W;
    const startX = (totalW - rowW) / 2;
    const y = rowYs[ri];

    row.forEach((value, ci) => {
      nodeMap.set(nodeKey(ri, ci), {
        row: ri,
        col: ci,
        x: startX + ci * CELL_W + CELL_W / 2,
        y,
        value,
        given: GIVEN_MASK[ri]?.[ci] ?? false,
      });
    });
  });

  const lines = PUZZLE_LINKS.map(([ur, uc, lr, lc]) => {
    const upper = nodeMap.get(nodeKey(ur, uc));
    const lower = nodeMap.get(nodeKey(lr, lc));
    if (!upper || !lower) return '';

    const isBridge = BRIDGE_LINKS.has(`${ur},${uc},${lr},${lc}`);
    const cls = isBridge ? 'link bridge' : 'link';
    return `<line x1="${upper.x}" y1="${upper.y + CELL_H / 2 - 2}" x2="${lower.x}" y2="${lower.y - CELL_H / 2 + 2}" class="${cls}" />`;
  }).join('');

  const cells = [...nodeMap.values()]
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .map((n) => {
      const id = `cell-${n.row}-${n.col}`;
      const given = n.given;

      if (mode === 'play' && !given) {
        return `
          <g class="node input-node" data-row="${n.row}" data-col="${n.col}">
            <rect x="${n.x - 26}" y="${n.y - 20}" width="52" height="40" rx="6" class="cell blank input-cell" />
            <foreignObject x="${n.x - 24}" y="${n.y - 18}" width="48" height="36">
              <input
                type="number"
                inputmode="numeric"
                class="cell-input"
                id="${id}"
                data-row="${n.row}"
                data-col="${n.col}"
                placeholder="?"
                autocomplete="off"
              />
            </foreignObject>
          </g>`;
      }

      const cls = ['cell', given ? 'given' : 'blank'].join(' ');
      return `
        <g class="node" data-row="${n.row}" data-col="${n.col}">
          <rect x="${n.x - 26}" y="${n.y - 20}" width="52" height="40" rx="6" class="${cls}" />
          <text x="${n.x}" y="${n.y + 5}" text-anchor="middle" class="cell-text">${n.value}</text>
        </g>`;
    })
    .join('');

  const html = `
    <svg viewBox="0 0 ${totalW} ${totalH}" class="puzzle-svg" role="img" aria-label="菱形数字谜题">
      <g class="links">${lines}</g>
      <g class="cells">${cells}</g>
    </svg>`;

  return { html, totalW, totalH, nodeMap };
}

export function renderTargets(solution) {
  return `
    <div class="target-chip left">左顶目标和 <strong>${solution.leftTop}</strong></div>
    <div class="target-chip right">右顶目标和 <strong>${solution.rightTop}</strong></div>`;
}

export { GIVEN_MASK, CELL_W, CELL_H };
