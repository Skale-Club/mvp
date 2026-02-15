
import "dotenv/config";
import { db } from "../server/db";
import { servicePosts } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const kitchenService = {
    title: "Kitchen Remodeling",
    slug: "kitchen-remodeling",
    excerpt: "Transform your kitchen into the heart of your home with our expert remodeling services. From custom cabinets to modern islands, we bring your culinary dream space to life.",
    metaDescription: "Expert kitchen remodeling services. Custom cabinetry, quartz & granite countertops, backsplash installation, and complete kitchen makeovers.",
    focusKeyword: "Kitchen Remodeling",
    featureImageUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&q=80&w=2768",
    status: "published",
    order: 2, // Assuming Bathroom is 1
    content: `
      <div class="space-y-12">
        <!-- Intro Section -->
        <div class="text-center max-w-3xl mx-auto">
          <p class="text-lg text-muted-foreground leading-relaxed">
            The kitchen is more than just a place to cook—it's the heart of your home where families gather and memories are made. 
            Whether you're looking for a contemporary chef's kitchen or a cozy farmhouse style, our team delivers functional beauty tailored to your lifestyle.
          </p>
        </div>

        <!-- Key Features Grid -->
        <div class="grid md:grid-cols-2 gap-8">
          <div class="bg-card p-8 rounded-xl border shadow-sm">
            <h3 class="text-xl font-semibold mb-4 text-primary">Custom Cabinetry</h3>
            <p class="text-muted-foreground">Maximize storage and style with custom-built cabinets. We offer a wide range of finishes, hardware, and smart storage solutions like pull-out pantries and soft-close drawers.</p>
          </div>
          <div class="bg-card p-8 rounded-xl border shadow-sm">
            <h3 class="text-xl font-semibold mb-4 text-primary">Countertops & Surfaces</h3>
            <p class="text-muted-foreground">Choose from premium materials including Quartz, Granite, Marble, and Butcher Block. Our precision installation ensures durable and stunning workspaces.</p>
          </div>
          <div class="bg-card p-8 rounded-xl border shadow-sm">
            <h3 class="text-xl font-semibold mb-4 text-primary">Islands & Layouts</h3>
            <p class="text-muted-foreground">Optimize flow with a redesigned layout. Add a functional island with seating, a prep sink, or built-in appliances to make your kitchen the social hub.</p>
          </div>
          <div class="bg-card p-8 rounded-xl border shadow-sm">
            <h3 class="text-xl font-semibold mb-4 text-primary">Lighting & Fixtures</h3>
            <p class="text-muted-foreground">Set the mood with layered lighting—under-cabinet LEDs, pendant lights over the island, and recessed ceiling lights—paired with high-end faucets and sinks.</p>
          </div>
        </div>

        <!-- Process Section -->
        <div class="bg-muted/30 p-8 rounded-2xl">
          <h2 class="text-2xl font-bold mb-8 text-center">Our Kitchen Renovation Process</h2>
          <div class="space-y-6">
            <div class="flex gap-4">
              <div class="flex-none w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
              <div>
                <h4 class="font-semibold text-lg">Design Consultation</h4>
                <p class="text-muted-foreground">We meet to discuss your vision, budget, and needs. We'll provide 3D renderings so you can visualize the transformation.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="flex-none w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
              <div>
                <h4 class="font-semibold text-lg">Material Selection</h4>
                <p class="text-muted-foreground">Visit our showroom or work with our designers to select cabinets, countertops, tiles, and flooring that match your style.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="flex-none w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
              <div>
                <h4 class="font-semibold text-lg">Professional Installation</h4>
                <p class="text-muted-foreground">Our skilled craftsmen handle everything from demolition to plumbing and electrical, ensuring code compliance and quality.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="flex-none w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
              <div>
                <h4 class="font-semibold text-lg">Final Walkthrough</h4>
                <p class="text-muted-foreground">We don't consider the job done until you are 100% satisfied. We perform a detailed walkthrough to ensure every detail is perfect.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  };

  // Check if it exists
  const existing = await db.select().from(servicePosts).where(eq(servicePosts.slug, kitchenService.slug));

  if (existing.length > 0) {
    // Update
    await db.update(servicePosts)
      .set(kitchenService)
      .where(eq(servicePosts.slug, kitchenService.slug));
    console.log("Updated Kitchen Remodeling service.");
  } else {
    // Insert
    await db.insert(servicePosts).values(kitchenService);
    console.log("Created Kitchen Remodeling service.");
  }

  process.exit(0);
}

main().catch(console.error);
