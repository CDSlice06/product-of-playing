import { spawn } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const outputDir = path.join(projectRoot, "cloudflare-pages-dist");
const templateDir = path.join(projectRoot, "cloudflare-pages");

const title = "命运之战 | 手机塔罗策略对战";
const description = "命运之战外层静态壳页，自动适配手机与桌面端，直接加载游戏本体。";

async function ensureBuildExists() {
  const distIndexPath = path.join(distDir, "index.html");

  try {
    await readFile(distIndexPath, "utf8");
  } catch {
    throw new Error("未找到 dist/index.html，请先执行 npm.cmd run build。");
  }
}

async function runProjectBuild() {
  await new Promise((resolve, reject) => {
    const child =
      process.platform === "win32"
        ? spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm.cmd run build"], {
            cwd: projectRoot,
            stdio: "inherit",
          })
        : spawn("npm", ["run", "build"], {
            cwd: projectRoot,
            stdio: "inherit",
          });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`构建失败，退出码 ${code ?? 1}`));
    });
  });
}

function rewriteGameHtml(html) {
  let next = html;

  next = next.replace(/<html lang="[^"]*"/i, '<html lang="zh-CN"');
  next = next.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title} | 游戏本体</title>`);

  if (/<meta\s+name="viewport"/i.test(next)) {
    next = next.replace(
      /<meta\s+name="viewport"[\s\S]*?>/i,
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1, user-scalable=no" />',
    );
  } else {
    next = next.replace(
      /<meta charset="UTF-8"\s*\/?>/i,
      '$&\n    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1, user-scalable=no" />',
    );
  }

  if (!/<meta\s+name="description"/i.test(next)) {
    next = next.replace(
      /<\/head>/i,
      `    <meta name="description" content="${description}" />\n  </head>`,
    );
  }

  next = next.replace(
    /(<link rel="stylesheet"[^>]*>\s*)<meta name="description"/i,
    `$1    <meta name="description"`,
  );
  next = next.replace(/\n\s+<meta name="description"/i, `\n    <meta name="description"`);

  return next;
}

async function walkFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const filePaths = [];

  for (const entry of entries) {
    const targetPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      filePaths.push(...(await walkFiles(targetPath)));
      continue;
    }

    filePaths.push(targetPath);
  }

  return filePaths;
}

async function cleanupDebugArtifacts(rootDir) {
  const files = await walkFiles(rootDir);

  for (const filePath of files) {
    if (filePath.endsWith(".map")) {
      await rm(filePath, { force: true });
      continue;
    }

    if (!filePath.endsWith(".js") && !filePath.endsWith(".css")) {
      continue;
    }

    const content = await readFile(filePath, "utf8");
    const cleaned = content
      .replace(/\n\/\/# sourceMappingURL=.*$/gm, "")
      .replace(/\n\/\*# sourceMappingURL=.*?\*\/$/gm, "");

    if (cleaned !== content) {
      await writeFile(filePath, cleaned, "utf8");
    }
  }
}

async function buildOutput() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const gameDir = path.join(outputDir, "game");
  await mkdir(gameDir, { recursive: true });
  await cp(path.join(distDir, "assets"), path.join(gameDir, "assets"), { recursive: true });
  await cp(path.join(distDir, "favicon.svg"), path.join(gameDir, "favicon.svg"));

  const originalGameHtml = await readFile(path.join(distDir, "index.html"), "utf8");
  await writeFile(path.join(gameDir, "index.html"), rewriteGameHtml(originalGameHtml), "utf8");

  const templateFiles = [
    "index.html",
    "404.html",
    "favicon.svg",
    "_headers",
    "_redirects",
    path.join("assets", "shell.css"),
    path.join("assets", "shell.js"),
  ];

  for (const relativePath of templateFiles) {
    const from = path.join(templateDir, relativePath);
    const to = path.join(outputDir, relativePath);
    await mkdir(path.dirname(to), { recursive: true });
    await cp(from, to);
  }

  await cleanupDebugArtifacts(outputDir);
}

async function main() {
  await runProjectBuild();
  await ensureBuildExists();
  await buildOutput();

  console.log(`Cloudflare Pages package ready: ${outputDir}`);
  console.log("Upload the contents of cloudflare-pages-dist to Cloudflare Pages.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
