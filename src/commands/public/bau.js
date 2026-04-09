import fs from "fs";
import path from "path";
import { getDrop, clearDrop } from "../../utils/drops.js";
import { getGroupConfig, updateGroupConfig } from "../../utils/groups.js";

const dbLuckyPath = path.resolve("src/database/lucky.json");

/**
 * =========================
 * CONFIG (edite aqui fácil)
 * =========================
 */
const TRAP_LOSS_MIN = 10;
const TRAP_LOSS_MAX = 100;

const PRIZE_GAIN_MIN = 10;
const PRIZE_GAIN_MAX = 100;

// chance de cair em armadilha (0 a 100)
const TRAP_CHANCE = 20;

// dentro da armadilha, chance de ser MUTE (o resto vira perda de cash)
const TRAP_MUTE_CHANCE = 35; // %
const TRAP_MUTE_MIN_MINUTES = 1;
const TRAP_MUTE_MAX_MINUTES = 5;

/**
 * =========================
 * Helpers
 * =========================
 */
function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(filePath));
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function ensureLuckyUser(db, groupId, userId) {
  if (!db[groupId]) db[groupId] = {};
  if (!db[groupId][userId]) {
    db[groupId][userId] = {
      money: 0,
      items: {},
      lastroubo: 0,
      jailUntil: 0,
      jailStrikes: 0,
      bailCost: 0,
      lastJailAt: 0
    };
  }
  const u = db[groupId][userId];
  if (typeof u.money !== "number") u.money = 0;
  if (!u.items) u.items = {};
  return u;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatNumber(valor) {
  return valor.toLocaleString("pt-BR");
}

function formatMoney(valor) {
  if (valor >= 1_000_000_000) return `${formatNumber(valor)}B`;
  if (valor >= 1_000_000) return `${formatNumber(valor)}M`;
  if (valor >= 1_000) return `${formatNumber(valor)}K`;
  return formatNumber(valor);
}

export default {
  name: "abrir",
  aliases: ["bau", "baú"],
  description: "Abra o baú misterioso",
  category: "fun",
  showInMenu: false,

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuário";
    const now = Date.now();

    try {
      if (!from?.endsWith("@g.us")) {
        await sock.sendMessage(
          from,
          { text: "❌ Esse comando só funciona em grupos." },
          { quoted: msg }
        );
        return;
      }

      const drop = getDrop(from);

      // ❌ não tem baú
      if (!drop.active) {
        await sock.sendMessage(
          from,
          { text: "📦 Não há nenhum baú ativo no momento." },
          { quoted: msg }
        );
        return;
      }

      // ⌛ expirado
      if (drop.expiresAt && drop.expiresAt <= now) {
        clearDrop(from);
        await sock.sendMessage(
          from,
          { text: "⌛ O baú expirou e desapareceu." },
          { quoted: msg }
        );
        return;
      }

      // 🔒 trava imediatamente (primeiro que digitou ganha)
      clearDrop(from);

      const luckyDB = loadJSON(dbLuckyPath);
      const user = ensureLuckyUser(luckyDB, from, sender);

      const roll = randInt(0, 99);
      const isTrap = roll < TRAP_CHANCE;

      let text = `🎁 *${pushName}* abriu o baú misterioso!\n\n`;

      if (isTrap) {
        const trapRoll = randInt(0, 99);

        // ✅ ARMADILHA: MUTE (persistente no groups.json)
        if (trapRoll < TRAP_MUTE_CHANCE) {
          const minutes = randInt(TRAP_MUTE_MIN_MINUTES, TRAP_MUTE_MAX_MINUTES);

          const gConfig = getGroupConfig(from);
          if (!gConfig.muteds) gConfig.muteds = {};

          const previous = gConfig.muteds[sender] || { deletes: 0 };
          const expiresAt = Date.now() + minutes * 60 * 1000;

          gConfig.muteds[sender] = {
            muted: true,
            expiresAt,
            deletes: previous.deletes || 0
          };

          updateGroupConfig(from, { muteds: gConfig.muteds });

          // agenda desmute (igual teu comando mute)
          setTimeout(async () => {
            try {
              const updated = getGroupConfig(from);
              if (!updated?.muteds?.[sender]) return;

              // só desmuta se já passou do tempo (segurança)
              const exp = updated.muteds[sender]?.expiresAt;
              if (exp && Date.now() < exp) return;

              delete updated.muteds[sender];
              updateGroupConfig(from, { muteds: updated.muteds });

              // ❗ você pediu pra não mandar mensagem de "desmutado" aqui
            } catch (e) {
              console.error("Erro ao desmutar após armadilha:", e);
            }
          }, minutes * 60 * 1000);

          text += `💥 *ARMADILHA!* Você caiu numa bomba de silêncio 🤐\n`;
          text += `🔇 Você foi *mutado por ${minutes} minuto(s)*.`;

          saveJSON(dbLuckyPath, luckyDB);
          await sock.sendMessage(from, { text }, { quoted: msg });
          return;
        }

        // ARMADILHA: perde cash
        const loss = randInt(TRAP_LOSS_MIN, TRAP_LOSS_MAX);
        user.money = Math.max(0, user.money - loss);

        text += `💥 *ARMADILHA!* Você perdeu *${formatMoney(loss)} fyne coins* 😬`;

        saveJSON(dbLuckyPath, luckyDB);
        await sock.sendMessage(from, { text }, { quoted: msg });
        return;
      }

      // PRÊMIO
      const gain = randInt(PRIZE_GAIN_MIN, PRIZE_GAIN_MAX);
      user.money += gain;

      text += `✨ *PRÊMIO!* Você ganhou *${formatMoney(gain)} fyne coins* 🎉`;

      saveJSON(dbLuckyPath, luckyDB);
      await sock.sendMessage(from, { text }, { quoted: msg });

    } catch (err) {
      console.error("Erro no comando abrir:", err);
      await sock.sendMessage(
        from,
        { text: "❌ Ocorreu um erro ao abrir o baú." },
        { quoted: msg }
      );
    }
  }
};