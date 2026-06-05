/**
 * src/features/games/termo/handler.js
 * Listener para interceptar tentativas do jogo Termo no messageHandler.
 */

import { processGuess, getGameStatus, formatTermoBoard } from "./index.js";
import { hasActiveGame } from "./storage.js";
import { normalize } from "./words.js";
import { addMoney, formatMoney } from "../../../utils/saldo.js";

/**
 * Listener do Termo. Intercepta mensagens de jogadores com sessão ativa.
 * @returns {boolean} true se interceptou a mensagem, false se não.
 */
export async function termoListener(sock, msg, text) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  // Só processa se o jogador tem um jogo ativo
  if (!hasActiveGame(jid, sender)) return false;

  const body = text.trim();
  if (!body) return false;

  // Ignora se começa com prefixo de comando (!, /, .)
  if (/^[!\/\.\#]/.test(body)) return false;

  // Ignora se não parece uma palavra de 5 letras
  const normalized = normalize(body);
  if (normalized.length !== 5 || !/^[A-Z]+$/.test(normalized)) return false;

  // Processa a tentativa
  const result = processGuess(jid, sender, body);

  if (!result.ok) {
    if (result.reason === "INVALID_LENGTH") {
      await sock.sendMessage(jid, {
        text: "❌ Palavra inválida.\nDigite uma palavra de *5 letras* válida."
      }, { quoted: msg });
      return true;
    }
    if (result.reason === "INVALID_WORD") {
      await sock.sendMessage(jid, {
        text: "❌ Palavra não encontrada no dicionário.\nDigite uma palavra de *5 letras* válida."
      }, { quoted: msg });
      return true;
    }
    return false;
  }

  // Vitória
  if (result.won) {
    // Recompensa dinâmica:
    // 1ª tentativa = 1000 fyne coins.
    // Última tentativa (6ª) = 150 fyne coins.
    // Decréscimo linear: 170 moedas por tentativa extra.
    const attemptsUsed = result.attemptsUsed || 1;
    const reward = Math.max(150, 1000 - (attemptsUsed - 1) * 170);

    addMoney(jid, sender, reward);

    // Incrementar a estatística de vitórias no Termo para as conquistas
    try {
      const { incrementStat } = await import("../../progress/progressStore.js");
      incrementStat(jid, sender, "termo_wins", 1);

      // Verificar conquistas do Termo
      const { checkAchievements } = await import("../../achievements/achievementsHandler.js");
      const pushName = msg.pushName || "";
      await checkAchievements({
        sock,
        groupId: jid,
        user: sender,
        type: "termo_win",
        quoted: msg,
        pushName
      });
    } catch (err) {
      console.error("Erro ao processar conquistas do Termo:", err);
    }

    const historyLines = formatTermoBoard(result.session);
    await sock.sendMessage(jid, {
      text:
        `🎉 *Parabéns! Você acertou!*\n\n` +
        `${historyLines}\n\n` +
        `✅ Palavra: *${result.word}*\n` +
        `🎯 Tentativas usadas: *${attemptsUsed}/${result.session.maxAttempts}*\n` +
        `💰 Recompensa: +${formatMoney(reward)}!`
    }, { quoted: msg });
    return true;
  }

  // Derrota
  if (result.lost) {
    const historyLines = formatTermoBoard(result.session);
    await sock.sendMessage(jid, {
      text:
        `💀 *Fim de jogo!*\n\n` +
        `${historyLines}\n\n` +
        `❌ A palavra era: *${result.word}*\n\n` +
        `Tente novamente amanhã!`
    }, { quoted: msg });
    return true;
  }

  // Jogo continua
  const historyLines = formatTermoBoard(result.session);
  await sock.sendMessage(jid, {
    text:
      `${historyLines}\n\n` +
      `📝 Tentativas restantes: *${result.remaining}*`
  }, { quoted: msg });

  return true;
}
