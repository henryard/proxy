#!/usr/bin/env node
/**
 * 扫描 IconSet 目录，生成 Loon / Quantumult X 通用格式的「图标库」JSON 文件。
 *
 * 用法：
 *   node scripts/generate-iconset-json.js
 *
 * 建议放到仓库的 scripts/generate-iconset-json.js，
 * 配合 .github/workflows/update-iconset-json.yml 在 CI 里自动运行。
 * 在 GitHub Actions 里运行时会自动识别仓库名和分支，无需手动填写。
 */
const fs = require('fs');
const path = require('path');

// ====================== 按需修改这几项 ======================
const ICON_DIR = 'IconSet';              // 图标所在文件夹（相对仓库根目录）
const OUTPUT_FILE = 'IconSet.json';      // 生成的图标库 json 文件路径（相对仓库根目录）
const COLLECTION_NAME = 'My IconSet';    // 图标库名称，会显示在 Loon「图标库」列表里
const COLLECTION_DESC = '自用 Loon 图标合集，随 IconSet 文件夹自动更新';

// 图片托管方式：用 raw.githubusercontent.com，上传后立即生效、没有 CDN 缓存延迟
// 如果之后更在意国内访问速度、能接受几分钟到数十分钟的缓存延迟，可以换回 jsDelivr：
// const buildUrl = (repo, branch, file) =>
//   `https://cdn.jsdelivr.net/gh/${repo}@${branch}/${ICON_DIR}/${file}`;
const buildUrl = (repo, branch, file) =>
  `https://raw.githubusercontent.com/${repo}/${branch}/${ICON_DIR}/${file}`;

const VALID_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
// ============================================================

// GITHUB_REPOSITORY / GITHUB_REF_NAME 由 GitHub Actions 自动注入，本地运行时用占位符兜底
const REPO = process.env.GITHUB_REPOSITORY || '<你的GitHub用户名>/<仓库名>';
const BRANCH = process.env.GITHUB_REF_NAME || 'main';

const dirPath = path.join(process.cwd(), ICON_DIR);
if (!fs.existsSync(dirPath)) {
  console.error(`目录不存在: ${dirPath}`);
  process.exit(1);
}

const files = fs
  .readdirSync(dirPath)
  .filter((f) => VALID_EXT.has(path.extname(f).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, 'en'));

const icons = files.map((file) => ({
  name: file,
  url: buildUrl(REPO, BRANCH, file),
}));

const output = {
  name: COLLECTION_NAME,
  icons,
  description: COLLECTION_DESC,
};

fs.writeFileSync(
  path.join(process.cwd(), OUTPUT_FILE),
  JSON.stringify(output, null, 2) + '\n',
  'utf-8'
);

console.log(`已生成 ${OUTPUT_FILE}，共 ${icons.length} 个图标（仓库: ${REPO}，分支: ${BRANCH}）`);
