/**
 * src/features/games/termo/words.js
 * Lista de palavras válidas de 5 letras em português para o jogo Termo.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let extraWords = new Set();
let wordList = [];

try {
  const dictPath = path.join(__dirname, "dict.json");
  if (fs.existsSync(dictPath)) {
    wordList = JSON.parse(fs.readFileSync(dictPath, "utf8"));
    extraWords = new Set(wordList);
  }
} catch (e) {
  console.error("Erro ao carregar dict.json:", e);
}





/**
 * Retorna uma palavra secreta aleatória.
 */
export function getRandomWord() {
  if (wordList.length === 0) return "TERMO"; // Fallback caso dê erro no arquivo
  return wordList[Math.floor(Math.random() * wordList.length)];
}

/**
 * Verifica se uma palavra é válida como tentativa.
 */
export function isValidWord(word) {
  const normalized = normalize(word);
  if (normalized.length !== 5) return false;

  return extraWords.has(normalized);
}

/**
 * Normaliza uma palavra: maiúscula, sem acentos.
 */
export function normalize(word) {
  return word
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
