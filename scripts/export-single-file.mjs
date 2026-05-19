import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const distAssetsDir = path.join(distDir, "assets");
const outputPath = path.join(projectRoot, "双击打开游戏.html");

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function buildAssetDataUrlMap() {
  const entries = await readdir(distAssetsDir, { withFileTypes: true });
  const replacements = new Map();

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();
    const mimeType = MIME_TYPES[extension];
    if (!mimeType) continue;

    const filePath = path.join(distAssetsDir, entry.name);
    const fileBuffer = await readFile(filePath);
    const dataUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
    replacements.set(`./assets/${entry.name}`, dataUrl);
    replacements.set(`/assets/${entry.name}`, dataUrl);
    replacements.set(`assets/${entry.name}`, dataUrl);
  }

  return replacements;
}

function inlineAssetUrls(content, assetDataUrlMap) {
  let nextContent = content;
  for (const [assetPath, dataUrl] of assetDataUrlMap) {
    nextContent = nextContent.replace(new RegExp(escapeRegExp(assetPath), "g"), dataUrl);
  }
  return nextContent;
}

async function main() {
  const htmlPath = path.join(distDir, "index.html");
  let html = await readFile(htmlPath, "utf8");
  const assetDataUrlMap = await buildAssetDataUrlMap();

  const scriptMatch = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
  if (!scriptMatch) {
    throw new Error("未找到构建后的脚本引用。");
  }

  const cssMatch = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);
  const faviconMatch = html.match(/<link rel="icon" type="image\/svg\+xml" href="([^"]+)" \/>/);

  const jsRelativePath = scriptMatch[1].replace(/^\.\//, "");
  const jsPath = path.join(distDir, jsRelativePath);
  const js = inlineAssetUrls(await readFile(jsPath, "utf8"), assetDataUrlMap).replace(/<\/script/gi, "<\\/script");

  let css = "";
  if (cssMatch) {
    const cssRelativePath = cssMatch[1].replace(/^\.\//, "");
    const cssPath = path.join(distDir, cssRelativePath);
    css = inlineAssetUrls(await readFile(cssPath, "utf8"), assetDataUrlMap);
    html = html.replace(cssMatch[0], () => "");
  }

  if (faviconMatch) {
    const faviconRelativePath = faviconMatch[1].replace(/^\.\//, "");
    const faviconPath = path.join(projectRoot, "public", faviconRelativePath);
    const faviconSvg = await readFile(faviconPath, "utf8");
    const faviconDataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(faviconSvg)}`;
    html = html.replace(faviconMatch[0], () => `<link rel="icon" type="image/svg+xml" href="${faviconDataUrl}" />`);
  }

  const inlineAssets = [
    css ? `<style>\n${css}\n</style>` : "",
    `<script type="module">\n${js}\n</script>`,
  ]
    .filter(Boolean)
    .join("\n");

  html = html.replace(scriptMatch[0], () => inlineAssets);
  html = inlineAssetUrls(html, assetDataUrlMap);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
  console.log(`已生成单文件版本: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
