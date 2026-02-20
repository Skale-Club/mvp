declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
  }
}

export interface AnalyticsConfig {
  gtmContainerId?: string;
  ga4MeasurementId?: string;
  facebookPixelId?: string;
  gtmEnabled?: boolean;
  ga4Enabled?: boolean;
  facebookPixelEnabled?: boolean;
}

let isInitialized = false;
let config: AnalyticsConfig = {};
let initializedProviders = { gtm: false, ga4: false, fbq: false };

export function initAnalytics(settings: AnalyticsConfig) {
  config = settings;

  if (settings.gtmEnabled && settings.gtmContainerId && !initializedProviders.gtm) {
    injectGTM(settings.gtmContainerId);
    initializedProviders.gtm = true;
  }

  if (settings.ga4Enabled && settings.ga4MeasurementId && !initializedProviders.ga4) {
    injectGA4(settings.ga4MeasurementId);
    initializedProviders.ga4 = true;
  }

  if (settings.facebookPixelEnabled && settings.facebookPixelId && !initializedProviders.fbq) {
    injectFacebookPixel(settings.facebookPixelId);
    initializedProviders.fbq = true;
  }

  isInitialized = true;
}

function isGtagAvailable(): boolean {
  return typeof window.gtag === 'function';
}

function isFbqAvailable(): boolean {
  return typeof window.fbq === 'function';
}

function injectGTM(containerId: string) {
  if (!containerId || document.getElementById('gtm-script')) return;

  const script = document.createElement('script');
  script.id = 'gtm-script';
  script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${containerId}');
  `;
  // Insert at the very beginning of <head> as Google recommends
  document.head.insertBefore(script, document.head.firstChild);

  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.insertBefore(noscript, document.body.firstChild);
}

function injectGA4(measurementId: string) {
  if (!measurementId || document.getElementById('ga4-script')) return;

  // Per Google's official docs, the init script must come before the async gtag.js loader.
  // Both are inserted at the top of <head> so they appear as early as possible.
  const script2 = document.createElement('script');
  script2.id = 'ga4-init-script';
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.insertBefore(script2, document.head.firstChild);

  const script1 = document.createElement('script');
  script1.id = 'ga4-script';
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  // Insert before the init script so the loader appears first (just above script2)
  document.head.insertBefore(script1, script2);
}

function injectFacebookPixel(pixelId: string) {
  if (!pixelId || document.getElementById('fb-pixel-script')) return;

  const script = document.createElement('script');
  script.id = 'fb-pixel-script';
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);
}

export type AnalyticsEventName =
  | 'cta_click'
  | 'view_item_list'
  | 'view_item'
  | 'begin_checkout'
  | 'add_payment_info'
  | 'purchase'
  | 'contact_click'
  | 'page_view'
  | 'chat_open'
  | 'chat_close'
  | 'chat_message_sent'
  | 'chat_message_received'
  | 'chat_new_conversation'
  | 'chat_lead_captured'
  | 'form_open'
  | 'form_step_completed'
  | 'form_completed'
  | 'form_abandoned'
  | 'form_result_action';

export interface AnalyticsEventPayload {
  location?: string;
  label?: string;
  category?: string;
  value?: number;
  currency?: string;
  items?: Array<{
    item_id: string | number;
    item_name: string;
    price?: number;
    quantity?: number;
    item_category?: string;
  }>;
  transaction_id?: string;
  [key: string]: any;
}

export function trackEvent(eventName: AnalyticsEventName, payload: AnalyticsEventPayload = {}) {
  if (import.meta.env.DEV) {
    console.log('[Analytics]', eventName, payload);
  }

  if (config.gtmEnabled) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...payload
    });
  }

  if (config.ga4Enabled && config.ga4MeasurementId && isGtagAvailable()) {
    window.gtag('event', eventName, payload);
  }

  if (config.facebookPixelEnabled && config.facebookPixelId && isFbqAvailable()) {
    const fbEventMap: Record<string, string> = {
      'begin_checkout': 'InitiateCheckout',
      'purchase': 'Purchase',
      'view_item': 'ViewContent',
      'view_item_list': 'ViewContent',
      'contact_click': 'Contact',
      'form_completed': 'Lead',
    };

    const fbEvent = fbEventMap[eventName];
    if (fbEvent) {
      window.fbq('track', fbEvent, {
        content_name: payload.label,
        content_category: payload.category,
        value: payload.value,
        currency: payload.currency || 'USD',
        contents: payload.items?.map(item => ({
          id: item.item_id,
          quantity: item.quantity || 1
        }))
      });
    } else {
      window.fbq('trackCustom', eventName, payload);
    }
  }
}

export function trackPageView(path: string, title?: string) {
  trackEvent('page_view', {
    page_path: path,
    page_title: title || document.title
  });
}

export function trackBeginCheckout(items: Array<{ id: number | string; name: string; price: number; quantity?: number }>, total: number) {
  trackEvent('begin_checkout', {
    value: total,
    currency: 'USD',
    items: items.map(item => ({
      item_id: String(item.id),
      item_name: item.name,
      price: item.price,
      quantity: item.quantity || 1
    }))
  });
}

export function trackPurchase(
  transactionId: string,
  items: Array<{ id: number | string; name: string; price: number; quantity?: number }>,
  total: number
) {
  trackEvent('purchase', {
    transaction_id: transactionId,
    value: total,
    currency: 'USD',
    items: items.map(item => ({
      item_id: String(item.id),
      item_name: item.name,
      price: item.price,
      quantity: item.quantity || 1
    }))
  });
}

export function trackCTAClick(location: string, label: string) {
  trackEvent('cta_click', { location, label });
}

export function trackViewServices(category?: string, items?: Array<{ id: number | string; name: string; price: number }>) {
  trackEvent('view_item_list', {
    item_list_name: category || 'Services',
    items: items?.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: 1
    }))
  });
}

// Chat Analytics
export function trackChatOpen(pageUrl: string) {
  trackEvent('chat_open', {
    location: pageUrl,
    label: 'Chat Widget Opened'
  });
}

export function trackChatClose(pageUrl: string, messageCount: number) {
  trackEvent('chat_close', {
    location: pageUrl,
    label: 'Chat Widget Closed',
    value: messageCount
  });
}

export function trackChatMessageSent(pageUrl: string, conversationId?: string) {
  trackEvent('chat_message_sent', {
    location: pageUrl,
    label: 'Visitor Message',
    conversation_id: conversationId
  });
}

export function trackChatMessageReceived(pageUrl: string, conversationId?: string) {
  trackEvent('chat_message_received', {
    location: pageUrl,
    label: 'Assistant Response',
    conversation_id: conversationId
  });
}

export function trackChatNewConversation(pageUrl: string) {
  trackEvent('chat_new_conversation', {
    location: pageUrl,
    label: 'New Conversation Started'
  });
}

export function trackChatLeadCaptured(pageUrl: string, conversationId?: string) {
  trackEvent('chat_lead_captured', {
    location: pageUrl,
    label: 'Lead Captured via Chat',
    conversation_id: conversationId,
    category: 'lead_generation'
  });
}

