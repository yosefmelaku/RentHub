export interface AppUser {
  name: string;
  email: string;
  role: 'renter' | 'owner' | 'tenant_admin' | 'global_admin';
  password?: string;
  tenantId?: string;
}

export interface Tenant {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD';
  taxRate: number; // percentage, e.g. 10.0 for 10%
  allowPublicSignup: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userEmail: string;
  action: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface PropertyListing {
  id: string;
  tenantId?: string;
  title: string;
  description: string;
  location: string;
  price: number; // per night
  type: 'house' | 'apartment' | 'villa' | 'studio' | 'office' | 'other';
  beds: number;
  baths: number;
  image: string;
  amenities: string[];
  rating: number;
  reviewsCount: number;
  ownerId: string;
  featured?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface Booking {
  id: string;
  tenantId?: string;
  listingId: string;
  listingTitle?: string; // Cache for easy dashboard rendering
  listingImage?: string; // Cache for easy dashboard rendering
  listingLocation?: string; // Cache for easy dashboard rendering
  renterId: string;
  renterName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalPrice: number;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  createdAt: string;
  paymentStatus: 'paid' | 'unpaid';
  nights: number;
  contractPdfName?: string;
  contractPdfData?: string; // Base64 encoding of PDF/text contract
  contractStatus?: 'pending_owner_signature' | 'pending_renter_signature' | 'fully_signed' | 'draft';
  contractSignedByRenter?: boolean;
  contractSignedByOwner?: boolean;
  contractLastUpdated?: string;
}

export interface PaymentRecord {
  id: string;
  tenantId?: string;
  bookingId: string;
  renterId: string;
  amount: number;
  cardholderName: string;
  cardNumberMasked: string;
  transactionId: string;
  timestamp: string;
  status: 'success' | 'failed';
}

export interface Review {
  id: string;
  tenantId?: string;
  listingId: string;
  renterId: string;
  renterName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface OwnerStats {
  totalEarnings: number;
  occupancyRate: number;
  totalBookings: number;
  activeListingsCount: number;
}
