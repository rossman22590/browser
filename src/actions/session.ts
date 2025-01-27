"use server";

import {
  closeBrowserSession,
  getSessionUrl,
  createSession,
} from "@/lib/operator/session";

export async function createAndGetSessionUrl() {
  const session = await createSession();
  const url = await getSessionUrl(session.id);

  return { sessionId: session.id, url };
}

export async function closeSession(sessionId: string) {
  await closeBrowserSession(sessionId);
}
