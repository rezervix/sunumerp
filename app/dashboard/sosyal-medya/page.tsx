import { redirect } from "next/navigation";
import { useLanguage } from "@/lib/context/LanguageContext"
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import SosyalMedyaClient from "./SosyalMedyaClient";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this";

async function verifyUserAccess() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) return null;

    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        const user = await prisma.user.findUnique({
            where: { id: payload.userId as string },
            include: {
                branches: { include: { role: true } }
            }
        });

        if (!user || !user.isActive) return null;
        if (!user.branches || user.branches.length === 0) return null;

        return user;
    } catch {
        return null;
    }
}

export default async function SosyalMedyaPage() {
    const verifiedUser = await verifyUserAccess();

    if (!verifiedUser) {
        redirect("/dashboard");
    }

    return <SosyalMedyaClient />;
}
