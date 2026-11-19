const envId = (import.meta.env.VITE_TCB_ENV_ID as string | undefined)?.trim();
/** PG 模式的 Publishable Key（等价于 Supabase 的 anon key），控制台 → 环境 → API 密钥 获取 */
const accessKey = (import.meta.env.VITE_TCB_ACCESS_KEY as string | undefined)?.trim();
/** doc = 文档型数据库（传统模式）；pg = PostgreSQL 模式；为空时跟随环境自动判断 */
const modeEnv = ((import.meta.env.VITE_TCB_MODE as string | undefined) || "").trim().toLowerCase();

export function isCloudEnabled() {
  return Boolean(envId);
}

/** 是否使用 PostgreSQL 模式的数据层（rdb + realtime）*/
export function isPgMode() {
  return modeEnv === "pg" && Boolean(envId);
}

let dbPromise: Promise<any> | null = null;
let appRef: any = null;

export async function getCloudDb() {
  if (!envId) throw new Error("未配置 VITE_TCB_ENV_ID，无法连接云数据库");
  if (!dbPromise) {
    dbPromise = (async () => {
      const { default: cloudbase } = await import("@cloudbase/js-sdk");
      const app = cloudbase.init({ env: envId });
      appRef = app;
      const auth = app.auth({ persistence: "local" });
      if (!auth.hasLoginState()) {
        await auth.signInAnonymously();
      }
      return app.database();
    })();
  }
  return dbPromise;
}

export async function getCloudApp() {
  await getCloudDb();
  return appRef;
}

let pgPromise: Promise<any> | null = null;

/** PG 模式：初始化 JS SDK v3，匿名登录后返回 app（含 rdb() / realtime()）*/
export async function getPgApp() {
  if (!envId) throw new Error("未配置 VITE_TCB_ENV_ID，无法连接云数据库");
  if (!pgPromise) {
    pgPromise = (async () => {
      const { default: cloudbase } = await import("@cloudbase/js-sdk-v3");
      const app = cloudbase.init(
        accessKey ? { env: envId, accessKey } : { env: envId },
      );
      const auth = app.auth({ persistence: "local" });
      if (!auth.hasLoginState()) {
        await auth.signInAnonymously();
      }
      return app;
    })();
  }
  return pgPromise;
}

export async function getRdb() {
  const app = await getPgApp();
  return app.rdb();
}

export async function getRealtime() {
  const app = await getPgApp();
  return app.realtime();
}

/** 上传菜品图片到云存储，返回可访问的临时/永久链接 */
export async function uploadDishImage(file: File) {
  const app = await getCloudApp();
  const ext = file.name.split(".").pop() || "jpg";
  const cloudPath = `dishes/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await app.uploadFile({ cloudPath, filePath: file });
  const fileId = (res as any)?.fileID ?? (res as any)?.fileId;
  if (fileId) {
    const urlRes = await app.getTempFileURL({ fileList: [fileId] });
    const item = (urlRes as any)?.fileList?.[0];
    return (item?.tempFileURL as string) || fileId;
  }
  return "";
}
