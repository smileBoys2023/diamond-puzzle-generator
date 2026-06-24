# 菱形数字谜题生成器

基于「菱形数字墙」规则的浏览器端题目生成器，可随机生成数值与已知格位置，并保证存在正整数解。

## 规则摘要

- **7 行菱形**：节点数 `2 → 3 → 4 → 5 → 6 → 3 → 1`
- **通用**：下方相连两数之和 = 上方数（滑动窗口）
- **结构锚点**：第 4 行第 2 格、第 6 行中间格参与递推（数值随机）
- **特例**：`y = 中行 + p`，`z = 中行 + m`，`底 = p + 中行 + m`
- **顶部**：左顶 = a+b，右顶 = b+c（始终为已知目标和）
- **已知格**：除顶部外，每题随机揭示若干格子（简单多、困难少）

## 使用

### 本地

```bash
cd diamond-puzzle-generator
npx --yes serve .
```

1. 打开 `http://localhost:3000`，选择难度后**随机生成**题目
2. 自动跳转到 `play.html` 答题页，在空白格填写数字
3. 点击「验证答案」检查是否正确
4. 打开 `calc.html`：**计算当前题目**（读取随机已知格并显示完整答案），或手动输入参数推算

### 发布到 GitHub Pages

1. 在 GitHub 新建仓库（例如 `diamond-puzzle-generator`），**不要**勾选「Add a README」
2. 在本项目目录执行（将 `你的用户名` 换成你的 GitHub 用户名）：

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/diamond-puzzle-generator.git
git push -u origin main
```

3. 打开仓库 **Settings → Pages**
4. **Build and deployment → Source** 选 **Deploy from a branch**
5. **Branch** 选 `main`，文件夹选 **`/ (root)`**，点 **Save**
6. 等待约 1～2 分钟，访问：

   `https://你的用户名.github.io/diamond-puzzle-generator/`

之后每次 `git push` 到 `main`，站点会自动更新。

## 文件

- `index.html` / `index.js` — 按难度随机生成题目
- `play.html` / `play.js` — 答题与验证
- `calc.html` / `calc.js` — 计算当前题目（含随机已知格）或手动参数推算
- `puzzle.js` — 随机生成、递推求解、验算（核心引擎）
- `solve.js` — 重导出 `puzzle.js` 计算接口
- `render.js` — 菱形图渲染
- `styles.css` — 样式
