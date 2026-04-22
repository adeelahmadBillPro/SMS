"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

let initialized = false;
function initPosthogOnce() {
  if (initialized) return;
  if (typeof window === "undefined") return;
  if (!POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: false,
    disable_session_recording: true,
  });
  initialized = true;
}

export function PostHogProvider() {
  if (!POSTHOG_KEY) return null;
  return (
    <Suspense fallback={null}>
      <PostHogPageviews />
    </Suspense>
  );
}

function PostHogPageviews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPosthogOnce();
  }, []);

  useEffect(() => {
    if (!POSTHOG_KEY || !initialized) return;
    if (!pathname) return;
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
