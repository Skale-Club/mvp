import { useEffect, useState, RefObject } from "react";
import { LeadFormModal } from "@/components/LeadFormModal";

export function StickyBottomBar({ footerRef }: { footerRef: RefObject<HTMLElement> }) {
  const [visible, setVisible] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 100);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFooterVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(footer);

    return () => {
      if (footer) {
        observer.unobserve(footer);
      }
    };
  }, [footerRef]);

  return (
    <>
      <div
        className={`fixed bottom-0 left-0 right-0 transition-transform duration-300 ${
          visible ? "translate-y-0" : "translate-y-full"
        } ${isFooterVisible ? "z-0" : "z-40"}`}
      >
        <div className="backdrop-blur-md border-t border-white/10 py-3 px-4" style={{ backgroundColor: "var(--website-nav-bg)" }}>
          <div className="flex justify-center">
            <button
              onClick={() => setIsFormOpen(true)}
              className="w-full md:w-[40%] bg-[var(--website-cta-bg)] text-white hover:bg-[var(--website-cta-hover)] font-bold py-3 rounded-full text-sm md:text-base transition-colors"
            >
              Get a Free Quote
            </button>
          </div>
        </div>
      </div>

      <LeadFormModal open={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </>
  );
}
