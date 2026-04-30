/**
 * src/features/games/termo/index.js
 * Lógica central do jogo Termo (Wordle em PT-BR).
 */

import {
  getUserSession,
  setUserSession,
  hasPlayedToday,
  hasActiveGame,
  getTodayDate,
} from "./storage.js";

import { getRandomWord, isValidWord, normalize } from "./words.js";

const MAX_ATTEMPTS = 6;

export function startGame(groupId, userId) {
  if (hasPlayedToday(groupId, userId)) {
    return { ok: false, reason: "ALREADY_PLAYED" };
  }
  if (hasActiveGame(groupId, userId)) {
    return { ok: false, reason: "GAME_ACTIVE" };
  }

  const word = getRandomWord();
  const session = {
    word: normalize(word),
    attempts: [],
    results: [],
    status: "playing",
    date: getTodayDate(),
    maxAttempts: MAX_ATTEMPTS,
  };

  setUserSession(groupId, userId, session);
  return { ok: true, session };
}

export function processGuess(groupId, userId, guess) {
  const session = getUserSession(groupId, userId);
  if (!session || session.status !== "playing") {
    return { ok: false, reason: "NO_ACTIVE_GAME" };
  }
  if (session.date !== getTodayDate()) {
    return { ok: false, reason: "SESSION_EXPIRED" };
  }

  const normalizedGuess = normalize(guess);
  if (normalizedGuess.length !== 5) {
    return { ok: false, reason: "INVALID_LENGTH" };
  }
  if (!isValidWord(normalizedGuess)) {
    return { ok: false, reason: "INVALID_WORD" };
  }

  const result = compareWords(normalizedGuess, session.word);
  session.attempts.push(normalizedGuess);
  session.results.push(result);

  if (normalizedGuess === session.word) {
    session.status = "won";
    setUserSession(groupId, userId, session);
    return { ok: true, result, won: true, lost: false, word: session.word, session, attemptsUsed: session.attempts.length };
  }

  if (session.attempts.length >= MAX_ATTEMPTS) {
    session.status = "lost";
    setUserSession(groupId, userId, session);
    return { ok: true, result, won: false, lost: true, word: session.word, session, attemptsUsed: session.attempts.length };
  }

  setUserSession(groupId, userId, session);
  return { ok: true, result, won: false, lost: false, session, remaining: MAX_ATTEMPTS - session.attempts.length };
}

/**
 * Compara tentativa com a palavra secreta.
 * Trata letras repetidas corretamente.
 */
export function compareWords(guess, secret) {
  const result = Array(5).fill("⬛");
  const secretArr = secret.split("");
  const guessArr = guess.split("");
  const used = Array(5).fill(false);

  // Passo 1: posições exatas (🟩)
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === secretArr[i]) {
      result[i] = "🟩";
      used[i] = true;
      guessArr[i] = null;
    }
  }

  // Passo 2: letras na posição errada (🟨)
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === null) continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessArr[i] === secretArr[j]) {
        result[i] = "🟨";
        used[j] = true;
        break;
      }
    }
  }

  return result.join("");
}

export function getGameStatus(groupId, userId) {
  const session = getUserSession(groupId, userId);
  if (!session) return { ok: false, reason: "NO_GAME" };
  return { ok: true, session };
}

export function giveUp(groupId, userId) {
  const session = getUserSession(groupId, userId);
  if (!session || session.status !== "playing") {
    return { ok: false, reason: "NO_ACTIVE_GAME" };
  }
  session.status = "gave_up";
  setUserSession(groupId, userId, session);
  return { ok: true, word: session.word };
}
