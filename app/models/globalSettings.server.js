import prisma from '../config/database.server';

export async function findByShopDomain(shopDomain) {
    return prisma.globalSettings.findUnique({
        where: { shopDomain },
    });
}

export async function upsertByShopDomain(shopDomain, settings) {
    return prisma.globalSettings.upsert({
        where: { shopDomain },
        update: { settings, updatedAt: new Date() },
        create: { shopDomain, settings },
    });
}