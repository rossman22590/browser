"server only";
import { createSession } from "@/lib/operator/session";
import { type Browser, chromium, type Page } from "playwright-core";

interface BrowserSession {
  browser: Browser;
  page: Page;
}

let browserSession: BrowserSession | null = null;
let sessionId: string | null = null;

export function setSessionId(activeSessionId: string) {
  sessionId = activeSessionId;
}
export function getSessionId() {
  return sessionId;
}

async function getBrowser(sessionId: string) {
  const wsUrl = `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${sessionId}`;
  const browser = await chromium.connectOverCDP(wsUrl);
  const context = browser.contexts()[0];
  const page = context?.pages()[0];
  if (!page) {
    throw new Error("No page to use, error configuring browser session");
  }
  return { browser, page };
}

export async function getOrCreateBrowser(
  sessionId?: string
): Promise<BrowserSession> {
  if (browserSession) {
    return browserSession;
  }

  const activeSessionId = getSessionId();

  if (activeSessionId || sessionId) {
    const browser = await getBrowser(activeSessionId ?? sessionId!);
    browserSession = browser;
    return browser;
  }

  const session = await createSession();
  const browser = await getBrowser(session.id);
  browserSession = browser;
  return browser;
}
