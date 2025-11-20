# Borrow → Loan Lifecycle

## Overview

This document describes the complete lifecycle of borrowing resources in the application, from request creation to item return.

---

## State Machine Overview

```
[BORROWER creates request]
           ↓
    ┌─────────────┐
    │  PENDING    │ ← BorrowRequest created
    └─────────────┘
         │  │  │
         │  │  └─→ CANCELLED (borrower cancels)
         │  └────→ REJECTED (owner declines)
         ↓
    ┌─────────────┐
    │  APPROVED   │ ← Owner accepts
    └─────────────┘
         ↓
    [Creates LOAN + Updates RESOURCE]
         ↓
    ┌─────────────┐
    │ LOAN.ACTIVE │ ← Borrowing period starts
    │ RESOURCE.   │
    │  BORROWED   │
    └─────────────┘
         ↓
    [Owner marks as returned]
         ↓
    ┌─────────────┐
    │LOAN.RETURNED│ ← Item returned
    │RESOURCE.    │
    │ AVAILABLE   │
    └─────────────┘
```

---

## Lifecycle Stages

### Stage 1: Request Creation

**Actor**: Borrower  
**Endpoint**: `POST /api/borrow-requests`

**Process**:

1. Borrower selects a resource from the community or group
2. Borrower specifies start date and end date
3. System validates:
   - Resource exists and is AVAILABLE
   - Borrower is not the owner
   - No overlapping approved/pending requests exist for those dates (ANY user)
4. BorrowRequest created with `status = PENDING`

**Request Body**:

```json
{
  "resourceId": "uuid",
  "message": "Optional message to owner",
  "startDate": "2025-01-15T00:00:00Z",
  "endDate": "2025-01-20T00:00:00Z"
}
```

**Database Changes**:

```sql
INSERT INTO BorrowRequest (
  id, resourceId, borrowerId, ownerId,
  status, message, startDate, endDate, createdAt
) VALUES (
  'new-uuid', 'resource-id', 'borrower-id', 'owner-id',
  'PENDING', 'message', '2025-01-15', '2025-01-20', NOW()
)
```

**Validations**:

- ❌ **409 Conflict**: Another user has overlapping PENDING/APPROVED request
- ❌ **400 Bad Request**: Start date > End date
- ❌ **403 Forbidden**: Borrower is the resource owner
- ❌ **404 Not Found**: Resource doesn't exist
- ✅ **201 Created**: Request successfully created

---

### Stage 2: Owner Review

**Actor**: Owner  
**Endpoints**:

- `GET /api/borrow-requests/incoming` - View received requests
- `PATCH /api/borrow-requests/:id/approve` - Approve request
- `PATCH /api/borrow-requests/:id/reject` - Reject request

**Process - Approval**:

1. Owner views incoming requests in Request Dashboard
2. Owner clicks "Approve" on a PENDING request
3. System creates Loan atomically in transaction:
   - BorrowRequest.status = APPROVED
   - Loan created with status = ACTIVE
   - Resource.status = BORROWED
   - Resource.currentLoanId = new Loan.id

**Approval Endpoint**: `PATCH /api/borrow-requests/:requestId/approve`

**Database Transaction**:

```sql
BEGIN TRANSACTION;

-- Update request
UPDATE BorrowRequest
SET status = 'APPROVED'
WHERE id = 'request-id';

-- Create loan
INSERT INTO Loan (
  id, borrowRequestId, resourceId, borrowerId, lenderId,
  status, startDate, endDate, createdAt
) VALUES (
  'loan-id', 'request-id', 'resource-id', 'borrower-id', 'owner-id',
  'ACTIVE', '2025-01-15', '2025-01-20', NOW()
);

-- Update resource
UPDATE Resource
SET status = 'BORROWED', currentLoanId = 'loan-id'
WHERE id = 'resource-id';

COMMIT;
```

**Process - Rejection**:

1. Owner clicks "Reject" on a PENDING request
2. BorrowRequest.status = REJECTED
3. No Loan is created
4. Resource remains AVAILABLE

**Rejection Endpoint**: `PATCH /api/borrow-requests/:requestId/reject`

**Database Changes**:

```sql
UPDATE BorrowRequest
SET status = 'REJECTED'
WHERE id = 'request-id';
```

---

### Stage 3: Active Loan Period

**Duration**: `Loan.startDate` to `Loan.endDate`

**State**:

- **BorrowRequest.status**: APPROVED
- **Loan.status**: ACTIVE
- **Resource.status**: BORROWED
- **Resource.currentLoanId**: Points to active Loan

**Visibility**:

- Resource shows "Borrowed" badge with return date
- "Request to Borrow" button is disabled
- Resource image displayed with grayscale filter
- Owner can see loan in "Outgoing Requests" tab
- Borrower can see loan in "Incoming Requests" tab

**No Actions Available**:

- Borrowers cannot create new requests for this resource
- Resource cannot be edited to change availability
- Loan cannot be cancelled once approved

---

### Stage 4: Item Return

**Actor**: Owner (lender)  
**Endpoint**: `POST /api/borrow-requests/:id/mark-returned`

**Process**:

1. Borrower physically returns item to owner
2. Owner opens Request Dashboard → Outgoing tab
3. Owner clicks "Mark as Returned" on approved active loan
4. Confirmation dialog appears
5. System updates Loan and Resource atomically:
   - Loan.status = RETURNED
   - Loan.returnedDate = NOW()
   - Resource.status = AVAILABLE
   - Resource.currentLoanId = NULL

**Database Transaction**:

```sql
BEGIN TRANSACTION;

-- Update loan
UPDATE Loan
SET status = 'RETURNED', returnedDate = NOW()
WHERE id = 'loan-id';

-- Update resource
UPDATE Resource
SET status = 'AVAILABLE', currentLoanId = NULL
WHERE id = 'resource-id';

COMMIT;
```

**UI Confirmation**:

```
┌─────────────────────────────────────────┐
│  ✓ Item marked as returned!             │
│  Return date: January 15, 2025          │
└─────────────────────────────────────────┘
```

**After Return**:

- Resource becomes AVAILABLE again
- New borrow requests can be created
- Loan remains in database with RETURNED status (history)
- BorrowRequest remains with APPROVED status (history)

---

## Edge Cases & Business Rules

### Overlapping Requests

**Rule**: Only ONE active loan per resource at a time

**Scenario**: User B tries to borrow item for Jan 15-20, but User A already has PENDING/APPROVED request for Jan 17-22

**Result**:

```json
{
  "error": "A borrow request already exists for this resource during the selected dates."
}
```

**Backend Logic** (lines 1450-1473 in index.ts):

```typescript
const conflictingRequest = await prisma.borrowRequest.findFirst({
  where: {
    resourceId: resourceId,
    status: { in: ["PENDING", "APPROVED"] },
    OR: [
      {
        AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
      },
    ],
  },
});

if (conflictingRequest) {
  return res.status(409).json({
    message:
      "A borrow request already exists for this resource during the selected dates.",
  });
}
```

---

### Self-Borrowing Prevention

**Rule**: Users cannot borrow their own resources

**Validation**:

```typescript
if (borrowerId === resource.ownerId) {
  return res.status(403).json({
    message: "You cannot borrow your own resource",
  });
}
```

---

### Borrower Cancellation

**Actor**: Borrower  
**Endpoint**: `DELETE /api/borrow-requests/:id`

**Allowed States**: PENDING only

**Process**:

1. Borrower cancels their own pending request
2. BorrowRequest.status = CANCELLED
3. No impact on resource or loan (none created yet)

**Database**:

```sql
UPDATE BorrowRequest
SET status = 'CANCELLED'
WHERE id = 'request-id' AND status = 'PENDING';
```

---

### Edit Borrowed Resource

**Rule**: Editing a borrowed resource must preserve status

**Backend Fix** (lines 181-199 in index.ts):

```typescript
const updatedResource = await prisma.resource.update({
  where: { id },
  data: {
    title,
    description,
    image,
    status, // Explicitly preserve status
  },
  select: {
    id: true,
    title: true,
    description: true,
    image: true,
    ownerId: true,
    status: true,
    currentLoanId: true, // Preserve loan link
  },
});
```

**Why**: Without explicit `select`, Prisma omits fields not in `data`, causing borrowed items to appear available after edit.

---

### Overdue Loans

**Status**: OVERDUE (currently unused, future feature)

**Potential Logic**:

```typescript
// Cron job or API check
const overdue = await prisma.loan.updateMany({
  where: {
    status: "ACTIVE",
    endDate: { lt: new Date() },
  },
  data: {
    status: "OVERDUE",
  },
});
```

---

## API Endpoint Summary

| Action         | Method | Endpoint                                 | Actor    |
| -------------- | ------ | ---------------------------------------- | -------- |
| Create request | POST   | `/api/borrow-requests`                   | Borrower |
| View incoming  | GET    | `/api/borrow-requests/incoming`          | Owner    |
| View outgoing  | GET    | `/api/borrow-requests/outgoing`          | Borrower |
| Approve        | PATCH  | `/api/borrow-requests/:id/approve`       | Owner    |
| Reject         | PATCH  | `/api/borrow-requests/:id/reject`        | Owner    |
| Cancel         | DELETE | `/api/borrow-requests/:id`               | Borrower |
| Mark returned  | POST   | `/api/borrow-requests/:id/mark-returned` | Owner    |

---

## Frontend Components

### BorrowRequestModal.tsx

- Displays date picker form
- Validates start < end date
- Calls `POST /api/borrow-requests`
- Shows error messages from backend

### RequestDashboard.tsx

- Dual-tab interface: Incoming (owner) / Outgoing (borrower)
- Incoming tab shows:
  - Approve/Reject buttons for PENDING
  - "Mark as Returned" button for APPROVED active loans
  - Green success box after return
- Outgoing tab shows:
  - Cancel button for PENDING
  - Loan status for APPROVED

### GearCard.tsx & ResourceCard.tsx

- Display borrowed status:
  - Red "Borrowed" badge with return date
  - Grayscale image filter
  - Disabled "Request to Borrow" button
  - "Currently Borrowed" button text
- Check `status === "BORROWED" && currentLoan` to determine borrowed state

---

## Date Handling

**Format**: ISO 8601 with timezone  
**Example**: `"2025-01-15T00:00:00Z"`

**Frontend**:

```typescript
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
```

**Display**: "January 15, 2025"

**Backend**:

- Uses Prisma DateTime type
- Stores as ISO timestamp
- Comparison operations use `lte`, `gte` for overlap detection

---

## Transaction Safety

All multi-step operations use Prisma transactions:

```typescript
await prisma.$transaction(async (tx) => {
  // Update request
  const request = await tx.borrowRequest.update({...});

  // Create loan
  const loan = await tx.loan.create({...});

  // Update resource
  await tx.resource.update({...});
});
```

**Ensures**:

- Atomicity: All succeed or all fail
- No partial state (e.g., approved request without loan)
- Database consistency

---

## Future Enhancements

1. **Notifications**: Email/push when request approved/rejected
2. **Overdue Tracking**: Automated status updates and reminders
3. **Rating System**: Borrowers rate items, owners rate borrowers
4. **Reservation System**: Request future dates in advance
5. **Calendar View**: Visual timeline of loans and availability
6. **Auto-Return**: Mark as returned automatically after endDate + grace period
7. **Late Fees**: Configurable penalties for overdue items
8. **Damage Reports**: Document item condition on return

---

## Testing Checklist

- [ ] Create request with valid dates → PENDING
- [ ] Create request with invalid dates → 400 error
- [ ] Create overlapping request → 409 error
- [ ] Approve request → APPROVED + ACTIVE loan + BORROWED resource
- [ ] Reject request → REJECTED, resource stays AVAILABLE
- [ ] Cancel pending request → CANCELLED
- [ ] Mark returned → RETURNED loan + AVAILABLE resource
- [ ] Edit borrowed item → preserves BORROWED status
- [ ] View borrowed item → shows badge and disabled button
- [ ] Create new request after return → succeeds
