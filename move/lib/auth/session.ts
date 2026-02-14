import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

const SESSION_COOKIE = "move_session";

function getSecret() {
  return process.env.SESSION_SECRET || "dev-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function encode(payload: string) {
  return `${payload}.${sign(payload)}`;
}

function decode(raw: string | undefined) {
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const valid = timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!valid) return null;
  return payload;
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  const token = encode(userId);
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const payload = decode(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  return prisma.user.findUnique({ where: { id: payload }, select: { id: true, username: true } });
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireUserForApi() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
