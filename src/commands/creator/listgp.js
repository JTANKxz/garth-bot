export default {
  name: "groups",
  aliases: ["grupos", "listgroups"],
  description: "Lista todos os grupos que o bot participa",
  category: "owner",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;

    try {
      await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

      const groups = await sock.groupFetchAllParticipating();

      const lista = Object.values(groups);

      if (!lista.length) {
        await sock.sendMessage(
          from,
          { text: "🤖 O bot não está participando de nenhum grupo." },
          { quoted: msg }
        );
        return;
      }

      let texto = `📋 *Grupos que eu participo (${lista.length}):*\n\n`;

      lista.forEach((group, index) => {
        texto +=
          `*${index + 1}.* ${group.subject}\n` +
          `🆔 ID: \`${group.id}\`\n\n`;
      });

      await sock.sendMessage(
        from,
        { text: texto },
        { quoted: msg }
      );

      await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (err) {
      console.error("Erro ao listar grupos:", err);

      await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
      await sock.sendMessage(
        from,
        { text: "❌ Ocorreu um erro ao listar os grupos." },
        { quoted: msg }
      );
    }
  },
};