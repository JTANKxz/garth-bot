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
let secretWordsList = [];

try {
  const dictPath = path.join(__dirname, "dict.json");
  if (fs.existsSync(dictPath)) {
    wordList = JSON.parse(fs.readFileSync(dictPath, "utf8"));
    extraWords = new Set(wordList);
  }
} catch (e) {
  console.error("Erro ao carregar dict.json:", e);
}

try {
  const secretsPath = path.join(__dirname, "secrets.json");
  if (fs.existsSync(secretsPath)) {
    secretWordsList = JSON.parse(fs.readFileSync(secretsPath, "utf8"));
  } else {
    secretWordsList = wordList;
  }
} catch (e) {
  console.error("Erro ao carregar secrets.json:", e);
  secretWordsList = wordList;
}

/**
 * Retorna uma palavra secreta aleatória.
 */
export function getRandomWord() {
  const list = secretWordsList.length > 0 ? secretWordsList : wordList;
  if (list.length === 0) return "TERMO"; // Fallback caso dê erro no arquivo
  return list[Math.floor(Math.random() * list.length)];
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

/**
 * Adiciona dinamicamente uma palavra ao banco de dados e memória
 */
export function addNewWord(word) {
  const w = normalize(word);
  if (w.length !== 5 || !/^[A-Z]{5}$/.test(w)) return false;
  if (extraWords.has(w)) return true; // Já existe

  wordList.push(w);
  extraWords.add(w);
  
  // Salva no JSON
  try {
    const dictPath = path.join(__dirname, "dict.json");
    fs.writeFileSync(dictPath, JSON.stringify(wordList));
    return true;
  } catch (e) {
    console.error("Erro ao salvar nova palavra:", e);
    return false;
  }
}
