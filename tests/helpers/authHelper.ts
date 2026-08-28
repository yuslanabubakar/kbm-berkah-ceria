import { createSessionToken, COOKIE_NAME, type AuthUser } from "@/lib/auth";

export const TEST_USER_1: AuthUser = {
  id: "user-1",
  email: "irfan@example.com",
  name: "Irfan",
  avatarUrl: "https://example.com/avatar1.png",
};

export const TEST_USER_2: AuthUser = {
  id: "user-2",
  email: "yuslan@example.com",
  name: "Yuslan",
  avatarUrl: "https://example.com/avatar2.png",
};

export async function getAuthHeaders(
  user: AuthUser = TEST_USER_1,
): Promise<Record<string, string>> {
  const token = await createSessionToken(user);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    Cookie: `${COOKIE_NAME}=${token}`,
  };
}

export function createJsonRequest(
  url: string,
  method: string,
  body?: any,
  headers: Record<string, string> = {},
): Request {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
