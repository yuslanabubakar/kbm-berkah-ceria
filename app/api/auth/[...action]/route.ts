import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAME,
  createSessionToken,
  getCurrentUser,
  upsertUserFromGoogle,
} from "@/lib/auth";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: { action: string[] } },
) {
  const action = params.action?.[0];
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  // 1. LOGIN
  if (action === "login") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        {
          error: "GOOGLE_CLIENT_ID is not configured in environment variables.",
        },
        { status: 500 },
      );
    }

    const redirectUri = `${origin}/api/auth/callback`;
    const googleAuthUrl = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("prompt", "select_account");

    return NextResponse.redirect(googleAuthUrl.toString());
  }

  // 2. CALLBACK
  if (action === "callback") {
    const code = url.searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(`${origin}?auth_error=no_code`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${origin}/api/auth/callback`;

    try {
      // Exchange authorization code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId || "",
          client_secret: clientSecret || "",
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = (await tokenRes.json()) as {
        access_token?: string;
        id_token?: string;
      };
      if (!tokenData.access_token) {
        console.error("Failed to exchange Google OAuth token", tokenData);
        return NextResponse.redirect(`${origin}?auth_error=token_failed`);
      }

      // Fetch User Info
      const userRes = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        },
      );
      const userInfo = (await userRes.json()) as {
        id: string;
        email: string;
        name: string;
        picture?: string;
      };

      if (!userInfo.email) {
        return NextResponse.redirect(`${origin}?auth_error=no_email`);
      }

      // Upsert User in D1 Database
      const authUser = await upsertUserFromGoogle(userInfo);

      // Create JWT Session Token
      const sessionToken = await createSessionToken(authUser);

      const response = NextResponse.redirect(origin);
      response.cookies.set(COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    } catch (err) {
      console.error("Google OAuth error", err);
      return NextResponse.redirect(`${origin}?auth_error=server_error`);
    }
  }

  // 3. LOGOUT
  if (action === "logout") {
    const response = NextResponse.redirect(origin);
    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  // 4. ME (Get current user)
  if (action === "me") {
    const user = await getCurrentUser(request);
    return NextResponse.json({ user });
  }

  return NextResponse.json({ error: "Unknown auth action" }, { status: 404 });
}
