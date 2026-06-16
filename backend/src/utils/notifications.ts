import admin from "firebase-admin";
import prisma from "../prisma";
import NotificationService from "../services/NotificationService";

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification to a specific user via FCM.
 * @deprecated Use NotificationService.send() instead for multi-device and persistent storage.
 * Kept for backward compatibility only.
 * Silently fails if user has no token or token is invalid.
 */
export async function sendNotification(
  userId: string,
  payload: NotificationPayload,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) return;

    await admin.messaging().send({
      token: user.fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      webpush: {
        headers: { Urgency: "high" },
        notification: {
          icon: "/vite.svg",
          badge: "/vite.svg",
          requireInteraction: true,
        },
      },
    });
  } catch (error: any) {
    // If token is invalid/expired, remove it from the database
    if (
      error?.code === "messaging/invalid-registration-token" ||
      error?.code === "messaging/registration-token-not-registered"
    ) {
      await prisma.user.update({
        where: { id: userId },
        data: { fcmToken: null },
      });
    }
    // Don't throw — notifications should never break the main flow
    console.error(
      `Failed to send notification to user ${userId}:`,
      error?.message || error,
    );
  }
}

// Pre-built notification helpers for common events
// Now uses NotificationService for multi-device push + persistent in-app notifications

export function notifyNewBorrowRequest(
  ownerId: string,
  borrowerName: string,
  itemTitle: string,
  requestId: string,
) {
  return NotificationService.send({
    userId: ownerId,
    type: "borrow_request",
    title: "New Borrow Request",
    body: `${borrowerName} wants to borrow your "${itemTitle}"`,
    data: { requestId, itemTitle, borrowerName },
    actionUrl: `/requests/${requestId}`,
    priority: "high",
  });
}

export function notifyRequestAccepted(
  borrowerId: string,
  ownerName: string,
  itemTitle: string,
  requestId: string,
) {
  return NotificationService.send({
    userId: borrowerId,
    type: "request_accepted",
    title: "Request Accepted!",
    body: `${ownerName} approved your request for "${itemTitle}"`,
    data: { requestId, itemTitle, ownerName },
    actionUrl: `/requests/${requestId}`,
    priority: "high",
  });
}

export function notifyRequestDeclined(
  borrowerId: string,
  ownerName: string,
  itemTitle: string,
  requestId: string,
) {
  return NotificationService.send({
    userId: borrowerId,
    type: "request_declined",
    title: "Request Declined",
    body: `${ownerName} declined your request for "${itemTitle}"`,
    data: { requestId, itemTitle, ownerName },
    actionUrl: `/requests/${requestId}`,
    priority: "normal",
  });
}

export function notifyReturnRequested(
  ownerId: string,
  borrowerName: string,
  itemTitle: string,
  loanId: string,
) {
  return NotificationService.send({
    userId: ownerId,
    type: "return_requested",
    title: "Item Return Requested",
    body: `${borrowerName} says they returned your "${itemTitle}" — please confirm`,
    data: { loanId, itemTitle, borrowerName },
    actionUrl: `/loans/${loanId}`,
    priority: "high",
  });
}

export function notifyReturnConfirmed(
  borrowerId: string,
  ownerName: string,
  itemTitle: string,
  loanId: string,
) {
  return NotificationService.send({
    userId: borrowerId,
    type: "return_confirmed",
    title: "Return Confirmed",
    body: `${ownerName} confirmed the return of "${itemTitle}"`,
    data: { loanId, itemTitle, ownerName },
    actionUrl: `/loans/${loanId}`,
    priority: "normal",
  });
}
