export async function simulateTyping(sock, jid, time = 1200) {
    try {
        await sock.sendPresenceUpdate("composing", jid)
        await new Promise(resolve => setTimeout(resolve, time))
        await sock.sendPresenceUpdate("paused", jid)
    } catch (err) {
        console.error("Erro simulateTyping:", err)
    }
}
