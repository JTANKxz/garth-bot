import { exec } from "child_process";
import fs from "fs";
import path from "path";

const TEMP_DIR = "./temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

function getRandomName(ext = "mp4") {
    return Math.random().toString(36).substring(2, 10) + "." + ext;
}

export async function processResizeVideo(inputPath) {
    return new Promise((resolve, reject) => {
        const outFile = path.resolve(TEMP_DIR, getRandomName("mp4"));

        // Redimensiona o vídeo para 512x512
        const cmd = `ffmpeg -y -i "${inputPath}" -vf "scale=512:512" -c:v libx264 -preset fast -crf 23 -c:a copy "${outFile}"`;

        exec(cmd, async (err, _, stderr) => {
            try {
                if (err) {
                    console.error("FFmpeg erro (resize vídeo):", stderr);
                    return reject(new Error("Erro ao redimensionar o vídeo."));
                }

                resolve(outFile);
            } catch (e) {
                if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
                reject(e);
            }
        });
    });
}

export async function processLowQuality(inputPath) {
    return new Promise((resolve, reject) => {
        const outFile = path.resolve(TEMP_DIR, getRandomName("mp4"));

        // Reduz a resolução (144p), bitrate de vídeo, bitrate de áudio e FPS
        const cmd = `ffmpeg -y -i "${inputPath}" -vf "scale=256:144" -b:v 50k -b:a 24k -r 15 -preset ultrafast "${outFile}"`;

        exec(cmd, async (err, _, stderr) => {
            try {
                if (err) {
                    console.error("FFmpeg erro (low quality):", stderr);
                    return reject(new Error("Erro ao baixar a qualidade do vídeo."));
                }

                resolve(outFile);
            } catch (e) {
                if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
                reject(e);
            }
        });
    });
}
