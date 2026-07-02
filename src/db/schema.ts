import { pgTable, text, integer, doublePrecision, boolean } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').default('#059669').notNull(),
  currency: text('currency').default('USD').notNull(),
  taxRate: doublePrecision('tax_rate').default(10.0).notNull(),
  allowPublicSignup: boolean('allow_public_signup').default(true).notNull(),
  createdAt: text('created_at').notNull()
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').default('luxerent').notNull(),
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(),
  details: text('details').notNull(),
  ipAddress: text('ip_address').default('127.0.0.1').notNull(),
  timestamp: text('timestamp').notNull()
});

export const users = pgTable('users', {
  email: text('email').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(), // renter, owner, tenant_admin, global_admin
  password: text('password'),
  tenantId: text('tenant_id').default('luxerent').notNull()
});

export const listings = pgTable('listings', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').default('luxerent').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  location: text('location').notNull(),
  price: integer('price').notNull(),
  type: text('type').notNull(), // house, apartment, villa, studio
  beds: integer('beds').notNull(),
  baths: doublePrecision('baths').notNull(),
  image: text('image').notNull(),
  amenities: text('amenities').array(),
  rating: doublePrecision('rating').default(5.0).notNull(),
  reviewsCount: integer('reviews_count').default(0).notNull(),
  ownerId: text('owner_id').references(() => users.email).notNull(),
  featured: boolean('featured').default(false).notNull()
});

export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').default('luxerent').notNull(),
  listingId: text('listing_id').references(() => listings.id, { onDelete: 'cascade' }).notNull(),
  listingTitle: text('listing_title'),
  listingImage: text('listing_image'),
  listingLocation: text('listing_location'),
  renterId: text('renter_id').references(() => users.email).notNull(),
  renterName: text('renter_name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  totalPrice: integer('total_price').notNull(),
  status: text('status').default('pending').notNull(), // pending, approved, declined, cancelled
  createdAt: text('created_at').notNull(),
  paymentStatus: text('payment_status').default('unpaid').notNull(), // paid, unpaid
  nights: integer('nights').notNull(),
  contractPdfName: text('contract_pdf_name'),
  contractPdfData: text('contract_pdf_data'),
  contractStatus: text('contract_status'), // pending_owner_signature, pending_renter_signature, fully_signed, draft
  contractSignedByRenter: boolean('contract_signed_by_renter'),
  contractSignedByOwner: boolean('contract_signed_by_owner'),
  contractLastUpdated: text('contract_last_updated')
});

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').default('luxerent').notNull(),
  bookingId: text('booking_id').references(() => bookings.id, { onDelete: 'cascade' }).notNull(),
  renterId: text('renter_id').references(() => users.email).notNull(),
  amount: integer('amount').notNull(),
  cardholderName: text('cardholder_name').notNull(),
  cardNumberMasked: text('card_number_masked').notNull(),
  transactionId: text('transaction_id').notNull(),
  timestamp: text('timestamp').notNull(),
  status: text('status').notNull() // success, failed
});

export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').default('luxerent').notNull(),
  listingId: text('listing_id').references(() => listings.id, { onDelete: 'cascade' }).notNull(),
  renterId: text('renter_id').references(() => users.email).notNull(),
  renterName: text('renter_name').notNull(),
  rating: doublePrecision('rating').notNull(),
  comment: text('comment').notNull(),
  createdAt: text('created_at').notNull()
});

export const ledgerEntries = pgTable('ledger_entries', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').default('luxerent').notNull(),
  description: text('description').notNull(),
  debitAccount: text('debit_account').notNull(), // Cash, Accounts Receivable, etc.
  creditAccount: text('credit_account').notNull(), // Rental Revenue, Owner Payable, Tax Liability
  amount: integer('amount').notNull(),
  referenceType: text('reference_type'), // booking, payment, maintenance
  referenceId: text('reference_id'),
  timestamp: text('timestamp').notNull()
});

export const backgroundChecks = pgTable('background_checks', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').default('luxerent').notNull(),
  bookingId: text('booking_id').notNull(),
  renterEmail: text('renter_email').notNull(),
  status: text('status').default('pending').notNull(), // approved, elevated_risk, low_risk
  riskScore: integer('risk_score').notNull(), // 0 to 100
  reportSummary: text('report_summary').notNull(),
  recommendations: text('recommendations').notNull(),
  timestamp: text('timestamp').notNull()
});

export const maintenanceRequests = pgTable('maintenance_requests', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').default('luxerent').notNull(),
  listingId: text('listing_id').notNull(),
  listingTitle: text('listing_title'),
  renterEmail: text('renter_email').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(), // plumbing, electrical, hvac, appliance, general
  priority: text('priority').notNull(), // urgent, high, medium, low
  status: text('status').default('reported').notNull(), // reported, assigned, in_progress, resolved
  routingNotes: text('routing_notes').notNull(), // AI routing/dispatch notes
  assignedContractor: text('assigned_contractor'),
  estimatedCost: integer('estimated_cost'),
  timestamp: text('timestamp').notNull()
});

