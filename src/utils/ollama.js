// src/utils/ollama.js - Gerencia o gatilho de IA

import { askOllama } from "../features/ai/ollama.js";
import { getBotConfig } from "../config/botConfig.js";
import { buildOllamaHistory, addInteraction, rememberUserName } from "./aiMemory.js";

function getTextFromMsg(msg) {
  return (
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    ""
  ).trim();
}

/**
 * Extrai prompt quando começa com:
 * "Bot ..." ou "Garth ..."
 *
 * Exemplos válidos:
 * - Bot oi
 * - bot: me ajuda
 * - Garth, cria um comando
 * - garth - faz isso
 */
function extractPromptByPrefix(text) {
  const t = String(text || "").trim();
  if (!t) return "";

  const re = /^(bot|garth)\b[\s:,\-–—]*([\s\S]+)$/i;
  const match = t.match(re);
  if (!match) return "";

  return (match[2] || "").trim();
}

function extractDevPromptByPrefix(text) {
  const t = String(text || "").trim();
  if (!t) return "";

  const re = /^(gar|garth\s+dev|garth\s+criador)\b[\s:,\-–—]*([\s\S]+)$/i;
  const match = t.match(re);
  if (!match) return "";

  return (match[2] || "").trim();
}

/**
 * Normaliza JID removendo sufixo (@lid, @s.whatsapp.net etc)
 */
function jidBase(jid = "") {
  return String(jid).split("@")[0];
}

function escapeRegex(s = "") {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Manipula gatilho de IA.
 * Retorna true se tratou a mensagem (respondeu ou erro),
 * false se não aplicável.
 *
 * Regra:
 * - Se groupConfig.ai === true => qualquer um pode usar
 * - Se groupConfig.ai !== true => somente o criador pode usar
 */
export async function handleAiTrigger({ sock, msg, groupJid, groupConfig, sender, pushName }) {
  const botConfig = getBotConfig();
  const creatorJid = botConfig?.botCreator || "";
  const isCreator = creatorJid && jidBase(sender) === jidBase(creatorJid);

  const rawText = getTextFromMsg(msg);
  const devPrompt = extractDevPromptByPrefix(rawText);

  // 🛡️ ROTA DA I.A. DO CRIADOR
  if (devPrompt && isCreator) {
    try {
      await sock.sendPresenceUpdate("composing", groupJid);
      
      const { runCreatorAgent } = await import("../features/ai/creatorAi.js");
      const { getCreatorHistory, addCreatorMessage } = await import("./creatorAiMemory.js");

      const history = getCreatorHistory();
      const isGroup = groupJid.endsWith("@g.us");

      const answer = await runCreatorAgent({
        prompt: devPrompt,
        history,
        isGroup,
        groupJid,
        sock
      });

      if (answer) {
        addCreatorMessage("user", devPrompt);
        addCreatorMessage("assistant", answer);

        await sock.sendMessage(groupJid, { text: answer }, { quoted: msg });
        return true;
      }
      return false;
    } catch (err) {
      console.error("[IA Criador] ❌ Erro:", err?.message || err);
      await sock.sendMessage(
        groupJid,
        { text: `⚠️ Erro na I.A. dev: ${err.message}` },
        { quoted: msg }
      );
      return true;
    }
  }

  // ✅ IA desligada no grupo? só o criador pode usar (I.A. padrão)
  if (groupConfig?.ai !== true && !isCreator) return false;

  const prompt = extractPromptByPrefix(rawText);

  // Precisa ter argumento após o gatilho
  if (!prompt || prompt.length < 2) return false;

  try {
    await sock.sendPresenceUpdate("composing", groupJid);

    // Nome com fallback
    const userDisplayName = String(pushName || msg?.pushName || "").trim();

    // Atualiza nome na memória
    rememberUserName(groupJid, sender, userDisplayName);

    // Monta histórico (shared + individual)
    const history = buildOllamaHistory({ groupJid, userJid: sender });

    // Prompt reforçado
    const finalPrompt = `
Nome do usuário: ${userDisplayName || "Desconhecido"}
É o criador do bot? ${isCreator ? "SIM, É O CRIADOR JOÃO TANK." : "Não."}

Mensagem do usuário:
${prompt}
`.trim();

    const answer = await askOllama({ prompt: finalPrompt, history });

    if (answer) {
      // Salva interação completa
      addInteraction({
        groupJid,
        userJid: sender,
        userName: userDisplayName,
        userPrompt: prompt, // salva o prompt limpo (sem "Nome do usuário:")
        botReply: answer,
      });

      // Proteção contra texto gigante
      let safeAnswer =
        answer.length > 4000
          ? answer.slice(0, 4000) + "\n\n[Resposta truncada]"
          : answer;

      // Garantir que mencione o nome no início
      if (userDisplayName) {
        const startsWithName = new RegExp(`^${escapeRegex(userDisplayName)}\\b`, "i").test(safeAnswer);
        if (!startsWithName) safeAnswer = `${userDisplayName}, ${safeAnswer}`;
      }

      await sock.sendMessage(groupJid, { text: safeAnswer }, { quoted: msg });
      return true;
    }

    console.log(`[IA] ⚠️ Resposta vazia do modelo`);
    return false;
  } catch (err) {
    console.error("[IA] ❌ Erro:", err?.message || err);

    await sock.sendMessage(
      groupJid,
      { text: `⚠️ Erro. chama o Tank` },
      { quoted: msg }
    );

    return true;
  }
}