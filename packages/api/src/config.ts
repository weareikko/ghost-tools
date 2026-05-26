import type { GhostConfig } from "./types.ts";
import type { ConfigStoreFs } from "./utils/config-store.ts";

import { ConfigStore } from "./utils/config-store.ts";

const APP_NAME = "ghost-tools";
const ENV_URL = "GHOST_URL";
const ENV_STAFF_TOKEN = "GHOST_STAFF_TOKEN";
const ENV_CONTENT_KEY = "GHOST_CONTENT_KEY";

export function createConfigStore(fs?: ConfigStoreFs): ConfigStore<GhostConfig> {
  return new ConfigStore<GhostConfig>(APP_NAME, fs);
}

/**
 * Resolution priority for all fields: env var → config file → null.
 */
export function getUrl(configStore?: ConfigStore<GhostConfig>): string | null {
  const env = process.env[ENV_URL];
  if (env) return env;
  const store = configStore ?? createConfigStore();
  return store.getField("url") ?? null;
}

export function setUrl(url: string, configStore?: ConfigStore<GhostConfig>): void {
  const store = configStore ?? createConfigStore();
  store.update({ url });
}

export function getStaffAccessToken(configStore?: ConfigStore<GhostConfig>): string | null {
  const env = process.env[ENV_STAFF_TOKEN];
  if (env) return env;
  const store = configStore ?? createConfigStore();
  return store.getField("staffAccessToken") ?? null;
}

export function setStaffAccessToken(token: string, configStore?: ConfigStore<GhostConfig>): void {
  const store = configStore ?? createConfigStore();
  store.update({ staffAccessToken: token });
}

export function getContentApiKey(configStore?: ConfigStore<GhostConfig>): string | null {
  const env = process.env[ENV_CONTENT_KEY];
  if (env) return env;
  const store = configStore ?? createConfigStore();
  return store.getField("contentApiKey") ?? null;
}

export function setContentApiKey(key: string, configStore?: ConfigStore<GhostConfig>): void {
  const store = configStore ?? createConfigStore();
  store.update({ contentApiKey: key });
}

export function deleteConfig(configStore?: ConfigStore<GhostConfig>): void {
  const store = configStore ?? createConfigStore();
  store.delete();
}
