import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useSEO } from "@/hooks/use-seo";
import { initAnalytics, trackPageView } from "@/lib/analytics";
import { PageLoader } from "@/components/ui/spinner";
import { useEffect, Suspense, lazy, useRef, useState, createContext, useContext } from "react";
import type { CompanySettings } from "@shared/schema";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { StickyBottomBar } from "@/components/layout/StickyBottomBar";

// Context to track initial app load state
const InitialLoadContext = createContext<{ isInitialLoad: boolean; markLoaded: () => void }>({
  isInitialLoad: true,
  markLoaded: () => {},
});

// Hook to hide initial loader after first page renders
function useHideInitialLoader() {
  const { isInitialLoad, markLoaded } = useContext(InitialLoadContext);
  const hasRun = useRef(false);

  useEffect(() => {
    if (isInitialLoad && !hasRun.current) {
      hasRun.current = true;
      const loader = document.getElementById("initial-loader");
      if (loader) {
        loader.classList.add("loader-fade-out");
        setTimeout(() => {
          loader.remove();
          markLoaded();
        }, 150);
      } else {
        markLoaded();
      }
    }
  }, [isInitialLoad, markLoaded]);
}

// Wrapper to call the hook when a lazy component mounts
function PageWrapper({ children }: { children: React.ReactNode }) {
  useHideInitialLoader();
  return <>{children}</>;
}

// Lazy load page components for route transitions
const NotFound = lazy(() => import("@/pages/not-found").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));
const Home = lazy(() => import("@/pages/Home").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));
const Services = lazy(() => import("@/pages/Services").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));
const ServiceDetails = lazy(() => import("@/pages/ServiceDetails").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));
const Gallery = lazy(() => import("@/pages/Gallery").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));
const LeadThankYou = lazy(() => import("@/pages/LeadThankYou").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));
const Admin = lazy(() => import("@/pages/Admin").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));
const AdminLogin = lazy(() => import("@/pages/AdminLogin").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));
const TermsOfService = lazy(() => import("@/pages/TermsOfService").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));
const Contact = lazy(() => import("@/pages/Contact").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));
const Faq = lazy(() => import("@/pages/Faq").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));
const Blog = lazy(() => import("@/pages/Blog").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));
const BlogPost = lazy(() => import("@/pages/BlogPost").then(m => ({ default: () => <PageWrapper><m.default /></PageWrapper> })));

const DEFAULT_WEBSITE_COLORS = {
  websitePrimaryColor: "#1C53A3",
  websiteSecondaryColor: "#FFFF01",
  websiteAccentColor: "#FFFF01",
  websiteBackgroundColor: "#FFFFFF",
  websiteForegroundColor: "#1D1D1D",
  websiteNavBackgroundColor: "#1C1E24",
  websiteFooterBackgroundColor: "#18191F",
  websiteCtaBackgroundColor: "#406EF1",
  websiteCtaHoverColor: "#355CD0",
} as const;

function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  const candidate = (value || "").trim();
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  if (!hex.test(candidate)) return fallback;
  if (candidate.length === 4) {
    const r = candidate[1];
    const g = candidate[2];
    const b = candidate[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return candidate.toUpperCase();
}

function hexToHslToken(hex: string): string {
  const normalized = normalizeHexColor(hex, "#000000");
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ['/api/company-settings'],
  });
  const [location] = useLocation();

  useEffect(() => {
    if (settings) {
      initAnalytics({
        gtmContainerId: settings.gtmContainerId || undefined,
        ga4MeasurementId: settings.ga4MeasurementId || undefined,
        facebookPixelId: settings.facebookPixelId || undefined,
        gtmEnabled: settings.gtmEnabled || false,
        ga4Enabled: settings.ga4Enabled || false,
        facebookPixelEnabled: settings.facebookPixelEnabled || false,
      });
    }
  }, [settings]);

  useEffect(() => {
    trackPageView(location);
  }, [location]);

  useEffect(() => {
    const root = document.documentElement;
    const isAdminRoute = location.startsWith('/admin');

    if (isAdminRoute) {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--secondary");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--background");
      root.style.removeProperty("--foreground");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--website-nav-bg");
      root.style.removeProperty("--website-footer-bg");
      root.style.removeProperty("--website-cta-bg");
      root.style.removeProperty("--website-cta-hover");
      return;
    }

    const primary = normalizeHexColor(settings?.websitePrimaryColor, DEFAULT_WEBSITE_COLORS.websitePrimaryColor);
    const secondary = normalizeHexColor(settings?.websiteSecondaryColor, DEFAULT_WEBSITE_COLORS.websiteSecondaryColor);
    const accent = normalizeHexColor(settings?.websiteAccentColor, DEFAULT_WEBSITE_COLORS.websiteAccentColor);
    const background = normalizeHexColor(settings?.websiteBackgroundColor, DEFAULT_WEBSITE_COLORS.websiteBackgroundColor);
    const foreground = normalizeHexColor(settings?.websiteForegroundColor, DEFAULT_WEBSITE_COLORS.websiteForegroundColor);
    const navBg = normalizeHexColor(settings?.websiteNavBackgroundColor, DEFAULT_WEBSITE_COLORS.websiteNavBackgroundColor);
    const footerBg = normalizeHexColor(settings?.websiteFooterBackgroundColor, DEFAULT_WEBSITE_COLORS.websiteFooterBackgroundColor);
    const ctaBg = normalizeHexColor(settings?.websiteCtaBackgroundColor, DEFAULT_WEBSITE_COLORS.websiteCtaBackgroundColor);
    const ctaHover = normalizeHexColor(settings?.websiteCtaHoverColor, DEFAULT_WEBSITE_COLORS.websiteCtaHoverColor);

    root.style.setProperty("--primary", hexToHslToken(primary));
    root.style.setProperty("--secondary", hexToHslToken(secondary));
    root.style.setProperty("--accent", hexToHslToken(accent));
    root.style.setProperty("--background", hexToHslToken(background));
    root.style.setProperty("--foreground", hexToHslToken(foreground));
    root.style.setProperty("--ring", hexToHslToken(primary));
    root.style.setProperty("--website-nav-bg", navBg);
    root.style.setProperty("--website-footer-bg", footerBg);
    root.style.setProperty("--website-cta-bg", ctaBg);
    root.style.setProperty("--website-cta-hover", ctaHover);
  }, [location, settings]);

  return <>{children}</>;
}

function SEOProvider({ children }: { children: React.ReactNode }) {
  useSEO();
  return <>{children}</>;
}

function Router() {
  const footerRef = useRef<HTMLElement | null>(null);
  const [location] = useLocation();
  const { isInitialLoad } = useContext(InitialLoadContext);
  const isAdminRoute = location.startsWith('/admin');
  const prevLocation = useRef(location);

  // Scroll to top when navigating to a new page (not hash links)
  useEffect(() => {
    // Skip if it's the same path (hash change only) or initial load
    if (prevLocation.current !== location && !isInitialLoad) {
      // Don't scroll if there's a hash in the URL (handled by the page itself)
      if (!window.location.hash) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
    prevLocation.current = location;
  }, [location, isInitialLoad]);

  // During initial load, show PageLoader for route transitions
  const fallback = isInitialLoad ? null : <PageLoader />;

  if (isAdminRoute) {
    return (
      <Suspense fallback={fallback}>
        <Switch>
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin/:rest*" component={Admin} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    );
  }

  // Hide everything during initial load to prevent footer flash
  // The initial-loader in index.html covers the screen until content is ready
  return (
    <div className={`flex flex-col min-h-screen ${isInitialLoad ? 'invisible' : ''}`}>
      <Navbar />
      <main className="flex-grow">
        <Suspense fallback={fallback}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/services/:slug" component={ServiceDetails} />
            <Route path="/services" component={Services} />
            <Route path="/gallery" component={Gallery} />
            <Route path="/thankyou" component={LeadThankYou} />
            <Route path="/privacy-policy" component={PrivacyPolicy} />
            <Route path="/terms-of-service" component={TermsOfService} />
            <Route path="/contact" component={Contact} />
            <Route path="/faq" component={Faq} />
            <Route path="/blog" component={Blog} />
            <Route path="/blog/:slug" component={BlogPost} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
      <Footer ref={footerRef} />
      <StickyBottomBar footerRef={footerRef} />
      <ChatWidget />
    </div>
  );
}

function App() {
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const markLoaded = useRef(() => setIsInitialLoad(false)).current;

  return (
    <InitialLoadContext.Provider value={{ isInitialLoad, markLoaded }}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              <SEOProvider>
                <AnalyticsProvider>
                  <Router />
                  <Toaster />
                </AnalyticsProvider>
              </SEOProvider>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </InitialLoadContext.Provider>
  );
}

export default App;
