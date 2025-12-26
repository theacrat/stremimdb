import { PrismaClient } from "./generated/prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

let prisma: PrismaClient;

export function instantiatePrisma(db: D1Database) {
	return;
	if (!prisma) {
		const adapter = new PrismaD1(db);
		prisma = new PrismaClient({ adapter });
	}
}

export function getPrisma(): PrismaClient {
	return prisma;
}
