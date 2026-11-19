import type { DataDriver } from "./driver";
import { localDriver } from "./localDriver";
import { cloudDriver } from "./cloudDriver";
import { pgDriver } from "./pgDriver";
import { isCloudEnabled, isPgMode } from "./cloudbase";

export const IS_CLOUD = isCloudEnabled();

/** pg = PostgreSQL 模式；cloud = 文档型数据库；local = 本机演示数据 */
export const DATA_BACKEND: "pg" | "cloud" | "local" = !IS_CLOUD
  ? "local"
  : isPgMode()
    ? "pg"
    : "cloud";

const initialDriver: DataDriver =
  DATA_BACKEND === "local" ? localDriver : DATA_BACKEND === "pg" ? pgDriver : cloudDriver;

/**
 * 对外始终暴露同一个对象（Proxy），云初始化失败时可在内部切回本地驱动，
 * 页面不会白屏，而是降级为演示数据。
 */
let activeDriver: DataDriver = initialDriver;

export const driver: DataDriver = new Proxy({} as DataDriver, {
  get(_target, prop) {
    const value = (activeDriver as any)[prop];
    return typeof value === "function" ? value.bind(activeDriver) : value;
  },
});

/** 当前实际生效的驱动名（可能已从云降级为 local） */
export const activeBackend = () => activeDriver.name;

export const dataMode = initialDriver.name;

let initPromise: Promise<void> | null = null;

export function ensureDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await initialDriver.init();
      } catch (error) {
        console.error("云数据初始化失败，降级为本机演示数据", error);
        activeDriver = localDriver;
        await localDriver.init();
      }
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}
