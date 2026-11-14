import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";

const COOKIE = "wtc_desk";
const SALT = "what-the-craft-desk-v1";
const MONTH = 60 * 60 * 24 * 30;

export const initialDeskHash = "08f76f9c7d6bccb44671c9ac11a68766c6e2a57566848d67d8d965928519c79e";

export function hashPassword(password: string) {
  return scryptSync(password, SALT, 32).toString("hex");
}

function matchHex(left: string, right: string) {
  if (!left || !right || left.length !== right.length) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function passwordsMatch(password: string, stored: string) {
  return matchHex(hashPassword(password), stored);
}

async function storedHash() {
  const sql = await getSql();
  const rows = await sql<{ desk_hash: string }>`select desk_hash from shop_settings where id = 'main'`;
  return rows[0]?.desk_hash || initialDeskHash;
}

export async function deskOpen() {
  const token = getCookie(COOKIE);
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (Number(exp) < Date.now()) return false;
  const expect = createHmac("sha256", await storedHash()).update(exp).digest("hex");
  return matchHex(sig, expect);
}

export async function assertDesk() {
  if (!(await deskOpen())) throw new Error("Desk is locked.");
}

function writeCookie(value: string, maxAge: number) {
  setCookie(COOKIE, value, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
  });
}

export async function openDesk(password: string) {
  const sql = await getSql();
  const stored = await storedHash();
  if (!passwordsMatch(password, stored)) return false;
  await sql`update shop_settings set desk_hash = ${stored} where id = 'main' and desk_hash = ''`;
  const exp = String(Date.now() + MONTH * 1000);
  const sig = createHmac("sha256", stored).update(exp).digest("hex");
  writeCookie(`${exp}.${sig}`, MONTH);
  return true;
}

export async function closeDesk() {
  writeCookie("", 0);
}

export async function changeDeskPassword(next: string) {
  const trimmed = next.trim();
  if (trimmed.length < 8) throw new Error("Use at least 8 characters.");
  const sql = await getSql();
  const hashed = hashPassword(trimmed);
  await sql`update shop_settings set desk_hash = ${hashed} where id = 'main'`;
  const exp = String(Date.now() + MONTH * 1000);
  const sig = createHmac("sha256", hashed).update(exp).digest("hex");
  writeCookie(`${exp}.${sig}`, MONTH);
}
