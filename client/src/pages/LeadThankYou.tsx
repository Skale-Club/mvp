import { Link } from "wouter";
import { ChevronDown, Home } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { CompanySettings } from "@shared/schema";
import Lottie from "lottie-react";
import successAnimation from "../assets/success-animation.json";

export default function LeadThankYou() {
  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ["/api/company-settings"],
  });

  const companyName = companySettings?.companyName?.trim() || "";
  const headline = `Thanks for contacting ${companyName}.`;

  const heroGradient = `
    linear-gradient(
      to right bottom,
      #09152d,
      #0b152a,
      #0d1427,
      #0f1424,
      #101421,
      #121622,
      #151723,
      #171924,
      #1c1c29,
      #21202e,
      #262332,
      #2c2637
    )
  `;

  return (
    <div
      className="w-full text-white overflow-hidden flex items-center pt-16"
      style={{ background: heroGradient, minHeight: 'calc(100vh - 120px)' }}
    >
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 items-start">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 flex-shrink-0">
                <Lottie
                  animationData={successAnimation}
                  loop={true}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#406EF1]/10 text-blue-200 text-xs font-semibold border border-[#406EF1]/30">
                Request received
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight text-white">{headline}</h1>
            <p className="mt-4 text-slate-200 text-lg leading-relaxed">
              Your request was submitted successfully. A project specialist will review your details and contact you shortly.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              <Link href="/" className="inline-flex">
                <button className="inline-flex min-w-[220px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#406EF1] px-6 py-4 font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-[#355CD0]">
                  <Home className="w-4 h-4" />
                  Back to website
                </button>
              </Link>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-8 shadow-2xl backdrop-blur">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,#406EF1,transparent_35%),radial-gradient(circle_at_80%_0%,#60a5fa,transparent_30%),radial-gradient(circle_at_50%_80%,#3b82f6,transparent_25%)]" />
              <div className="relative space-y-4">
                <p className="text-sm text-slate-200/90">What happens next</p>
                <div className="space-y-1 text-sm text-white/90">
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#406EF1]/20 border border-[#406EF1]/30 flex items-center justify-center text-blue-300 font-bold text-sm">1</span>
                    <span>We review your project scope, goals, and priorities.</span>
                  </div>
                  <div className="flex justify-center -my-0.5">
                    <div className="inline-flex h-4 w-4 items-center justify-center text-blue-200/60">
                      <ChevronDown className="h-3 w-3" />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#406EF1]/20 border border-[#406EF1]/30 flex items-center justify-center text-blue-300 font-bold text-sm">2</span>
                    <span>We contact you to confirm details and schedule the next step.</span>
                  </div>
                  <div className="flex justify-center -my-0.5">
                    <div className="inline-flex h-4 w-4 items-center justify-center text-blue-200/60">
                      <ChevronDown className="h-3 w-3" />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#406EF1]/20 border border-[#406EF1]/30 flex items-center justify-center text-blue-300 font-bold text-sm">3</span>
                    <span>You receive an estimate, expected timeline, and clear recommendations.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
