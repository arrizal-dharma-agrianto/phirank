import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });

const enableLog =
  process.env.DATABASE_LOG === "true";

const prisma = new PrismaClient({
  adapter, log: enableLog
    ? ["query", "info", "warn", "error"]
    : ["error"],
});

if (enableLog) {
  prisma.$on("query", (e) => {
    console.log("━━━━━━━━━━━━━━━━━━");
    console.log("Query:", e.query);
    console.log("Params:", e.params);
    console.log("Duration:", `${e.duration}ms`);
  });
}

export { prisma };