# API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently uses Firebase Authentication. Include the Firebase user ID in request bodies where indicated.

---

## Resources API

### Create Resource

```http
POST /resources
```

**Request Body:**

```json
{
  "title": "Camping Tent",
  "description": "4-person tent, waterproof",
  "ownerId": "firebase-user-id",
  "image": "base64-encoded-image" // optional
}
```

**Response:** `201 Created`

```json
{
  "id": "resource-uuid",
  "title": "Camping Tent",
  "description": "4-person tent, waterproof",
  "ownerId": "firebase-user-id",
  "status": "AVAILABLE",
  "currentLoanId": null,
  "image": "base64-encoded-image"
}
```

### Get Resources by Owner

```http
GET /resources?ownerId={userId}
```

**Response:** `200 OK`

```json
[
  {
    "id": "resource-uuid",
    "title": "Camping Tent",
    "description": "4-person tent",
    "status": "AVAILABLE",
    "currentLoanId": null,
    "image": "base64-encoded-image",
    "owner": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
]
```

### Update Resource

```http
PUT /resources/:id
```

**Request Body:**

```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Response:** `200 OK`

```json
{
  "id": "resource-uuid",
  "title": "Updated Title",
  "description": "Updated description",
  "image": "base64-encoded-image",
  "ownerId": "user-id",
  "status": "AVAILABLE",
  "currentLoanId": null
}
```

### Delete Resource

```http
DELETE /resources/:id
```

**Request Body:**

```json
{
  "userId": "firebase-user-id"
}
```

**Response:** `204 No Content`

---

## Borrow Requests API

### Create Borrow Request

```http
POST /borrow-requests
```

**Request Body:**

```json
{
  "resourceId": "resource-uuid",
  "borrowerId": "firebase-user-id",
  "groupId": "group-uuid", // optional
  "message": "Need this for weekend camping trip", // optional
  "startDate": "2025-11-25T00:00:00Z",
  "endDate": "2025-11-27T00:00:00Z"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "borrowRequest": {
    "id": "request-uuid",
    "resourceId": "resource-uuid",
    "borrowerId": "borrower-id",
    "ownerId": "owner-id",
    "status": "PENDING",
    "message": "Need this for weekend camping trip",
    "startDate": "2025-11-25T00:00:00.000Z",
    "endDate": "2025-11-27T00:00:00.000Z",
    "resource": {
      "id": "resource-uuid",
      "title": "Camping Tent",
      "description": "4-person tent",
      "image": "base64-string"
    },
    "borrower": {
      "id": "borrower-id",
      "email": "borrower@example.com",
      "name": "Jane Smith"
    },
    "owner": {
      "id": "owner-id",
      "email": "owner@example.com",
      "name": "John Doe"
    }
  },
  "message": "Borrow request created successfully"
}
```

**Error Responses:**

`400 Bad Request` - Missing required fields

```json
{
  "error": "Missing required fields",
  "required": ["resourceId", "borrowerId", "startDate", "endDate"]
}
```

`409 Conflict` - Overlapping request or loan

```json
{
  "error": "Request conflict",
  "message": "There is already a pending or approved request for this resource during the requested time period"
}
```

### Get Borrow Requests

```http
GET /borrow-requests?userId={userId}&role={owner|borrower}&status={PENDING|APPROVED|REJECTED|CANCELLED}
```

**Query Parameters:**

- `userId` (required): Firebase user ID
- `role` (required): `owner` or `borrower`
- `status` (optional): Filter by status

**Response:** `200 OK`

```json
{
  "requests": [
    {
      "id": "request-uuid",
      "resourceId": "resource-uuid",
      "borrowerId": "borrower-id",
      "ownerId": "owner-id",
      "status": "PENDING",
      "message": "Need this for camping",
      "startDate": "2025-11-25T00:00:00.000Z",
      "endDate": "2025-11-27T00:00:00.000Z",
      "resource": {
        "id": "resource-uuid",
        "title": "Camping Tent",
        "description": "4-person tent",
        "image": "base64-string"
      },
      "borrower": {
        "id": "borrower-id",
        "email": "borrower@example.com",
        "name": "Jane Smith"
      },
      "owner": {
        "id": "owner-id",
        "email": "owner@example.com",
        "name": "John Doe"
      },
      "loan": null
    }
  ]
}
```

### Accept Borrow Request

```http
POST /borrow-requests/:id/accept
```

**Response:** `200 OK`

```json
{
  "message": "Borrow request accepted and loan created",
  "borrowRequest": {
    "id": "request-uuid",
    "status": "APPROVED",
    "resourceId": "resource-uuid",
    "borrowerId": "borrower-id",
    "ownerId": "owner-id",
    "startDate": "2025-11-25T00:00:00.000Z",
    "endDate": "2025-11-27T00:00:00.000Z"
  },
  "loan": {
    "id": "loan-uuid",
    "resourceId": "resource-uuid",
    "borrowerId": "borrower-id",
    "lenderId": "owner-id",
    "status": "ACTIVE",
    "startDate": "2025-11-25T00:00:00.000Z",
    "endDate": "2025-11-27T00:00:00.000Z"
  }
}
```

### Decline Borrow Request

```http
POST /borrow-requests/:id/decline
```

**Response:** `200 OK`

```json
{
  "message": "Borrow request declined",
  "borrowRequest": {
    "id": "request-uuid",
    "status": "REJECTED"
  }
}
```

### Cancel Borrow Request

```http
POST /borrow-requests/:id/cancel
```

**Response:** `200 OK`

```json
{
  "message": "Borrow request cancelled",
  "borrowRequest": {
    "id": "request-uuid",
    "status": "CANCELLED"
  }
}
```

### Mark Item as Returned

```http
POST /borrow-requests/:id/mark-returned
```

**Description:** Marks an active loan as returned and updates resource status.

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Item marked as returned successfully",
  "loan": {
    "id": "loan-uuid",
    "status": "RETURNED",
    "returnedDate": "2025-11-27T14:30:00.000Z"
  },
  "resource": {
    "id": "resource-uuid",
    "status": "AVAILABLE",
    "currentLoanId": null
  }
}
```

---

## Groups API

### Create Group

```http
POST /groups
```

**Request Body:**

```json
{
  "name": "Weekend Warriors",
  "createdById": "firebase-user-id"
}
```

**Response:** `201 Created`

```json
{
  "id": "group-uuid",
  "name": "Weekend Warriors",
  "description": null,
  "createdById": "user-id",
  "avatar": null
}
```

### Get User's Groups

```http
GET /groups?userId={userId}
```

**Response:** `200 OK`

```json
[
  {
    "id": "group-uuid",
    "name": "Weekend Warriors",
    "description": "Outdoor adventure group",
    "avatar": "base64-string",
    "createdById": "creator-id",
    "members": [
      {
        "id": "member-uuid",
        "userId": "user-id",
        "role": "owner"
      }
    ]
  }
]
```

### Get Group Details

```http
GET /groups/:id
```

**Response:** `200 OK`

```json
{
  "id": "group-uuid",
  "name": "Weekend Warriors",
  "description": "Outdoor adventure group",
  "avatar": "base64-string",
  "createdById": "creator-id",
  "members": [
    {
      "id": "member-uuid",
      "userId": "user-id",
      "role": "owner",
      "user": {
        "id": "user-id",
        "email": "user@example.com",
        "name": "John Doe"
      }
    }
  ],
  "sharedResources": [
    {
      "id": "resource-uuid",
      "title": "Camping Tent",
      "description": "4-person tent",
      "status": "AVAILABLE",
      "image": "base64-string",
      "owner": {
        "id": "owner-id",
        "email": "owner@example.com",
        "name": "John Doe"
      }
    }
  ]
}
```

### Update Group

```http
PUT /groups/:id
```

**Request Body:**

```json
{
  "name": "Updated Group Name",
  "description": "New description",
  "avatar": "base64-encoded-image"
}
```

**Response:** `200 OK`

### Add Group Member

```http
POST /groups/:groupId/members
```

**Request Body:**

```json
{
  "email": "newmember@example.com"
}
```

**Response:** `201 Created`

### Remove Group Member

```http
DELETE /groups/:groupId/members/:memberId
```

**Response:** `204 No Content`

---

## Resource Sharing API

### Share Resource with Group

```http
POST /resources/:resourceId/share
```

**Request Body:**

```json
{
  "groupIds": ["group-uuid-1", "group-uuid-2"]
}
```

**Response:** `200 OK`

```json
{
  "message": "Resource shared successfully",
  "sharedWith": [
    {
      "id": "sharing-uuid",
      "resourceId": "resource-uuid",
      "groupId": "group-uuid-1"
    },
    {
      "id": "sharing-uuid",
      "resourceId": "resource-uuid",
      "groupId": "group-uuid-2"
    }
  ]
}
```

### Get Shared Resources

```http
GET /resources/shared?userId={userId}
```

**Description:** Returns all resources shared in groups the user is a member of.

**Response:** `200 OK`

```json
[
  {
    "id": "resource-uuid",
    "title": "Camping Tent",
    "description": "4-person tent",
    "status": "AVAILABLE",
    "currentLoanId": null,
    "image": "base64-string",
    "owner": {
      "id": "owner-id",
      "email": "owner@example.com",
      "name": "John Doe"
    },
    "currentLoan": null
  }
]
```

---

## Status Codes

| Code | Description                         |
| ---- | ----------------------------------- |
| 200  | Success                             |
| 201  | Created                             |
| 204  | No Content                          |
| 400  | Bad Request - Invalid input         |
| 403  | Forbidden - Not authorized          |
| 404  | Not Found                           |
| 409  | Conflict - Overlapping loan/request |
| 500  | Internal Server Error               |

---

## Data Models

### BorrowRequest Status

- `PENDING` - Awaiting owner approval
- `APPROVED` - Accepted by owner, loan created
- `REJECTED` - Declined by owner
- `CANCELLED` - Cancelled by borrower

### Loan Status

- `ACTIVE` - Currently borrowed
- `RETURNED` - Item returned
- `OVERDUE` - Past end date

### Resource Status

- `AVAILABLE` - Can be borrowed
- `BORROWED` - Currently on loan
- `UNAVAILABLE` - Not available for borrowing
