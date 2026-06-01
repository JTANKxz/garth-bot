import {
  getQuotedMessageInfo,
  deleteQuotedMessage,
  canModerateTarget,
  warnTarget,
  banTarget,
  kickTarget
} from "../../utils/adminActions.js";

const ACTION_BY_COMMAND = {
  del: "delete",
  apagar: "delete",
  delwarn: "warn",
  delban: "ban",
  delkick: "kick"
};

export default {
  name: "del",
  aliases: ["apagar", "delwarn", "delban", "delkick"],
  description: "Deleta mensagem respondida e opcionalmente pune o autor",
  usage: "responda uma mensagem com del, delwarn, delban ou delkick",
  category: "admin",

  async run({ sock, msg, args, commandName }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const quoted = getQuotedMessageInfo(msg);
    const action = ACTION_BY_COMMAND[commandName] || ACTION_BY_COMMAND[args[0]?.toLowerCase()] || "delete";

    if (!quoted) {
      return sock.sendMessage(jid, { text: "Responda a mensagem que voce quer deletar." }, { quoted: msg });
    }

    const target = quoted.participant;
    const reason = args.join(" ").trim() || "Mensagem apagada pela administracao";

    try {
      await deleteQuotedMessage(sock, jid, quoted);

      if (action === "delete") {
        return sock.sendMessage(jid, { text: "Mensagem deletada." }, { quoted: msg });
      }

      const check = await canModerateTarget({ sock, jid, target, sender });
      if (!check.ok) {
        return sock.sendMessage(jid, { text: check.text, mentions: check.mentions }, { quoted: msg });
      }

      if (action === "warn") {
        await warnTarget(sock, jid, target, sender, reason);
        return;
      }

      if (action === "ban") {
        await banTarget(sock, jid, target);
        return sock.sendMessage(jid, {
          text: `Mensagem deletada e @${target.split("@")[0]} foi banido.`,
          mentions: [target]
        }, { quoted: msg });
      }

      if (action === "kick") {
        await kickTarget(sock, jid, target);
        return sock.sendMessage(jid, {
          text: `Mensagem deletada e @${target.split("@")[0]} foi removido e colocado na blacklist.`,
          mentions: [target]
        }, { quoted: msg });
      }
    } catch (err) {
      console.error("Erro no comando del:", err);
      return sock.sendMessage(jid, { text: "Nao consegui executar essa acao. Veja se o bot e admin." }, { quoted: msg });
    }
  }
};
