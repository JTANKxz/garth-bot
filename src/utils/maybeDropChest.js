// src/utils/maybeDropChest.js
import fs from "fs";
import path from "path";
import sharp from "sharp";

import { getDrop, setDrop } from "./drops.js";
import { getGroupConfig } from "./groups.js";

const DROP_CHANCE_PER_MESSAGE = 0.4; // % por mensagem (ajuste)
const DROP_EXPIRE_MS = 10 * 60 * 1000;

function randPercent() {
  return Math.random() * 100;
}

async function pngToWebpSticker(buffer) {
  // 512x512 é o padrão bom pra sticker
  return sharp(buffer)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toBuffer();
}

export async function maybeDropChest({ sock, msg }) {
  const from = msg.key.remoteJid;

  if (!from?.endsWith("@g.us")) return;

  const cfg = getGroupConfig(from);
  if (cfg?.onlyAdmins) return;

  const now = Date.now();
  const drop = getDrop(from);

  if (drop.active && drop.expiresAt && drop.expiresAt <= now) {
    setDrop(from, { active: false, droppedAt: 0, expiresAt: 0, openedBy: null, openedAt: 0, messageId: null });
  }

  const drop2 = getDrop(from);
  if (drop2.active) return;

  if (randPercent() > DROP_CHANCE_PER_MESSAGE) return;

  setDrop(from, {
    active: true,
    droppedAt: now,
    expiresAt: now + DROP_EXPIRE_MS,
    openedBy: null,
    openedAt: 0,
    messageId: msg.key?.id || null,
  });

  // ✅ caminho correto (raiz do projeto)
  const stickerPath = path.join(process.cwd(), "assets", "images", "bau.png");

  if (!fs.existsSync(stickerPath)) {
    const prefix = cfg?.prefix || "!";
    return sock.sendMessage(from, {
      text:
        `🎁 *Um baú misterioso apareceu no grupo!*\n` +
        `⚡ O primeiro que digitar *${prefix}abrir* abre!\n` +
        `⏳ Expira em 10 minutos.`,
    });
  }

  const pngBuffer = fs.readFileSync(stickerPath);
  const webpBuffer = await pngToWebpSticker(pngBuffer);

  // ✅ envia como sticker (webp)
  await sock.sendMessage(from, { sticker: webpBuffer });
}