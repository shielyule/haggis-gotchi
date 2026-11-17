import { onRequestGet as __h__id__ts_onRequestGet } from "/Users/shielyule/Desktop/haggis-gotchi-app/apps/mother/functions/h/[id].ts"

export const routes = [
    {
      routePath: "/h/:id",
      mountPath: "/h",
      method: "GET",
      middlewares: [],
      modules: [__h__id__ts_onRequestGet],
    },
  ]