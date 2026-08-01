export async function confirmFyneLink(payload) {
  const apiUrl = String(process.env.FYNE_API_URL || '').replace(/\/$/, '');
  const token = process.env.FYNE_BOT_API_TOKEN || '';
  if (!apiUrl || !token) throw new Error('A integração FYNE não está configurada no bot.');

  const response = await fetch(`${apiUrl}/api/v1/bot/link/confirm`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const validation = data.errors ? Object.values(data.errors).flat().join(' ') : '';
    throw new Error(validation || data.message || `A API FYNE respondeu com status ${response.status}.`);
  }
  return data;
}
