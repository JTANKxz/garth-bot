// src/utils/cardprofile.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas, loadImage } from "canvas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ coloque seu template aqui (recomendo mover para assets/images/)
const TEMPLATE_PATH = path.join(__dirname, "../../assets/images/template.png");

// ===== HELPERS =====
function wrapText(ctx, text, maxWidth) {
  const words = String(text ?? "").split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawTextBox(ctx, text, box, options = {}) {
  if (!box) return;

  const {
    maxFont = 36,
    minFont = 14,
    padding = 20,
    color = "#FFFFFF",
    weight = "700",
    fontFamily = "Sans",
    lineHeight = 1.15,
  } = options;

  let size = maxFont;
  let lines = [];

  while (size >= minFont) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    lines = wrapText(ctx, text, box.w - padding * 2);

    const height = lines.length * size * lineHeight;
    if (height <= box.h - padding * 2) break;

    size -= 2;
  }

  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  ctx.textBaseline = "top";

  let y = box.y + (box.h - lines.length * size * lineHeight) / 2;

  for (const line of lines) {
    // ✅ IMPORTANTE: mantém EXATAMENTE como era antes (esquerda)
    ctx.fillText(line, box.x + padding, y);
    y += size * lineHeight;
  }
}

function drawAvatar(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const scale = Math.max((r * 2) / img.width, (r * 2) / img.height);
  const w = img.width * scale;
  const h = img.height * scale;

  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
}

// (Opcional) sanitiza/limita a frase pra não estourar o layout
function sanitizePhrase(phrase, maxChars = 90) {
  const clean = String(phrase ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > maxChars ? clean.slice(0, maxChars - 1) + "…" : clean;
}

// ===== MAIN EXPORT =====
export async function generateProfileCard({
  avatarBuffer, // Buffer (foto)
  username,     // string
  messages,     // number
  popularity,   // number
  victories,    // number
  defeats,      // number
  phrase,       // ✅ string (frase VIP)
}) {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template não encontrado em: ${TEMPLATE_PATH}`);
  }

  const template = await loadImage(TEMPLATE_PATH);
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext("2d");

  // Template
  ctx.drawImage(template, 0, 0);

  // ===== LAYOUT (seu ajuste atual) =====
  const layout = {
    avatar: { cx: 147, cy: 243, r: 106 },
    username: { x: 257, y: 225, w: 100, h: 80 },

    // ✅ FRASE: você ajusta a posição conforme seu template
    phrase: { x: 245, y: 504, w: 560, h: 55 },

    slot1: { x: 110, y: 363, w: 300, h: 70 },
    slot2: { x: 540, y: 363, w: 300, h: 70 },
    slot3: { x: 110, y: 441, w: 300, h: 70 },
    slot4: { x: 540, y: 441, w: 300, h: 70 },
  };

  // Avatar
  if (avatarBuffer && Buffer.isBuffer(avatarBuffer)) {
    try {
      const avatar = await loadImage(avatarBuffer);
      drawAvatar(ctx, avatar, layout.avatar.cx, layout.avatar.cy, layout.avatar.r);
    } catch {
      // se falhar, só não desenha
    }
  }

  // Username (mantém igual)
  drawTextBox(ctx, username ?? "Usuário", layout.username, {
    maxFont: 40,
    minFont: 28,
    weight: "900",
    color: "#ffffff",
    padding: 10,
  });

  // ✅ Frase no card (mantém alinhamento esquerda igual)
  const cleanPhrase = sanitizePhrase(phrase, 90);
  if (cleanPhrase) {
    drawTextBox(ctx, cleanPhrase, layout.phrase, {
      maxFont: 26,
      minFont: 14,
      weight: "700",
      color: "#ffffff",
      padding: 10,
      lineHeight: 1.1,
    });
  }

  // Slots (mantém igual)
  const slotStyle = {
    maxFont: 64,
    minFont: 34,
    weight: "900",
    color: "#000000",
    padding: 18,
  };

  drawTextBox(ctx, `${messages ?? 0}`, layout.slot1, slotStyle);
  drawTextBox(ctx, `${victories ?? 0}`, layout.slot2, slotStyle);
  drawTextBox(ctx, `${popularity ?? 0}`, layout.slot3, slotStyle);
  drawTextBox(ctx, `${defeats ?? 0}`, layout.slot4, slotStyle);

  return canvas.toBuffer("image/png");
}
