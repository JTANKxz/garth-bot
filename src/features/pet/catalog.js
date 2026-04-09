import fs from "fs";
import path from "path";

const manifestPath = path.resolve("assets/pets/manifest.json");
const assetsRoot = path.resolve("assets/pets");

let cached = null;

export function getManifest() {
  if (cached) return cached;
  const raw = fs.readFileSync(manifestPath, "utf8");
  cached = JSON.parse(raw);
  return cached;
}

export function getLayoutPath(type) {
  const m = getManifest();
  const t = String(type);
  const layoutRel = m.types?.[t]?.layout || "layouts/default.png";
  return path.join(assetsRoot, layoutRel);
}

export function getDefaultType() {
  const m = getManifest();
  // agora é "1", "2", "3"
  return String(m.defaultType || "1");
}

export function typeExists(type) {
  const m = getManifest();
  const t = String(type);
  return !!m.types?.[t];
}

export function skinExists(type, skin) {
  const m = getManifest();
  const t = String(type);
  const s = String(skin);
  return !!m.types?.[t]?.skins?.[s];
}

export function getTypeLabel(type) {
  const m = getManifest();
  const t = String(type);
  return m.types?.[t]?.label || t;
}

export function getSkinLabel(type, skin) {
  const m = getManifest();
  const t = String(type);
  const s = String(skin);
  return m.types?.[t]?.skins?.[s]?.label || s;
}

export function getSkinFilePath(type, skin) {
  const m = getManifest();
  const t = String(type);
  const s = String(skin);

  const rel = m.types?.[t]?.skins?.[s]?.file;
  if (!rel) return null;

  return path.join(assetsRoot, rel);
}

export function getCreatePrice() {
  const m = getManifest();
  return m.createPrice || 500;
}

export function getTypePrice(type) {
  const m = getManifest();
  const t = String(type);
  return m.types?.[t]?.price || 0;
}

export function getSkinPrice(type, skin) {
  const m = getManifest();
  const t = String(type);
  const s = String(skin);
  return m.types?.[t]?.skins?.[s]?.price || 0;
}