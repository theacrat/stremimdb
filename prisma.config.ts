import { listLocalDatabases } from "@prisma/adapter-d1";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `file:${listLocalDatabases().pop()}`,
  },
});
