import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, Palette } from 'lucide-react';
import { WEBSITE_COLOR_DEFAULTS, normalizeColorInputValue } from './useWebsiteSettings';
import type { WebsiteSettingsReturn } from './useWebsiteSettings';

type Props = Pick<
  WebsiteSettingsReturn,
  | 'savedFields'
  | 'websitePrimaryColor' | 'setWebsitePrimaryColor'
  | 'websiteSecondaryColor' | 'setWebsiteSecondaryColor'
  | 'websiteAccentColor' | 'setWebsiteAccentColor'
  | 'websiteBackgroundColor' | 'setWebsiteBackgroundColor'
  | 'websiteForegroundColor' | 'setWebsiteForegroundColor'
  | 'websiteNavBackgroundColor' | 'setWebsiteNavBackgroundColor'
  | 'websiteFooterBackgroundColor' | 'setWebsiteFooterBackgroundColor'
  | 'websiteCtaBackgroundColor' | 'setWebsiteCtaBackgroundColor'
  | 'websiteCtaHoverColor' | 'setWebsiteCtaHoverColor'
  | 'adminBackgroundColor' | 'setAdminBackgroundColor'
  | 'adminSidebarColor' | 'setAdminSidebarColor'
  | 'triggerAutoSave'
>;

function SavedIndicator({ field, savedFields }: { field: string; savedFields: Record<string, boolean> }) {
  return savedFields[field] ? (
    <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 w-4 h-4" />
  ) : null;
}

function ColorField({
  id,
  label,
  value,
  defaultValue,
  placeholder,
  savedFields,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  defaultValue: string;
  placeholder: string;
  savedFields: Record<string, boolean>;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const swatchColor = normalizeColorInputValue(value, defaultValue);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Pick ${label} color`}
              className="h-9 w-9 shrink-0 rounded-md p-0 ring-1 ring-border shadow-sm transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background overflow-hidden"
              style={{ backgroundColor: swatchColor }}
            />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto p-3 rounded-xl border border-border bg-popover shadow-xl"
          >
            <div className="space-y-3">
              <HexColorPicker
                color={swatchColor}
                onChange={(c) => onChange(c.toUpperCase())}
                style={{ width: 220, height: 160 }}
              />
              <div className="flex items-center gap-2">
                <span
                  className="h-7 w-7 shrink-0 rounded-md ring-1 ring-border"
                  style={{ backgroundColor: swatchColor }}
                />
                <Input
                  value={value}
                  onChange={(e) => onChange(e.target.value.toUpperCase())}
                  placeholder={placeholder}
                  className="h-8 text-xs font-mono uppercase"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder={placeholder}
          className="h-9 pr-9 text-sm font-mono uppercase"
        />
        <SavedIndicator field={id} savedFields={savedFields} />
      </div>
    </div>
  );
}

export function ColorsTab({
  savedFields,
  websitePrimaryColor, setWebsitePrimaryColor,
  websiteSecondaryColor, setWebsiteSecondaryColor,
  websiteAccentColor, setWebsiteAccentColor,
  websiteBackgroundColor, setWebsiteBackgroundColor,
  websiteForegroundColor, setWebsiteForegroundColor,
  websiteNavBackgroundColor, setWebsiteNavBackgroundColor,
  websiteFooterBackgroundColor, setWebsiteFooterBackgroundColor,
  websiteCtaBackgroundColor, setWebsiteCtaBackgroundColor,
  websiteCtaHoverColor, setWebsiteCtaHoverColor,
  adminBackgroundColor, setAdminBackgroundColor,
  adminSidebarColor, setAdminSidebarColor,
  triggerAutoSave,
}: Props) {
  const makeColorHandler = (setter: (v: string) => void, key: string) => (val: string) => {
    setter(val);
    triggerAutoSave({ [key]: val } as any, [key]);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 transition-all hover:shadow-sm">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Website Colors
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Customize the public website palette (navbar, footer and CTA buttons).</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ColorField id="websitePrimaryColor" label="Primary" value={websitePrimaryColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websitePrimaryColor} placeholder="#1C53A3" savedFields={savedFields} onChange={makeColorHandler(setWebsitePrimaryColor, 'websitePrimaryColor')} />
          <ColorField id="websiteSecondaryColor" label="Secondary" value={websiteSecondaryColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteSecondaryColor} placeholder="#FFFF01" savedFields={savedFields} onChange={makeColorHandler(setWebsiteSecondaryColor, 'websiteSecondaryColor')} />
          <ColorField id="websiteAccentColor" label="Accent" value={websiteAccentColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteAccentColor} placeholder="#FFFF01" savedFields={savedFields} onChange={makeColorHandler(setWebsiteAccentColor, 'websiteAccentColor')} />
          <ColorField id="websiteBackgroundColor" label="Background" value={websiteBackgroundColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteBackgroundColor} placeholder="#FFFFFF" savedFields={savedFields} onChange={makeColorHandler(setWebsiteBackgroundColor, 'websiteBackgroundColor')} />
          <ColorField id="websiteForegroundColor" label="Text" value={websiteForegroundColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteForegroundColor} placeholder="#1D1D1D" savedFields={savedFields} onChange={makeColorHandler(setWebsiteForegroundColor, 'websiteForegroundColor')} />
          <ColorField id="websiteNavBackgroundColor" label="Navbar Background" value={websiteNavBackgroundColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteNavBackgroundColor} placeholder="#1C1E24" savedFields={savedFields} onChange={makeColorHandler(setWebsiteNavBackgroundColor, 'websiteNavBackgroundColor')} />
          <ColorField id="websiteFooterBackgroundColor" label="Footer Background" value={websiteFooterBackgroundColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteFooterBackgroundColor} placeholder="#18191F" savedFields={savedFields} onChange={makeColorHandler(setWebsiteFooterBackgroundColor, 'websiteFooterBackgroundColor')} />
          <ColorField id="websiteCtaBackgroundColor" label="CTA Background" value={websiteCtaBackgroundColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteCtaBackgroundColor} placeholder="#406EF1" savedFields={savedFields} onChange={makeColorHandler(setWebsiteCtaBackgroundColor, 'websiteCtaBackgroundColor')} />
          <ColorField id="websiteCtaHoverColor" label="CTA Hover" value={websiteCtaHoverColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteCtaHoverColor} placeholder="#355CD0" savedFields={savedFields} onChange={makeColorHandler(setWebsiteCtaHoverColor, 'websiteCtaHoverColor')} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4 transition-all hover:shadow-sm">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Admin Colors
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Customize the admin panel background and sidebar colors.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ColorField id="adminBackgroundColor" label="Admin Background" value={adminBackgroundColor} defaultValue={WEBSITE_COLOR_DEFAULTS.adminBackgroundColor} placeholder="#0F1729" savedFields={savedFields} onChange={makeColorHandler(setAdminBackgroundColor, 'adminBackgroundColor')} />
          <ColorField id="adminSidebarColor" label="Admin Sidebar" value={adminSidebarColor} defaultValue={WEBSITE_COLOR_DEFAULTS.adminSidebarColor} placeholder="#1D283A" savedFields={savedFields} onChange={makeColorHandler(setAdminSidebarColor, 'adminSidebarColor')} />
        </div>
      </div>
    </div>
  );
}
