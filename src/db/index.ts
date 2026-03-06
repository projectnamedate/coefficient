import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client/web";
import * as schema from "./schema";

let url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:./data/coefficient.db";

// @libsql/client/web needs https:// not libsql://
if (url.startsWith("libsql://")) {
  url = url.replace("libsql://", "https://");
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
