/**
 * src/commands/public/termo.js
 * Comando !termo — Inicia o jogo Termo (Wordle em PT-BR)
 */

import { startGame, getGameStatus, giveUp } from "../../features/games/termo/index.js";

export default {
  name: "termo",
  aliases: ["wordle"],
  description: "Jogue o Termo! Adivinhe a palavra de 5 letras (1x por dia)",
  category: "fun",

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuário";

    const option = (args[0] || "").toLowerCase();

    // ============ STATUS ============
    if (option === "status") {
      const statusRes = getGameStatus(from, sender);

      if (!statusRes.ok) {
        return sock.sendMessage(from, {
          text: "📊 Você não tem nenhum jogo de Termo ativo."
        }, { quoted: msg });
      }

      const s = statusRes.session;

      if (s.status !== "playing") {
        const statusLabel = s.status === "won" ? "✅ Vitória" : s.status === "lost" ? "❌ Derrota" : "😢 Desistiu";
        return sock.sendMessage(from, {
          text:
            `📊 *Seu jogo de hoje:*\n\n` +
            `${s.results.join("\n")}\n\n` +
            `Status: *${statusLabel}*\n` +
            `Palavra: *${s.word}*`
        }, { quoted: msg });
      }

      const historyText = s.results.length
        ? s.results.join("\n")
        : "_Nenhuma tentativa ainda_";

      return sock.sendMessage(from, {
        text:
          `📊 *Seu jogo:*\n\n` +
          `${historyText}\n\n` +
          `📝 Tentativas restantes: *${s.maxAttempts - s.attempts.length}*`
      }, { quoted: msg });
    }

    // ============ DESISTIR ============
    if (option === "desistir") {
      const giveUpRes = giveUp(from, sender);

      if (!giveUpRes.ok) {
        return sock.sendMessage(from, {
          text: "❌ Você não tem um jogo ativo para desistir."
        }, { quoted: msg });
      }

      return sock.sendMessage(from, {
        text:
          `😢 *Você desistiu!*\n\n` +
          `A palavra era: *${giveUpRes.word}*`
      }, { quoted: msg });
    }

    // ============ INICIAR JOGO ============
    const res = startGame(from, sender);

    if (!res.ok) {
      if (res.reason === "ALREADY_PLAYED") {
        return sock.sendMessage(from, {
          text:
            `⏳ *${pushName}*, você já jogou hoje!\n` +
            `Volte amanhã para um novo desafio.\n\n` +
            `💡 Use *!termo status* para ver seu resultado de hoje.`
        }, { quoted: msg });
      }

      if (res.reason === "GAME_ACTIVE") {
        return sock.sendMessage(from, {
          text:
            `🎮 *${pushName}*, você já tem um jogo ativo!\n\n` +
            `Digite uma palavra de 5 letras para tentar.\n` +
            `Use *!termo status* para ver seu progresso.\n` +
            `Use *!termo desistir* para desistir.`
        }, { quoted: msg });
      }

      return sock.sendMessage(from, {
        text: "❌ Erro ao iniciar o jogo."
      }, { quoted: msg });
    }

    await sock.sendMessage(from, {
      text:
        `🎯 *TERMO INICIADO!*\n\n` +
        `Adivinhe a palavra de *5 letras*.\n` +
        `Você tem *6 tentativas*.\n\n` +
        `🟩 = Letra correta na posição certa\n` +
        `🟨 = Letra correta na posição errada\n` +
        `⬛ = Letra não existe na palavra\n\n` +
        `Digite sua primeira palavra:`
    }, { quoted: msg });
  }
};
