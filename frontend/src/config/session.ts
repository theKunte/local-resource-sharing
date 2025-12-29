export const SESSION_CONFIG = {
  // Session timeout (5 minutes)
  TIMEOUT: 5 * 60 * 1000,

  // Warning time (1 minute before timeout)
  WARNING_TIME: 1 * 60 * 1000,

  // Activity events to track
  ACTIVITY_EVENTS: ["mousedown", "keydown", "scroll", "touchstart", "click"],

  // Document events
  DOCUMENT_EVENTS: ["visibilitychange"],

  // Window events
  WINDOW_EVENTS: ["focus"],

  // Enable/disable session timeout
  DISABLE_SESSION_TIMEOUT: false,

  // Enable/disable server-side validation
  ENFORCE_SERVER_VALIDATION: false,

  // Debug mode
  DEBUG: true,
};
