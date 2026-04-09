
//src/utils/groupsConfig.js
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const groupsPath = path.join(__dirname, "..", "database", "groups.json")

export function getGroupConfig(jid) {
    if (!fs.existsSync(groupsPath)) return {}

    const data = JSON.parse(fs.readFileSync(groupsPath, "utf8"))


    if (!data[jid]) {
        data[jid] = {
            groupName: "",
            prefix: "!",
            welcomeMessage: "",
            onlyAdmins: false,
            leaveGroupMessage: false,
            welcomeGroup: true,
            antilink: false,
            antifig: false,
            blacklisteds: [],
            warnings: {},
            muteds: {}
        }
        fs.writeFileSync(groupsPath, JSON.stringify(data, null, 2))
    }

    return data[jid]
}

export function updateGroupConfig(jid, newData) {
    let data = {}

    if (fs.existsSync(groupsPath)) {
        data = JSON.parse(fs.readFileSync(groupsPath, "utf8"))
    }

    if (!data[jid]) data[jid] = {}

    data[jid] = { ...data[jid], ...newData }

    fs.writeFileSync(groupsPath, JSON.stringify(data, null, 2))

    return data[jid]
}
