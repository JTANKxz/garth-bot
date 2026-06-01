import { getBotConfig, updateBotConfig } from "../config/botConfig.js";

export function normalizeCommandName(name = "") {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/^[!./#]+/, "");
}

export function getDisabledCommands() {
  const config = getBotConfig();
  if (!config.disabledCommands || typeof config.disabledCommands !== "object") {
    config.disabledCommands = {};
    updateBotConfig(config);
  }
  return config.disabledCommands;
}

export function getDisabledCommand(name) {
  const normalized = normalizeCommandName(name);
  return getDisabledCommands()[normalized] || null;
}

export function isCommandDisabled(name) {
  return Boolean(getDisabledCommand(name));
}

export function disableCommand(name, reason = "") {
  const config = getBotConfig();
  const disabledCommands = config.disabledCommands || {};
  const normalized = normalizeCommandName(name);

  disabledCommands[normalized] = {
    reason: String(reason || "").trim(),
    disabledAt: Date.now()
  };

  updateBotConfig({ disabledCommands });
  return normalized;
}

export function enableCommand(name) {
  const config = getBotConfig();
  const disabledCommands = config.disabledCommands || {};
  const normalized = normalizeCommandName(name);
  const existed = Boolean(disabledCommands[normalized]);

  delete disabledCommands[normalized];
  updateBotConfig({ disabledCommands });
  return existed;
}
