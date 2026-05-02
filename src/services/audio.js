import { exec } from "child_process";
import fs from "fs";
import path from "path";

const TEMP_DIR = "./temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

function getRandomName(ext = "mp3") {
    return Math.random().toString(36).substring(2, 10) + "." + ext;
}

export async function processExtractAudio(inputPath, start = null, end = null) {
    return new Promise((resolve, reject) => {
        const outFile = path.resolve(TEMP_DIR, getRandomName("mp3"));

        let timeArgs = "";
        if (start) timeArgs += `-ss ${start} `;
        if (end) timeArgs += `-to ${end} `;

        // Filtro para extrair o áudio e salvar como MP3
        const cmd = `ffmpeg -y -i "${inputPath}" ${timeArgs}-vn -acodec libmp3lame -q:a 2 "${outFile}"`;

        exec(cmd, async (err, _, stderr) => {
            try {
                if (err) {
                    console.error("FFmpeg erro (extrair áudio):", stderr);
                    return reject(new Error("Erro ao extrair o áudio."));
                }

                resolve(outFile);
            } catch (e) {
                if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
                reject(e);
            }
        });
    });
}
