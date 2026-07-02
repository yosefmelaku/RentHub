import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { PropertyListing, Booking, PaymentRecord, AppUser, Review, Tenant, AuditLog } from '../types';

import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Tenant helper functions
export function getActiveTenantId(): string {
  return localStorage.getItem('renthub_tenant_id') || 'luxerent';
}

export function setActiveTenantId(tenantId: string) {
  localStorage.setItem('renthub_tenant_id', tenantId);
}

// Seed function - no-op since server handles PostgreSQL seed
export async function seedDatabaseIfEmpty() {
  // PostgreSQL database is seeded automatically by the server
  return;
}

// Multi-Tenant Metadata APIs
export async function getAllTenants(): Promise<Tenant[]> {
  const res = await fetch('/api/tenants');
  if (!res.ok) {
    throw new Error('Failed to fetch tenants');
  }
  return await res.json() as Tenant[];
}

export async function createTenant(tenant: Omit<Tenant, 'createdAt'>): Promise<Tenant> {
  const res = await fetch('/api/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tenant)
  });
  if (!res.ok) {
    throw new Error('Failed to create tenant');
  }
  return await res.json() as Tenant;
}

export async function updateTenantConfig(tenantId: string, update: Partial<Tenant>): Promise<void> {
  const res = await fetch(`/api/tenants/${tenantId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update)
  });
  if (!res.ok) {
    throw new Error('Failed to update tenant configuration');
  }
}

// Enterprise Audit Logs
export async function getAuditLogs(email: string): Promise<AuditLog[]> {
  const res = await fetch(`/api/audit-logs?email=${encodeURIComponent(email)}`, {
    headers: { 'x-tenant-id': getActiveTenantId() }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch audit logs');
  }
  return await res.json() as AuditLog[];
}

// Enterprise Analytics
export async function getEnterpriseAnalytics(): Promise<any> {
  const res = await fetch('/api/enterprise/analytics', {
    headers: { 'x-tenant-id': getActiveTenantId() }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch enterprise analytics');
  }
  return await res.json();
}

// Listing operations
export async function getAllListings(): Promise<PropertyListing[]> {
  const res = await fetch('/api/listings', {
    headers: { 'x-tenant-id': getActiveTenantId() }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch listings');
  }
  return await res.json() as PropertyListing[];
}

export async function createListing(listing: Omit<PropertyListing, 'id' | 'rating' | 'reviewsCount'>): Promise<PropertyListing> {
  const listingId = "listing_" + Date.now();
  const newListing: PropertyListing = {
    ...listing,
    id: listingId,
    rating: 5.0,
    reviewsCount: 0
  };

  const res = await fetch('/api/listings', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-tenant-id': getActiveTenantId()
    },
    body: JSON.stringify(newListing)
  });

  if (!res.ok) {
    throw new Error('Failed to create listing');
  }

  return await res.json() as PropertyListing;
}

export async function deleteListing(listingId: string): Promise<void> {
  const res = await fetch(`/api/listings/${listingId}`, {
    method: 'DELETE',
    headers: { 'x-tenant-id': getActiveTenantId() }
  });
  if (!res.ok) {
    throw new Error('Failed to delete listing');
  }
}

// Booking operations
export async function getBookingsByRenter(renterId: string): Promise<Booking[]> {
  const res = await fetch(`/api/bookings/renter?email=${encodeURIComponent(renterId)}`, {
    headers: { 'x-tenant-id': getActiveTenantId() }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch renter bookings');
  }
  const data = await res.json() as Booking[];
  return data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBookingsByOwner(ownerId: string): Promise<Booking[]> {
  const res = await fetch(`/api/bookings/owner?email=${encodeURIComponent(ownerId)}`, {
    headers: { 'x-tenant-id': getActiveTenantId() }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch owner bookings');
  }
  const data = await res.json() as Booking[];
  return data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createBooking(booking: Omit<Booking, 'id' | 'status' | 'createdAt' | 'paymentStatus'>): Promise<Booking> {
  const bookingId = "booking_" + Date.now();
  const newBooking: Booking = {
    ...booking,
    id: bookingId,
    status: 'pending',
    paymentStatus: 'unpaid',
    createdAt: new Date().toISOString()
  };

  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-tenant-id': getActiveTenantId()
    },
    body: JSON.stringify(newBooking)
  });

  if (!res.ok) {
    throw new Error('Failed to create booking');
  }

  return await res.json() as Booking;
}

export async function updateBookingStatus(bookingId: string, status: Booking['status']): Promise<void> {
  const res = await fetch(`/api/bookings/${bookingId}/status`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'x-tenant-id': getActiveTenantId()
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    throw new Error('Failed to update booking status');
  }
}

export async function updateBookingPaymentStatus(bookingId: string, paymentStatus: Booking['paymentStatus']): Promise<void> {
  const res = await fetch(`/api/bookings/${bookingId}/payment`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'x-tenant-id': getActiveTenantId()
    },
    body: JSON.stringify({ paymentStatus, status: 'approved' })
  });
  if (!res.ok) {
    throw new Error('Failed to update booking payment status');
  }
}

export async function updateBookingContract(
  bookingId: string,
  contractUpdate: Partial<Pick<Booking, 'contractPdfName' | 'contractPdfData' | 'contractStatus' | 'contractSignedByRenter' | 'contractSignedByOwner' | 'contractLastUpdated'>>
): Promise<void> {
  const res = await fetch(`/api/bookings/${bookingId}/contract`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'x-tenant-id': getActiveTenantId()
    },
    body: JSON.stringify(contractUpdate)
  });
  if (!res.ok) {
    throw new Error('Failed to update booking contract');
  }
}

// Payment operations
export async function createPaymentRecord(payment: Omit<PaymentRecord, 'id' | 'transactionId' | 'timestamp' | 'status'>): Promise<PaymentRecord> {
  const paymentId = "pay_" + Date.now();
  const newPayment: PaymentRecord = {
    ...payment,
    id: paymentId,
    transactionId: "TXN_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
    timestamp: new Date().toISOString(),
    status: 'success'
  };

  const res = await fetch('/api/payments', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-tenant-id': getActiveTenantId()
    },
    body: JSON.stringify(newPayment)
  });

  if (!res.ok) {
    throw new Error('Failed to create payment record');
  }

  return await res.json() as PaymentRecord;
}

export async function getPaymentsByRenter(renterId: string): Promise<PaymentRecord[]> {
  const res = await fetch(`/api/payments/renter?email=${encodeURIComponent(renterId)}`, {
    headers: { 'x-tenant-id': getActiveTenantId() }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch payments');
  }
  return await res.json() as PaymentRecord[];
}

// User Operations
export async function signUpUser(user: AppUser): Promise<AppUser> {
  const res = await fetch('/api/users/signup', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-tenant-id': getActiveTenantId()
    },
    body: JSON.stringify(user)
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to sign up');
  }

  return await res.json() as AppUser;
}

export async function loginUser(email: string, password?: string): Promise<AppUser> {
  const res = await fetch('/api/users/login', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-tenant-id': getActiveTenantId()
    },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to login');
  }

  return await res.json() as AppUser;
}

export async function signInWithGoogle(): Promise<AppUser> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const emailKey = user.email ? user.email.toLowerCase().trim() : '';
    if (!emailKey) {
      throw new Error("Could not retrieve email from Google Account.");
    }

    const res = await fetch('/api/users/signup', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-tenant-id': getActiveTenantId()
      },
      body: JSON.stringify({
        email: emailKey,
        name: user.displayName || "Google User",
        role: 'renter'
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to sync user on login");
    }

    return await res.json() as AppUser;
  } catch (err) {
    console.error("Google sign in failed:", err);
    throw err;
  }
}

// Reviews
export async function getReviewsForListing(listingId: string): Promise<Review[]> {
  const res = await fetch(`/api/reviews/${listingId}`, {
    headers: { 'x-tenant-id': getActiveTenantId() }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch reviews');
  }
  const data = await res.json() as Review[];
  return data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
  const reviewId = "rev_" + Date.now();
  const newReview: Review = {
    ...review,
    id: reviewId,
    createdAt: new Date().toISOString()
  };

  const res = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-tenant-id': getActiveTenantId()
    },
    body: JSON.stringify(newReview)
  });

  if (!res.ok) {
    throw new Error('Failed to create review');
  }

  return await res.json() as Review;
}
