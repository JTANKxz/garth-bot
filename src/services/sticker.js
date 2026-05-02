/**
 * Serviços para processar figurinhas (stickers) no ffmpeg.
 *
 * Revisado e aprimorado para o bot do João – versão estável
 * by DEVGUI
 */

import { exec } from "child_process";
import webp from "node-webpmux";
import fs from "fs";
import path from "path";

const TEMP_DIR = "./temp";
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// ===============
// FUNÇÕES BASE
// ===============

function getRandomName(ext = "webp") {
    return Math.random().toString(36).substring(2, 10) + "." + ext;
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ================================
//   DETECTAR SE É WEBP ANIMADO
// ================================

export async function isAnimatedSticker(filePath) {
    try {
        const buffer = fs.readFileSync(filePath);

        // verifica cabeçalho de WebP animado
        if (buffer.includes(Buffer.from("ANIM"))) return true;
        if (buffer.includes(Buffer.from("ANMF"))) return true;

        return false;

    } catch {
        return false;
    }
}

// ================================
//   ADICIONAR METADADOS EXIF
// ================================

export async function addStickerMetadata(media, metadata) {
    const inFile = path.resolve(TEMP_DIR, getRandomName("webp"));
    const outFile = path.resolve(TEMP_DIR, getRandomName("webp"));

    await fs.promises.writeFile(inFile, media);

    const img = new webp.Image();

    const json = {
        "sticker-pack-id": String(getRandomNumber(10000, 99999)),
        "sticker-pack-name": metadata.username,
        "sticker-pack-publisher": metadata.botName,
        emojis: metadata.categories ?? [""]
    };

    const exifAttr = Buffer.from([
        0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,
        0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00
    ]);

    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    await img.load(inFile);
    await fs.promises.unlink(inFile);

    img.exif = exif;
    await img.save(outFile);

    return outFile;
}

// ================================
//   PROCESSAR FIGURINHA ESTÁTICA
// ================================

export async function processStaticSticker(inputPath, metadata) {
    return new Promise((resolve, reject) => {
        const outFile = path.resolve(TEMP_DIR, getRandomName("webp"));

        const cmd = `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512" -vframes 1 -q:v 80 -f webp "${outFile}"`;

        exec(cmd, async (err, _, stderr) => {
            try {
                if (err) {
                    console.error("FFmpeg erro (static):", stderr);
                    return reject(new Error("Erro ao converter para figurinha estática."));
                }

                const data = await fs.promises.readFile(outFile);
                const finalPath = await addStickerMetadata(data, metadata);

                fs.unlinkSync(outFile);
                resolve(finalPath);

            } catch (e) {
                if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
                reject(e);
            }
        });
    });
}

// ======================================
//   PROCESSAR FIGURINHA ANIMADA (WEBP)
// ======================================

export async function processAnimatedSticker(inputPath, metadata) {
    try {
        const img = new webp.Image();
        await img.load(inputPath);

        const json = {
            "sticker-pack-id": String(getRandomNumber(10000, 99999)),
            "sticker-pack-name": metadata.username,
            "sticker-pack-publisher": metadata.botName,
            emojis: metadata.categories ?? [""]
        };

        const exifAttr = Buffer.from([
            0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,
            0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00
        ]);

        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);

        img.exif = exif;

        const final = path.resolve(TEMP_DIR, getRandomName("webp"));
        await img.save(final);

        return final;

    } catch (e) {
        console.log("Erro processando WebP animado:", e);
        throw new Error("Erro ao processar sticker animado.");
    }
}

// ======================================
//   PROCESSAR VÍDEO → WEBP ANIMADO
// ======================================

export async function processAnimatedStickerFromVideo(inputPath, metadata) {
    return new Promise((resolve, reject) => {
        const outFile = path.resolve(TEMP_DIR, getRandomName("webp"));

        const cmd = `ffmpeg -y -i "${inputPath}" -vcodec libwebp -filter:v "fps=15,scale=512:512:force_original_aspect_ratio=increase,crop=512:512" -loop 0 -an -preset picture "${outFile}"`;

        exec(cmd, async (err, _, stderr) => {
            try {
                if (err) {
                    console.error("FFmpeg erro (vídeo):", stderr);
                    return reject(new Error("Erro ao converter vídeo para sticker animado."));
                }

                const data = await fs.promises.readFile(outFile);
                const finalPath = await addStickerMetadata(data, metadata);

                fs.unlinkSync(outFile);
                resolve(finalPath);

            } catch (e) {
                if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
                reject(e);
            }
        });
    });
}
