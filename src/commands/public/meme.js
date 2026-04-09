import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import { exec } from "child_process";
import { getGroupConfig } from "../../utils/groups.js";
import { load } from "cheerio"; 

const BASE_URL = "https://www.myinstants.com";

async function searchMyInstants(query) {
    const url = `${BASE_URL}/pt/search/?name=${encodeURIComponent(query)}`;
    const { data: html } = await axios.get(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        timeout: 10000
    });

    const $ = load(html);
    const results = [];

    $(".instant").each((_, el) => {
        const button = $(el).find("button.small-button");
        const onclick = button.attr("onclick");
        if (!onclick) return;

        const match = onclick.match(/play\('([^']+\.mp3)'/);
        if (!match) return;

        const audioUrl = BASE_URL + match[1];
        const title = $(el).find("a.instant-link").text().trim() || "Som sem nome";

        results.push({ title, url: audioUrl });
    });

    return results;
}

export default {
    name: "meme3",
    aliases: ["som", "audio", "instant"],
    description: "Busca um meme sonoro e envia como áudio",
    usage: "[termo]",
    category: "fun",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;

        // Prefixo do grupo
        const gConfig = getGroupConfig(jid);
        const prefix = gConfig.prefix || "!";

        const query = args.join(" ").trim();

        if (!query) {
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            return sock.sendMessage(
                jid,
                { text: `❗ Use: *${prefix}meme [termo]*\nExemplo: *${prefix}meme para de mandar áudio*` },
                { quoted: msg }
            );
        }

        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

        const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
        const tempMp3 = path.join(os.tmpdir(), `meme_${id}.mp3`);
        const tempM4a = path.join(os.tmpdir(), `meme_${id}.m4a`);

        try {
            // 🔎 Buscar áudio via scraper
            const results = await searchMyInstants(query);

            if (!results.length) {
                await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
                return sock.sendMessage(jid, { text: `❌ Nenhum áudio encontrado para "${query}".`, quoted: msg });
            }

            const audioUrl = results[0].url;

            // Baixar MP3 temporário
            const writer = fs.createWriteStream(tempMp3);
            const audioResp = await axios({ url: audioUrl, method: "GET", responseType: "stream" });
            audioResp.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            // Converter para M4A
            await new Promise((resolve, reject) => {
                exec(
                    `ffmpeg -y -i "${tempMp3}" -c:a aac -b:a 128k "${tempM4a}"`,
                    (error) => {
                        if (error) {
                            console.error("Erro FFmpeg:", error);
                            return reject(new Error("Erro ao converter o áudio."));
                        }
                        resolve();
                    }
                );
            });

            // Enviar áudio final
            await sock.sendMessage(
                jid,
                { audio: { url: tempM4a }, mimetype: "audio/mp4", ptt: false },
                { quoted: msg }
            );

            await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Erro no comando meme:", err);
            await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(
                jid,
                { text: "❌ Ocorreu um erro ao buscar ou processar o áudio. Tente novamente mais tarde." },
                { quoted: msg }
            );
        } finally {
            // Apagar arquivos temporários
            for (const fp of [tempMp3, tempM4a]) {
                if (fs.existsSync(fp)) {
                    try { fs.unlinkSync(fp); } catch {}
                }
            }
        }
    }
};
