
import "dotenv/config";
import { db } from "../server/db";
import { servicePosts } from "../shared/schema";
import { eq, ilike } from "drizzle-orm";

async function main() {
  const posts = await db.select().from(servicePosts).where(ilike(servicePosts.title, "%Bathroom%"));
  console.log(JSON.stringify(posts, null, 2));
  process.exit(0);
}

main().catch(console.error);
