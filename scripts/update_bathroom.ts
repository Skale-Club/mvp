
import "dotenv/config";
import { db } from "../server/db";
import { servicePosts } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const content = `
    <h2>Transform Your Bathroom into a Personal Oasis</h2>
    <p>Your bathroom should be more than just a functional space—it should be a sanctuary where you can relax and rejuvenate. Whether you're looking to update a powder room or completely overhaul your master bath, our expert team is here to bring your vision to life.</p>

    <h3>Our Bathroom Remodeling Services</h3>
    <ul>
      <li><strong>Full Bathroom Renovations:</strong> Complete gut and remodel services to maximize space and style.</li>
      <li><strong>Custom Showers & Tubs:</strong> Luxurious walk-in showers, soaking tubs, and spa-like features.</li>
      <li><strong>Vanity & Countertop Installation:</strong> High-quality materials including granite, quartz, and marble.</li>
      <li><strong>Tile & Flooring:</strong> Expert installation of ceramic, porcelain, and natural stone tiles.</li>
      <li><strong>Lighting & Fixtures:</strong> Modern lighting solutions and premium plumbing fixtures to complete the look.</li>
      <li><strong>Accessibility Upgrades:</strong> Walk-in tubs, grab bars, and curbless showers for safety and comfort.</li>
    </ul>

    <h3>Our Process</h3>
    <ol>
      <li><strong>Consultation:</strong> We discuss your needs, style preferences, and budget.</li>
      <li><strong>Design:</strong> Our designers create a custom plan with 3D renderings to visualize your new space.</li>
      <li><strong>Selection:</strong> We help you choose the perfect materials, fixtures, and finishes.</li>
      <li><strong>Construction:</strong> Our skilled craftsmen execute the remodel with precision and care, minimizing disruption to your home.</li>
      <li><strong>Completion:</strong> A final walkthrough ensures every detail meets our high standards and your satisfaction.</li>
    </ol>

    <h3>Why Choose Us?</h3>
    <p>With years of experience and a commitment to quality, we pride ourselves on delivering exceptional results. We handle every aspect of the project, from initial design to final cleanup, ensuring a stress-free experience for you.</p>
    <p><strong>Ready to start your bathroom transformation? Contact us today for a free consultation!</strong></p>
  `;

  const excerpt = "Transform your bathroom into a luxurious retreat with our professional remodeling services. From custom showers to modern vanities, we handle it all.";
  const metaDescription = "Expert bathroom remodeling services. Create your dream bathroom with our custom design, quality installation, and full renovation solutions.";

  await db.update(servicePosts)
    .set({
      content,
      excerpt,
      metaDescription,
      updatedAt: new Date()
    })
    .where(eq(servicePosts.slug, "bathroom-remodeling"));

  console.log("Successfully updated Bathroom Remodeling content.");
  process.exit(0);
}

main().catch(console.error);
