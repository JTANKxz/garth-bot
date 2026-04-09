import { getGroupConfig, isGroupVip, setGroupAi } from "../../utils/groups.js";
import { getBotConfig } from "../../config/botConfig.js";

export default {
  name: "ia",
  aliases: ["setia", "ai"],
  description: "Ativar/desativar a IA no grupo",
  usage: "[on/off]",
  category: "creator",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    // ✅ sender correto
    const sender = msg.key.participant || msg.key.remoteJid;

    const gpConfig = getGroupConfig(jid);
    const botConfig = getBotConfig();

    // ✅ isCreator correto (normaliza @lid / @s.whatsapp.net)
    const jidBase = (x = "") => String(x).split("@")[0];
    const isCreator = jidBase(sender) === jidBase(botConfig.botCreator);

    const prefix = gpConfig.prefix || "!";
    const isGroup = jid.endsWith("@g.us");
    const groupVip = isGroupVip(jid);

    // 🔒 Regra VIP: só VIP ou criador pode usar
    if (isGroup && !groupVip && !isCreator) {
      return sock.sendMessage(
        jid,
        { text: `❌ Este comando é exclusivo para grupos VIP` },
        { quoted: msg }
      );
    }

    if (!args[0]) {
      return sock.sendMessage(
        jid,
        {
          text: `🤖 *IA do Grupo*
                
Status atual: ${gpConfig.ai === true ? "✅ ATIVADA" : "❌ DESATIVADA"}

Uso: ${prefix}ia [on/off]

Exemplos:
${prefix}ia on    → Ativar IA
${prefix}ia off   → Desativar IA`,
        },
        { quoted: msg }
      );
    }

    const command = String(args[0]).toLowerCase();

    if (!["on", "off", "1", "0", "sim", "nao", "true", "false"].includes(command)) {
      return sock.sendMessage(
        jid,
        { text: `❌ Use: ${prefix}ia on (ou) ${prefix}ia off` },
        { quoted: msg }
      );
    }

    const shouldEnable = ["on", "1", "sim", "true"].includes(command);

    // Não fazer nada se já está neste estado
    if ((shouldEnable && gpConfig.ai === true) || (!shouldEnable && gpConfig.ai === false)) {
      const status = shouldEnable ? "ativada" : "desativada";
      return sock.sendMessage(
        jid,
        { text: `ℹ️ A IA já está ${status} neste grupo` },
        { quoted: msg }
      );
    }

    // ✅ Atualiza a config
    setGroupAi(jid, shouldEnable);

    const newStatus = shouldEnable ? "✅ ATIVADA" : "❌ DESATIVADA";

    return sock.sendMessage(
      jid,
      {
        text: `🤖 IA ${newStatus}

Agora você pode usar:
→ Bot [sua mensagem]
→ Garth [sua mensagem]`,
      },
      { quoted: msg }
    );
  },
};