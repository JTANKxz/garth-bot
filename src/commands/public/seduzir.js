import fs from "fs";
import path from "path";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const FIG_PATH = path.resolve("assets/figs/vontad.webp");

// 🔹 Sequências de mensagens
const SEQUENCES = [
  [
    { type: "text", content: "Ei bebe de painho kk" },
    { type: "text", content: "Vem ca minha meno quenti kk" },
    { type: "sticker", path: FIG_PATH },
  ],
  [
    { type: "text", content: "To com tesao bebe kk" },
    { type: "text", content: "voce é minha preta" },
    { type: "sticker", path: FIG_PATH },
  ],
  [
    { type: "text", content: "Vagabunda mesmo kk" },
    { type: "text", content: "vou te matar kk" },
    { type: "sticker", path: FIG_PATH },
  ],
];

export default {
  name: "seduzir",
  aliases: ["flertar", "flerte"],
  description: "Seduz o usuário com mensagens e figurinhas 😘",
  category: "fun",

  async run({ sock, msg }) {
    const from = msg.key.remoteJid;

    try {
      // 🎲 Escolhe uma sequência aleatória
      const sequence = SEQUENCES[Math.floor(Math.random() * SEQUENCES.length)];

      for (let i = 0; i < sequence.length; i++) {
        const step = sequence[i];

        if (step.type === "text") {
          await sock.sendMessage(
            from,
            { text: step.content },
            i === 0 ? { quoted: msg } : {}
          );
        }

        if (step.type === "sticker") {
          if (fs.existsSync(step.path)) {
            const stickerBuffer = fs.readFileSync(step.path);
            await sock.sendMessage(from, { sticker: stickerBuffer });
          } else {
            await sock.sendMessage(from, { text: "❌ Figurinha não encontrada 😢" });
          }
        }

        // ⏱️ Delay entre mensagens (exceto após a última)
        if (i < sequence.length - 1) {
          await delay(500);
        }
      }
    } catch (err) {
      console.error("Erro no comando oi:", err);
      await sock.sendMessage(
        from,
        { text: "❌ Ocorreu um erro ao executar o comando." },
        { quoted: msg }
      );
    }
  },
};
