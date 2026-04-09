import fs from "fs"
import path from "path"

const responsesPath1 = path.join(process.cwd(), "src/database/responses.json")
const responsesPath2 = path.join(process.cwd(), "src/database/responses2.json")

// ==============================
// Utils JSON
// ==============================
function loadJson(filePath) {
    if (!fs.existsSync(filePath)) return {}
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"))
    } catch (err) {
        console.error(`Erro ao ler ${filePath}:`, err)
        return {}
    }
}

function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
}

// ==============================
// Combina responses.json + responses2.json
// ==============================
function loadResponses() {
    const res1 = loadJson(responsesPath1)
    const res2 = loadJson(responsesPath2)

    const combined = {}

    for (const [key, values] of Object.entries({ ...res1, ...res2 })) {
        const k = key.toLowerCase()

        const arr1 = res1[k] || []
        const arr2 = res2[k] || []

        combined[k] = Array.from(
            new Set([...arr1, ...arr2])
        )
    }

    return combined
}

// ==============================
// Retorna resposta automática
// ==============================
export function getAutoResponse(message) {
    if (!message) return null

    const text = message.trim().toLowerCase()
    const responses = loadResponses()

    const options = responses[text]
    if (!options || options.length === 0) return null

    return options[Math.floor(Math.random() * options.length)]
}

// ==============================
// Aprende nova resposta (responses2.json)
// ==============================
export function learnAutoResponse(message, reply) {
    if (!message || !reply) return

    const key = message.trim().toLowerCase()
    const value = reply.trim()

    const res2 = loadJson(responsesPath2)

    if (!res2[key]) res2[key] = []

    if (!res2[key].includes(value)) {
        res2[key].push(value)
        saveJson(responsesPath2, res2)
        // console.log(`🤖 AutoLearn: "${key}" => "${value}"`)
    }
}
