import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:./data/coefficient.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

// Use web client for remote Turso, native client for local SQLite
const isRemote = url.startsWith("libsql://") || url.startsWith("https://");

let client: any;
if (isRemote) {
  const { createClient } = await import("@libsql/client/web");
  client = createClient({ url, authToken });
} else {
  const { createClient } = await import("@libsql/client");
  client = createClient({ url, authToken });
}

export const db = drizzle(client, { schema });
