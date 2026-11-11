// services/auth.service.js
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';



export const createUserService = async (data) => {
    const { name, phone, password, role, photo, description, haveWhatsApp, services } = data;

    // 1. Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
        // Usamos un objeto de error personalizado para manejarlo en el controlador
        throw { statusCode: 409, message: 'Este número de teléfono ya está registrado' };
    }

    // 2. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Crear el usuario y conectar los servicios (Relación N:M)
    // Usamos 'connect' para asociar los IDs de servicios que ya existen en la BD
    const newUser = await prisma.user.create({
        data: {
            name: name.trim(),
            phone: phone.trim(),
            password: hashedPassword,
            role,
            photo,
            description,
            haveWhatsApp,
            services: {
                create: services.map(serviceId => ({
                    service: { connect: { id: serviceId } }
                }))
            }
        },
        select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            createdAt: true
            // NUNCA devolvemos la contraseña
        }
    });

    return newUser;
};