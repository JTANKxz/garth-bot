import { createCanvas, loadImage } from "canvas";
import path from "path";
import { getLayoutPath } from "./catalog.js";

export async function renderPetImage(pet) {
    const width = 800;
    const height = 600;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Carrega o layout específico do tipo de pet
    const layoutPath = getLayoutPath(pet.type);
    const bg = await loadImage(layoutPath);
    ctx.drawImage(bg, 0, 0, width, height);

    // pet (type/skin)
    const petPath = path.resolve(`assets/pets/sprites/${pet.type}/${pet.skin}.png`);
    const petImg = await loadImage(petPath);

    const petW = 220;
    const petH = 250;
    const petX = Math.floor((width - petW) / 2);
    const petY = 215;

    ctx.drawImage(petImg, petX, petY, petW, petH);

    return canvas.toBuffer("image/png");
}