import { drizzle } from "drizzle-orm/libsql/web";
import * as schema from "./schema";

let url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
if (url.startsWith("libsql://")) {
  url = url.replace("libsql://", "https://");
}

// Strip whitespace/newlines that Vercel env vars may introduce
const authToken = (process.env.TURSO_AUTH_TOKEN ?? "").replace(/\s+/g, "");

export const db = drizzle({
  connection: {
    url,
    authToken,
  },
  schema,
});
