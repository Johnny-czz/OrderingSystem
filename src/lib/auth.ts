import type { Identity, Member, Settings } from "@/types";
import { colorFor, uid } from "./utils";

const IDENTITY_KEY = "family-ordering::identity::v1";

export function randomSalt() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function sha256(text: string) {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // 非安全上下文（如局域网 http）下的降级实现
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    h1 = (h1 ^ c) * 0x01000193 >>> 0;
    h2 = (h2 + c * (i + 7)) >>> 0;
  }
  return `f${h1.toString(16)}${h2.toString(16)}`;
}

export async function hashPassword(password: string, salt: string) {
  return sha256(`${salt}::${password}::family-ordering`);
}

/** 内置管理员初始账号密码，登录后强制修改 */
export const DEFAULT_ADMIN = { username: "admin", password: "123456" };

export async function buildDefaultSettings(): Promise<Settings> {
  const salt = randomSalt();
  return {
    familyName: "我家小厨房",
    notice: "今天想吃什么？点完我来做～",
    authMode: "guest",
    adminUsername: DEFAULT_ADMIN.username,
    adminSalt: salt,
    adminPasswordHash: await hashPassword(DEFAULT_ADMIN.password, salt),
    adminMustChangePassword: true,
  };
}

export async function verifyAdmin(settings: Settings, username: string, password: string) {
  if (username.trim() !== settings.adminUsername) return false;
  const hash = await hashPassword(password, settings.adminSalt);
  return hash === settings.adminPasswordHash;
}

export async function verifyMember(members: Member[], username: string, password: string) {
  const target = members.find(
    (m) => m.active && m.username && m.username.trim() === username.trim()
  );
  if (!target?.passwordSalt || !target.passwordHash) return null;
  const hash = await hashPassword(password, target.passwordSalt);
  return hash === target.passwordHash ? target : null;
}

export function makeMember(name: string, role: Member["role"] = "member"): Member {
  return {
    _id: uid("m"),
    name,
    role,
    color: colorFor(name),
    active: true,
    createdAt: Date.now(),
  };
}

export function identityFromMember(member: Member): Identity {
  return {
    memberId: member._id ?? uid("m"),
    name: member.name,
    role: member.role,
    color: member.color || colorFor(member.name),
  };
}

export function guestIdentity(name: string): Identity {
  return {
    memberId: `guest_${name}`,
    name,
    role: "member",
    color: colorFor(name),
  };
}

export function loadIdentity(): Identity | null {
  const raw = localStorage.getItem(IDENTITY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Identity;
  } catch (error) {
    console.error("读取本地身份失败", error);
    return null;
  }
}

export function saveIdentity(identity: Identity | null) {
  if (!identity) {
    localStorage.removeItem(IDENTITY_KEY);
    return;
  }
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}
