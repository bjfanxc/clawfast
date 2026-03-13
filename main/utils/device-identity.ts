import { getPublicKeyAsync, signAsync, utils } from "@noble/ed25519";
import fs from "fs/promises";
import path from "path";
import { app } from "electron";
import crypto from "crypto";

// Polyfill global crypto for @noble/ed25519 if needed (Node 19+ has global crypto)
if (!globalThis.crypto) {
  // @ts-ignore
  globalThis.crypto = crypto;
}

type StoredIdentity = {
  version: 1;
  deviceId: string;
  publicKey: string;
  privateKey: string;
  createdAtMs: number;
};

export type DeviceIdentity = {
  deviceId: string;
  publicKey: string;
  privateKey: string;
};

const STORAGE_FILE_NAME = "device-identity.json";

function getStoragePath() {
    return path.join(app.getPath('userData'), STORAGE_FILE_NAME);
}

function base64UrlEncode(bytes: Uint8Array): string {
  // Use Buffer for Node.js environment which is faster and safer
  return Buffer.from(bytes).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Uint8Array {
  // Use Buffer for Node.js environment
  const normalized = input.replaceAll('-', '+').replaceAll('_', '/');
  return new Uint8Array(Buffer.from(normalized, 'base64'));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fingerprintPublicKey(publicKey: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", publicKey.slice().buffer);
  return bytesToHex(new Uint8Array(hash));
}

async function generateIdentity(): Promise<DeviceIdentity> {
  const privateKey = utils.randomSecretKey();
  const publicKey = await getPublicKeyAsync(privateKey);
  const deviceId = await fingerprintPublicKey(publicKey);
  return {
    deviceId,
    publicKey: base64UrlEncode(publicKey),
    privateKey: base64UrlEncode(privateKey),
  };
}

export async function loadOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const storagePath = getStoragePath();
  try {
    const raw = await fs.readFile(storagePath, 'utf-8');
    if (raw) {
      const parsed = JSON.parse(raw) as StoredIdentity;
      if (
        parsed?.version === 1 &&
        typeof parsed.deviceId === "string" &&
        typeof parsed.publicKey === "string" &&
        typeof parsed.privateKey === "string"
      ) {
        const derivedId = await fingerprintPublicKey(base64UrlDecode(parsed.publicKey));
        if (derivedId !== parsed.deviceId) {
          const updated: StoredIdentity = {
            ...parsed,
            deviceId: derivedId,
          };
          await fs.writeFile(storagePath, JSON.stringify(updated));
          return {
            deviceId: derivedId,
            publicKey: parsed.publicKey,
            privateKey: parsed.privateKey,
          };
        }
        return {
          deviceId: parsed.deviceId,
          publicKey: parsed.publicKey,
          privateKey: parsed.privateKey,
        };
      }
    }
  } catch {
    // fall through to regenerate
  }

  const identity = await generateIdentity();
  const stored: StoredIdentity = {
    version: 1,
    deviceId: identity.deviceId,
    publicKey: identity.publicKey,
    privateKey: identity.privateKey,
    createdAtMs: Date.now(),
  };
  await fs.writeFile(storagePath, JSON.stringify(stored));
  return identity;
}

export async function signDevicePayload(privateKeyBase64Url: string, payload: string) {
  const key = base64UrlDecode(privateKeyBase64Url);
  const data = new TextEncoder().encode(payload);
  const sig = await signAsync(data, key);
  return base64UrlEncode(sig);
}

export interface DeviceAuthPayloadParams {
    deviceId: string;
    clientId: string;
    clientMode: string;
    role: string;
    scopes: string[];
    signedAtMs: number;
    token?: string | null;
    nonce?: string | null;
    version?: 'v1' | 'v2';
  }

export function buildDeviceAuthPayload(params: DeviceAuthPayloadParams): string {
    const version = params.version ?? (params.nonce ? 'v2' : 'v1');
    const scopes = params.scopes.join(',');
    const token = params.token ?? '';
    const base = [
      version,
      params.deviceId,
      params.clientId,
      params.clientMode,
      params.role,
      scopes,
      String(params.signedAtMs),
      token,
    ];
    if (version === 'v2') base.push(params.nonce ?? '');
    return base.join('|');
}