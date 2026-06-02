import axios from "axios";
import puppeteer from "puppeteer";
import { getGroupConfig } from "../../utils/groups.js";

async function searchImages(query, limit = 20) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ]
    });

    try {
        const page = await browser.newPage();

        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36"
        );

        await page.goto(
            `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`,
            {
                waitUntil: "networkidle2",
                timeout: 30000
            }
        );

        await page.waitForSelector(".mimg", {
            timeout: 10000
        });

        const images = await page.evaluate((limit) => {
            return [...document.querySelectorAll(".mimg")]
                .map(img => ({
                    url: img.src,
                    title: img.alt || "Imagem"
                }))
                .filter(img => img.url?.startsWith("http"))
                .slice(0, limit);
        }, limit);

        return images;
    } finally {
        await browser.close();
    }
}

export default {
    name: "buscar2",
    aliases: ["img2", "image2", "foto2", "imagem2"],
    description: "Busca imagens via Bing",
    usage: "[termo]",
    category: "utils",

    async run({ sock, msg, args }) {
        const jid = msg.key.remoteJid;
        const gConfig = getGroupConfig(jid);
        const prefix = gConfig.prefix;

        const query = args.join(" ");

        if (!query) {
            await sock.sendMessage(jid, {
                react: { text: "❌", key: msg.key }
            });

            return sock.sendMessage(jid, {
                text: `❗ Use: ${prefix}buscar2 [termo]`
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, {
            react: { text: "⏳", key: msg.key }
        });

        try {
            const results = await searchImages(query);

            if (!results.length) {
                await sock.sendMessage(jid, {
                    react: { text: "❌", key: msg.key }
                });

                return sock.sendMessage(jid, {
                    text: `❌ Nenhuma imagem encontrada para "${query}".`
                }, { quoted: msg });
            }

            let validImage = null;

            for (const img of results) {
                try {
                    const head = await axios.head(img.url, {
                        timeout: 7000
                    });

                    const type = head.headers["content-type"] || "";
                    const size = parseInt(
                        head.headers["content-length"] || "0"
                    );

                    if (!type.startsWith("image/")) continue;

                    if (size > 8 * 1024 * 1024) continue;

                    validImage = img;
                    break;
                } catch {
                    continue;
                }
            }

            if (!validImage) {
                await sock.sendMessage(jid, {
                    react: { text: "❌", key: msg.key }
                });

                return sock.sendMessage(jid, {
                    text: "❌ Não encontrei uma imagem válida."
                }, { quoted: msg });
            }

            await sock.sendMessage(jid, {
                image: {
                    url: validImage.url
                },
                caption: `📸 *Resultado de:* _${query}_`
            }, { quoted: msg });

            await sock.sendMessage(jid, {
                react: { text: "✅", key: msg.key }
            });

        } catch (error) {
            console.error("Erro buscar2:", error);

            await sock.sendMessage(jid, {
                react: { text: "❌", key: msg.key }
            });

            await sock.sendMessage(jid, {
                text: "❌ Erro ao buscar imagem."
            }, { quoted: msg });
        }
    }
};