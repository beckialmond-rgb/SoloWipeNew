// Simple analytics utility for tracking user actions
// Can be extended to integrate with Google Analytics, Mixpanel, etc.

type EventName =
  | 'job_completed'
  | 'job_skipped'
  | 'job_rescheduled'
  | 'payment_marked'
  | 'customer_added'
  | 'customer_archived'
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'dd_mandate_created'
  | 'page_view'
  | 'feature_used'
  | 'error_occurred';

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

class Analytics {
  private isEnabled: boolean;
  private userId: string | null = null;

  constructor() {
    // Enable analytics in production only
    this.isEnabled = import.meta.env.PROD;
  }

  identify(userId: string) {
    this.userId = userId;
    if (this.isEnabled) {
      console.log('[Analytics] User identified:', userId);
    }
  }

  track(event: EventName, properties?: EventProperties) {
    if (!this.isEnabled) {
      // In development, log to console for debugging
      console.log('[Analytics Dev]', event, properties);
      return;
    }

    const eventData = {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        userId: this.userId,
        url: window.location.pathname,
        userAgent: navigator.userAgent,
      },
    };

    // Log to console (can be replaced with actual analytics service)
    console.log('[Analytics]', eventData);

    // Store events locally for debugging
    this.storeEvent(eventData);
  }

  private storeEvent(eventData: { event: EventName; properties: EventProperties }) {
    try {
      const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      events.push(eventData);
      // Keep only last 100 events
      if (events.length > 100) {
        events.shift();
      }
      localStorage.setItem('analytics_events', JSON.stringify(events));
    } catch (e) {
      // Silently fail if localStorage is full
    }
  }

  // Get stored events for debugging
  getStoredEvents() {
    try {
      return JSON.parse(localStorage.getItem('analytics_events') || '[]');
    } catch {
      return [];
    }
  }

  // Clear stored events
  clearEvents() {
    localStorage.removeItem('analytics_events');
  }
}

export const analytics = new Analytics();
