import type { ComponentType } from "react";
import { Star, Shield, Clock, Sparkles, Heart, BadgeCheck, ThumbsUp, Trophy } from "lucide-react";

type TrustBadge = {
  icon?: string;
  title?: string;
  description?: string;
};

type TrustBadgesSectionProps = {
  trustBadges: TrustBadge[];
};

const badgeIconMap: Record<string, ComponentType<{ className?: string }>> = {
  star: Star,
  shield: Shield,
  clock: Clock,
  sparkles: Sparkles,
  heart: Heart,
  badgeCheck: BadgeCheck,
  thumbsUp: ThumbsUp,
  trophy: Trophy,
};

export function TrustBadgesSection({ trustBadges }: TrustBadgesSectionProps) {
  if (trustBadges.length === 0) return null;

  return (
    <section className="relative z-20 -mt-8 sm:-mt-12 lg:-mt-16 bg-transparent">
      <div className="container-custom mx-auto relative">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 overflow-hidden relative z-30">
          {trustBadges.map((feature, i) => {
            const iconKey = (feature.icon || '').toLowerCase();
            const Icon = badgeIconMap[iconKey] || badgeIconMap.star || Star;
            return (
              <div key={i} className="p-8 flex items-center gap-6 hover:bg-gray-50 transition-colors">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-slate-500">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
