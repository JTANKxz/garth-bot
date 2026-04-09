function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function applyDecay(pet, now = Date.now()) {
  if (!pet?.timestamps) return;

  const tickMs = 10 * 60 * 1000; // 10 min
  const last = pet.timestamps.updatedAt || pet.timestamps.createdAt || now;

  const elapsed = now - last;
  if (elapsed < tickMs) return;

  const ticks = Math.floor(elapsed / tickMs);
  if (ticks <= 0) return;

  // perdas por tick
  pet.stats.hunger = clamp(pet.stats.hunger - 3 * ticks, 0, 100);
  pet.stats.thirst = clamp(pet.stats.thirst - 4 * ticks, 0, 100);
  pet.stats.affection = clamp(pet.stats.affection - 2 * ticks, 0, 100);

  // vida só cai se estiver ruim
  let lifeLoss = 0;
  if (pet.stats.hunger < 20) lifeLoss += 3 * ticks;
  if (pet.stats.thirst < 20) lifeLoss += 3 * ticks;
  if (pet.stats.affection < 10) lifeLoss += 2 * ticks;

  pet.stats.life = clamp(pet.stats.life - lifeLoss, 0, 100);

  // avança updatedAt (pra não aplicar duas vezes se chamarem rápido)
  pet.timestamps.updatedAt = last + ticks * tickMs;
}