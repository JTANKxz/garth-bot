// src/utils/carroForte.js
// Evento global do Carro-Forte: aparece aleatoriamente e os primeiros 3 podem saquear.

import fs from "fs";
import path from "path";
import { getGroupConfig } from "./groups.js";
import { isRpgEnabled } from "./rpg.js";
import { getBotConfig } from "../config/botConfig.js";

const dbLuckyPath = path.resolve("src/database/lucky.json");
const activePath  = path.resolve("src/database/carroForte.json");

// 0.3% de chance por mensagem de aparecer
const SPAWN_CHANCE  = 0.3;
// Expira em 5 minutos
const EXPIRE_MS     = 5 * 60 * 1000;
// Máximo de participantes que podem sacar
const MAX_PLAYERS   = 3;
// ROCAM chega 45% das vezes
const ROCAM_CHANCE  = 45;
// Recompensas base
const MIN_REWARD    = 500;
const MAX_REWARD    = 1000;
// Multa da ROCAM
const FINE_MIN      = 200;
const FINE_MAX      = 500;

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
  try { return JSON.parse(fs.readFileSync(filePath)); } catch { return {}; }
}
function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function formatMoney(v) { return v.toLocaleString("pt-BR"); }

// Verifica se o carro deve aparecer baseado em mensagem aleatória
export async function maybeSpawnCarroForte({ sock, msg }) {
  const from = msg.key.remoteJid;

  if (!from?.endsWith("@g.us")) return;

  // Trava 1: grupo autorizado?
  const botConfig = getBotConfig();
  if (!botConfig.allowedGroups.includes(from)) return;

  // Trava 2: modo onlyAdmins?
  const cfg = getGroupConfig(from);
  if (!isRpgEnabled(cfg)) {
    const activeEvents = loadJSON(activePath);
    if (activeEvents[from]) {
      delete activeEvents[from];
      saveJSON(activePath, activeEvents);
    }
    return;
  }
  if (cfg?.onlyAdmins) return;

  // Trava 3: aluguel expirado?
  if (cfg?.authExpiresAt && Date.now() >= cfg.authExpiresAt) return;

  // Verifica se já tem evento ativo
  const activeEvents = loadJSON(activePath);
  const event = activeEvents[from];
  const now   = Date.now();

  if (event?.active && event.expiresAt > now) return; // já tem um evento ativo

  // Limpa evento expirado
  if (event?.active && event.expiresAt <= now) {
    delete activeEvents[from];
    saveJSON(activePath, activeEvents);
  }

  // Rola a chance de aparecer
  if (Math.random() * 100 > SPAWN_CHANCE) return;

  // Cria o evento
  activeEvents[from] = {
    active: true,
    spawnedAt: now,
    expiresAt: now + EXPIRE_MS,
    participants: []
  };
  saveJSON(activePath, activeEvents);

  const prefix = cfg?.prefix || "!";
  const text =
    `💰 *ALERTA — CARRO-FORTE NA ÁREA!*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🚛 O carro-forte da prefeitura pifou na rodovia!\n` +
    `O dinheiro tá espalhado pela pista...\n\n` +
    `⚡ Os primeiros *${MAX_PLAYERS}* que digitarem *${prefix}saquear* ficam com a grana!\n` +
    `⚠️ Mas cuidado — a ROCAM pode aparecer!\n` +
    `⏳ Expira em *5 minutos*.`;

  await sock.sendMessage(from, { text });
}

// Handler do !saquear
export async function handleSaquear({ sock, msg }) {
  const from   = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const now    = Date.now();

  if (!from?.endsWith("@g.us")) return;

  const activeEvents = loadJSON(activePath);
  const event        = activeEvents[from];

  if (!event?.active || event.expiresAt <= now) {
    return sock.sendMessage(from, { text: `🚛 Não tem nenhum carro-forte disponível agora.` }, { quoted: msg });
  }

  // Já participou?
  if (event.participants.includes(sender)) {
    return sock.sendMessage(from, { text: `😅 Você já saqueou o carro-forte!` }, { quoted: msg });
  }

  // Vagas esgotadas?
  if (event.participants.length >= MAX_PLAYERS) {
    return sock.sendMessage(from, { text: `😤 O dinheiro já acabou! Chegou tarde demais.` }, { quoted: msg });
  }

  event.participants.push(sender);

  // Rola ROCAM
  const rocam = Math.random() * 100 < ROCAM_CHANCE;

  const luckyDB = loadJSON(dbLuckyPath);
  if (!luckyDB[from]) luckyDB[from] = {};
  if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };

  let text;

  if (rocam) {
    const multa = randInt(FINE_MIN, FINE_MAX);
    luckyDB[from][sender].money = Math.max(0, (luckyDB[from][sender].money || 0) - multa);
    luckyDB[from][sender].jailUntil = now + 60 * 60 * 1000; // 1h de prisão

    text =
      `🚔 *ROCAM CHEGOU!*\n\n` +
      `@${sender.split("@")[0]} tentou saquear o carro-forte mas a ROCAM estava de campana!\n\n` +
      `🔒 Você foi preso por *1 hora* e levou uma multa de *${formatMoney(multa)} fyne coins*!`;
  } else {
    const reward = randInt(MIN_REWARD, MAX_REWARD);
    luckyDB[from][sender].money = (luckyDB[from][sender].money || 0) + reward;

    text =
      `💵 *SAQUE REALIZADO!*\n\n` +
      `@${sender.split("@")[0]} correu rápido e pegou *${formatMoney(reward)} fyne coins* do carro-forte!\n\n` +
      `_${event.participants.length}/${MAX_PLAYERS} vagas preenchidas._`;
  }

  // Fecha o evento se chegou ao limite
  if (event.participants.length >= MAX_PLAYERS) {
    event.active = false;
  }

  saveJSON(activePath, activeEvents);
  saveJSON(dbLuckyPath, luckyDB);

  await sock.sendMessage(from, { text, mentions: [sender] }, { quoted: msg });
}
