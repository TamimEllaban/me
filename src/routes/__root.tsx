import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Heart, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import legacyTvCss from "../legacy-tv.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartoonCarLoader } from "../components/cartoon-loader";
import { installLegacyCustomEvent } from "../legacy-tv-polyfills";

if (typeof window !== "undefined") {
  installLegacyCustomEvent();
}

const legacyTvBootstrap = `(function(){try{var d=document.documentElement;var c=window.CSS&&CSS.supports;var vars=!!(c&&c("--legacy-tv","0"));var grid=!!(c&&c("display","grid"));var color=!!(c&&c("color","oklch(50% 0.1 20)"));var layer=false;var s=document.createElement("style");s.type="text/css";s.textContent="@layer legacy-tv-test { .legacy-tv-test { color: red; } }";var h=document.getElementsByTagName("head")[0];if(h){h.appendChild(s);layer=!!(s.sheet&&s.sheet.cssRules&&s.sheet.cssRules.length);s.parentNode.removeChild(s);}if(vars&&grid&&color&&layer){d.removeAttribute("data-tv-legacy");}else{d.setAttribute("data-tv-legacy","true");}}catch(e){document.documentElement.setAttribute("data-tv-legacy","true");}}());`;
const legacyTvNoModuleFix = `!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",(function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()}),!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();`;
declare const __LEGACY_ASSET_VERSION__: string;
const legacyAssetVersion =
  typeof __LEGACY_ASSET_VERSION__ === "string" ? __LEGACY_ASSET_VERSION__ : "dev";
const legacyTvPolyfillUrl = `/assets/polyfills-legacy.js?v=${legacyAssetVersion}`;
const legacyTvEntryUrl = `/assets/app-legacy.js?v=${legacyAssetVersion}`;
const legacyTvAutoFallback = `(function(){setTimeout(function(){if(window.__legacyTvStarted||window.__tamimHydrated)return;window.__legacyTvStarted=true;function boot(){if(window.System){System.import("${legacyTvEntryUrl}");}}if(window.System){boot();return;}var s=document.createElement("script");s.src="${legacyTvPolyfillUrl}";s.onload=boot;s.onerror=function(){window.__legacyTvStarted=false;};document.head.appendChild(s);},5000);}());`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "Tamim's World" },
      { name: "description", content: "A private family memory capsule." },
      { name: "author", content: "Family" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: legacyTvCss,
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://res.cloudinary.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-tv-legacy="true" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: legacyTvBootstrap }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        {/* TanStack Start emits the document through SSR, so the legacy
            plugin's index.html transform cannot add these tags for us. */}
        {import.meta.env.PROD ? (
          <>
            <script
              {...{ nomodule: "" }}
              dangerouslySetInnerHTML={{ __html: legacyTvNoModuleFix }}
            />
            <script {...{ nomodule: "" }} src={legacyTvPolyfillUrl} />
            <script
              {...{ nomodule: "" }}
              dangerouslySetInnerHTML={{
                __html: `window.__legacyTvStarted=!!window.System;if(window.System){System.import("${legacyTvEntryUrl}")}`,
              }}
            />
            <script dangerouslySetInnerHTML={{ __html: legacyTvAutoFallback }} />
          </>
        ) : null}
      </body>
    </html>
  );
}

function Splash({ name = "Tamim" }: { name?: string }) {
  const [visible, setVisible] = useState(true);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("tamim-splash-shown")) {
      setVisible(false);
      setGone(true);
      return;
    }
    try {
      sessionStorage.setItem("tamim-splash-shown", "1");
    } catch {
      /* storage unavailable — still play the splash */
    }
    const hide = setTimeout(() => setVisible(false), 2000);
    const remove = setTimeout(() => setGone(true), 2500);
    return () => {
      clearTimeout(hide);
      clearTimeout(remove);
    };
  }, []);
  if (gone) return null;
  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 px-6 text-center backdrop-blur-md transition-opacity duration-500 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div className="rounded-3xl border border-border/80 bg-card/95 p-6 sm:p-10 shadow-keepsake backdrop-blur">
        <CartoonCarLoader
          title={`${name}'s World`}
          subtitle="Ka-Chow! جاري تجهيز أحلى الذكريات... 🏎️"
        />
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as Window & { __tamimHydrated?: boolean }).__tamimHydrated = true;
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Splash />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
