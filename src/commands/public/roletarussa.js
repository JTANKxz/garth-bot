/**
 * Normaliza um JID para o formato correto
 * Converte @lid para :1@lid se necessário
 */
function normalizeJid(jid) {
  if (!jid) return null;
  
  // Se já tem :1@lid, retorna
  if (jid.includes(":1@lid")) return jid;
  
  // Se tem @lid sem :1, adiciona :1
  if (jid.includes("@lid") && !jid.includes(":")) {
    const number = jid.replace("@lid", "").replace(":1", "");
    return `${number}:1@lid`;
  }
  
  return jid;
}

export default {
    name: 'roletarussa',
    description: 'Roleta russa: se morrer, é removido do grupo',
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid
        if (!from.endsWith('@g.us')) return

        let sender = msg.key.participant || from
        
        // Normaliza o sender para garantir formato correto
        sender = normalizeJid(sender);
        
        const pushName = msg.pushName || "Usuário"

        const resultado = Math.floor(Math.random() * 6) + 1

        if (resultado === 1) {
            await sock.sendMessage(from, { text: `💥 *${pushName} puxou o gatilho... e morreu!* 💀` }, { quoted: msg })

            try {
                await sock.groupParticipantsUpdate(from, [sender], "remove")
            } catch (e) {
                await sock.sendMessage(from, { text: `❌ Não consegui remover ${pushName}. Talvez eu não seja admin.` }, { quoted: msg })
            }
        } else {
            await sock.sendMessage(from, { text: `*${pushName} puxou o gatilho... e sobreviveu!*` }, { quoted: msg })
        }
    }
}
