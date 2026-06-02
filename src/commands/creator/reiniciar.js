export default {
  name: "reiniciar",
  aliases: ["restart", "rebootbot"],
  description: "Reinicia o processo do bot",
  category: "creator",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;

    await sock.sendMessage(from, {
      text: "Reiniciando o bot. O servidor vai subir em alguns segundos."
    }, { quoted: msg });

    setTimeout(() => {
      process.exit(0);
    }, 1200);
  }
};
