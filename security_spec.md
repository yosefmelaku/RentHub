# RentHub Enterprise - Firestore Security Specification (ABAC & Zero-Trust)

This document outlines the strict database security invariants, data schemas, rogue testing vectors, and full security rules compliance for the RentHub Multi-Tenant Enterprise property management system.

---

## 1. Core Data Invariants

1. **Multi-Tenant Partitioning Isolation**: No renter, owner, or tenant admin can view, create, or alter any record (listings, bookings, payments, reviews) belonging to another tenant workspace (`tenantId`).
2. **Double-Entry Financial Integrity**: Financial ledger entries (`ledgerEntries`) and payments (`payments`) are system-generated immutable ledgers. No client-side SDK write is permitted. They can only be modified through secure server-side transactional processing.
3. **Identity Spoofing Blockage**: Document owners/creators cannot assign or modify another user's identity string. The `ownerId` or `renterId` must strictly map to `request.auth.uid` or `request.auth.token.email`.
4. **Lease Contract State Transitions**: Signing status can only change sequentially. Once a contract reaches `fully_signed`, further alterations to contract clauses or prices are strictly forbidden.
5. **Verified Renter Lock**: Only users with verified email addresses (`request.auth.token.email_verified == true`) are permitted to write listings or book properties.

---

## 2. The "Dirty Dozen" Payloads (Aesthetic Penetration Testing Vectors)

### Payload 1: Tenant Border Crossing (Cross-Tenant Theft)
*   **Attack Vector**: Attacker from workspace `corpstay` tries to read private property listings of `beachfront`.
*   **Target Collection**: `/listings/{listingId}`
*   **Malicious Payload**:
    ```json
    { "id": "listing_corp_leak", "tenantId": "beachfront", "title": "Stolen Beach View", "ownerId": "attacker@corpstay.com" }
    ```
*   **Expected Result**: `PERMISSION_DENIED`

### Payload 2: Host Identity Impersonation
*   **Attack Vector**: Attacker logs in under their own email but sets the `ownerId` of a high-value listing to another verified host's email to steal payouts or redirect bookings.
*   **Target Collection**: `/listings/{listingId}`
*   **Malicious Payload**:
    ```json
    { "id": "listing_theft", "tenantId": "luxerent", "ownerId": "host.premium@luxerent.com", "title": "Phished Manor" }
    ```
*   **Expected Result**: `PERMISSION_DENIED`

### Payload 3: Ledger Poisoning (Fabricated Assets)
*   **Attack Vector**: Renter attempts to write directly into `ledgerEntries` to debit `Cash` and credit `Accounts Receivable` by $50,000, creating fake transactional states.
*   **Target Collection**: `/ledgerEntries/{entryId}`
*   **Malicious Payload**:
    ```json
    { "id": "fake_cash", "tenantId": "luxerent", "debitAccount": "Cash", "creditAccount": "Accounts Receivable", "amount": 50000, "timestamp": "2026-06-30T00:00:00Z" }
    ```
*   **Expected Result**: `PERMISSION_DENIED`

### Payload 4: Arbitrary Free Booking (Price Injection)
*   **Attack Vector**: Renter tries to schedule a 5-night stay but sets `totalPrice` to `$0.00` in the payload instead of the calculated `$2,250`.
*   **Target Collection**: `/bookings/{bookingId}`
*   **Malicious Payload**:
    ```json
    { "id": "free_stay", "listingId": "listing_1", "renterId": "attacker@luxerent.com", "nights": 5, "totalPrice": 0, "status": "pending" }
    ```
*   **Expected Result**: `PERMISSION_DENIED`

### Payload 5: Contract Forgery (Self-Authorization)
*   **Attack Vector**: Renter tries to bypass the owner's signature stage by setting `contractStatus` directly to `"fully_signed"` and `contractSignedByOwner: true` during initial booking.
*   **Target Collection**: `/bookings/{bookingId}`
*   **Malicious Payload**:
    ```json
    { "id": "booking_forge", "contractStatus": "fully_signed", "contractSignedByOwner": true, "contractSignedByRenter": true }
    ```
*   **Expected Result**: `PERMISSION_DENIED`

### Payload 6: Unverified Email Booking Attempt
*   **Attack Vector**: Attacker with a self-registered email that is unverified tries to initiate booking operations.
*   **Target Collection**: `/bookings/{bookingId}`
*   **Malicious Payload**:
    ```json
    { "id": "unverified_book", "listingId": "listing_1", "renterId": "unverified@luxerent.com", "status": "pending" }
    ```
*   **Expected Result**: `PERMISSION_DENIED`

### Payload 7: Background Screening Tampering (Risk Score Decoupling)
*   **Attack Vector**: Renter runs background screening and attempts to manually write or alter their risk report to change `riskScore` to `0` and status to `approved`.
*   **Target Collection**: `/backgroundChecks/{checkId}`
*   **Malicious Payload**:
    ```json
    { "id": "tamper_bg", "bookingId": "booking_1", "renterEmail": "attacker@luxerent.com", "riskScore": 0, "status": "approved" }
    ```
*   **Expected Result**: `PERMISSION_DENIED`

### Payload 8: Deny-of-Wallet Path Variable Poisoning
*   **Attack Vector**: Malicious script attempts to create a document under `/listings/{listingId}` where `listingId` is an injected 20KB garbage text designed to crash Firestore partition indexing.
*   **Target Collection**: `/listings`
*   **Malicious Document ID**: `listing_very_long_garbage_character_string_designed_to_consume_massive_bytes_and_exceed_limits...`
*   **Expected Result**: `PERMISSION_DENIED`

### Payload 9: PII Blanket Read (Data Scraping)
*   **Attack Vector**: Authenticated renter attempts to query and read all users' private details including unhashed passwords and matching roles.
*   **Target Collection**: `/users`
*   **Malicious Operation**: Standard full collection read query.
*   **Expected Result**: `PERMISSION_DENIED`

### Payload 10: Feedback Star Elevation
*   **Attack Vector**: Owner attempts to post a 10-star rating comment with rating value `10` (max allowed is 5) to artificial elevate their rating score.
*   **Target Collection**: `/reviews/{reviewId}`
*   **Malicious Payload**:
    ```json
    { "id": "fake_review", "listingId": "listing_1", "rating": 10, "comment": "Amazing", "renterId": "owner@luxerent.com" }
    ```
*   **Expected Result**: `PERMISSION_DENIED`

### Payload 11: Locked State Modification (Terminal Bypassing)
*   **Attack Vector**: Renter tries to change the details of a booking that has already been marked as `declined` or `cancelled` back to `approved` to forcefully claim the room.
*   **Target Collection**: `/bookings/{bookingId}`
*   **Malicious Payload**:
    ```json
    { "status": "approved" }
    ```
*   **Expected Result**: `PERMISSION_DENIED`

### Payload 12: Direct Maintenance Routing Dispatch
*   **Attack Vector**: Renter tries to bypass the automatic mechanical classification dispatch engine and manually route a repair to high-priority plumbing with a pre-approved $500 estimated pay directly into their own contractor account.
*   **Target Collection**: `/maintenanceRequests/{maintId}`
*   **Malicious Payload**:
    ```json
    { "id": "maint_hack", "status": "resolved", "estimatedCost": 500, "assignedContractor": "self-plumbing" }
    ```
*   **Expected Result**: `PERMISSION_DENIED`

---

## 3. Test Runner Specification

The automated verification of the "Dirty Dozen" payloads is implemented in `firestore.rules.test.ts`. This test runner establishes local mock environments to guarantee 100% of the payload attacks fail with `PERMISSION_DENIED`.
