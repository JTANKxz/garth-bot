import fs from "fs";
import path from "path";

const dbPath = path.resolve("src/database/lucky.json");

function loadDB() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
  return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function formatNumber(valor) {
  return Number(valor).toLocaleString("pt-BR");
}

function formatMoney(valor) {
  const v = Number(valor) || 0;
  if (v >= 1_000_000_000) return `${formatNumber(v)}B`;
  if (v >= 1_000_000) return `${formatNumber(v)}M`;
  if (v >= 1_000) return `${formatNumber(v)}K`;
  return formatNumber(v);
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ✅ regra: se tem QUALQUER dívida, não pode emprestar
function hasAnyDebt(user) {
  if (!user?.debts) return false;
  return Object.values(user.debts).some((v) => Number(v) > 0);
}

/**
 * borrower = quem pediu (digitou o comando)
 * lender = quem vai emprestar (vai responder 1/2)
 */
export async function createLoanRequest({
  sock,
  msg,
  groupId,
  borrowerId,
  borrowerName,
  lenderId,
  amount,
  ttlSeconds = 60,
}) {
  const db = loadDB();
  if (!db[groupId]) db[groupId] = {};
  if (!db[groupId][borrowerId]) db[groupId][borrowerId] = { money: 0, debts: {} };
  if (!db[groupId][lenderId]) db[groupId][lenderId] = { money: 0, debts: {} };

  const lender = db[groupId][lenderId];

  if (!amount || amount <= 0) {
    await sock.sendMessage(groupId, { text: "💰 Informe um valor válido." }, { quoted: msg });
    return null;
  }

  // ❌ quem já deve, não pode emprestar
  if (hasAnyDebt(lender)) {
    await sock.sendMessage(
      groupId,
      {
        text: `🚫 @${lenderId.split("@")[0]} não pode emprestar porque já tem dívidas pendentes.`,
        mentions: [lenderId],
      },
      { quoted: msg }
    );
    return null;
  }

  // anti-spam: 1 pedido pendente por (borrower -> lender)
  if (!db[groupId]._pendingLoans) db[groupId]._pendingLoans = {};
  const existing = Object.values(db[groupId]._pendingLoans).find(
    (p) => p?.status === "pending" && p?.borrowerId === borrowerId && p?.lenderId === lenderId
  );
  if (existing) {
    await sock.sendMessage(
      groupId,
      {
        text: `⏳ Já existe um pedido pendente para @${lenderId.split("@")[0]}. Aguarde ele responder *1* ou *2*.`,
        mentions: [lenderId],
      },
      { quoted: msg }
    );
    return null;
  }

  const id = makeId();
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;

  db[groupId]._pendingLoans[id] = {
    id,
    status: "pending",
    createdAt: now,
    expiresAt,
    borrowerId,
    borrowerName: borrowerName || "Usuário",
    lenderId,
    amount,
  };

  saveDB(db);

  await sock.sendMessage(
    groupId,
    {
      text:
        `🤝 *Pedido de Empréstimo*\n\n` +
        `> *Quem pediu:* @${borrowerId.split("@")[0]}\n` +
        `> *Quem empresta:* @${lenderId.split("@")[0]}\n` +
        `> *Valor:* ${formatMoney(amount)} fyne coins\n\n` +
        `@${lenderId.split("@")[0]}, responda:\n` +
        `> *1* para *ACEITAR*\n` +
        `> *2* para *RECUSAR*\n\n` +
        `⏱️ Expira em ${ttlSeconds}s`,
      mentions: [borrowerId, lenderId],
    },
    { quoted: msg }
  );

  return id;
}

/**
 * Quem responde 1/2 é o LENDER (credor).
 * Retorna true se consumiu a mensagem.
 */
export async function handleLoanDecision({ sock, msg }) {
  const groupId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  const choice = text.trim();
  if (choice !== "1" && choice !== "2") return false;

  const db = loadDB();
  const group = db[groupId];
  if (!group?._pendingLoans) return false;

  // procura pedido pendente onde o sender é o lender
  const pending = Object.values(group._pendingLoans).find(
    (p) => p?.status === "pending" && p?.lenderId === sender
  );
  if (!pending) return false;

  // expiração
  if (Date.now() > pending.expiresAt) {
    pending.status = "expired";
    saveDB(db);

    await sock.sendMessage(
      groupId,
      {
        text: `⌛ Pedido de empréstimo expirou.`,
        mentions: [pending.borrowerId, pending.lenderId],
      },
      { quoted: msg }
    );
    return true;
  }

  // recusar
  if (choice === "2") {
    pending.status = "rejected";
    saveDB(db);

    await sock.sendMessage(
      groupId,
      {
        text:
          `❌ Empréstimo *recusado*.\n\n` +
          `> Pedido por: @${pending.borrowerId.split("@")[0]}\n` +
          `> Emprestador: @${pending.lenderId.split("@")[0]}\n` +
          `> Valor: ${formatMoney(pending.amount)} fyne coins`,
        mentions: [pending.borrowerId, pending.lenderId],
      },
      { quoted: msg }
    );
    return true;
  }

  // aceitar: garante estruturas
  if (!group[pending.lenderId]) group[pending.lenderId] = { money: 0, debts: {} };
  if (!group[pending.borrowerId]) group[pending.borrowerId] = { money: 0, debts: {} };
  if (!group[pending.borrowerId].debts) group[pending.borrowerId].debts = {};

  const lender = group[pending.lenderId];
  const borrower = group[pending.borrowerId];

  // ❌ se durante o tempo pendente o lender passou a ter dívida, não pode emprestar mais
  if (hasAnyDebt(lender)) {
    pending.status = "failed_lender_in_debt";
    saveDB(db);

    await sock.sendMessage(
      groupId,
      {
        text: `🚫 Empréstimo cancelado: @${pending.lenderId.split("@")[0]} já tem dívidas pendentes e não pode emprestar.`,
        mentions: [pending.borrowerId, pending.lenderId],
      },
      { quoted: msg }
    );
    return true;
  }

  // valida saldo
  if (lender.money < pending.amount) {
    pending.status = "failed_no_money";
    saveDB(db);

    await sock.sendMessage(
      groupId,
      {
        text:
          `❌ Não foi possível concluir: @${pending.lenderId.split("@")[0]} não tem saldo suficiente.\n` +
          `> Valor: ${formatMoney(pending.amount)} fyne coins`,
        mentions: [pending.borrowerId, pending.lenderId],
      },
      { quoted: msg }
    );
    return true;
  }

  // transação
  lender.money -= pending.amount;
  borrower.money += pending.amount;

  // dívida fica no devedor apontando para o credor
  borrower.debts[pending.lenderId] = (borrower.debts[pending.lenderId] || 0) + pending.amount;

  pending.status = "accepted";
  pending.completedAt = Date.now();

  saveDB(db);

  await sock.sendMessage(
    groupId,
    {
      text:
        `✅ Empréstimo *aceito*!\n\n` +
        `> Devedor: @${pending.borrowerId.split("@")[0]}\n` +
        `> Credor: @${pending.lenderId.split("@")[0]}\n` +
        `> Valor: ${formatMoney(pending.amount)} fyne coins\n\n` +
        `📌 Dívida registrada.`,
      mentions: [pending.borrowerId, pending.lenderId],
    },
    { quoted: msg }
  );

  return true;
}