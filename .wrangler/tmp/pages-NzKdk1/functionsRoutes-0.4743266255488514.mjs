import { onRequest as __api___path___js_onRequest } from "/Users/nader/projects/nader0913.github.io/functions/api/[[path]].js"

export const routes = [
    {
      routePath: "/api/:path*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___path___js_onRequest],
    },
  ]