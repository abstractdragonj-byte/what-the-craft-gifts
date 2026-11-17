import handler from "@tanstack/react-start/server-entry";
import installPageTemplate from "../scripts/install-page.html?raw";
import { grokOgIdentity } from "virtual:grok-og-identity";
import {
  acceptsHtml,
  createHeadInjector,
  isDocumentPath,
  isInstallQuery,
  renderInstallPageHtml,
  renderWebManifest,
} from "../scripts/grok-pwa-shared.mjs";

function requestHost(request: Request, url: URL): string {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
}

function injectHead(response: Response, host: string): Response {
  if (!response.body) return response;
  const injector = createHeadInjector({ host, site: grokOgIdentity.site });
  const body = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        for (const output of injector.push(chunk)) controller.enqueue(output);
      },
      flush(controller) {
        for (const output of injector.flush()) controller.enqueue(output);
      },
    }),
  );
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const host = requestHost(request, url);

    if (request.method.toUpperCase() === "GET") {
      if (
        url.pathname === "/__grok/manifest.webmanifest" ||
        url.pathname === "/__grok/manifest.json"
      ) {
        return new Response(renderWebManifest(host), {
          headers: {
            "content-type": "application/manifest+json; charset=utf-8",
            "cache-control": "no-cache",
          },
        });
      }

      if (
        isInstallQuery(url.pathname + url.search) &&
        isDocumentPath(url.pathname) &&
        acceptsHtml(request.headers.get("accept"))
      ) {
        return new Response(
          renderInstallPageHtml(installPageTemplate, {
            host,
            url: url.pathname + url.search,
          }),
          {
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "no-cache",
            },
          },
        );
      }
    }

    const response = await handler.fetch(request);
    if (
      request.method.toUpperCase() === "GET" &&
      isDocumentPath(url.pathname) &&
      response.body &&
      String(response.headers.get("content-type") ?? "").includes("text/html") &&
      !response.headers.get("content-encoding")
    ) {
      return injectHead(response, host);
    }
    return response;
  },
};
