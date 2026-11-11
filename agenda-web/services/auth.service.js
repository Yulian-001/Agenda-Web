// services/auth.service.js
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import jwt from 'jsonwebtoken';




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

//* Validacion TOKEN JWT


export const loginUserService = async (phone, password) => {
    // 1. Buscar al usuario con sus datos
    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
        throw { statusCode: 401, message: 'Credenciales incorrectas' };
    }

    // 2. Verificar si está bloqueado
    if (user.lockUntil && user.lockUntil > new Date()) {
        throw { statusCode: 403, message: 'Cuenta bloqueada temporalmente. Intente más tarde.' };
    }

    // 3. Comparar contraseñas
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        const failedAttempts = user.failedAttempts + 1;
        let lockUntil = null;

        if (failedAttempts >= 5) {
            lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Bloqueo 15 min
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts, lockUntil }
        });

        throw { statusCode: 401, message: 'Credenciales incorrectas' };
    }

    // 4. Login exitoso: Resetear intentos
    await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: 0, lockUntil: null }
    });

    // 5. Generar el JWT
    const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '1d' } // El token dura 1 día
    );

    // 6. Devolver los datos (sin contraseña) y el token
    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            role: user.role,
            photo: user.photo
        }
    };
};