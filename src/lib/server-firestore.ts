import { db } from "../db/index.ts";
import * as schema from "../db/schema.ts";
import { eq, getTableColumns } from "drizzle-orm";

const tableMap: Record<string, any> = {
  tenants: schema.tenants,
  auditLogs: schema.auditLogs,
  users: schema.users,
  listings: schema.listings,
  bookings: schema.bookings,
  payments: schema.payments,
  reviews: schema.reviews,
  ledgerEntries: schema.ledgerEntries,
  backgroundChecks: schema.backgroundChecks,
  maintenanceRequests: schema.maintenanceRequests
};

export const dbAdmin = {
  collection(collectionName: string) {
    const table = tableMap[collectionName];
    if (!table) {
      throw new Error(`Table mapping for collection '${collectionName}' not found.`);
    }
    const isUsers = collectionName === "users";

    return {
      async get() {
        try {
          const rows = await db.select().from(table);
          return {
            empty: rows.length === 0,
            docs: rows.map(r => ({
              id: isUsers ? (r as any).email : (r as any).id,
              exists: true,
              data: () => r
            }))
          };
        } catch (err: any) {
          console.error(`dbAdmin.collection('${collectionName}').get() failed:`, err);
          throw err;
        }
      },

      doc(docId: string) {
        const keyColumn = isUsers ? table.email : table.id;
        const keyField = isUsers ? "email" : "id";

        return {
          async get() {
            try {
              const rows = await db.select().from(table).where(eq(keyColumn, docId));
              if (rows.length === 0) {
                return {
                  id: docId,
                  exists: false,
                  data: () => undefined
                };
              }
              return {
                id: docId,
                exists: true,
                data: () => rows[0]
              };
            } catch (err: any) {
              console.error(`dbAdmin.collection('${collectionName}').doc('${docId}').get() failed:`, err);
              throw err;
            }
          },

          async set(data: any, options?: { merge?: boolean }) {
            try {
              const columns = getTableColumns(table);
              const filteredData: Record<string, any> = {};
              
              // Ensure primary key is set
              const rowData = { ...data, [keyField]: docId };

              // Keep only keys present in table columns
              for (const key of Object.keys(rowData)) {
                if (key in columns) {
                  filteredData[key] = rowData[key];
                }
              }

              // Check if record exists
              const existing = await db.select().from(table).where(eq(keyColumn, docId));
              if (existing.length > 0) {
                // Remove primary key from update to avoid issues
                const updateData = { ...filteredData };
                delete updateData[keyField];

                await db.update(table).set(updateData).where(eq(keyColumn, docId));
              } else {
                // Insert new record
                await db.insert(table).values(filteredData);
              }
            } catch (err: any) {
              console.error(`dbAdmin.collection('${collectionName}').doc('${docId}').set() failed:`, err);
              throw err;
            }
          },

          async update(data: any) {
            try {
              const columns = getTableColumns(table);
              const filteredData: Record<string, any> = {};

              // Keep only keys present in table columns, and exclude primary key
              for (const key of Object.keys(data)) {
                if (key in columns && key !== keyField) {
                  filteredData[key] = data[key];
                }
              }

              await db.update(table).set(filteredData).where(eq(keyColumn, docId));
            } catch (err: any) {
              console.error(`dbAdmin.collection('${collectionName}').doc('${docId}').update() failed:`, err);
              throw err;
            }
          },

          async delete() {
            try {
              await db.delete(table).where(eq(keyColumn, docId));
            } catch (err: any) {
              console.error(`dbAdmin.collection('${collectionName}').doc('${docId}').delete() failed:`, err);
              throw err;
            }
          }
        };
      }
    };
  },

  async clearAllTables() {
    try {
      await db.delete(schema.auditLogs);
      await db.delete(schema.backgroundChecks);
      await db.delete(schema.maintenanceRequests);
      await db.delete(schema.reviews);
      await db.delete(schema.ledgerEntries);
      await db.delete(schema.payments);
      await db.delete(schema.bookings);
      await db.delete(schema.listings);
      await db.delete(schema.users);
      await db.delete(schema.tenants);
    } catch (err) {
      console.error("clearAllTables failed:", err);
      throw err;
    }
  }
};
