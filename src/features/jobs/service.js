/**
 * src/features/jobs/service.js
 * Lógica central dos empregos.
 */

import { readJSON, writeJSON } from "../../utils/readJSON.js";
import { getJobByKey, ECONOMY_CONFIG } from "./catalog.js";
import { addMoney, removeMoney, getUserBalance } from "../../utils/saldo.js";
import { calculateLevel, addGlobalXP } from "../progress/levelSystem.js";

const JOBS_DB = "database/jobs.json";
const LUCKY_DB = "database/lucky.json";
const COUNTS_DB = "database/messageCounts.json";

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function ensureJobsUser(db, groupId, userId) {
    if (!db[groupId]) db[groupId] = {};
    if (!db[groupId][userId]) {
        db[groupId][userId] = {
            job: null,
            quitUntil: 0,
            workCooldownUntil: 0,
            jobXP: 0,
            jobLevel: 1,
            bossPendingIncome: 0
        };
    }
    return db[groupId][userId];
}

export function getJobsUser(groupId, userId) {
    const db = readJSON(JOBS_DB);
    return ensureJobsUser(db, groupId, userId);
}

/**
 * Tenta contratar um usuário para um emprego.
 */
export function hire(groupId, userId, jobKey) {
    const db = readJSON(JOBS_DB);
    const luckyDB = readJSON(LUCKY_DB);
    const countsDB = readJSON(COUNTS_DB);
    
    const userJobs = ensureJobsUser(db, groupId, userId);
    const job = getJobByKey(jobKey);
    
    if (!job) return { ok: false, reason: "JOB_NOT_FOUND" };
    if (userJobs.job) return { ok: false, reason: "ALREADY_EMPLOYED" };
    
    // Verificando cooldown de demissão
    if (userJobs.quitUntil > Date.now()) {
        return { ok: false, reason: "QUIT_COOLDOWN", time: userJobs.quitUntil - Date.now() };
    }

    // Verificar requisitos
    if (job.requirement) {
        const { type, min } = job.requirement;
        let current = 0;
        
        if (type === "level") {
            const xp = countsDB[groupId]?.[userId]?.xp || 0;
            current = calculateLevel(xp);
        } else if (type === "money") {
            current = getUserBalance(groupId, userId);
        } else {
            current = luckyDB[groupId]?.[userId]?.[type] || 0;
        }

        if (current < min) return { ok: false, reason: "REQ_NOT_MET", type, min, current };
    }

    // Contrata
    userJobs.job = job.key;
    userJobs.jobXP = 0;
    userJobs.jobLevel = 1;
    userJobs.workCooldownUntil = 0;
    
    writeJSON(JOBS_DB, db);
    return { ok: true, job };
}

/**
 * Executa o trabalho diário.
 */
export function work(groupId, userId) {
    const db = readJSON(JOBS_DB);
    const userJobs = ensureJobsUser(db, groupId, userId);
    const now = Date.now();

    if (!userJobs.job) return { ok: false, reason: "NO_JOB" };
    if (userJobs.workCooldownUntil > now) {
        return { ok: false, reason: "COOLDOWN", time: userJobs.workCooldownUntil - now };
    }

    const job = getJobByKey(userJobs.job);
    const result = { ok: true, job, xpEarned: job.xpGain };

    // Lógica por categoria
    if (job.key === "policia") {
        const salary = randInt(job.salaryRange[0], job.salaryRange[1]);
        addMoney(groupId, userId, salary);
        result.salary = salary;
        result.type = "salary";
    } else if (job.key === "hacker") {
        // Hacker: Chance de bloqueio de rede (15%)
        if (randInt(0, 99) < 15) {
            userJobs.workCooldownUntil = now + (4 * 60 * 60 * 1000); // 4h ban
            result.type = "hack_fail";
            result.cooldown = 4 * 60 * 60 * 1000;
        } else {
            const salary = randInt(job.salaryRange[0], job.salaryRange[1]);
            addMoney(groupId, userId, salary);
            result.salary = salary;
            result.type = "salary";
        }
    } else if (job.salaryRange) {
        // Empregos normais com salário
        const salary = randInt(job.salaryRange[0], job.salaryRange[1]);
        
        // Acidentes
        if (job.accidentChance && randInt(0, 99) < job.accidentChance) {
            const loss = randInt(job.accidentLossRange[0], job.accidentLossRange[1]);
            removeMoney(groupId, userId, loss);
            result.loss = loss;
            result.type = "accident";
        } else {
            addMoney(groupId, userId, salary);
            result.salary = salary;
            result.type = "salary";
        }
    }

    // Incrementa XP do Emprego e Global XP
    userJobs.jobXP += job.xpGain;
    addGlobalXP(groupId, userId, Math.floor(job.xpGain / 2)); // 50% do XP do job vai pro level global

    // Cooldown
    userJobs.workCooldownUntil = now + ECONOMY_CONFIG.WORK_COOLDOWN_MS;
    
    writeJSON(JOBS_DB, db);
    return result;
}

/**
 * Pede demissão do cargo atual.
 */
export function fire(groupId, userId) {
    const db = readJSON(JOBS_DB);
    const userJobs = ensureJobsUser(db, groupId, userId);
    
    if (!userJobs.job) return { ok: false, reason: "NO_JOB" };

    userJobs.job = null;
    userJobs.quitUntil = Date.now() + ECONOMY_CONFIG.QUIT_COOLDOWN_MS;
    
    writeJSON(JOBS_DB, db);
    return { ok: true, cooldown: ECONOMY_CONFIG.QUIT_COOLDOWN_MS };
}
