import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Get the OpenClaw configuration directory
 * Default: ~/.openclaw
 */
export function getOpenClawConfigDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.openclaw');
}

/**
 * Get the path to openclaw.json
 */
export function getOpenClawConfigPath(): string {
  return path.join(getOpenClawConfigDir(), 'openclaw.json');
}

/**
 * Read the Gateway Token from openclaw.json
 */
export async function getGatewayToken(): Promise<string | null> {
  const configPath = getOpenClawConfigPath();
  try {
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath);
      // Try multiple possible locations for the token based on config evolution
      return (
        config.gateway?.auth?.token ||
        config.gatewayToken ||
        null
      );
    }
  } catch (err) {
    console.error('Failed to read openclaw.json:', err);
  }
  return null;
}
