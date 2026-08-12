import { loadDatabase } from '../../features/marriage.js'

export default {
    name: "rankpar",
    aliases: ["rankcasal", "topcasal"],
    description: "Mostra o top 10 casais com mais tempo de casamento",
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid

        await sock.sendMessage(from, {
            react: {
                text: "⏳",
                key: msg.key
            }
        })

        try {
            const db = loadDatabase()
            const groupDb = db[from] || {}

            function parseBrDate(str) {
                if (!str) return null

                try {
                    const [data, hora = "00:00:00"] = str.split(", ")
                    const [dia, mes, ano] = data.split("/")

                    if (!dia || !mes || !ano) return null

                    /*
                     * O timestamp do casamento está salvo no horário
                     * de Brasília. O -03:00 evita interpretar como
                     * horário local diferente.
                     */
                    const date = new Date(
                        `${ano}-${mes}-${dia}T${hora}-03:00`
                    )

                    if (isNaN(date.getTime())) return null

                    return date
                } catch {
                    return null
                }
            }

            const casamentos = Object.values(groupDb)
                .filter(c =>
                    c &&
                    typeof c === "object" &&
                    c.requester &&
                    c.target &&
                    c.timestamp
                )
                .map(c => {
                    const casamentoDate = parseBrDate(c.timestamp)

                    return {
                        ...c,
                        casamentoDate
                    }
                })
                .filter(c => c.casamentoDate)
                .sort(
                    (a, b) =>
                        a.casamentoDate.getTime() -
                        b.casamentoDate.getTime()
                )
                .slice(0, 10)

            if (casamentos.length === 0) {
                await sock.sendMessage(
                    from,
                    {
                        text: "💔 Ainda não existe nenhum casal registrado neste grupo."
                    },
                    { quoted: msg }
                )

                await sock.sendMessage(from, {
                    react: {
                        text: "✅",
                        key: msg.key
                    }
                })

                return
            }

            let groupName = "Grupo"

            if (from.endsWith("@g.us")) {
                try {
                    const metadata = await sock.groupMetadata(from)
                    groupName = metadata.subject || "Grupo"
                } catch {}
            }

            const agora = new Date()

            function calcularTempo(dataCasamento) {
                let diffMs = agora.getTime() - dataCasamento.getTime()

                if (diffMs < 0) diffMs = 0

                const dias = Math.floor(
                    diffMs / (1000 * 60 * 60 * 24)
                )

                const horas = Math.floor(
                    (diffMs / (1000 * 60 * 60)) % 24
                )

                const minutos = Math.floor(
                    (diffMs / (1000 * 60)) % 60
                )

                return {
                    dias,
                    horas,
                    minutos
                }
            }

            const medalhas = [
                "🥇",
                "🥈",
                "🥉"
            ]

            const lines = casamentos
                .map((casamento, index) => {
                    const requester =
                        casamento.requester.split("@")[0]

                    const target =
                        casamento.target.split("@")[0]

                    const {
                        dias,
                        horas,
                        minutos
                    } = calcularTempo(casamento.casamentoDate)

                    const posicao =
                        medalhas[index] || `🏅 ${index + 1}º`

                    return (
`${posicao} @${requester} ❤️ @${target}
│ 💍 ${dias}d ${horas}h ${minutos}m
│ 📅 Desde ${casamento.timestamp}`
                    )
                })
                .join("\n│──────────────────\n")

            const dateSP = new Date().toLocaleDateString(
                "pt-BR",
                {
                    timeZone: "America/Sao_Paulo"
                }
            )

            const text = `
╭──❰ 💍 *TOP 10 CASAIS* ❱──╮
│ *${groupName}* - ${dateSP}
│──────────────────
${lines}
╰──────────────────╯
            `.trim()

            const mentions = [
                ...new Set(
                    casamentos.flatMap(c => [
                        c.requester,
                        c.target
                    ])
                )
            ]

            await sock.sendMessage(
                from,
                {
                    text,
                    mentions
                },
                { quoted: msg }
            )

            await sock.sendMessage(from, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            })

        } catch (err) {
            console.error(
                "Erro no comando rankpar:",
                err
            )

            await sock.sendMessage(from, {
                react: {
                    text: "❌",
                    key: msg.key
                }
            })

            await sock.sendMessage(
                from,
                {
                    text: "❌ Ocorreu um erro ao carregar o ranking de casais."
                },
                { quoted: msg }
            )
        }
    }
}