// seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const adminPhone = "3000000000"; // Teléfono del Admin
    const existingAdmin = await prisma.user.findUnique({ where: { phone: adminPhone } });

    if (existingAdmin) {
        console.log("El administrador ya existe en la base de datos.");
        return;
    }

    const hashedPassword = await bcrypt.hash("AdminPassword123!", 10);

    await prisma.user.create({
        data: {
            name: "Administrador Principal",
            phone: adminPhone,
            password: hashedPassword,
            role: "ADMIN",
            photo: "https://misitio.com/admin.jpg",
            description: "Dueño de la barbería",
        }
    });

    console.log("✅ Administrador creado.");
    console.log("📱 Teléfono: 3000000000");
    console.log("🔑 Contraseña: AdminPassword123!");
}

main().catch(console.error).finally(() => prisma.$disconnect());