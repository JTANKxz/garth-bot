export function getMentionedOrQuoted(msg) {
  const context = msg.message?.extendedTextMessage?.contextInfo;
  return context?.mentionedJid?.[0] || context?.participant || null;
}

export function parseMentionAndAmount(msg, args) {
  const target = getMentionedOrQuoted(msg);
  const amountArg = args.find(arg => /^\d+([.,]\d+)?$/.test(arg));
  const amount = Number(String(amountArg || "").replace(",", "."));

  return {
    target,
    amount: Number.isFinite(amount) ? amount : 0
  };
}
