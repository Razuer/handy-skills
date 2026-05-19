const fs = require("fs");
const path = require("path");

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else if (entry.isFile()) copyFile(from, to);
  }
}

function copyTemplateAssets(template, outDir, options = {}) {
  const skillRoot = options.skillRoot || path.resolve(__dirname, "../..");
  const templateDir = path.join(skillRoot, "assets", "templates", template);
  if (!fs.existsSync(templateDir)) throw new Error(`Template asset directory not found: ${templateDir}`);
  for (const file of ["deck-stage.js", "image-slot.js", "tweaks-panel.jsx"]) {
    const src = path.join(templateDir, file);
    if (!fs.existsSync(src)) throw new Error(`Required template asset not found: ${src}`);
    copyFile(src, path.join(outDir, file));
  }
  copyDirectory(path.join(templateDir, "assets"), path.join(outDir, "assets"));
}

module.exports = { copyTemplateAssets, copyDirectory };
