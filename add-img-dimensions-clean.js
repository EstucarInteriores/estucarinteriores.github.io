const fs = require("fs");
const path = require("path");
const { imageSize } = require("image-size");

const ROOT = process.cwd();

function walkHtml(dir, out = []) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item === "node_modules") continue;
      walkHtml(full, out);
    } else if (full.toLowerCase().endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

function isHttp(u){ return /^https?:\/\//i.test(u); }
function stripQuery(u){ return u.split("?")[0].split("#")[0]; }

function resolveImagePath(htmlAbsPath, src){
  let clean = stripQuery(src);
  if (!clean || isHttp(clean) || clean.startsWith("data:")) return null;

  // %20, tildes, etc.
  try { clean = decodeURIComponent(clean); } catch(e) {}

  // Si el src empieza por "/" lo tratamos como relativo a la raíz del proyecto
  // Ej: "/assets/img/..." -> "<ROOT>/assets/img/..."
  if (clean.startsWith("/")) {
    clean = clean.slice(1);
    return path.resolve(ROOT, clean);
  }

  // Si es relativo normal, lo resolvemos respecto al HTML
  return path.resolve(path.dirname(htmlAbsPath), clean);
}

// Encuentra <img ...> (sin parsear DOM)
const IMG_TAG_RE = /<img\b[^>]*>/gi;
const SRC_RE     = /\bsrc\s*=\s*(["'])(.*?)\1/i;
const WIDTH_RE   = /\bwidth\s*=\s*(["'])(.*?)\1/i;
const HEIGHT_RE  = /\bheight\s*=\s*(["'])(.*?)\1/i;

const htmlFiles = walkHtml(ROOT);

let totalAdded = 0;
let totalUpdated = 0;
let totalErrors = 0;

for (const htmlPath of htmlFiles) {
  let txt = fs.readFileSync(htmlPath, "utf8");
  const tags = txt.match(IMG_TAG_RE);
  if (!tags) continue;

  let changedThisFile = 0;

  for (const tag of tags) {
    const m = tag.match(SRC_RE);
    if (!m) continue;

    const quote = m[1];
    const src = m[2];

    const absImg = resolveImagePath(htmlPath, src);
    if (!absImg) continue;
    if (!fs.existsSync(absImg)) continue;

    // Lee bytes -> tamaño real (evita el error ArrayBuffer/Buffer)
    let width, height;
    try {
      const buf = fs.readFileSync(absImg);
      const dim = imageSize(buf);
      width = dim.width;
      height = dim.height;
      if (!width || !height) continue;
    } catch (e) {
      totalErrors++;
      continue;
    }

    const hasW = WIDTH_RE.test(tag);
    const hasH = HEIGHT_RE.test(tag);

    // Si ya tiene width/height, NO lo tocamos (o si quieres, los actualizamos; por defecto: NO tocar)
    if (hasW && hasH) continue;

    let newTag = tag;

    // Inserta antes del cierre ">"
    const insert = [];
    if (!hasW) insert.push(` width=${quote}${width}${quote}`);
    if (!hasH) insert.push(` height=${quote}${height}${quote}`);

    newTag = newTag.replace(/>$/, `${insert.join("")}>`);

    // Reemplazo exacto de ese tag por el nuevo (sin tocar el resto del HTML)
    txt = txt.replace(tag, newTag);

    changedThisFile++;
    totalAdded += insert.length;
  }

  if (changedThisFile) {
    fs.writeFileSync(htmlPath, txt, "utf8");
    console.log(`OK: ${path.relative(ROOT, htmlPath)}  (imgs tocadas: ${changedThisFile})`);
  }
}

console.log("====================================");
console.log(`HTML procesados: ${htmlFiles.length}`);
console.log(`Atributos width/height añadidos: ${totalAdded}`);
console.log(`Errores leyendo imágenes: ${totalErrors}`);
console.log("Listo.");
