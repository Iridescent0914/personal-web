import handler from "vinext/server/fetch-handler";

// Handle the full-stack site and its D1-backed message route on Workers.
export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    return handler.fetch(request, env, ctx);
  },
};
