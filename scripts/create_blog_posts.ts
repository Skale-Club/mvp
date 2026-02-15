
import "dotenv/config";
import { db } from "../server/db";
import { blogPosts } from "../shared/schema";

async function main() {
  const posts = [
    {
      title: "Top 5 Bathroom Remodeling Trends for 2026",
      slug: "top-5-bathroom-remodeling-trends-2026",
      content: `
        <h2>1. Spa-Like Features</h2>
        <p>Homeowners are increasingly turning their bathrooms into personal retreats. Think steam showers, soaking tubs, and heated floors.</p>
        
        <h2>2. Sustainable Materials</h2>
        <p>Eco-friendly materials like reclaimed wood, recycled glass tiles, and low-flow fixtures are becoming standard.</p>
        
        <h2>3. Smart Technology</h2>
        <p>From digital shower controls to smart mirrors with built-in lighting and defogging, technology is making bathrooms more convenient.</p>
        
        <h2>4. Bold Colors and Patterns</h2>
        <p>While white bathrooms are timeless, we're seeing a shift towards moody blues, deep greens, and patterned tiles for accent walls.</p>
        
        <h2>5. Floating Vanities</h2>
        <p>Floating vanities create a sense of space and offer a modern, clean look that is perfect for contemporary homes.</p>
      `,
      excerpt: "Discover the latest trends in bathroom design, from spa-like features to smart technology.",
      metaDescription: "Explore the top bathroom remodeling trends for 2026, including spa features, sustainable materials, and smart tech.",
      focusKeyword: "Bathroom Remodeling Trends",
      tags: "Bathroom, Remodeling, Trends, 2026",
      status: "published",
      authorName: "MVP Remodeling Team",
      publishedAt: new Date(),
    },
    {
      title: "How to Increase Your Home Value with a Kitchen Remodel",
      slug: "increase-home-value-kitchen-remodel",
      content: `
        <p>The kitchen is often considered the heart of the home, and it's also one of the best places to invest if you want to increase your property value.</p>
        
        <h2>Focus on Functionality</h2>
        <p>A beautiful kitchen that doesn't work well is a missed opportunity. Ensure the "work triangle" (sink, stove, fridge) is efficient.</p>
        
        <h2>Update Cabinets and Countertops</h2>
        <p>Refacing or replacing cabinets and installing quartz or granite countertops can instantly transform the look of the room.</p>
        
        <h2>Energy-Efficient Appliances</h2>
        <p>Modern buyers look for energy efficiency. Upgrading to Energy Star-rated appliances can be a major selling point.</p>
        
        <h2>Lighting Matters</h2>
        <p>Layered lighting—ambient, task, and accent—makes a kitchen feel warm and welcoming while being functional.</p>
      `,
      excerpt: "Learn how a strategic kitchen remodel can significantly boost your home's market value.",
      metaDescription: "Maximize your ROI with these kitchen remodeling tips designed to increase home value.",
      focusKeyword: "Kitchen Remodel ROI",
      tags: "Kitchen, Real Estate, Home Value, Renovation",
      status: "published",
      authorName: "MVP Remodeling Team",
      publishedAt: new Date(),
    },
    {
      title: "The Ultimate Guide to Choosing the Right Flooring",
      slug: "guide-choosing-right-flooring",
      content: `
        <p>Flooring sets the tone for your entire home. Here’s how to choose the right material for each room.</p>
        
        <h2>Hardwood</h2>
        <p>Classic, durable, and adds value. Best for living rooms, dining rooms, and bedrooms. Avoid in high-moisture areas.</p>
        
        <h2>Luxury Vinyl Plank (LVP)</h2>
        <p>Waterproof and durable, LVP mimics the look of wood or stone but is perfect for basements, kitchens, and bathrooms.</p>
        
        <h2>Tile</h2>
        <p>Ceramic and porcelain tiles are incredibly durable and water-resistant, making them ideal for bathrooms and entryways.</p>
        
        <h2>Carpet</h2>
        <p>Offers warmth and comfort, making it a popular choice for bedrooms and playrooms.</p>
      `,
      excerpt: "Hardwood, tile, or vinyl? Find out which flooring option is best for every room in your house.",
      metaDescription: "A comprehensive guide to selecting the best flooring materials for your home's needs and style.",
      focusKeyword: "Flooring Guide",
      tags: "Flooring, Hardwood, Tile, Home Improvement",
      status: "published",
      authorName: "MVP Remodeling Team",
      publishedAt: new Date(),
    }
  ];

  for (const post of posts) {
    await db.insert(blogPosts).values(post).onConflictDoNothing();
    console.log(`Created post: ${post.title}`);
  }

  console.log("Successfully created 3 blog posts.");
  process.exit(0);
}

main().catch(console.error);
