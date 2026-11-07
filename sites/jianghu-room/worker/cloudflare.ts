import handler from "vinext/server/fetch-handler";

// Standalone Cloudflare entrypoint. The existing Sites Worker remains available
// while the GitHub deployment is being set up.
export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    return handler.fetch(request, env, ctx);
  },
};
