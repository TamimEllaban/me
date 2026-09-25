import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

const legacyTsrScript =
  "self.$_TSR={h:function(){this.hydrated=true,this.c()},e:function(){this.streamEnded=true,this.c()},c:function(){this.hydrated&&this.streamEnded&&(delete self.$_TSR,delete self.$R.tsr)},p:function(e){this.initialized?e():this.buffer.push(e)},buffer:[]};";
const legacyScrollRestorationScript =
  "(function(){var k='tsr-scroll-restoration-v1_3',b,s,i,x,y,r;try{b=JSON.parse(sessionStorage.getItem(k)||'{}')}catch(e){return}s=history.state||{};i=b[s.__TSR_key||''];for(x in i){if(!Object.prototype.hasOwnProperty.call(i,x))continue;y=i[x]||{};if(typeof y.scrollX==='number'&&typeof y.scrollY==='number'&&isFinite(y.scrollX)&&isFinite(y.scrollY)){if(x==='window'){scrollTo(y.scrollX,y.scrollY);r=true}else if(x){try{var e=document.querySelector(x);if(e){e.scrollLeft=y.scrollX;e.scrollTop=y.scrollY}}catch(e){}}}}if(r)return;var h=location.hash.slice(1);if(h){var e=document.getElementById(h);if(e&&e.scrollIntoView)e.scrollIntoView(true)}else if(scrollTo)scrollTo(0,0)})();if(document.currentScript)document.currentScript.remove();";

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// TanStack's streamed document contains a modern method/arrow bootstrap even
// when the client bundle is legacy. Convert those inline snippets only for
// old TV user agents; modern requests keep the normal streaming path.
function needsLegacyInlineScripts(request: Request): boolean {
  const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";
  if (!userAgent) return true;
  if (/webos|web0s|lg netcast|lg browser|smarttv|smart tv/.test(userAgent)) return true;

  const chromeVersion = userAgent.match(/(?:chrome|crios)\/(\d+)/)?.[1];
  if (chromeVersion && Number(chromeVersion) < 57) return true;

  const edgeVersion = userAgent.match(/edge\/(\d+)/)?.[1];
  if (edgeVersion && Number(edgeVersion) < 16) return true;

  const safariVersion = userAgent.match(/version\/(\d+)(?:\.\d+)?.*safari/)?.[1];
  return Boolean(safariVersion && Number(safariVersion) < 10);
}

function makeInlineScriptsLegacySafe(html: string): string {
  let safeHtml = html.replace(
    /self\.\$_TSR=\{h\(\)\{this\.hydrated=!0,this\.c\(\)\},e\(\)\{this\.streamEnded=!0,this\.c\(\)\},c\(\)\{this\.hydrated&&this\.streamEnded&&\(delete self\.\$_TSR,delete self\.\$R\.tsr\)\},p\(e\)\{this\.initialized\?e\(\):this\.buffer\.push\(e\)\},buffer:\[\]\};/g,
    legacyTsrScript,
  );

  const routerStart = safeHtml.indexOf("$_TSR.router=($R=>$R[0]=");
  if (routerStart >= 0) {
    const replacement = "$_TSR.router=(function($R){return $R[0]=";
    safeHtml =
      safeHtml.slice(0, routerStart) +
      replacement +
      safeHtml.slice(routerStart + "$_TSR.router=($R=>$R[0]=".length);
    const routerEnd = safeHtml.indexOf('})($R["tsr"]);', routerStart);
    if (routerEnd >= 0) {
      safeHtml =
        safeHtml.slice(0, routerEnd) +
        '}})($R["tsr"]);' +
        safeHtml.slice(routerEnd + '})($R["tsr"]);'.length);
    }
  }

  const scrollMarker = safeHtml.indexOf("tsr-scroll-restoration-v1_3");
  if (scrollMarker >= 0) {
    const scriptStart = safeHtml.lastIndexOf("<script", scrollMarker);
    const scriptEnd = safeHtml.indexOf("</script>", scrollMarker);
    if (scriptStart >= 0 && scriptEnd >= 0) {
      safeHtml =
        safeHtml.slice(0, scriptStart) +
        `<script>${legacyScrollRestorationScript}</script>` +
        safeHtml.slice(scriptEnd + "</script>".length);
    }
  }

  return safeHtml;
}

function addUserAgentVary(headers: Headers) {
  const vary = headers.get("vary");
  if (vary === "*") return;
  if (!vary) {
    headers.set("vary", "User-Agent");
    return;
  }
  const values = vary.split(",").map((value) => value.trim().toLowerCase());
  if (!values.includes("user-agent")) {
    headers.set("vary", vary ? `${vary}, User-Agent` : "User-Agent");
  }
}

async function prepareLegacyHtmlResponse(request: Request, response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") || !response.body) return response;

  const headers = new Headers(response.headers);
  addUserAgentVary(headers);
  if (!needsLegacyInlineScripts(request)) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  try {
    const html = await response.clone().text();
    await response.body?.cancel().catch(() => undefined);
    const safeHtml = makeInlineScriptsLegacySafe(html);
    if (safeHtml === html) {
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    headers.delete("content-length");
    return new Response(safeHtml, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error("legacy HTML script transform failed", error);
    return response;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalizedResponse = await normalizeCatastrophicSsrResponse(response);
      return await prepareLegacyHtmlResponse(request, normalizedResponse);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
  },
};
