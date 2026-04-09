import { createLoanRequest } from "../../utils/loanRequests.js";

export default {
  name: "emprestimo",
  aliases: [],
  description: "Pede empréstimo para outro jogador (ele aceita 1/2)",
  usage: "emprestimo 5000 @user",
  category: "fun",

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;

    const borrowerId = msg.key.participant || msg.key.remoteJid; // quem pediu
    const borrowerName = msg.pushName || "Usuário";

    const valor = Number(args[0]);
    if (!valor || valor <= 0) {
      return sock.sendMessage(from, { text: "💰 Use: emprestimo 5000 @user" }, { quoted: msg });
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentioned || mentioned.length === 0) {
      return sock.sendMessage(from, { text: "👤 Marque um usuário (credor) para pedir empréstimo." }, { quoted: msg });
    }

    const lenderId = mentioned[0]; // quem vai emprestar

    if (lenderId === borrowerId) {
      return sock.sendMessage(from, { text: "🚫 Você não pode pedir empréstimo para si mesmo." }, { quoted: msg });
    }

    await createLoanRequest({
      sock,
      msg,
      groupId: from,
      borrowerId,
      borrowerName,
      lenderId,
      amount: valor,
      ttlSeconds: 60,
    });
  },
};