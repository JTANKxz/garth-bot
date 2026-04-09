function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function applyDecay(pet, now = Date.now()) {
  if (!pet?.timestamps) return false;

  const tickMs = 30 * 60 * 1000; // 30 min (Slower!)
  const last = pet.timestamps.updatedAt || pet.timestamps.createdAt || now;

  const elapsed = now - last;
  if (elapsed < tickMs) return false;

  const ticks = Math.floor(elapsed / tickMs);
  if (ticks <= 0) return false;

  // perdas por tick (Reduzidas para o novo tempo)
  pet.stats.hunger = clamp(pet.stats.hunger - 2 * ticks, 0, 100);
  pet.stats.thirst = clamp(pet.stats.thirst - 3 * ticks, 0, 100);
  pet.stats.affection = clamp(pet.stats.affection - 1 * ticks, 0, 100);

  // vida só cai se estiver ruim (Fome/Sede < 15 ou Carinho < 5)
  let lifeLoss = 0;
  if (pet.stats.hunger < 15) lifeLoss += 4 * ticks;
  if (pet.stats.thirst < 15) lifeLoss += 4 * ticks;
  if (pet.stats.affection < 5) lifeLoss += 2 * ticks;

  pet.stats.life = clamp(pet.stats.life - lifeLoss, 0, 100);

  // avança updatedAt
  pet.timestamps.updatedAt = last + ticks * tickMs;

  // Retorna true se o pet "morreu" (vida zerada)
  return pet.stats.life === 0;
}