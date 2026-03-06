import { drizzle } from "drizzle-orm/libsql/web";
import * as schema from "./schema";

let url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
if (url.startsWith("libsql://")) {
  url = url.replace("libsql://", "https://");
}

export const db = drizzle({
  connection: {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  schema,
});
