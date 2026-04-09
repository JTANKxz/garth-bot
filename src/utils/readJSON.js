//src/utils/readJSON.js
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function readJSON(relativePath) {
    const fullPath = path.join(__dirname, "..", relativePath)

    if (!fs.existsSync(fullPath)) return null;

    const content = fs.readFileSync(fullPath, "utf8")
    return JSON.parse(content)
}

export function writeJSON(relativePath, data) {
  const fullPath = path.join(__dirname, "..", relativePath);

  // garante pasta
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });

  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
}