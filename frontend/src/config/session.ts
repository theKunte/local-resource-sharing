export const SESSION_CONFIG = {
  // Session timeout (30 minutes)
  TIMEOUT: 30 * 60 * 1000,

  // Warning time (5 minutes before timeout)
  WARNING_TIME: 5 * 60 * 1000,

  // Activity events to track
  ACTIVITY_EVENTS: [
    "mousedown",
    "mousemove",
    "keypress",
    "scroll",
    "touchstart",
    "click",
  ],

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
