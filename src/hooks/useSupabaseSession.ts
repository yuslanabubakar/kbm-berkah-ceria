"use client";

import { useAuth } from "./useAuth";

export function useSupabaseSession() {
  const { user, loading } = useAuth();

  const legacyUser = user
    ? {
        id: user.id,
        email: user.email,
        user_metadata: { full_name: user.name, avatar_url: user.avatarUrl },
      }
    : null;

  return {
    session: user ? { user: legacyUser } : null,
    user: legacyUser,
    loading,
  };
}
