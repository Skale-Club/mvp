/**
 * Shared constants and configuration values
 */

export const DEFAULT_CHAT_MODEL = 'gpt-4o-mini';
export const DEFAULT_GHL_CALENDAR_ID = '2irhr47AR6K0AQkFqEQl';
export const CHAT_MESSAGE_LIMIT_PER_CONVERSATION = 50;
export const RATE_LIMIT_REQUESTS = 8;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const LOW_PERFORMANCE_ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

export const DEFAULT_INTAKE_OBJECTIVES = [
  { id: 'zipcode' as const, label: 'Zip code', description: 'Collect zip/postal code to validate service area', enabled: true },
  { id: 'name' as const, label: 'Name', description: 'Customer full name', enabled: true },
  { id: 'phone' as const, label: 'Phone', description: 'Phone number for confirmations', enabled: true },
  { id: 'serviceType' as const, label: 'Service type', description: 'Which service is requested', enabled: true },
  { id: 'serviceDetails' as const, label: 'Service details', description: 'Extra details (rooms, size, notes)', enabled: true },
  { id: 'date' as const, label: 'Date & time', description: 'Date and time slot selection', enabled: true },
  { id: 'address' as const, label: 'Address', description: 'Full address with street, unit, city, state', enabled: true },
];
