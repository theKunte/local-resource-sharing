/**
 * Shared API types and interfaces
 */

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
}

// Resource/Gear types
export interface Owner {
  id: string;
  email: string;
  name?: string;
}

export interface Borrower {
  id: string;
  name?: string;
  email: string;
}

export interface CurrentLoan {
  id: string;
  status: "ACTIVE" | "PENDING_RETURN_CONFIRMATION" | "RETURNED" | "OVERDUE";
  startDate: string;
  endDate: string;
  returnedDate?: string;
  borrower: Borrower;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  image?: string;
  ownerId: string;
  status: "AVAILABLE" | "BORROWED" | "UNAVAILABLE";
  currentLoanId?: string;
  owner?: Owner;
  currentLoan?: CurrentLoan;
}

// Group types
export interface GroupMember {
  id: string;
  user: User;
  role: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdById: string;
  avatar?: string;
  memberCount?: number;
  members?: GroupMember[];
  userRole?: string; // The current user's role in this group
}

// Borrow Request types
export type BorrowRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface BorrowRequest {
  id: string;
  resourceId: string;
  borrowerId: string;
  ownerId: string;
  status: BorrowRequestStatus;
  message?: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  resource?: Resource;
  borrower?: User;
  owner?: User;
}

// API Error types
export interface ApiError {
  error?: string;
  message?: string;
  details?: string[];
}

export interface ApiErrorResponse {
  response?: {
    data?: ApiError;
    status?: number;
    statusText?: string;
  };
  message: string;
}

// API Request/Response types
export interface CreateResourceRequest {
  title: string;
  description: string;
  image: string;
  ownerId: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  createdById: string;
  avatar?: string;
}

export interface CreateBorrowRequestData {
  resourceId: string;
  borrowerId: string;
  groupId?: string;
  startDate: string;
  endDate: string;
  message?: string;
}

export interface UpdateResourceRequest {
  title?: string;
  description?: string;
  image?: string;
  status?: "AVAILABLE" | "BORROWED" | "UNAVAILABLE";
}
