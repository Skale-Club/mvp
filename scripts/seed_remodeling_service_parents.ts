import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../server/db";
import { servicePosts } from "../shared/schema";

type ParentServiceSeed = {
  title: string;
  slug: string;
  excerpt: string;
  metaDescription: string;
  focusKeyword: string;
  order: number;
  children: string[];
  content: string;
};

const LEGACY_SLUGS_TO_REMOVE = ["bathroom-remodeling", "kitchen-remodeling"];

const SERVICES: ParentServiceSeed[] = [
  {
    title: "Interior Remodeling",
    slug: "interior-remodeling",
    excerpt:
      "Interior remodeling contractor for full kitchen and bathroom remodeling, interior reconstruction, drywall, painting, and flooring upgrades.",
    metaDescription:
      "Interior remodeling services including full kitchen remodeling, full bathroom remodeling, bedroom and living room renovations, demolition and reconstruction, drywall finishing, painting, and flooring installation.",
    focusKeyword: "Interior Remodeling",
    order: 1,
    children: [
      "Full kitchen remodeling",
      "Full bathroom remodeling",
      "Bedroom and living room renovations",
      "Interior demolition and reconstruction",
      "Drywall installation and finishing",
      "Interior and exterior painting",
      "Flooring installation and replacement",
    ],
    content: `
      <h2>Interior Remodeling Services</h2>
      <p>Our interior remodeling team delivers complete home transformations with practical planning, disciplined execution, and high-quality finishes. We manage the full scope from interior demolition to final reconstruction, coordinating each phase so your project stays organized, efficient, and aligned with your vision.</p>
      <p>Whether you are upgrading one room or renovating multiple spaces in the same project, we build a clear roadmap around layout, material choices, timeline expectations, and investment priorities. Every stage is sequenced to reduce rework, avoid unnecessary delays, and keep momentum from start to finish.</p>
      <p>Interior renovation is not only about appearance. It is also about comfort, functionality, storage, durability, and long-term value. We design and build spaces that support your routine today while improving flexibility for the future.</p>

      <h3>Included Services</h3>
      <ul>
        <li>Full kitchen remodeling</li>
        <li>Full bathroom remodeling</li>
        <li>Bedroom and living room renovations</li>
        <li>Interior demolition and reconstruction</li>
        <li>Drywall installation and finishing</li>
        <li>Interior and exterior painting</li>
        <li>Flooring installation and replacement</li>
      </ul>

      <h3>Detailed Scope by Service Type</h3>
      <h4>Full Kitchen Remodeling</h4>
      <p>We transform kitchens into efficient, modern, and practical workspaces. Scope can include demolition, updated layout, cabinet replacement, countertop installation, backsplash updates, sink and fixture upgrades, lighting improvements, and finishing details that complete the look.</p>
      <h4>Full Bathroom Remodeling</h4>
      <p>Our bathroom remodel process prioritizes waterproofing, efficient use of space, and durable finishes. Typical work includes removal of old finishes, shower and vanity upgrades, wall and floor tile installation, plumbing fixture replacement, lighting updates, and premium finish detailing.</p>
      <h4>Bedroom and Living Room Renovations</h4>
      <p>We redesign bedrooms and living rooms to improve flow, comfort, and visual consistency. Services can include wall modifications, trim upgrades, flooring replacement, lighting improvements, and full paint refresh for a unified interior style.</p>
      <h4>Interior Demolition and Reconstruction</h4>
      <p>We perform controlled demolition with site protection and debris management, followed by clean reconstruction based on approved scope. Our team maintains careful sequencing to ensure framing, drywall, paint, and finish work are completed in the right order.</p>
      <h4>Drywall Installation and Finishing</h4>
      <p>We install and finish drywall to create smooth, ready-to-paint surfaces. Work includes panel placement, joint treatment, texture matching, corner reinforcement, and final preparation to support high-end paint results.</p>
      <h4>Painting and Flooring</h4>
      <p>From preparation to final coat, our painting process focuses on adhesion, consistency, and clean edges. For flooring, we remove existing materials, prepare subfloors, and install the selected surface system with precise alignment and transition detailing.</p>

      <h3>How We Deliver Interior Renovations</h3>
      <ol>
        <li><strong>Consultation and Scope:</strong> We define goals, room priorities, dimensions, style direction, and expected outcomes. This step ensures all decisions are aligned before production begins.</li>
        <li><strong>Planning and Preparation:</strong> We organize timeline, procurement, trade sequencing, and site protection protocols. A structured plan minimizes downtime and keeps work predictable.</li>
        <li><strong>Demolition and Core Work:</strong> Existing materials are removed safely and efficiently. We then execute framing, drywall, and foundational finish preparation according to scope.</li>
        <li><strong>Finish Installation:</strong> Flooring, paint, trim, cabinetry, fixtures, and decorative details are installed with strict attention to quality and consistency.</li>
        <li><strong>Final Walkthrough and Punch List:</strong> We complete quality verification, resolve final details, and deliver a project-ready interior.</li>
      </ol>

      <h3>Interior Remodeling Quality Standards</h3>
      <ul>
        <li>Clear scope documentation before major execution phases</li>
        <li>Consistent communication during active construction</li>
        <li>Detail-oriented finish installation and alignment checks</li>
        <li>Clean and organized jobsite practices</li>
        <li>Final walkthrough process before project closeout</li>
      </ul>

      <h3>Why Homeowners Invest in Interior Remodeling</h3>
      <p>Interior remodeling improves everyday living quality while increasing property desirability. Strategic updates can optimize layout, modernize finishes, improve storage capacity, and make each room more functional. A properly planned remodel also reduces future maintenance issues by replacing outdated components and finish systems.</p>
      <p>By combining design goals with practical construction planning, we help clients avoid fragmented upgrades and instead deliver cohesive, high-value improvements throughout the home.</p>

      <h3>Why Homeowners Choose Our Interior Remodeling Team</h3>
      <ul>
        <li>Clear communication and documented project scope</li>
        <li>Attention to detail in finishes and transitions</li>
        <li>Clean job site practices and reliable scheduling</li>
        <li>Solutions tailored to your home and daily routine</li>
      </ul>

      <h3>Frequently Asked Questions</h3>
      <h4>How long does an interior remodeling project usually take?</h4>
      <p>Timeline depends on scope, selected materials, and project complexity. During planning, we provide a realistic schedule and phase-based expectations.</p>
      <h4>Can multiple rooms be remodeled in one project?</h4>
      <p>Yes. We frequently coordinate multi-room renovation projects and sequence work to reduce disruption while maintaining consistent quality.</p>
      <h4>Do you handle both demolition and finishing?</h4>
      <p>Yes. Our process covers demolition, reconstruction, drywall, paint, flooring, and finishing details for a complete interior remodeling solution.</p>

      <p>Ready to start your project? Contact us to schedule a consultation and receive a personalized quote and timeline for your interior remodeling plan.</p>
    `.trim(),
  },
  {
    title: "Custom Carpentry & Finishes",
    slug: "custom-carpentry-and-finishes",
    excerpt:
      "Custom carpentry and finish work for cabinets, closets, TV feature walls, decorative moldings, trims, and built-ins.",
    metaDescription:
      "Custom carpentry and finishes including custom cabinets, walk-in closets, TV feature walls, decorative moldings, trims, built-ins, and custom furniture.",
    focusKeyword: "Custom Carpentry",
    order: 2,
    children: [
      "Custom cabinets",
      "Walk-in closets and closet systems",
      "TV feature walls",
      "Decorative wall moldings and trims",
      "Built-ins and custom furniture",
    ],
    content: `
      <h2>Custom Carpentry & Finishes</h2>
      <p>Our custom carpentry and finish services are designed for homeowners who want precision craftsmanship, practical storage, and elevated visual results. We create built elements that feel integrated with your home instead of added as an afterthought.</p>
      <p>From custom millwork to statement feature walls, we build solutions that combine function and design continuity. Every project is planned from exact field measurements so the final installation fits cleanly and performs well over time.</p>
      <p>When executed correctly, carpentry and finish work becomes one of the highest-impact upgrades in a renovation because it adds both daily utility and architectural character.</p>

      <h3>Included Services</h3>
      <ul>
        <li>Custom cabinets</li>
        <li>Walk-in closets and closet systems</li>
        <li>TV feature walls</li>
        <li>Decorative wall moldings and trims</li>
        <li>Built-ins and custom furniture</li>
      </ul>

      <h3>Service Breakdown</h3>
      <h4>Custom Cabinets</h4>
      <p>We build and install cabinetry designed for your room dimensions, storage needs, and preferred finish profile. Layout planning focuses on accessibility, organization, and clean lines.</p>
      <h4>Walk-In Closets and Closet Systems</h4>
      <p>Our closet systems combine hanging zones, shelving, drawers, and specialty storage to maximize usability while keeping the space visually organized.</p>
      <h4>TV Feature Walls</h4>
      <p>Feature wall projects can include paneling, integrated storage, concealed wiring pathways, and balanced layout composition for a refined focal point.</p>
      <h4>Decorative Moldings and Trims</h4>
      <p>We install crown molding, wall trim, baseboard upgrades, and decorative accents to create stronger room definition and premium finish quality.</p>
      <h4>Built-Ins and Custom Furniture</h4>
      <p>Built-in shelving, media units, bench seating, and custom furniture pieces are fabricated and installed to match your interior palette and maximize space efficiency.</p>

      <h3>What Makes Our Carpentry Work Different</h3>
      <ul>
        <li>Custom dimensions for perfect fit and clean alignment</li>
        <li>Material and finish options that match your interior design</li>
        <li>Detailed trim and molding installation for a premium look</li>
        <li>Functional designs that improve everyday use</li>
      </ul>

      <h3>Our Carpentry Process</h3>
      <ol>
        <li><strong>Consultation and Measurements:</strong> We assess function, style, and exact site dimensions to define project scope.</li>
        <li><strong>Design Alignment:</strong> We validate finish direction, proportions, and configuration details before production.</li>
        <li><strong>Build and Preparation:</strong> Components are prepared with emphasis on fit, finish, and durability.</li>
        <li><strong>Installation and Leveling:</strong> We install each element with precise alignment and clean transitions.</li>
        <li><strong>Final Detailing:</strong> We complete touch-ups, quality checks, and closeout review.</li>
      </ol>

      <h3>Frequently Asked Questions</h3>
      <h4>Can custom carpentry match my existing interior style?</h4>
      <p>Yes. We plan finishes and profiles to align with existing colors, textures, and architectural details.</p>
      <h4>Is custom work only for large spaces?</h4>
      <p>No. Small rooms often benefit the most from custom dimensions because they require optimized use of every inch.</p>
      <h4>Do you offer full design and installation support?</h4>
      <p>Yes. We support planning, production, and installation for end-to-end delivery.</p>

      <p>Request a consultation to plan custom carpentry and finish upgrades tailored to your home goals and layout.</p>
    `.trim(),
  },
  {
    title: "Outdoor & Exterior Projects",
    slug: "outdoor-and-exterior-projects",
    excerpt:
      "Outdoor and exterior remodeling services including outdoor kitchens, decks, exterior wall finishes, and exterior painting.",
    metaDescription:
      "Outdoor and exterior projects designed for durability and style, from outdoor kitchens and decks to exterior wall finishes and painting.",
    focusKeyword: "Outdoor Projects",
    order: 3,
    children: [
      "Outdoor kitchens",
      "Decks and outdoor living areas",
      "Exterior wall finishes",
      "Exterior painting",
    ],
    content: `
      <h2>Outdoor & Exterior Projects</h2>
      <p>Upgrade curb appeal and outdoor living functionality with complete exterior remodeling services. Our team designs and builds outdoor spaces that are practical, durable, and visually cohesive with your home architecture.</p>
      <p>Exterior projects require careful material selection, weather-aware planning, and quality installation methods. We prioritize long-term performance so your investment remains attractive and resilient season after season.</p>
      <p>Whether you are creating a new outdoor entertainment area or modernizing worn finishes, we organize scope and sequencing to keep execution efficient and predictable.</p>

      <h3>Included Services</h3>
      <ul>
        <li>Outdoor kitchens</li>
        <li>Decks and outdoor living areas</li>
        <li>Exterior wall finishes</li>
        <li>Exterior painting</li>
      </ul>

      <h3>Project Categories</h3>
      <h4>Outdoor Kitchens</h4>
      <p>We build functional outdoor cooking and hosting spaces with layout planning focused on workflow, convenience, and weather-appropriate finishes.</p>
      <h4>Decks and Outdoor Living Areas</h4>
      <p>Our deck and living area projects create comfortable gathering spaces with thoughtful zoning for dining, seating, and circulation.</p>
      <h4>Exterior Wall Finishes</h4>
      <p>We update and protect exterior surfaces using finish systems selected for durability, appearance, and maintenance efficiency.</p>
      <h4>Exterior Painting</h4>
      <p>Our exterior painting process includes preparation, surface correction, and controlled application for clean coverage and long-lasting protection.</p>

      <h3>Benefits of Exterior Renovation</h3>
      <ul>
        <li>Improves home appearance and property value</li>
        <li>Expands your usable living space outdoors</li>
        <li>Protects surfaces with proper finishing systems</li>
        <li>Creates functional spaces for hosting and relaxing</li>
      </ul>

      <h3>Our Exterior Project Workflow</h3>
      <ol>
        <li><strong>Site Evaluation:</strong> We review existing conditions, measurements, and practical constraints.</li>
        <li><strong>Design Direction:</strong> We align layout, finish options, and performance priorities.</li>
        <li><strong>Preparation and Build:</strong> We execute core construction and surface preparation with quality oversight.</li>
        <li><strong>Finishing and Protection:</strong> Final coatings and details are completed for durability and appearance.</li>
        <li><strong>Closeout Review:</strong> We verify final quality and deliver a clean project handoff.</li>
      </ol>

      <h3>Frequently Asked Questions</h3>
      <h4>Are these projects designed for all-weather performance?</h4>
      <p>Yes. We prioritize materials and installation methods that support long-term durability in outdoor conditions.</p>
      <h4>Can I combine multiple exterior services in one project?</h4>
      <p>Yes. We can bundle outdoor kitchens, decks, finishes, and painting into one coordinated scope.</p>
      <h4>Will exterior updates increase home value?</h4>
      <p>Well-planned exterior renovations typically improve curb appeal and market perception, often strengthening property value.</p>

      <p>Talk to our team about your outdoor renovation goals and receive a clear scope, phased timeline, and pricing guidance.</p>
    `.trim(),
  },
  {
    title: "Specialty Projects",
    slug: "specialty-projects",
    excerpt:
      "Specialty remodeling for themed rooms, garage conversions, custom room transformations, and decorative lighting details.",
    metaDescription:
      "Specialty remodeling projects including themed rooms for vacation homes, garage conversions, custom room design, and decorative lighting installation.",
    focusKeyword: "Specialty Remodeling",
    order: 4,
    children: [
      "Themed rooms for vacation homes",
      "Garage conversions",
      "Custom room design and transformations",
      "Lighting installation and decorative details",
    ],
    content: `
      <h2>Specialty Projects</h2>
      <p>Our specialty remodeling services are built for unique concepts that require custom planning, technical coordination, and detail-focused execution. We transform underused or outdated areas into high-value spaces with clear purpose and strong visual identity.</p>
      <p>Not every project fits a standard renovation template. When your goals involve specialized themes, space conversion, or one-of-a-kind room design, we apply a structured process to keep creativity practical and buildable.</p>
      <p>From concept development to finishing details, we focus on functionality, atmosphere, and long-term usability.</p>

      <h3>Included Services</h3>
      <ul>
        <li>Themed rooms for vacation homes</li>
        <li>Garage conversions</li>
        <li>Custom room design and transformations</li>
        <li>Lighting installation and decorative details</li>
      </ul>

      <h3>Specialty Scope Highlights</h3>
      <h4>Themed Rooms for Vacation Homes</h4>
      <p>We create distinctive themed environments that elevate guest experience and improve property differentiation in short-term rental markets.</p>
      <h4>Garage Conversions</h4>
      <p>Garage conversion projects can transform unused square footage into offices, studios, guest rooms, or multi-purpose spaces with practical layout solutions.</p>
      <h4>Custom Room Design and Transformations</h4>
      <p>We deliver room concepts tailored to personal lifestyle, entertainment, or business use, balancing aesthetics with comfort and function.</p>
      <h4>Lighting Installation and Decorative Details</h4>
      <p>Lighting and finish details are planned to shape mood, improve usability, and strengthen design consistency throughout the space.</p>

      <h3>Popular Specialty Transformations</h3>
      <ul>
        <li>Entertainment and media-focused environments</li>
        <li>Garage-to-office, studio, or guest space conversions</li>
        <li>Custom concept rooms for short-term rental properties</li>
        <li>Layered lighting plans to enhance mood and function</li>
      </ul>

      <h3>How We Execute Custom Projects</h3>
      <ol>
        <li><strong>Concept and Goal Alignment:</strong> We define use case, design direction, and budget constraints.</li>
        <li><strong>Technical Planning:</strong> We map layout, electrical needs, lighting positions, and finish sequencing.</li>
        <li><strong>Construction and Installation:</strong> We execute build scope with close quality control.</li>
        <li><strong>Design Detailing:</strong> Final decorative elements are installed to complete the intended experience.</li>
        <li><strong>Final Handoff:</strong> We deliver a clean, ready-to-use specialty space.</li>
      </ol>

      <h3>Frequently Asked Questions</h3>
      <h4>Can you handle projects with unconventional design ideas?</h4>
      <p>Yes. Specialty work is designed for projects that need custom concept development and non-standard execution plans.</p>
      <h4>Are garage conversions fully planned from layout to finishing?</h4>
      <p>Yes. We support planning, construction, and finishing details so converted spaces are functional and visually complete.</p>
      <h4>Can decorative lighting be integrated into the full room design?</h4>
      <p>Absolutely. We coordinate lighting strategy with materials, color palette, and room function for a cohesive final result.</p>

      <p>Share your project idea with us and we will build a custom remodeling plan that translates vision into a practical, high-quality finished space.</p>
    `.trim(),
  },
];

async function upsertParentService(seed: ParentServiceSeed): Promise<"created" | "updated"> {
  const payload = {
    title: seed.title,
    slug: seed.slug,
    content: seed.content,
    excerpt: seed.excerpt,
    metaDescription: seed.metaDescription,
    focusKeyword: seed.focusKeyword,
    status: "published",
    order: seed.order,
    publishedAt: new Date(),
    updatedAt: new Date(),
  };

  const [existing] = await db.select().from(servicePosts).where(eq(servicePosts.slug, seed.slug));
  if (existing) {
    await db
      .update(servicePosts)
      .set(payload)
      .where(eq(servicePosts.id, existing.id));
    return "updated";
  }

  await db.insert(servicePosts).values(payload);
  return "created";
}

async function main() {
  console.log("Seeding and organizing parent service pages...");

  for (const slug of LEGACY_SLUGS_TO_REMOVE) {
    await db.delete(servicePosts).where(eq(servicePosts.slug, slug));
    console.log(`REMOVED: ${slug}`);
  }

  for (const service of SERVICES) {
    const action = await upsertParentService(service);
    console.log(`${action.toUpperCase()}: ${service.title} (${service.slug})`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to seed parent service pages:", error);
  process.exit(1);
});
