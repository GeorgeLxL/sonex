"use client";

/**
 * Google reCAPTCHA v3 (invisible, score-based). Loads the script on first
 * use. When NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set, returns null and the
 * server skips verification — so the site works before keys are registered.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

declare global {
  interface Window {
    grecaptcha?: {
      ready(cb: () => void): void;
      execute(siteKey: string, opts: { action: string }): Promise<string>;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("reCAPTCHA failed to load"));
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/** Token for the given action, or null when reCAPTCHA is not configured
 *  or unreachable (the server treats a missing token as failed when keys
 *  are set, so bots can't bypass by blocking the script). */
export async function getRecaptchaToken(action: string): Promise<string | null> {
  if (!SITE_KEY) return null;
  try {
    await loadScript();
    await new Promise<void>((r) => window.grecaptcha!.ready(r));
    return await window.grecaptcha!.execute(SITE_KEY, { action });
  } catch {
    return null;
  }
}
