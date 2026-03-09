export const ANALYTICS_CHANNELS = ['ga4', 'facebook', 'ghl', 'telegram'] as const;
export type AnalyticsChannel = (typeof ANALYTICS_CHANNELS)[number];

export type AnalyticsChannelSupport = Record<AnalyticsChannel, boolean>;

export const ANALYTICS_EVENT_NAMES = [
  'cta_click',
  'view_item_list',
  'view_item',
  'begin_checkout',
  'add_payment_info',
  'purchase',
  'generate_lead',
  'contact_click',
  'page_view',
  'chat_open',
  'chat_close',
  'chat_message_sent',
  'chat_message_received',
  'chat_new_conversation',
  'chat_lead_captured',
  'form_open',
  'form_step_completed',
  'form_completed',
  'form_abandoned',
  'form_result_action',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value);
}

export interface WebsiteEventDefinition {
  event: AnalyticsEventName;
  trigger: string;
  channels: AnalyticsChannelSupport;
}

const defaultWebChannelSupport: AnalyticsChannelSupport = {
  ga4: true,
  facebook: true,
  ghl: false,
  telegram: false,
};

const leadSyncChannelSupport: AnalyticsChannelSupport = {
  ga4: true,
  facebook: true,
  ghl: true,
  telegram: false,
};

export const WEBSITE_EVENT_DEFINITIONS: WebsiteEventDefinition[] = [
  {
    event: 'generate_lead',
    trigger: 'When the thank you page is viewed',
    channels: leadSyncChannelSupport,
  },
  {
    event: 'contact_click',
    trigger: 'When a phone CTA is clicked',
    channels: defaultWebChannelSupport,
  },
  {
    event: 'form_completed',
    trigger: 'When the lead form is submitted',
    channels: leadSyncChannelSupport,
  },
  {
    event: 'cta_click',
    trigger: 'When any CTA button is clicked',
    channels: defaultWebChannelSupport,
  },
  {
    event: 'page_view',
    trigger: 'When users navigate between pages',
    channels: defaultWebChannelSupport,
  },
  {
    event: 'view_item_list',
    trigger: 'When the services page is viewed',
    channels: defaultWebChannelSupport,
  },
  {
    event: 'form_open',
    trigger: 'When the lead form is opened',
    channels: defaultWebChannelSupport,
  },
  {
    event: 'form_step_completed',
    trigger: 'When a lead form step is completed',
    channels: defaultWebChannelSupport,
  },
  {
    event: 'form_abandoned',
    trigger: 'When users abandon the lead form',
    channels: defaultWebChannelSupport,
  },
  {
    event: 'chat_open',
    trigger: 'When the chat widget is opened',
    channels: defaultWebChannelSupport,
  },
  {
    event: 'chat_lead_captured',
    trigger: 'When chat captures a lead',
    channels: leadSyncChannelSupport,
  },
  {
    event: 'chat_message_sent',
    trigger: 'When a visitor sends a chat message',
    channels: defaultWebChannelSupport,
  },
];

export type WebsiteEventName = (typeof WEBSITE_EVENT_DEFINITIONS)[number]['event'];

const websiteEventLookup = new Map<AnalyticsEventName, WebsiteEventDefinition>(
  WEBSITE_EVENT_DEFINITIONS.map((definition) => [definition.event, definition]),
);

export function getEventChannelSupport(eventName: AnalyticsEventName): AnalyticsChannelSupport {
  return websiteEventLookup.get(eventName)?.channels ?? defaultWebChannelSupport;
}

export const DEFAULT_EVENT_ACTIVITY_WINDOW_DAYS = 30;

export interface ChannelWindowStatus {
  supported: boolean;
  activeInWindow: boolean;
  lastHitAt: string | null;
}

export interface WebsiteEventHealthRow {
  event: WebsiteEventName;
  trigger: string;
  hitsInWindow: number;
  activeInWindow: boolean;
  lastHitAt: string | null;
  channels: Record<AnalyticsChannel, ChannelWindowStatus>;
}

export interface IntegrationWindowStatus {
  enabled: boolean;
  activatedAt: string | null;
  activeForDays: number | null;
}

export interface WebsiteEventsHealthResponse {
  lookbackDays: number;
  generatedAt: string;
  integrations: Record<AnalyticsChannel, IntegrationWindowStatus>;
  events: WebsiteEventHealthRow[];
}
