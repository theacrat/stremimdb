import { Hono } from "hono";
import { getFullTitle, search } from "./imdb";
import { cors } from "hono/cors";
import { instantiateTmdb } from "./tmdb";
import { env } from "hono/adapter";
import { instantiatePrisma } from "./prisma";

type Bindings = {
  MY_KV: KVNamespace;
  DB: D1Database;
};

type Env = {
  TMDB_API: string;
  ImdbTmdb: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();
app.use("*", cors({ origin: "*" }));
app.use("*", async (c, next) => {
  const { TMDB_API, ImdbTmdb } = env<Env>(c);
  const apiKey = await c.text(TMDB_API).text();
  instantiateTmdb(apiKey);
  instantiatePrisma(ImdbTmdb);
  return await next();
});

app.get("/manifest.json", (c) => {
  return c.json({
    id: "pet.thea.stremimdb",
    version: "1.0.0",
    name: "StremIMDb",
    description: "IMDb metadata in Stremio",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IMDB_Logo_2016.svg/575px-IMDB_Logo_2016.svg.png",
    background:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IMDB_Logo_2016.svg/575px-IMDB_Logo_2016.svg.png",
    catalogs: [
      {
        type: "movie",
        id: "search",
        name: "Movies",
        extra: [
          {
            name: "search",
            isRequired: true,
          },
        ],
      },
      {
        type: "series",
        id: "search",
        name: "Series",
        extra: [
          {
            name: "search",
            isRequired: true,
          },
        ],
      },
    ],
    resources: ["catalog", "meta"],
    types: ["movie", "series"],
    idPrefixes: ["tt"],
    behaviorHints: {
      configurable: false,
      configurationRequired: false,
    },
  });
});

app.get("/meta/:type{(movie|series)}/:id", async (c) => {
  const { id } = c.req.param();

  const result = await getFullTitle(id.replace(".json", ""));
  return c.json({ meta: result });
});

app.get("/catalog/:type{(movie|series)}/search/:query", async (c) => {
  const { type, query } = c.req.param();
  const cleanedQuery = query.replace("search=", "").replace(".json", "");
  const result = await search(cleanedQuery, type);
  return c.json({ metas: result });
});

export default app;
