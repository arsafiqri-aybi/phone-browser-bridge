export class BridgeError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export const MUTATIONS = new Set(['open', 'switch', 'close', 'navigate', 'back', 'reload', 'click', 'type', 'scroll']);
export const METHODS = new Set([...MUTATIONS, 'tabs', 'read', 'screenshot']);
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}
export async function hash(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(x => x.toString(16).padStart(2, '0')).join('');
}
export function randomToken() { return crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''); }
export function json(value, status = 200, headers = {}) { return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } }); }
export async function body(request, limit = 65536) {
  if (Number(request.headers.get('Content-Length') || 0) > limit) throw new BridgeError('BODY_TOO_LARGE', 413);
  const reader = request.body?.getReader(); let length = 0; const chunks = [];
  if (!reader) throw new BridgeError('BODY_REQUIRED');
  while (true) { const {value, done} = await reader.read(); if (done) break; length += value.length; if (length > limit) { await reader.cancel(); throw new BridgeError('BODY_TOO_LARGE', 413); } chunks.push(value); }
  const bytes = new Uint8Array(length); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
  try { const value = JSON.parse(new TextDecoder().decode(bytes)); if (!value || Array.isArray(value) || typeof value !== 'object') throw Error(); return value; } catch { throw new BridgeError('INVALID_JSON'); }
}
export function validId(id) { if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(id)) throw new BridgeError('INVALID_ID'); return id; }
export function validateCommand(method, payload) {
  if (!METHODS.has(method)) throw new BridgeError('UNSUPPORTED_METHOD');
  if (!payload || Array.isArray(payload) || typeof payload !== 'object' || JSON.stringify(payload).length > 16000) throw new BridgeError('BAD_PAYLOAD');
  const allowed = {
    tabs: [], open: ['url'], switch: ['tabId'], close: ['tabId'], navigate: ['tabId','url','expectedOrigin'],
    back: ['tabId','expectedOrigin'], reload: ['tabId','expectedOrigin'], read: ['tabId'], screenshot: ['tabId'],
    click: ['tabId','ref','documentId','generation','expectedOrigin','consent'], type: ['tabId','ref','documentId','generation','expectedOrigin','text','consent'], scroll: ['tabId','dy','expectedOrigin']
  }[method];
  if (Object.keys(payload).some(k => !allowed.includes(k))) throw new BridgeError('UNKNOWN_FIELD');
  if (!['tabs','open'].includes(method) && (typeof payload.tabId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(payload.tabId))) throw new BridgeError('BAD_TAB_ID');
  if (['open','navigate'].includes(method)) {
    let u; try { u = new URL(payload.url); } catch { throw new BridgeError('BAD_URL'); }
    if (!['https:','http:'].includes(u.protocol) || u.username || u.password || payload.url.length > 2048) throw new BridgeError('BAD_URL');
  }
  if (['click','type'].includes(method)) {
    if (payload.consent !== true) throw new BridgeError('EXPLICIT_ACTION_CONSENT_REQUIRED');
    if (typeof payload.ref !== 'string' || !/^\d{1,3}$/.test(payload.ref) || typeof payload.documentId !== 'string' || !Number.isSafeInteger(payload.generation) || typeof payload.expectedOrigin !== 'string') throw new BridgeError('REFERENCE_REQUIRED');
  }
  if (method === 'type' && (typeof payload.text !== 'string' || payload.text.length > 4096)) throw new BridgeError('BAD_TEXT');
  if (method === 'scroll' && (!Number.isInteger(payload.dy) || Math.abs(payload.dy) > 4000)) throw new BridgeError('BAD_SCROLL');
}
export function authorizeDevice(principal, device) {
  if (!device || device.revoked || principal.ownerId !== device.ownerId || (principal.devices !== '*' && !principal.devices.includes(device.deviceId))) throw new BridgeError('DEVICE_SCOPE_DENIED', 403);
}
export function requireOrigin(request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) throw new BridgeError('ORIGIN_DENIED', 403);
}
export function timingEqual(a,b) { if (a.length !== b.length) return false; let out=0;for(let i=0;i<a.length;i++)out|=a.charCodeAt(i)^b.charCodeAt(i);return out===0; }
