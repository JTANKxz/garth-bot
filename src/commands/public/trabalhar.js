import { work } from "../../features/jobs/service.js";
import fs from "fs";
import path from "path";
import { grantJobAchievement } from "../../features/achievements/jobAchievements.js";

const dbLuckyPath = path.resolve("src/database/lucky.json");

function formatTimeLeft(ms) {
    const totalMinutes = Math.ceil(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h <= 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
}

function formatMoney(v) {
    if (v === undefined || v === null) return "0";
    return v.toLocaleString("pt-BR");
}

export default {
    name: "trabalhar",
    aliases: ["work", "trampar"],
    description: "Trabalhe no seu emprego atual para ganhar fyne coins e XP",
    category: "fun",

    async run({ sock, msg }) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const pushName = msg.pushName || "Usuário";

        try {
            const now = Date.now();
            let isJailed = false;
            let jailTimeLeft = 0;
            let isHospitalized = false;
            let hospitalTimeLeft = 0;
            
            if (fs.existsSync(dbLuckyPath)) {
                const luckyDB = JSON.parse(fs.readFileSync(dbLuckyPath));
                const userLucky = luckyDB[from]?.[sender];
                if (userLucky?.jailUntil && userLucky.jailUntil > now) {
                    isJailed = true;
                    jailTimeLeft = userLucky.jailUntil - now;
                }
                if (userLucky?.hospitalUntil && userLucky.hospitalUntil > now) {
                    isHospitalized = true;
                    hospitalTimeLeft = userLucky.hospitalUntil - now;
                }
            }

            if (isJailed) {
                return sock.sendMessage(from, { text: `🚔 *${pushName}*, você está preso e não pode trabalhar!\n⏳ Tempo restante: *${formatTimeLeft(jailTimeLeft)}*.\nUse *!fianca* para tentar sair.` }, { quoted: msg });
            }

            if (isHospitalized) {
                return sock.sendMessage(from, { text: `🏥 *${pushName}*, você está internado no hospital e não pode trabalhar!\n⏳ Alta em: *${formatTimeLeft(hospitalTimeLeft)}*.` }, { quoted: msg });
            }

            const res = work(from, sender);

            if (!res.ok) {
                if (res.reason === "NO_JOB") {
                    return sock.sendMessage(from, { text: `💼 *${pushName}*, você está desempregado! Use !emprego para escolher uma profissão.` }, { quoted: msg });
                }
                if (res.reason === "COOLDOWN") {
                    return sock.sendMessage(from, { text: `⏳ *${pushName}*, você já trabalhou recentemente. Volte em *${formatTimeLeft(res.time)}*.` }, { quoted: msg });
                }
                return sock.sendMessage(from, { text: `❌ Erro ao trabalhar: ${res.reason}` }, { quoted: msg });
            }

            const job = res.job;
            let text = "";

            if (res.type === "hack_fail") {
                 text = `📡 *BLOQUEIO DE REDE*\n\n` +
                        `🚫 *${pushName}*, seu ataque cibernético foi detectado!\n` +
                        `🔒 Você foi banido da rede por *${formatTimeLeft(res.cooldown)}*.`;
            } else if (res.type === "accident") {
                if (fs.existsSync(dbLuckyPath)) {
                    const luckyDB = JSON.parse(fs.readFileSync(dbLuckyPath));
                    if (!luckyDB[from]) luckyDB[from] = {};
                    if (!luckyDB[from][sender]) luckyDB[from][sender] = { money: 0 };
                    luckyDB[from][sender].lastAccidentAt = Date.now();
                    luckyDB[from][sender].lastAccidentLoss = res.loss;
                    luckyDB[from][sender].curado = false;
                    fs.writeFileSync(dbLuckyPath, JSON.stringify(luckyDB, null, 2));
                }

                text = `🚑 *ACIDENTE DETECTADO*\n\n` +
                       `⚠️ *${pushName}*, você sofreu um acidente enquanto trabalhava como *${job.name}*!\n` +
                       `💸 Custos médicos: *-${formatMoney(res.loss)} fyne coins*.\n\n` +
                       `✨ XP ganho: *+${res.xpEarned}*`;
            } else {
                text = `💼 *TRABALHO CONCLUÍDO*\n\n` +
                       `✅ *${pushName}* trabalhou como *${job.name}*!\n`;
                if (res.salary !== undefined && res.salary !== null) {
                    text += `💰 Salário recebido: *+${formatMoney(res.salary)} fyne coins*.\n`;
                }
                text += `✨ XP ganho: *+${res.xpEarned}*`;
                
                if (job.key === "policia") {
                    text += `\n\n👮 _Dica: Use !prender para ganhar bônus capturando criminosos!_`;
                }

                // Conquista de trabalho
                await grantJobAchievement({
                    sock, groupId: from, user: sender,
                    stat: "work_count",
                    achievementType: "work_count",
                    quoted: msg, pushName
                });
            }

            await sock.sendMessage(from, { text }, { quoted: msg });

        } catch (err) {
            console.error("Erro no comando trabalhar:", err);
            await sock.sendMessage(from, { text: "❌ Ocorreu um erro ao processar seu trabalho." }, { quoted: msg });
        }
    }
};
