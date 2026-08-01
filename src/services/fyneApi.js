async function fyneRequest(path, payload) {
  const apiUrl = String(process.env.FYNE_API_URL || '').replace(/\/$/, '');
  const token = process.env.FYNE_BOT_API_TOKEN || '';
  if (!apiUrl || !token) throw new Error('A integração FYNE não está configurada no bot.');
  const response = await fetch(apiUrl + path, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const validation = data.errors ? Object.values(data.errors).flat().join(' ') : ''; const error = new Error(validation || data.message || 'A API FYNE respondeu com status ' + response.status + '.'); error.status = response.status; throw error; }
  return data;
}
export function confirmFyneLink(payload) { return fyneRequest('/api/v1/bot/link/confirm', payload); }
export function createFyneLoginLink(payload) { return fyneRequest('/api/v1/bot/login-link', payload); }
export function getFyneProfile(whatsapp_lid) { return fyneRequest('/api/v1/bot/profile', { whatsapp_lid }); }
