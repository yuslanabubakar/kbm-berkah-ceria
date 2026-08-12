import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getDb } from "./db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const COOKIE_NAME = "kbm_session";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET || "kbm-berkah-ceria-default-secret-jwt-key-2026";
  return new TextEncoder().encode(secret);
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
};

export async function createSessionToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<AuthUser | null> {
  try {
    const verified = await jwtVerify(token, getSecretKey());
    const payload = verified.payload;
    if (!payload.sub || !payload.email) return null;
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: (payload.name as string) || (payload.email as string).split("@")[0],
      avatarUrl: (payload.avatarUrl as string) || null,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(
  req?: NextRequest | Request,
): Promise<AuthUser | null> {
  let token: string | undefined;

  if (req) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      const cookieHeader = req.headers.get("Cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(
          new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`),
        );
        if (match) {
          token = decodeURIComponent(match[1]);
        }
      }
    }
  }

  if (!token) {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    } catch {
      // Ignore if outside cookies() scope
    }
  }

  if (!token) return null;
  return verifySessionToken(token);
}

export async function upsertUserFromGoogle(profile: {
  id?: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<AuthUser> {
  const db = getDb();
  const userId = profile.id || profile.email;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, profile.email))
    .get();

  const now = new Date().toISOString();

  if (existing) {
    await db
      .update(users)
      .set({
        name: profile.name,
        avatarUrl: profile.picture || existing.avatarUrl,
      })
      .where(eq(users.id, existing.id));

    return {
      id: existing.id,
      email: existing.email,
      name: profile.name,
      avatarUrl: profile.picture || existing.avatarUrl,
    };
  } else {
    await db.insert(users).values({
      id: userId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture || null,
      createdAt: now,
    });

    return {
      id: userId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture || null,
    };
  }
}
