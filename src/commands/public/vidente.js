export default async function handler({ sock, msg, args, groupJid }) {
  const target = groupJid || msg.key.remoteJid;
  if (args.length === 0) {
    return sock.sendMessage(target, { text: "🔮 Por favor, faça uma pergunta para a vidente (ex: !vidente eu vou ser rico?)" }, { quoted: msg });
  }

  const respostas = [
    "Sim, com certeza!",
    "Não conte com isso.",
    "Talvez o destino esteja a seu favor.",
    "As estrelas dizem que não.",
    "Pergunte novamente mais tarde.",
    "É um mistério até para mim.",
    "Grandes chances de acontecer!",
    "Definitivamente não.",
    "Sim, mas cuidado com as consequências.",
    "A resposta está dentro de você."
  ];

  const resposta = respostas[Math.floor(Math.random() * respostas.length)];
  const pergunta = args.join(' ');
  const texto = `🔮 *Vidente Online*\n\n❓ *Pergunta:* ${pergunta}\n✨ *Resposta:* ${resposta}`;

  await sock.sendMessage(target, { text: texto }, { quoted: msg });
}