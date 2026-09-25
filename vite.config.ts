// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { transformSync } from "@babel/core";
import babelPresetEnv from "@babel/preset-env";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import legacy from "@vitejs/plugin-legacy";
import type { Plugin } from "vite";

const legacyAssetVersion =
  process.env["VERCEL_GIT_COMMIT_SHA"] ||
  process.env["GITHUB_SHA"] ||
  `build-${Date.now().toString(36)}`;

type LegacyPlugin = Plugin;
type Environment = Parameters<NonNullable<Plugin["applyToEnvironment"]>>[0];

function transpileLegacyPolyfill(code: string): string {
  const result = transformSync(code, {
    babelrc: false,
    configFile: false,
    sourceMaps: false,
    presets: [
      [
        babelPresetEnv,
        {
          bugfixes: true,
          modules: false,
          shippedProposals: true,
          targets: ["Chrome >= 38"],
        },
      ],
    ],
  });

  return result?.code ?? code;
}

function clientOnly(plugin: LegacyPlugin): LegacyPlugin {
  const originalGenerateBundle = plugin.generateBundle;
  const wrappedPlugin: LegacyPlugin = {
    ...plugin,
    applyToEnvironment(environment: Environment) {
      return environment.name === "client";
    },
  };

  if (
    plugin.name === "vite:legacy-generate-polyfill-chunk" &&
    typeof originalGenerateBundle === "function"
  ) {
    wrappedPlugin.generateBundle = async function (options, bundle) {
      const originalEmitFile = this.emitFile;
      const pluginContext = new Proxy(this, {
        get(target, property) {
          if (property === "emitFile") {
            return (file: Parameters<typeof originalEmitFile>[0]) => {
              const emittedFile =
                file.type === "prebuilt-chunk" && file.fileName.includes("polyfills-legacy")
                  ? {
                      ...file,
                      code: transpileLegacyPolyfill(file.code),
                      isEntry: false,
                    }
                  : file;
              return originalEmitFile.call(target, emittedFile);
            };
          }
          return Reflect.get(target, property);
        },
      });
      return originalGenerateBundle.call(pluginContext, options, bundle, false);
    };
  }

  return wrappedPlugin;
}

const legacyPlugins = legacy({
  targets: ["Chrome >= 38", "Edge >= 12", "Safari >= 8", "iOS >= 10", "Firefox >= 52"],
  // Keep the module path parseable on webOS builds that support modules but
  // predate the plugin's very high default modern target.
  modernTargets: ["Chrome >= 60", "Edge >= 79", "Firefox >= 60", "Safari >= 12", "iOS >= 12"],
  modernPolyfills: false,
  additionalLegacyPolyfills: [
    "core-js/modules/es.symbol.js",
    "core-js/modules/es.promise.js",
    "core-js/proposals/global-this",
    "core-js/modules/web.dom-collections.iterator.js",
    "core-js/modules/web.dom-collections.for-each.js",
    "core-js/modules/web.queue-microtask.js",
    "core-js/modules/web.url.js",
    "core-js/modules/web.url-search-params.js",
    "whatwg-fetch",
    "abort-controller/polyfill",
    "text-encoding",
    "web-streams-polyfill/polyfill/es5",
    "resize-observer-polyfill",
    "intersection-observer",
    "closest-polyfill",
    "core-js/modules/es.array.flat.js",
    "core-js/modules/es.array.flat-map.js",
    "core-js/modules/es.array.from.js",
    "core-js/modules/es.array.includes.js",
    "core-js/modules/es.array.find.js",
    "core-js/modules/es.array.find-index.js",
    "core-js/modules/es.object.assign.js",
    "core-js/modules/es.object.entries.js",
    "core-js/modules/es.object.from-entries.js",
    "core-js/modules/es.object.values.js",
    "core-js/modules/es.promise.finally.js",
    "core-js/modules/es.promise.all-settled.js",
    "core-js/modules/es.promise.any.js",
    "core-js/modules/es.array.at.js",
    "core-js/modules/es.array.to-sorted.js",
    "core-js/modules/es.string.replace-all.js",
    "core-js/modules/es.object.has-own.js",
    "core-js/modules/es.object.get-own-property-descriptors.js",
    "core-js/modules/web.dom-exception.constructor.js",
    "core-js/modules/es.string.includes.js",
    "core-js/modules/es.string.pad-start.js",
    "core-js/modules/es.string.pad-end.js",
  ],
}).map(clientOnly);

function installLegacyOutputsInClientEnvironment(): Plugin {
  return {
    name: "legacy-outputs-client-environment",
    enforce: "post",
    applyToEnvironment(environment: Environment) {
      return environment.name === "client";
    },
    configResolved(config) {
      const outputs = config.build.rolldownOptions?.output;
      const clientBuild = config.environments?.["client"]?.build;
      if (Array.isArray(outputs) && clientBuild) {
        const clientOutputs = outputs.map((output) => {
          if (String(output.entryFileNames).includes("-legacy")) {
            // Rolldown's legacy minifier preserves ES2015 syntax. Keep this
            // output unminified so Babel's ES5 result is not reintroduced.
            return { ...output, minify: false };
          }
          return output;
        });
        clientBuild.rolldownOptions ??= {};
        clientBuild.rolldownOptions.output = clientOutputs;
      }
    },
    // TanStack Start renders the document through its SSR manifest rather than
    // Vite's index.html transform. Publish stable aliases so RootShell can
    // reference the legacy entry and polyfills from the streamed document.
    async writeBundle(options, bundle) {
      const legacyEntry = Object.values(bundle).find(
        (output) =>
          output.type === "chunk" && output.isEntry && output.fileName.includes("-legacy-"),
      );
      const legacyPolyfills = Object.values(bundle).find(
        (output) => output.type === "chunk" && output.fileName.includes("polyfills-legacy"),
      );

      if (!legacyEntry && !legacyPolyfills) return;
      if (
        !legacyEntry ||
        legacyEntry.type !== "chunk" ||
        !legacyPolyfills ||
        legacyPolyfills.type !== "chunk" ||
        !options.dir
      ) {
        throw new Error("Legacy client assets were not emitted as expected.");
      }

      const assetsDir = resolve(options.dir, "assets");
      await mkdir(assetsDir, { recursive: true });
      await Promise.all([
        writeFile(resolve(assetsDir, "app-legacy.js"), legacyEntry.code, "utf8"),
        writeFile(resolve(assetsDir, "polyfills-legacy.js"), legacyPolyfills.code, "utf8"),
      ]);
    },
  };
}

export default defineConfig({
  plugins: [...legacyPlugins, installLegacyOutputsInClientEnvironment()],
  vite: {
    define: {
      __LEGACY_ASSET_VERSION__: JSON.stringify(legacyAssetVersion),
    },
    build: {
      cssTarget: "chrome38",
    },
  },
  nitro: {
    inlineDynamicImports: true,
    rolldownConfig: {
      output: {
        codeSplitting: false,
      },
    },
  } as Record<string, unknown>,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
