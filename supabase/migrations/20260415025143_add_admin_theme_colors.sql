alter table public.company_settings
  add column if not exists admin_background_color text default '#0F1729',
  add column if not exists admin_sidebar_color text default '#1D283A';
