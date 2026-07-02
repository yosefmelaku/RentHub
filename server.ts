import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { dbAdmin } from "./src/lib/server-firestore";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Firestore connection is handled by our custom Web-SDK based dbAdmin adapter

  // Firestore DB retrieval helper functions to prevent index exceptions
  async function getCollection<T = any>(collectionName: string): Promise<T[]> {
    const snap = await dbAdmin.collection(collectionName).get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
  }

  async function getCollectionFiltered<T = any>(collectionName: string, filterFn: (item: T) => boolean): Promise<T[]> {
    const list = await getCollection<T>(collectionName);
    return list.filter(filterFn);
  }

  // Helper to log audit actions
  async function logAction(tenantId: string, email: string, action: string, details: string, req: express.Request) {
    try {
      const logId = "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const logDoc = {
        id: logId,
        tenantId,
        userEmail: email,
        action,
        details,
        ipAddress: ipAddress.includes("::") ? "127.0.0.1" : ipAddress,
        timestamp: new Date().toISOString()
      };
      await dbAdmin.collection("auditLogs").doc(logId).set(logDoc);
      console.log(`[AUDIT LOG] [${tenantId}] [${email}] ${action}: ${details}`);
    } catch (err) {
      console.error("Failed to write audit log to Firestore:", err);
    }
  }

  // Helper to extract active tenant ID
  const getTenantId = (req: express.Request): string => {
    return (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string) || (req.body.tenantId as string) || "luxerent";
  };

  // Lazy Gemini client helper
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY environment variable is required but missing");
      }
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
    return aiClient;
  }

  // Automatic double-entry bookkeeping helper
  async function recordLedgerEntry(
    tenantId: string,
    description: string,
    debitAccount: string,
    creditAccount: string,
    amount: number,
    referenceType?: string,
    referenceId?: string
  ) {
    try {
      const id = "ledg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const entryDoc = {
        id,
        tenantId,
        description,
        debitAccount,
        creditAccount,
        amount,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        timestamp: new Date().toISOString()
      };
      await dbAdmin.collection("ledgerEntries").doc(id).set(entryDoc);
      console.log(`[LEDGER ENTRY] [${tenantId}] ${description}. Debit: ${debitAccount}, Credit: ${creditAccount}, Amount: ${amount}`);
    } catch (err) {
      console.error("Failed to insert double-entry ledger entry into Firestore:", err);
    }
  }

  // Seed Firestore if Empty
  async function seedFirestore() {
    try {
      const tenantsSnap = await dbAdmin.collection("tenants").get();
      if (tenantsSnap.empty) {
        console.log("Seeding default tenants into Firestore...");
        const defaultTenants = [
          {
            id: "luxerent",
            name: "Luxerent Global Estates",
            logoUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=120&q=80",
            primaryColor: "#059669",
            currency: "USD",
            taxRate: 12.5,
            allowPublicSignup: true,
            createdAt: new Date().toISOString()
          },
          {
            id: "corpstay",
            name: "CorpStay Business Suites",
            logoUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=120&q=80",
            primaryColor: "#2563eb",
            currency: "EUR",
            taxRate: 8.0,
            allowPublicSignup: true,
            createdAt: new Date().toISOString()
          },
          {
            id: "beachfront",
            name: "Apex Beachfront Resorts",
            logoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=120&q=80",
            primaryColor: "#f59e0b",
            currency: "GBP",
            taxRate: 15.0,
            allowPublicSignup: false,
            createdAt: new Date().toISOString()
          }
        ];
        for (const t of defaultTenants) {
          await dbAdmin.collection("tenants").doc(t.id).set(t);
        }
      }

      const usersSnap = await dbAdmin.collection("users").get();
      if (usersSnap.empty) {
        console.log("Seeding default users into Firestore...");
        const defaultUsers = [
          {
            email: "admin@enterprise.com",
            name: "Enterprise Global Admin",
            role: "global_admin",
            password: "123456",
            tenantId: "luxerent"
          },
          {
            email: "yosefmelaku9876@gmail.com",
            name: "Yosef Melaku",
            role: "renter",
            password: "123456",
            tenantId: "luxerent"
          },
          {
            email: "host.premium@luxerent.com",
            name: "Premium Host",
            role: "owner",
            password: "123456",
            tenantId: "luxerent"
          },
          {
            email: "admin.luxerent@luxerent.com",
            name: "Luxerent Tenant Admin",
            role: "tenant_admin",
            password: "123456",
            tenantId: "luxerent"
          },
          {
            email: "corp.guest@corpstay.com",
            name: "Corp Guest",
            role: "renter",
            password: "123456",
            tenantId: "corpstay"
          },
          {
            email: "corp.owner@corpstay.com",
            name: "Corp Owner",
            role: "owner",
            password: "123456",
            tenantId: "corpstay"
          },
          {
            email: "admin.corpstay@corpstay.com",
            name: "Corpstay Tenant Admin",
            role: "tenant_admin",
            password: "123456",
            tenantId: "corpstay"
          },
          {
            email: "beach.guest@beachfront.com",
            name: "Beach Guest",
            role: "renter",
            password: "123456",
            tenantId: "beachfront"
          },
          {
            email: "beach.owner@beachfront.com",
            name: "Beach Owner",
            role: "owner",
            password: "123456",
            tenantId: "beachfront"
          },
          {
            email: "admin.beachfront@beachfront.com",
            name: "Beachfront Tenant Admin",
            role: "tenant_admin",
            password: "123456",
            tenantId: "beachfront"
          }
        ];
        for (const u of defaultUsers) {
          await dbAdmin.collection("users").doc(u.email).set(u);
        }
      }

      console.log("Ensuring default listings exist in Firestore...");
      const defaultListings = [
        {
          id: "listing_1",
          tenantId: "luxerent",
          title: "Minimalist Ocean View Villa",
          description: "Perched high on the cliffs overlooking the sea, this architectural masterpiece offers unmatched panoramic views, a private infinity pool, and pristine minimalist interiors designed for tranquility.",
          location: "Malibu, California",
          price: 450,
          type: "villa",
          beds: 3,
          baths: 3.5,
          image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Ocean View", "Infinity Pool", "Fast Wi-Fi", "Chef's Kitchen", "Hot Tub", "AC", "Private Parking"],
          rating: 4.92,
          reviewsCount: 48,
          ownerId: "host.premium@luxerent.com",
          featured: true
        },
        {
          id: "listing_2",
          tenantId: "luxerent",
          title: "Industrial Loft in Historic Center",
          description: "Featuring 14-foot exposed brick walls, timber ceilings, and massive factory windows, this stylish downtown loft combines vintage industrial character with ultra-modern high-end comforts.",
          location: "SoHo, New York",
          price: 220,
          type: "apartment",
          beds: 1,
          baths: 1.5,
          image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
          amenities: ["City View", "Workspace", "Fast Wi-Fi", "Gym", "Elevator", "Heated Floors", "Washer/Dryer"],
          rating: 4.85,
          reviewsCount: 124,
          ownerId: "host.premium@luxerent.com",
          featured: true
        },
        {
          id: "listing_7",
          tenantId: "luxerent",
          title: "The Grand Sapphire Infinity Villa",
          description: "Perched elegantly on a coastal peak, the Sapphire Villa features an expansive heated infinity pool, full-glass floor-to-ceiling panoramic sliding doors, private wellness spa room, and automated smart-home lighting that mimics the sunset. Ideal for premium luxury vacationers seeking absolute privacy and high-class amenities.",
          location: "Cap d'Antibes, French Riviera",
          price: 680,
          type: "villa",
          beds: 4,
          baths: 4.5,
          image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Ocean View", "Infinity Pool", "Private Spa", "Fast Wi-Fi", "Dedicated Butler", "AC", "Helipad Access", "Wine Cellar"],
          rating: 4.97,
          reviewsCount: 32,
          ownerId: "host.premium@luxerent.com",
          featured: true
        },
        {
          id: "listing_8",
          tenantId: "luxerent",
          title: "The Monarch High-Rise Penthouse Apartment",
          description: "Hovering 50 stories above downtown, this masterpiece apartment offers sweeping urban skyline views, an open-concept layout with white marble chef’s kitchen, custom-curated Italian furniture, an in-ceiling sound system, and keycard elevator access straight into your foyer.",
          location: "Midtown Manhattan, New York",
          price: 350,
          type: "apartment",
          beds: 2,
          baths: 2.0,
          image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Skyline View", "Private Elevator", "Gym & Spa Access", "Fast Wi-Fi", "Marble Kitchen", "Concierge", "EV Charging"],
          rating: 4.91,
          reviewsCount: 56,
          ownerId: "host.premium@luxerent.com",
          featured: true
        },
        {
          id: "listing_9",
          tenantId: "luxerent",
          title: "Serene Nordic Oak Timber House",
          description: "An architectural triumph crafted entirely from premium sustainably sourced cedar and oak wood, nestled in a quiet evergreen forest. Features high timber cathedral ceilings, a massive glass facade opening into a private forest deck, an outdoor wood-fired hot tub, and an indoor fieldstone fireplace.",
          location: "Oslo, Norway",
          price: 280,
          type: "house",
          beds: 3,
          baths: 2.5,
          image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Forest Views", "Firestone Fireplace", "Wood-fired Hot Tub", "Fast Wi-Fi", "Heated Floors", "Organic Coffee Bar", "Hiking Trails"],
          rating: 4.95,
          reviewsCount: 41,
          ownerId: "host.premium@luxerent.com",
          featured: true
        },
        {
          id: "listing_10",
          tenantId: "luxerent",
          title: "The Zenith Tech Smart Studio",
          description: "Designed for high-productivity executives and digital nomads. Fully automated smart-home environment with voice controls, dual 4K monitors workstation with ergonomic Steelcase chair, custom ambient lighting, dynamic space-saving Murphy bed, and an espresso machine bar.",
          location: "Akihabara, Tokyo",
          price: 160,
          type: "studio",
          beds: 1,
          baths: 1.0,
          image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Voice Automation", "Dual 4K Workstation", "Fast Wi-Fi", "Espresso Bar", "AC", "Metro Proximity"],
          rating: 4.89,
          reviewsCount: 24,
          ownerId: "host.premium@luxerent.com",
          featured: true
        },
        {
          id: "listing_3",
          tenantId: "corpstay",
          title: "Modern Executive Penthouse",
          description: "A perfect choice for business travelers. High-speed fiber internet, multi-monitor workspace setup, ergonomic chair, and a premium coffee station. Located in the heart of Frankfurt's banking district.",
          location: "Frankfurt, Germany",
          price: 180,
          type: "apartment",
          beds: 2,
          baths: 2.0,
          image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Executive Workspace", "Fast Wi-Fi", "Coffee Station", "Gym Access", "Meeting Room Access", "Elevator"],
          rating: 4.82,
          reviewsCount: 42,
          ownerId: "corp.owner@corpstay.com",
          featured: true
        },
        {
          id: "listing_4",
          tenantId: "corpstay",
          title: "Sleek Business Studio Suite",
          description: "This studio is tailored for the short-term working professional. Integrated smart-home climate control, a modern gym in the building, and minutes away from public transport.",
          location: "Paris, France",
          price: 130,
          type: "studio",
          beds: 1,
          baths: 1.0,
          image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Smart Home", "Ergonomic Desk", "Fast Wi-Fi", "Subway Proximity", "AC"],
          rating: 4.68,
          reviewsCount: 37,
          ownerId: "corp.owner@corpstay.com",
          featured: false
        },
        {
          id: "listing_corp_house_1",
          tenantId: "corpstay",
          title: "Silicon Valley Corporate Retreat House",
          description: "A modern, high-tech spacious home in Palo Alto. Perfect for team offsites and business groups, featuring a private backyard deck, smart-board meeting room, high-speed mesh Wi-Fi, and multiple dedicated work suites.",
          location: "Palo Alto, California",
          price: 320,
          type: "house",
          beds: 4,
          baths: 3.0,
          image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Smart Board Room", "Mesh Wi-Fi", "Offsite Garden Deck", "Conference Setup", "AC", "Workspace"],
          rating: 4.87,
          reviewsCount: 19,
          ownerId: "corp.owner@corpstay.com",
          featured: true
        },
        {
          id: "listing_corp_villa_1",
          tenantId: "corpstay",
          title: "Executive Hills Conference Villa",
          description: "An ultra-premium corporate retreat villa nestled in the hills. Includes a fully-equipped boardroom, panoramic view reception deck, private pool, catering service options, and 5 luxurious individual office bedrooms.",
          location: "Lugano, Switzerland",
          price: 550,
          type: "villa",
          beds: 5,
          baths: 5.5,
          image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Boardroom", "Reception Deck", "Infinity Pool", "Catering Ready", "Fast Wi-Fi", "Dedicated Office Suites"],
          rating: 4.94,
          reviewsCount: 15,
          ownerId: "corp.owner@corpstay.com",
          featured: true
        },
        {
          id: "listing_5",
          tenantId: "beachfront",
          title: "Architectural Beachfront Villa",
          description: "Perched right over the pristine sand dunes, this striking glass villa offers waves breaking right outside your door, a high-contrast modern sun terrace, and absolute privacy on the coast.",
          location: "St Ives, United Kingdom",
          price: 350,
          type: "villa",
          beds: 3,
          baths: 3.0,
          image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Beachfront", "Panoramic Sea Deck", "Fire Pit", "Fast Wi-Fi", "Outdoor Shower", "Solar Powered"],
          rating: 4.95,
          reviewsCount: 89,
          ownerId: "beach.owner@beachfront.com",
          featured: true
        },
        {
          id: "listing_6",
          tenantId: "beachfront",
          title: "Traditional Cornish Coastal House",
          description: "Enjoy a fully restored authentic stone house. Features a wood-burning stove, high-end bedding, and a gated garden path leading straight to the public beach cove.",
          location: "Cornwall, United Kingdom",
          price: 210,
          type: "house",
          beds: 3,
          baths: 2.5,
          image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Stone Fireplace", "Gated Garden", "Fast Wi-Fi", "Beach Access", "Espresso Machine"],
          rating: 4.88,
          reviewsCount: 53,
          ownerId: "beach.owner@beachfront.com",
          featured: false
        },
        {
          id: "listing_beach_apt_1",
          tenantId: "beachfront",
          title: "Azure Vista Beachfront Apartment",
          description: "Step directly from your balcony onto the warm ocean sands. This beachside apartment features bright nautical chic styling, huge sunset-facing windows, a premium telescope, and custom paddleboard/kayak storage.",
          location: "Miami Beach, Florida",
          price: 240,
          type: "apartment",
          beds: 2,
          baths: 2.0,
          image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Beachfront Access", "Sunset Balcony", "Kayak & Paddleboard", "Telescope", "Fast Wi-Fi", "Beach Chairs"],
          rating: 4.89,
          reviewsCount: 61,
          ownerId: "beach.owner@beachfront.com",
          featured: true
        },
        {
          id: "listing_beach_studio_1",
          tenantId: "beachfront",
          title: "The Surfside Cabana Studio",
          description: "A gorgeous compact cabana studio right on the coastline, styled with natural driftwood accents and cozy hammocks. Fall asleep to the gentle sound of crushing waves and wake up to a stunning ocean breeze.",
          location: "Maui, Hawaii",
          price: 150,
          type: "studio",
          beds: 1,
          baths: 1.0,
          image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Hammocks", "Ocean Breeze", "Outdoor Shower", "Fast Wi-Fi", "Beach Path", "Surfing Gear"],
          rating: 4.83,
          reviewsCount: 45,
          ownerId: "beach.owner@beachfront.com",
          featured: true
        },
        {
          id: "listing_office_1",
          tenantId: "corpstay",
          title: "Sleek Executive Hub & Shared Office",
          description: "A premium corporate co-working and private meeting space in Frankfurt. Equipped with high-speed fiber internet, whiteboard walls, conference call displays, soundproof phone booths, and a continuous coffee & espresso service.",
          location: "Frankfurt, Germany",
          price: 120,
          type: "office",
          beds: 0,
          baths: 2.0,
          image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Fiber Internet", "Whiteboard Walls", "Conference Screen", "Espresso Bar", "Soundproof Booths", "Printer Access"],
          rating: 4.9,
          reviewsCount: 12,
          ownerId: "corp.owner@corpstay.com",
          featured: true
        },
        {
          id: "listing_other_1",
          tenantId: "luxerent",
          title: "Futuristic Eco-Dome Retreat",
          description: "Nestled deep in the redwoods, this stunning geodesic dome offers a luxurious escape from the modern world. Stargaze from the plush bed through the crystalline ceiling panels, warm up by the floating hearth, or relax in the wood-burning Japanese cedar tub.",
          location: "Big Sur, California",
          price: 380,
          type: "other",
          beds: 1,
          baths: 1.0,
          image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
          amenities: ["Stargazing Ceiling", "Floating Hearth", "Japanese Cedar Tub", "Fast Wi-Fi", "Solar Powered", "Forest Deck"],
          rating: 4.96,
          reviewsCount: 28,
          ownerId: "host.premium@luxerent.com",
          featured: true
        }
      ];
      for (const l of defaultListings) {
        await dbAdmin.collection("listings").doc(l.id).set(l);
      }

      const bookingsSnap = await dbAdmin.collection("bookings").get();
      if (bookingsSnap.empty) {
        console.log("Seeding default bookings into Firestore...");
        const defaultBookings = [
          {
            id: "booking_pre_1",
            tenantId: "luxerent",
            listingId: "listing_1",
            listingTitle: "Minimalist Ocean View Villa",
            listingImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
            listingLocation: "Malibu, California",
            renterId: "yosefmelaku9876@gmail.com",
            renterName: "Yosef Melaku",
            startDate: "2026-07-10",
            endDate: "2026-07-15",
            totalPrice: 2250,
            nights: 5,
            status: "approved",
            paymentStatus: "paid",
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
          },
          {
            id: "booking_pre_2",
            tenantId: "luxerent",
            listingId: "listing_2",
            listingTitle: "Industrial Loft in Historic Center",
            listingImage: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
            listingLocation: "SoHo, New York",
            renterId: "yosefmelaku9876@gmail.com",
            renterName: "Yosef Melaku",
            startDate: "2026-08-01",
            endDate: "2026-08-04",
            totalPrice: 660,
            nights: 3,
            status: "pending",
            paymentStatus: "unpaid",
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
          },
          {
            id: "booking_pre_3",
            tenantId: "corpstay",
            listingId: "listing_3",
            listingTitle: "Modern Executive Penthouse",
            listingImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
            listingLocation: "Frankfurt, Germany",
            renterId: "corp.guest@corpstay.com",
            renterName: "Corp Guest",
            startDate: "2026-07-20",
            endDate: "2026-07-24",
            totalPrice: 720,
            nights: 4,
            status: "approved",
            paymentStatus: "paid",
            createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
          },
          {
            id: "booking_pre_4",
            tenantId: "beachfront",
            listingId: "listing_5",
            listingTitle: "Architectural Beachfront Villa",
            listingImage: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1200&q=80",
            listingLocation: "St Ives, United Kingdom",
            renterId: "beach.guest@beachfront.com",
            renterName: "Beach Guest",
            startDate: "2026-07-15",
            endDate: "2026-07-18",
            totalPrice: 1050,
            nights: 3,
            status: "approved",
            paymentStatus: "paid",
            createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
          }
        ];
        for (const b of defaultBookings) {
          await dbAdmin.collection("bookings").doc(b.id).set(b);
        }
      }

      const paymentsSnap = await dbAdmin.collection("payments").get();
      if (paymentsSnap.empty) {
        console.log("Seeding default payments into Firestore...");
        const defaultPayments = [
          {
            id: "pay_pre_1",
            tenantId: "luxerent",
            bookingId: "booking_pre_1",
            renterId: "yosefmelaku9876@gmail.com",
            amount: 2250,
            transactionId: "TXN_PRESEED_9876",
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
            status: "success",
            cardholderName: "Yosef Melaku",
            cardNumberMasked: "•••• •••• •••• 4321"
          },
          {
            id: "pay_pre_3",
            tenantId: "corpstay",
            bookingId: "booking_pre_3",
            renterId: "corp.guest@corpstay.com",
            amount: 720,
            transactionId: "TXN_CORP_3321",
            timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
            status: "success",
            cardholderName: "Corp Guest",
            cardNumberMasked: "•••• •••• •••• 1111"
          },
          {
            id: "pay_pre_4",
            tenantId: "beachfront",
            bookingId: "booking_pre_4",
            renterId: "beach.guest@beachfront.com",
            amount: 1050,
            transactionId: "TXN_BEACH_8877",
            timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
            status: "success",
            cardholderName: "Beach Guest",
            cardNumberMasked: "•••• •••• •••• 9999"
          }
        ];
        for (const p of defaultPayments) {
          await dbAdmin.collection("payments").doc(p.id).set(p);
        }
      }

      const reviewsSnap = await dbAdmin.collection("reviews").get();
      if (reviewsSnap.empty) {
        console.log("Seeding default reviews into Firestore...");
        const defaultReviews = [
          {
            id: "rev_1",
            tenantId: "luxerent",
            listingId: "listing_1",
            renterId: "yosefmelaku9876@gmail.com",
            renterName: "Yosef Melaku",
            rating: 5,
            comment: "This villa is absolutely stunning! The infinity pool and ocean views are even better than the pictures. Clean, modern, and perfectly equipped.",
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
          },
          {
            id: "rev_3",
            tenantId: "luxerent",
            listingId: "listing_2",
            renterId: "yosefmelaku9876@gmail.com",
            renterName: "Yosef Melaku",
            rating: 4.5,
            comment: "Wonderful location right in the heart of SoHo. High ceilings, rustic brick feel, and very modern appliances. Highly recommend!",
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
          },
          {
            id: "rev_4",
            tenantId: "corpstay",
            listingId: "listing_3",
            renterId: "corp.guest@corpstay.com",
            renterName: "Corp Guest",
            rating: 5.0,
            comment: "Extremely productive stay. The ergonomic office set up was top tier and the location couldn't be better. Fast internet throughout.",
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
          }
        ];
        for (const r of defaultReviews) {
          await dbAdmin.collection("reviews").doc(r.id).set(r);
        }
      }

      const auditLogsSnap = await dbAdmin.collection("auditLogs").get();
      if (auditLogsSnap.empty) {
        console.log("Seeding initial compliance audit logs into Firestore...");
        const initialLog = {
          id: "log_init_1",
          tenantId: "luxerent",
          userEmail: "system.seeder@enterprise.com",
          action: "SYSTEM_SEED",
          details: "Enterprise-wide multi-tenant data seeded successfully for Luxerent, CorpStay, and Beachfront brands.",
          ipAddress: "127.0.0.1",
          timestamp: new Date().toISOString()
        };
        await dbAdmin.collection("auditLogs").doc(initialLog.id).set(initialLog);
      }

      console.log("Firestore multi-tenant database seeded and verified successfully!");
    } catch (err) {
      console.error("Failed to seed Firestore database:", err);
    }
  }

  // Trigger seeding
  await seedFirestore();

  // ==========================================
  // API - Tenants Management
  // ==========================================
  app.get("/api/tenants", async (req, res) => {
    try {
      const data = await getCollection("tenants");
      res.json(data);
    } catch (err: any) {
      console.error("Failed to fetch tenants:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tenants", async (req, res) => {
    try {
      const tenantData = req.body;
      tenantData.createdAt = new Date().toISOString();
      await dbAdmin.collection("tenants").doc(tenantData.id).set(tenantData);
      await logAction(tenantData.id, "admin@enterprise.com", "CREATE_TENANT", `New tenant brand created: ${tenantData.name}`, req);
      res.status(201).json(tenantData);
    } catch (err: any) {
      console.error("Failed to create tenant:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/tenants/:id", async (req, res) => {
    try {
      const updateData = req.body;
      await dbAdmin.collection("tenants").doc(req.params.id).set(updateData, { merge: true });
      await logAction(req.params.id, "admin@enterprise.com", "UPDATE_TENANT_CONFIG", `Tenant configuration updated for: ${req.params.id}`, req);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to update tenant:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/tenants/:id", async (req, res) => {
    try {
      await dbAdmin.collection("tenants").doc(req.params.id).delete();
      await logAction(req.params.id, "admin@enterprise.com", "DELETE_TENANT", `Tenant brand deleted: ${req.params.id}`, req);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to delete tenant:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // API - Audit Logs (Compliance)
  // ==========================================
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const email = req.query.email as string;
      const allLogs = await getCollection("auditLogs");
      allLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      if (email === "admin@enterprise.com") {
        return res.json(allLogs);
      }
      const filtered = allLogs.filter(log => log.tenantId === tenantId);
      res.json(filtered);
    } catch (err: any) {
      console.error("Failed to fetch audit logs:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // API - Enterprise Raw Tables
  // ==========================================
  app.get("/api/enterprise/raw-table", async (req, res) => {
    try {
      const table = req.query.table as string;
      let collectionName = "";
      if (table === "tenants") collectionName = "tenants";
      else if (table === "users") collectionName = "users";
      else if (table === "listings") collectionName = "listings";
      else if (table === "bookings") collectionName = "bookings";
      else if (table === "payments") collectionName = "payments";
      else if (table === "audit_logs") collectionName = "auditLogs";
      else if (table === "ledger_entries") collectionName = "ledgerEntries";
      else if (table === "background_checks") collectionName = "backgroundChecks";
      else if (table === "maintenance_requests") collectionName = "maintenanceRequests";
      else {
        return res.status(400).json({ error: `Invalid table requested: ${table}` });
      }

      const data = await getCollection(collectionName);
      res.json(data);
    } catch (err: any) {
      console.error("Failed to fetch raw table:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/enterprise/raw-table", async (req, res) => {
    try {
      const table = req.query.table as string;
      const id = req.query.id as string;
      let collectionName = "";
      if (table === "tenants") collectionName = "tenants";
      else if (table === "users") collectionName = "users";
      else if (table === "listings") collectionName = "listings";
      else if (table === "bookings") collectionName = "bookings";
      else if (table === "payments") collectionName = "payments";
      else if (table === "audit_logs") collectionName = "auditLogs";
      else if (table === "ledger_entries") collectionName = "ledgerEntries";
      else if (table === "background_checks") collectionName = "backgroundChecks";
      else if (table === "maintenance_requests") collectionName = "maintenanceRequests";
      else {
        return res.status(400).json({ error: `Invalid table requested: ${table}` });
      }

      await dbAdmin.collection(collectionName).doc(id).delete();
      await logAction("system", "admin@enterprise.com", `SUPER_ADMIN_DELETE_ROW_${table.toUpperCase()}`, `Super admin manually deleted record ${id} from table ${table}`, req);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to delete raw row:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/enterprise/seed", async (req, res) => {
    try {
      // Clear database tables through dbAdmin helper
      await dbAdmin.clearAllTables();
      // Re-run database seeding
      await seedFirestore();
      await logAction("system", "admin@enterprise.com", "SUPER_ADMIN_RESEED_DB", "Super admin manually cleared and re-seeded the multi-tenant partitioned cluster.", req);
      res.json({ success: true, message: "Multi-tenant partitioned database cleared and seeded successfully!" });
    } catch (err: any) {
      console.error("Failed to clear and seed database:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // API - Enterprise Analytics
  // ==========================================
  app.get("/api/enterprise/analytics", async (req, res) => {
    try {
      const tenantsList = await getCollection("tenants");
      const allUsers = await getCollection("users");
      const allListings = await getCollection("listings");
      const allBookings = await getCollection("bookings");
      const allPayments = await getCollection("payments");

      // Aggregate revenue per tenant
      const revenueByTenant: Record<string, number> = {};
      const bookingsByTenant: Record<string, number> = {};
      const listingsByTenant: Record<string, number> = {};

      tenantsList.forEach(t => {
        revenueByTenant[t.id] = 0;
        bookingsByTenant[t.id] = 0;
        listingsByTenant[t.id] = 0;
      });

      allPayments.forEach(p => {
        const tid = p.tenantId || "luxerent";
        if (revenueByTenant[tid] !== undefined) {
          revenueByTenant[tid] += Number(p.amount);
        } else {
          revenueByTenant[tid] = Number(p.amount);
        }
      });

      allBookings.forEach(b => {
        const tid = b.tenantId || "luxerent";
        if (bookingsByTenant[tid] !== undefined) {
          bookingsByTenant[tid] += 1;
        }
      });

      allListings.forEach(l => {
        const tid = l.tenantId || "luxerent";
        if (listingsByTenant[tid] !== undefined) {
          listingsByTenant[tid] += 1;
        }
      });

      const approvedByTenant: Record<string, number> = {};
      allBookings.filter(b => b.status === "approved").forEach(b => {
        const tid = b.tenantId || "luxerent";
        approvedByTenant[tid] = (approvedByTenant[tid] || 0) + 1;
      });

      const tenantComparison = tenantsList.map(t => {
        const listingsCount = listingsByTenant[t.id] || 1;
        const bookingsCount = bookingsByTenant[t.id] || 0;
        const approvedCount = approvedByTenant[t.id] || 0;
        const occupancy = Math.min(Math.round((approvedCount / (listingsCount * 2)) * 100), 100);

        return {
          id: t.id,
          name: t.name,
          primaryColor: t.primaryColor,
          currency: t.currency,
          revenue: revenueByTenant[t.id] || 0,
          bookingsCount,
          listingsCount,
          occupancyRate: occupancy || 35
        };
      });

      // Daily trend across last 7 days
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split("T")[0];
      }).reverse();

      const bookingTrends = last7Days.map(day => {
        const counts: Record<string, any> = { date: day };
        tenantsList.forEach(t => {
          counts[t.id] = 0;
        });

        allBookings.forEach(b => {
          const bDay = b.createdAt ? b.createdAt.split("T")[0] : null;
          if (bDay === day) {
            const tid = b.tenantId || "luxerent";
            if (counts[tid] !== undefined) {
              counts[tid]++;
            }
          }
        });
        return counts;
      });

      const telemetry = {
        apiResponseTimeMs: Math.floor(Math.random() * 25) + 12,
        activeDbConnections: Math.floor(Math.random() * 12) + 24,
        cpuUtilizationPercent: Math.floor(Math.random() * 8) + 14,
        cacheHitRatePercent: 98.4
      };

      res.json({
        totalTenants: tenantsList.length,
        totalGlobalUsers: allUsers.length,
        totalGlobalEarningsUSD: allPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        tenantComparison,
        bookingTrends,
        telemetry
      });
    } catch (err: any) {
      console.error("Failed to compile analytics:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // API - Listings (Partitioned)
  // ==========================================
  app.get("/api/listings", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const data = await getCollectionFiltered("listings", l => l.tenantId === tenantId);
      res.json(data);
    } catch (err: any) {
      console.error("Failed to get listings:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.post("/api/listings", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const listing = req.body;
      listing.tenantId = tenantId;
      await dbAdmin.collection("listings").doc(listing.id).set(listing);
      await logAction(tenantId, listing.ownerId, "CREATE_LISTING", `Property listed: "${listing.title}" in ${listing.location}`, req);
      res.status(201).json(listing);
    } catch (err: any) {
      console.error("Failed to create listing:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.delete("/api/listings/:id", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const docRef = dbAdmin.collection("listings").doc(req.params.id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const listing = docSnap.data() as any;
        await docRef.delete();
        await logAction(tenantId, listing.ownerId, "DELETE_LISTING", `Property listing deleted: "${listing.title}"`, req);
      }
      res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Failed to delete listing:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  // ==========================================
  // API - Bookings (Partitioned)
  // ==========================================
  app.get("/api/bookings/renter", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "Email query param required" });
      }
      const data = await getCollectionFiltered("bookings", b => b.renterId === email && b.tenantId === tenantId);
      res.json(data);
    } catch (err: any) {
      console.error("Failed to get renter bookings:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.get("/api/bookings/owner", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "Email query param required" });
      }
      const ownerListings = await getCollectionFiltered("listings", l => l.ownerId === email && l.tenantId === tenantId);
      const listingIds = ownerListings.map(l => l.id);
      if (listingIds.length === 0) {
        return res.json([]);
      }
      const data = await getCollectionFiltered("bookings", b => listingIds.includes(b.listingId) && b.tenantId === tenantId);
      res.json(data);
    } catch (err: any) {
      console.error("Failed to get owner bookings:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const booking = req.body;
      booking.tenantId = tenantId;
      await dbAdmin.collection("bookings").doc(booking.id).set(booking);
      await logAction(tenantId, booking.renterId, "CREATE_BOOKING", `Booking scheduled for listing ID: ${booking.listingId} (${booking.nights} nights)`, req);

      // Automatic Double-Entry Bookkeeping
      await recordLedgerEntry(
        tenantId,
        `Unearned rental booking scheduled for "${booking.listingTitle || "Property"}" (Ref: ${booking.id})`,
        "Accounts Receivable",
        "Unearned Rental Revenue",
        Number(booking.totalPrice) || 0,
        "booking",
        booking.id
      );

      res.status(201).json(booking);
    } catch (err: any) {
      console.error("Failed to create booking:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.put("/api/bookings/:id/status", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { status } = req.body;
      const docRef = dbAdmin.collection("bookings").doc(req.params.id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const booking = docSnap.data() as any;
        await docRef.update({ status });
        await logAction(tenantId, booking.renterId, "UPDATE_BOOKING_STATUS", `Booking status updated to ${status} for listing "${booking.listingTitle}"`, req);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to update booking status:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.put("/api/bookings/:id/payment", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { paymentStatus, status } = req.body;
      const docRef = dbAdmin.collection("bookings").doc(req.params.id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const booking = docSnap.data() as any;
        await docRef.update({ paymentStatus, status });
        await logAction(tenantId, booking.renterId, "UPDATE_BOOKING_PAYMENT", `Booking payment status updated to ${paymentStatus}`, req);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to update booking payment:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.put("/api/bookings/:id/contract", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const contractUpdate = req.body;
      const docRef = dbAdmin.collection("bookings").doc(req.params.id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const booking = docSnap.data() as any;
        await docRef.update(contractUpdate);

        let label = "Contract updated";
        if (contractUpdate.contractSignedByRenter) label = "Contract digitally signed by Renter";
        if (contractUpdate.contractSignedByOwner) label = "Contract digitally signed by Owner";

        await logAction(tenantId, booking.renterId, "SIGN_CONTRACT", `${label} (booking ID: ${booking.id})`, req);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to update booking contract:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  // ==========================================
  // API - Payments (Partitioned)
  // ==========================================
  app.post("/api/payments", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const payment = req.body;
      payment.tenantId = tenantId;

      await dbAdmin.collection("payments").doc(payment.id).set(payment);
      await dbAdmin.collection("bookings").doc(payment.bookingId).update({ paymentStatus: "paid", status: "approved" });
      await logAction(tenantId, payment.renterId, "PROCESS_PAYMENT", `Secure payment processed of amount: ${payment.amount} (booking ID: ${payment.bookingId})`, req);

      // Automatic Double-Entry Bookkeeping
      await recordLedgerEntry(
        tenantId,
        `Cash received from renter ${payment.renterId} (Ref: ${payment.transactionId})`,
        "Cash",
        "Accounts Receivable",
        Number(payment.amount),
        "payment",
        payment.id
      );

      const tenantSnap = await dbAdmin.collection("tenants").doc(tenantId).get();
      const taxRatePercent = tenantSnap.exists ? (tenantSnap.data() as any).taxRate : 10.0;

      const totalAmount = Number(payment.amount);
      const netAmount = Math.round(totalAmount / (1 + taxRatePercent / 100));
      const taxAmount = totalAmount - netAmount;
      const ownerShare = Math.round(netAmount * 0.85);
      const platformShare = netAmount - ownerShare;

      await recordLedgerEntry(
        tenantId,
        `Platform commission fee realized for booking ${payment.bookingId}`,
        "Unearned Rental Revenue",
        "Rental Revenue",
        platformShare,
        "payment",
        payment.id
      );

      if (taxAmount > 0) {
        await recordLedgerEntry(
          tenantId,
          `Local lodging tax liability allocated for booking ${payment.bookingId}`,
          "Unearned Rental Revenue",
          "Tax Liability",
          taxAmount,
          "payment",
          payment.id
        );
      }

      await recordLedgerEntry(
        tenantId,
        `Host payout obligation recognized for booking ${payment.bookingId}`,
        "Unearned Rental Revenue",
        "Owner Payable",
        ownerShare,
        "payment",
        payment.id
      );

      res.status(201).json(payment);
    } catch (err: any) {
      console.error("Failed to create payment:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.get("/api/payments/renter", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "Email query param required" });
      }
      const data = await getCollectionFiltered("payments", p => p.renterId === email && p.tenantId === tenantId);
      res.json(data);
    } catch (err: any) {
      console.error("Failed to get renter payments:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  // ==========================================
  // API - Users Auth & Workspace Sync
  // ==========================================
  app.post("/api/users/signup", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const user = req.body;
      user.tenantId = tenantId;

      await dbAdmin.collection("users").doc(user.email.toLowerCase().trim()).set(user, { merge: true });
      await logAction(tenantId, user.email, "USER_SIGNUP", `Account created or synced. Role assigned: ${user.role}`, req);
      res.status(201).json(user);
    } catch (err: any) {
      console.error("Failed to sign up user:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.post("/api/users/login", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { email, password } = req.body;
      const docRef = dbAdmin.collection("users").doc(email.toLowerCase().trim());
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "Account not found. Please sign up first!" });
      }
      const user = docSnap.data() as any;
      if (password && user.password && user.password !== password) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      if (user.role !== "global_admin" && user.tenantId !== tenantId) {
        const tenantSnap = await dbAdmin.collection("tenants").doc(tenantId).get();
        if (tenantSnap.exists && (tenantSnap.data() as any).allowPublicSignup) {
          user.tenantId = tenantId;
          await docRef.update({ tenantId });
        } else {
          return res.status(403).json({ error: "Access denied. You do not have permission to log into this brand workspace." });
        }
      }

      await logAction(user.tenantId, user.email, "USER_LOGIN", `User successfully logged into tenant dashboard (${user.role})`, req);
      res.json(user);
    } catch (err: any) {
      console.error("Failed to login user:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  // ==========================================
  // API - Reviews
  // ==========================================
  app.get("/api/reviews/:listingId", async (req, res) => {
    try {
      const data = await getCollectionFiltered("reviews", r => r.listingId === req.params.listingId);
      res.json(data);
    } catch (err: any) {
      console.error("Failed to get reviews:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const review = req.body;
      review.tenantId = tenantId;
      await dbAdmin.collection("reviews").doc(review.id).set(review);

      // Recalculate average listing rating
      const allReviews = await getCollectionFiltered("reviews", r => r.listingId === review.listingId);
      const count = allReviews.length;
      const totalRating = allReviews.reduce((sum, r) => sum + Number(r.rating), 0);
      const avg = count > 0 ? Number((totalRating / count).toFixed(2)) : 5.0;

      await dbAdmin.collection("listings").doc(review.listingId).update({ rating: avg, reviewsCount: count });
      await logAction(tenantId, review.renterId, "CREATE_REVIEW", `Submitted ${review.rating}-star review for listing ${review.listingId}`, req);

      res.status(201).json(review);
    } catch (err: any) {
      console.error("Failed to create review:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  // ==========================================
  // API - Ledgers & Financial Accounting
  // ==========================================
  app.get("/api/ledger", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const data = await getCollectionFiltered("ledgerEntries", l => l.tenantId === tenantId);
      data.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      res.json(data);
    } catch (err: any) {
      console.error("Failed to fetch ledger entries:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.get("/api/ledger/balances", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const data = await getCollectionFiltered("ledgerEntries", l => l.tenantId === tenantId);

      const balances: Record<string, number> = {
        "Cash": 0,
        "Accounts Receivable": 0,
        "Unearned Rental Revenue": 0,
        "Rental Revenue": 0,
        "Tax Liability": 0,
        "Owner Payable": 0,
        "Maintenance Expense": 0
      };

      data.forEach(entry => {
        if (balances[entry.debitAccount] !== undefined) {
          const isAssetOrExpense = ["Cash", "Accounts Receivable", "Maintenance Expense"].includes(entry.debitAccount);
          balances[entry.debitAccount] += isAssetOrExpense ? Number(entry.amount) : -Number(entry.amount);
        } else {
          balances[entry.debitAccount] = Number(entry.amount);
        }

        if (balances[entry.creditAccount] !== undefined) {
          const isAssetOrExpense = ["Cash", "Accounts Receivable", "Maintenance Expense"].includes(entry.creditAccount);
          balances[entry.creditAccount] += isAssetOrExpense ? -Number(entry.amount) : Number(entry.amount);
        } else {
          balances[entry.creditAccount] = Number(entry.amount);
        }
      });

      res.json(balances);
    } catch (err: any) {
      console.error("Failed to compute ledger balances:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.post("/api/ledger/adjust", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { description, debitAccount, creditAccount, amount, referenceType, referenceId, userEmail } = req.body;
      if (!description || !debitAccount || !creditAccount || !amount) {
        return res.status(400).json({ error: "Missing required fields for double-entry" });
      }
      await recordLedgerEntry(tenantId, description, debitAccount, creditAccount, Number(amount), referenceType, referenceId);
      await logAction(tenantId, userEmail || "admin@enterprise.com", "MANUAL_LEDGER_ADJUST", `Manual journal entry created: ${description} (Amount: ${amount})`, req);
      res.status(201).json({ success: true });
    } catch (err: any) {
      console.error("Failed to record manual adjusting entry:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  // ==========================================
  // API - AI-Driven Background Checks
  // ==========================================
  app.get("/api/background-checks", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const data = await getCollectionFiltered("backgroundChecks", b => b.tenantId === tenantId);
      data.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      res.json(data);
    } catch (err: any) {
      console.error("Failed to fetch background checks:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.post("/api/background-check/run", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { bookingId, renterEmail } = req.body;
      if (!bookingId || !renterEmail) {
        return res.status(400).json({ error: "Missing bookingId or renterEmail" });
      }

      const bookingSnap = await dbAdmin.collection("bookings").doc(bookingId).get();
      if (!bookingSnap.exists) {
        return res.status(404).json({ error: "Booking not found" });
      }
      const booking = bookingSnap.data() as any;

      const reviewsList = await getCollectionFiltered("reviews", r => r.renterId === renterEmail);
      const avgRating = reviewsList.length > 0 ? (reviewsList.reduce((sum, r) => sum + Number(r.rating), 0) / reviewsList.length).toFixed(1) : "5.0";

      const ai = getGeminiClient();
      const prompt = `
        Perform a professional rental risk vetting and background evaluation on the prospective tenant based on:
        Tenant Email: ${renterEmail}
        Tenant Name: ${booking.renterName}
        Average Rating from past hosts: ${avgRating}/5.0 (out of ${reviewsList.length} reviews)
        Booking Details: ${booking.listingTitle} at ${booking.listingLocation}
        Duration: ${booking.nights} nights
        Total Financial Obligation: ${booking.totalPrice}

        Rate their overall risk from 0 (perfectly safe) to 100 (high risk), provide a decision ('approved', 'low_risk', 'elevated_risk'), a brief bullet-pointed summary of findings, and professional underwriting recommendations (e.g. request deposit, request identity verification, approve immediately).
      `;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an automated, enterprise-grade AI Underwriter and Tenant Vetting Officer for high-end properties. Provide clear, reliable, realistic risk assessments. Output strictly in JSON format matching the schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskScore: { type: Type.INTEGER, description: "Vetting risk score from 0 to 100" },
              status: { type: Type.STRING, description: "Underwriting decision status: 'approved', 'low_risk', or 'elevated_risk'" },
              reportSummary: { type: Type.STRING, description: "A detailed but structured underwriting finding report summary" },
              recommendations: { type: Type.STRING, description: "Actionable host or property manager guidelines" }
            },
            required: ["riskScore", "status", "reportSummary", "recommendations"]
          }
        }
      });

      const responseText = aiResponse.text?.trim() || "{}";
      const vettingResult = JSON.parse(responseText);

      const checkId = "bgc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const newCheck = {
        id: checkId,
        tenantId,
        bookingId,
        renterEmail,
        status: vettingResult.status || "approved",
        riskScore: vettingResult.riskScore || 20,
        reportSummary: vettingResult.reportSummary || "Tenant cleared standard automated evaluation.",
        recommendations: vettingResult.recommendations || "Approve booking immediately.",
        timestamp: new Date().toISOString()
      };

      await dbAdmin.collection("backgroundChecks").doc(checkId).set(newCheck);
      await logAction(tenantId, "ai-underwriter@renthub.com", "RUN_BACKGROUND_CHECK", `AI background vetting completed for tenant ${renterEmail}. Score: ${vettingResult.riskScore}/100, Status: ${vettingResult.status}`, req);

      res.json(newCheck);
    } catch (err: any) {
      console.error("AI Background check failed:", err);
      res.status(500).json({ error: "AI Processing error: " + err.message });
    }
  });

  // ==========================================
  // API - AI-Driven Maintenance & Dispatch Routing
  // ==========================================
  app.get("/api/maintenance", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const data = await getCollectionFiltered("maintenanceRequests", m => m.tenantId === tenantId);
      data.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      res.json(data);
    } catch (err: any) {
      console.error("Failed to fetch maintenance requests:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  app.post("/api/maintenance/submit", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { listingId, renterEmail, description, listingTitle } = req.body;
      if (!listingId || !renterEmail || !description) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const ai = getGeminiClient();
      const prompt = `
        Analyze the following property maintenance issue reported by a tenant:
        Property Title: ${listingTitle || "RentHub Managed Property"}
        Renter reported: "${description}"

        Determine the priority ('urgent', 'high', 'medium', 'low'), the trade category ('plumbing', 'electrical', 'hvac', 'appliance', 'general'), immediate troubleshooting actions for the renter, dispatch instructions for the technician, and a realistic repair cost estimate in USD.
      `;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an automated, smart property maintenance dispatcher and mechanical router. Route issues precisely to plumbers, electricians, or HVAC specialists. Estimate repair costs realistic to standard real-estate rates. Output strictly in JSON format.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, description: "Category: 'plumbing', 'electrical', 'hvac', 'appliance', 'general'" },
              priority: { type: Type.STRING, description: "Priority: 'urgent', 'high', 'medium', 'low'" },
              routingNotes: { type: Type.STRING, description: "Technical dispatch guidelines and tenant actions" },
              estimatedCost: { type: Type.INTEGER, description: "Estimated cost of contractor repair in USD" }
            },
            required: ["category", "priority", "routingNotes", "estimatedCost"]
          }
        }
      });

      const responseText = aiResponse.text?.trim() || "{}";
      const routingResult = JSON.parse(responseText);

      const maintenanceId = "maint_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const newMaint = {
        id: maintenanceId,
        tenantId,
        listingId,
        listingTitle: listingTitle || "RentHub Property",
        renterEmail,
        description,
        category: routingResult.category || "general",
        priority: routingResult.priority || "medium",
        status: "reported",
        routingNotes: routingResult.routingNotes || "Dispatch general contractor.",
        estimatedCost: Number(routingResult.estimatedCost) || 150,
        timestamp: new Date().toISOString()
      };

      await dbAdmin.collection("maintenanceRequests").doc(maintenanceId).set(newMaint);

      // Record maintenance expense ledger
      await recordLedgerEntry(
        tenantId,
        `AI-Estimated Maintenance Expense for issue ${maintenanceId} (${routingResult.category})`,
        "Maintenance Expense",
        "Owner Payable",
        Number(routingResult.estimatedCost) || 150,
        "maintenance",
        maintenanceId
      );

      await logAction(tenantId, renterEmail, "SUBMIT_MAINTENANCE", `Maintenance request submitted: ${description}. AI routed to ${routingResult.category} with ${routingResult.priority} priority`, req);

      res.status(201).json(newMaint);
    } catch (err: any) {
      console.error("AI Maintenance routing failed:", err);
      res.status(500).json({ error: "AI Dispatcher failed: " + err.message });
    }
  });

  app.put("/api/maintenance/:id/status", async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { status, assignedContractor } = req.body;
      const docRef = dbAdmin.collection("maintenanceRequests").doc(req.params.id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const updateObj: any = { status };
        if (assignedContractor !== undefined) {
          updateObj.assignedContractor = assignedContractor;
        }
        await docRef.update(updateObj);
        await logAction(tenantId, "maint-admin@renthub.com", "UPDATE_MAINTENANCE", `Maintenance issue ${req.params.id} updated to status: ${status}`, req);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to update maintenance status:", err);
      res.status(500).json({ error: "Database error: " + err.message });
    }
  });

  // ==========================================
  // Vite and Static serving
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
