import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/lucky.json");

/**
 * =========================
 * CONFIG (edite aqui fácil)
 * =========================
 */
const ALLOW_NEGATIVE_BALANCE = true; // devedor pode ficar negativo

function loadDB() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function formatNumber(valor) {
  return valor.toLocaleString("pt-BR");
}

function formatMoney(valor) {
  const abs = Math.abs(valor);
  const s =
    abs >= 1_000_000_000 ? `${formatNumber(abs)}B` :
    abs >= 1_000_000 ? `${formatNumber(abs)}M` :
    abs >= 1_000 ? `${formatNumber(abs)}K` :
    formatNumber(abs);
  return valor < 0 ? `-${s}` : s;
}

function ensureUser(db, groupId, userId) {
  if (!db[groupId]) db[groupId] = {};
  if (!db[groupId][userId]) db[groupId][userId] = { money: 0, debts: {} };

  const u = db[groupId][userId];
  if (typeof u.money !== "number") u.money = 0;
  if (!u.debts) u.debts = {};
  return u;
}

function getTargetFromMentionOrReply(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;

  // prioridade: menção
  const mentioned = ctx?.mentionedJid;
  if (mentioned?.length) return mentioned[0];

  // fallback: resposta (reply)
  const participant = ctx?.participant;
  if (participant) return participant;

  return null;
}

function parseAmountArg(args) {
  // args no seu handler geralmente já vem sem o comando.
  // Ex:
  // !cobrar @user        -> args = ["@user"]  (não é número!)
  // !cobrar @user 100    -> args = ["@user","100"]
  // !cobrar 100 @user    -> args = ["100","@user"] (vamos suportar também)

  if (!Array.isArray(args) || args.length === 0) return null;

  // pega o primeiro token numérico que aparecer
  for (const token of args) {
    const n = Number(token);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export default {
  name: "cobrar",
  aliases: ["cobranca", "cobrança"],
  description: "Cobra dívidas de um usuário. Se ele não tiver, fica negativo.",
  category: "fun",

  /**
   * Uso:
   * !cobrar @user            -> cobra TUDO que ele deve a você
   * !cobrar @user 100        -> cobra 100 (ou o máximo da dívida)
   * (também funciona respondendo a mensagem do devedor)
   */
  async run({ sock, msg, args }) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "Usuário";

    try {
      const target = getTargetFromMentionOrReply(msg);

      if (!target) {
        await sock.sendMessage(
          from,
          { text: "👤 Marque um usuário ou responda a mensagem dele.\nEx: *!cobrar @user* ou *!cobrar @user 100*" },
          { quoted: msg }
        );
        return;
      }

      if (target === sender) {
        await sock.sendMessage(from, { text: "🚫 Você não pode cobrar a si mesmo." }, { quoted: msg });
        return;
      }

      // valor opcional (se não tiver número, cobra tudo)
      const valorArg = parseAmountArg(args); // null = cobra tudo

      const db = loadDB();
      const cobrador = ensureUser(db, from, sender);
      const devedor = ensureUser(db, from, target);

      const divida = Number(devedor.debts?.[sender] || 0);

      if (!divida || divida <= 0) {
        await sock.sendMessage(
          from,
          {
            text: `✅ *${pushName}*, @${target.split("@")[0]} não tem dívida com você.`,
            mentions: [target]
          },
          { quoted: msg }
        );
        return;
      }

      const cobrarValor = valorArg ? Math.min(valorArg, divida) : divida;

      // transfere (mesmo sem saldo do devedor)
      cobrador.money += cobrarValor;

      if (ALLOW_NEGATIVE_BALANCE) {
        devedor.money -= cobrarValor; // pode ficar negativo
      } else {
        const pago = Math.min(devedor.money, cobrarValor);
        devedor.money -= pago;
        cobrador.money += pago;
      }

      // reduz dívida
      devedor.debts[sender] = divida - cobrarValor;
      if (devedor.debts[sender] <= 0) delete devedor.debts[sender];

      saveDB(db);

      const resto = Number(devedor.debts?.[sender] || 0);
      const msgDivida = resto > 0
        ? `📌 Dívida restante: *${formatMoney(resto)} fyne coins*`
        : `✅ Dívida quitada!`;

      await sock.sendMessage(
        from,
        {
          text:
            `💼 *${pushName}* cobrou *${formatMoney(cobrarValor)} fyne coins* de @${target.split("@")[0]}.\n` +
            `💰 Seu saldo: *${formatMoney(cobrador.money)} fyne coins*\n` +
            msgDivida,
          mentions: [target]
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error("Erro no comando cobrar:", err);
      await sock.sendMessage(from, { text: "❌ Ocorreu um erro ao executar o comando cobrar." }, { quoted: msg });
    }
  }
};
