import { Bell } from "lucide-react";

/**
 * Notification control. DEF-013: no notification data or panel exists yet, so
 * the control is honestly disabled (not a dead button that appears to work).
 * A future notification panel plugs in here without changing the header layout.
 */
export const NotificationButton = () => (
  <button
    type="button"
    aria-label="Notifications (no notifications yet)"
    title="No notifications yet"
    disabled
    aria-disabled="true"
    className="inline-flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-md text-text-secondary opacity-60"
  >
    <Bell aria-hidden="true" className="h-4 w-4" />
  </button>
);
