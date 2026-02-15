
import { db } from "../server/db";
import { servicePosts } from "../shared/schema";

async function checkImages() {
  const posts = await db.select().from(servicePosts);
  console.log("Service Posts Feature Images:");
  posts.forEach(p => {
    console.log(`ID: ${p.id}, Title: ${p.title}, Image: ${p.featureImageUrl}`);
  });
  process.exit(0);
}

checkImages();
