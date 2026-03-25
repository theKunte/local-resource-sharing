import admin from "firebase-admin";
import prisma from "../prisma";

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification to a specific user via FCM.
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

export function notifyNewBorrowRequest(
  ownerId: string,
  borrowerName: string,
  itemTitle: string,
  requestId: string,
) {
  return sendNotification(ownerId, {
    title: "New Borrow Request",
    body: `${borrowerName} wants to borrow your "${itemTitle}"`,
    data: { type: "borrow_request", requestId },
  });
}

export function notifyRequestAccepted(
  borrowerId: string,
  ownerName: string,
  itemTitle: string,
  requestId: string,
) {
  return sendNotification(borrowerId, {
    title: "Request Accepted!",
    body: `${ownerName} approved your request for "${itemTitle}"`,
    data: { type: "request_accepted", requestId },
  });
}

export function notifyRequestDeclined(
  borrowerId: string,
  ownerName: string,
  itemTitle: string,
  requestId: string,
) {
  return sendNotification(borrowerId, {
    title: "Request Declined",
    body: `${ownerName} declined your request for "${itemTitle}"`,
    data: { type: "request_declined", requestId },
  });
}

export function notifyReturnRequested(
  ownerId: string,
  borrowerName: string,
  itemTitle: string,
  loanId: string,
) {
  return sendNotification(ownerId, {
    title: "Item Return Requested",
    body: `${borrowerName} says they returned your "${itemTitle}" — please confirm`,
    data: { type: "return_requested", loanId },
  });
}

export function notifyReturnConfirmed(
  borrowerId: string,
  ownerName: string,
  itemTitle: string,
  loanId: string,
) {
  return sendNotification(borrowerId, {
    title: "Return Confirmed",
    body: `${ownerName} confirmed the return of "${itemTitle}"`,
    data: { type: "return_confirmed", loanId },
  });
}
