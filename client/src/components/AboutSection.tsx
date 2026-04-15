import { User, CheckCircle } from "lucide-react";
import type { HomepageContent } from "@shared/schema";

interface AboutSectionProps {
  content?: HomepageContent['aboutSection'] | null;
  aboutImageUrl?: string | null;
}

export function AboutSection({ content, aboutImageUrl }: AboutSectionProps) {
  const sectionContent = content || {};

  const highlights = sectionContent?.highlights || [];

  return (
    <div className="container-custom mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <User className="w-4 h-4" />
            {sectionContent?.label || 'About Us'}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
            {sectionContent?.heading || ""}
          </h2>

          <p className="text-slate-600 text-lg mb-6 leading-relaxed">
            {sectionContent?.description || 'We are specialists in our field, dedicated to delivering the best results for our clients. With years of experience, we provide high-quality services with commitment and excellence.'}
          </p>

          {highlights.length > 0 && (
            <div className="space-y-4 mb-8">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{highlight.title}</h4>
                    <p className="text-slate-600">{highlight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="order-1 lg:order-2 aspect-square max-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-slate-100 relative">
          {aboutImageUrl || sectionContent?.defaultImageUrl ? (
            <img
              src={aboutImageUrl || sectionContent?.defaultImageUrl}
              alt={sectionContent?.heading || ""}
              className="w-full h-full object-cover object-center"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
