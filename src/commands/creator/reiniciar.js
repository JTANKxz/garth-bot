export default {
  name: "reiniciar",
  aliases: ["restart", "rebootbot"],
  description: "Reinicia o processo do bot",
  category: "creator",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;

    await sock.sendMessage(from, {
      text: "Reiniciando o bot. Se o servidor estiver usando PM2, Docker ou outro gerenciador, ele deve subir novamente em alguns segundos."
    }, { quoted: msg });

    setTimeout(() => {
      process.exit(0);
    }, 1200);
  }
};
