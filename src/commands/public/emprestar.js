import { createLoanRequest } from "../../utils/loanRequests.js";
import { parseMentionAndAmount } from "../../utils/commandArgs.js";

export default {
  name: "emprestimo",
  aliases: ["emprestar"],
  description: "Pede emprestimo para outro jogador",
  usage: "emprestimo 5000 @user ou emprestimo @user 5000",
  category: "fun",

  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const borrowerId = msg.key.participant || msg.key.remoteJid;
    const borrowerName = msg.pushName || "Usuario";
    const { target: lenderId, amount } = parseMentionAndAmount(msg, args);

    if (!amount || amount <= 0) {
      return sock.sendMessage(from, { text: "Use: emprestimo 5000 @user ou emprestimo @user 5000" }, { quoted: msg });
    }

    if (!lenderId) {
      return sock.sendMessage(from, { text: "Marque um usuario para pedir emprestimo." }, { quoted: msg });
    }

    if (lenderId === borrowerId) {
      return sock.sendMessage(from, { text: "Voce nao pode pedir emprestimo para si mesmo." }, { quoted: msg });
    }

    await createLoanRequest({
      sock,
      msg,
      groupId: from,
      borrowerId,
      borrowerName,
      lenderId,
      amount,
      ttlSeconds: 60
    });
  }
};
