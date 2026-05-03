import type { Session } from "next-auth";

export function userAvatarImageUrl(user: NonNullable<Session["user"]>): string | undefined {
  const fromOAuth = user.image?.trim();
  if (fromOAuth) return fromOAuth;
  const login = user.githubLogin?.trim();
  if (login) return `https://github.com/${login}.png`;
  return undefined;
}
