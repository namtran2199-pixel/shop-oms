export const AUTH_COOKIE_NAME = "oms_session";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "oms_local_secret";

export type AuthUser = {
  sub: string;
  username: string;
  displayName: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
  exp: number;
};

function toBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toBase64Url(new Uint8Array(digest));
}

export async function hashPassword(password: string) {
  return sha256(`password:${AUTH_SECRET}:${password}`);
}

export async function verifyPassword(password: string, passwordHash: string) {
  const hashedInput = await hashPassword(password);
  return hashedInput === passwordHash;
}

export async function createAuthToken(payload: {
  userId: string;
  username: string;
  displayName: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
}) {
  const body: AuthUser = {
    sub: payload.userId,
    username: payload.username.trim().toLowerCase(),
    displayName: payload.displayName,
    role: payload.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const encodedPayload = toBase64Url(
    new TextEncoder().encode(JSON.stringify(body)),
  );
  const signature = await sha256(`${encodedPayload}.${AUTH_SECRET}`);
  return `${encodedPayload}.${signature}`;
}

export async function readAuthToken(token?: string) {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  const expectedSignature = await sha256(`${encodedPayload}.${AUTH_SECRET}`);
  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload)),
    ) as AuthUser;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifyAuthToken(token?: string) {
  return Boolean(await readAuthToken(token));
}

function getCookieValue(cookieHeader: string, name: string) {
  const entry = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

export async function getAuthUserFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = getCookieValue(cookieHeader, AUTH_COOKIE_NAME);
  return readAuthToken(token);
}
