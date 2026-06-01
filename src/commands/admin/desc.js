export default {
  name: "desc",
  aliases: ["descricao", "descrição", "setdesc"],
  description: "Altera a descricao do grupo",
  usage: "desc nova descricao",
  category: "admin",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const description = args.join(" ").trim();

    if (!jid.endsWith("@g.us")) return;

    if (!description) {
      return sock.sendMessage(jid, { text: "Use: desc nova descricao do grupo" }, { quoted: msg });
    }

    try {
      await sock.groupUpdateDescription(jid, description);
      return sock.sendMessage(jid, { text: "Descricao do grupo atualizada." }, { quoted: msg });
    } catch (err) {
      console.error("Erro ao alterar descricao:", err);
      return sock.sendMessage(jid, { text: "Nao consegui alterar a descricao. Veja se o bot e admin." }, { quoted: msg });
    }
  }
};
