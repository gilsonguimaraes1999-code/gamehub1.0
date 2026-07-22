import { createFileRoute } from "@tanstack/react-router";
import { callAppsScriptGET, callAppsScriptPOST } from "@/lib/sghub.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(payload: unknown, init?: ResponseInit) {
  return Response.json(payload, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init?.headers || {}),
    },
  });
}

export const Route = createFileRoute("/api/apps-script")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query = Object.fromEntries(url.searchParams.entries());
        try {
          const result = await callAppsScriptGET(query);
          return jsonResponse(result);
        } catch (e) {
          return jsonResponse({ success: false, message: (e as Error).message });
        }
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Record<string, unknown>;
          const result = await callAppsScriptPOST(body);
          return jsonResponse(result);
        } catch (e) {
          return jsonResponse({ success: false, message: (e as Error).message });
        }
      },
    },
  },
});
