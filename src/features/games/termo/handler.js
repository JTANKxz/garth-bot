/**
 * src/features/games/termo/handler.js
 * Listener para interceptar tentativas do jogo Termo no messageHandler.
 */

import { processGuess, getGameStatus } from "./index.js";
import { hasActiveGame } from "./storage.js";
import { normalize } from "./words.js";

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
    const historyLines = result.session.results.join("\n");
    await sock.sendMessage(jid, {
      text:
        `🎉 *Parabéns! Você acertou!*\n\n` +
        `${historyLines}\n\n` +
        `✅ Palavra: *${result.word}*\n` +
        `🎯 Tentativas usadas: *${result.attemptsUsed}/${result.session.maxAttempts}*`
    }, { quoted: msg });
    return true;
  }

  // Derrota
  if (result.lost) {
    const historyLines = result.session.results.join("\n");
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
  const historyLines = result.session.results.join("\n");
  await sock.sendMessage(jid, {
    text:
      `${historyLines}\n\n` +
      `📝 Tentativas restantes: *${result.remaining}*`
  }, { quoted: msg });

  return true;
}
