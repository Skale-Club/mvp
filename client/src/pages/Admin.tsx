import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAdminAuth } from '@/context/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { UsersSection } from './UsersSection';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DashboardSection } from '@/components/admin/DashboardSection';
import { HeroSettingsSection } from '@/components/admin/HeroSettingsSection';
import { CompanySettingsSection } from '@/components/admin/CompanySettingsSection';
import { SEOSection } from '@/components/admin/SEOSection';
import { LeadsSection } from '@/components/admin/LeadsSection';
import { FaqsSection } from '@/components/admin/FaqsSection';
import { ChatSection } from '@/components/admin/ChatSection';
import { IntegrationsSection } from '@/components/admin/IntegrationsSection';
import { BlogSection } from '@/components/admin/BlogSection';
import { GallerySection } from '@/components/admin/GallerySection';
import { ServicePostsSection } from '@/components/admin/ServicePostsSection';
import { ReviewsSection } from '@/components/admin/ReviewsSection';
import { SIDEBAR_MENU_ITEMS } from '@/components/admin/shared/constants';
import type { AdminSection, CompanySettingsData } from '@/components/admin/shared/types';

function getInitialSection(): AdminSection {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('admin-active-section');
    if (stored && SIDEBAR_MENU_ITEMS.some((item) => item.id === stored)) {
      return stored as AdminSection;
    }
  }
  return 'dashboard';
}

function AdminContent() {
  const { isAdmin, email, loading, signOut } = useAdminAuth();
  const [, setLocation] = useLocation();

  const [activeSection, setActiveSection] = useState<AdminSection>(getInitialSection);
  const [blogResetSignal, setBlogResetSignal] = useState(0);
  const [sectionsOrder, setSectionsOrder] = useState<AdminSection[]>(SIDEBAR_MENU_ITEMS.map((item) => item.id));

  const { data: companySettings } = useQuery<CompanySettingsData>({
    queryKey: ['/api/company-settings'],
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      setLocation('/admin/login');
    }
  }, [loading, isAdmin, setLocation]);

  useEffect(() => {
    if (activeSection) {
      localStorage.setItem('admin-active-section', activeSection);
    }
  }, [activeSection]);

  useEffect(() => {
    if (companySettings?.sectionsOrder && companySettings.sectionsOrder.length > 0) {
      const savedOrder = companySettings.sectionsOrder as AdminSection[];
      const allSectionIds = SIDEBAR_MENU_ITEMS.map((item) => item.id);
      const validSaved = savedOrder.filter((id) => allSectionIds.includes(id));
      const missingSections = allSectionIds.filter((id) => !validSaved.includes(id));
      setSectionsOrder([...validSaved, ...missingSections]);
    }
  }, [companySettings?.sectionsOrder]);

  const updateSectionOrder = useCallback(async (newOrder: AdminSection[]) => {
    setSectionsOrder(newOrder);
    try {
      await apiRequest('PUT', '/api/company-settings', { sectionsOrder: newOrder });
      queryClient.invalidateQueries({ queryKey: ['/api/company-settings'] });
    } catch {
      setSectionsOrder((prev) => prev);
    }
  }, []);

  const handleSectionSelect = useCallback(
    (section: AdminSection) => {
      if (section === 'blog') {
        if (activeSection === 'blog') {
          setBlogResetSignal((prev) => prev + 1);
        } else {
          setActiveSection(section);
          localStorage.setItem('admin-active-section', section);
        }
        return;
      }
      setActiveSection(section);
      localStorage.setItem('admin-active-section', section);
    },
    [activeSection]
  );

  const handleLogout = useCallback(async () => {
    await signOut();
    setLocation('/admin/login');
  }, [setLocation, signOut]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen md:h-screen w-full bg-background relative overflow-x-hidden">
      <AdminSidebar
        activeSection={activeSection}
        sectionsOrder={sectionsOrder}
        companyName={companySettings?.companyName}
        logoIcon={companySettings?.logoIcon}
        email={email}
        onSectionChange={handleSectionSelect}
        onSectionsReorder={updateSectionOrder}
        onLogout={handleLogout}
      />

      <main className="flex-1 min-w-0 relative bg-background overflow-visible md:overflow-auto md:h-screen" id="admin-top">
        <AdminHeader companyName={companySettings?.companyName || 'Admin Panel'} />

        <div className="p-6 pb-16 md:p-8 md:pb-10">
          {activeSection === 'dashboard' && (
            <DashboardSection
              onNavigate={(section) => {
                handleSectionSelect(section);
                document.getElementById('admin-top')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          )}
          {activeSection === 'leads' && <LeadsSection />}
          {activeSection === 'hero' && <HeroSettingsSection />}
          {activeSection === 'reviews' && <ReviewsSection />}
          {activeSection === 'company' && <CompanySettingsSection />}
          {activeSection === 'gallery' && <GallerySection />}
          {activeSection === 'servicePosts' && <ServicePostsSection />}
          {activeSection === 'seo' && <SEOSection />}
          {activeSection === 'faqs' && <FaqsSection />}
          {activeSection === 'users' && <UsersSection />}
          {activeSection === 'chat' && <ChatSection />}
          {activeSection === 'integrations' && <IntegrationsSection />}
          {activeSection === 'blog' && <BlogSection resetSignal={blogResetSignal} />}
        </div>
      </main>
    </div>
  );
}

export default function Admin() {
  const sidebarStyle: CSSProperties = {
    ['--sidebar-width' as string]: '16rem',
    ['--sidebar-width-icon' as string]: '3rem',
  };

  return (
    <SidebarProvider style={sidebarStyle}>
      <AdminContent />
    </SidebarProvider>
  );
}
