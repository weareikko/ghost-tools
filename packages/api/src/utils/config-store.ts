import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

/**
 * XDG-compliant JSON configuration store.
 *
 * Stores configuration as JSON in a platform-specific directory:
 * - Linux: ~/.config/{appName}/config.json
 * - macOS: ~/Library/Application Support/{appName}/config.json
 * - Windows: %APPDATA%/{appName}/config.json
 */
export class ConfigStore<T extends object> {
  private readonly configPath: string;

  constructor(
    private readonly appName: string,
    private readonly fs: ConfigStoreFs = {
      existsSync,
      mkdirSync,
      readFileSync,
      writeFileSync,
      unlinkSync,
    },
  ) {
    this.configPath = this.resolveConfigPath();
  }

  get(): T | null {
    if (!this.fs.existsSync(this.configPath)) {
      return null;
    }
    try {
      const content = this.fs.readFileSync(this.configPath, "utf-8");
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  getField<K extends keyof T>(key: K): T[K] | undefined {
    return this.get()?.[key];
  }

  set(config: T): void {
    const dir = dirname(this.configPath);
    if (!this.fs.existsSync(dir)) {
      this.fs.mkdirSync(dir, { recursive: true });
    }
    this.fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  update(partial: Partial<T>): void {
    const existing = this.get() ?? ({} as T);
    this.set({ ...existing, ...partial });
  }

  delete(): void {
    if (this.fs.existsSync(this.configPath)) {
      this.fs.unlinkSync(this.configPath);
    }
  }

  getPath(): string {
    return this.configPath;
  }

  private resolveConfigPath(): string {
    const os = platform();

    if (os === "win32") {
      const appData = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
      return join(appData, this.appName, "config.json");
    }

    if (os === "darwin") {
      return join(homedir(), "Library", "Application Support", this.appName, "config.json");
    }

    const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
    return join(xdgConfig, this.appName, "config.json");
  }
}

export interface ConfigStoreFs {
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive: boolean }): string | undefined;
  readFileSync(path: string, encoding: BufferEncoding): string;
  writeFileSync(path: string, data: string, encoding: BufferEncoding): void;
  unlinkSync(path: string): void;
}
