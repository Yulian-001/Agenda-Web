// utils/validations.js
import { z } from 'zod';
import { Role } from '@prisma/client';

export const registerSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").trim(),
    phone: z.string()
        .trim()
        .length(10, "El teléfono debe tener 10 dígitos")
        .startsWith('3', "El teléfono debe iniciar con 3"),
    password: z.string().regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!#$%&/(){}*+<>]).{8,}$/,
        "Contraseña débil: debe incluir mayúsculas, minúsculas y un carácter especial (!#$%&/(){}*+<>)"
    ),
    role: z.nativeEnum(Role, { errorMap: () => ({ message: "Rol inválido" }) }),
    photo: z.string().url("Debe ser una URL válida").regex(/\.(jpg|jpeg|png)$/i, "La foto debe ser JPG o PNG").optional(),
    description: z.string().min(10, "La descripción es muy corta").optional(),
    haveWhatsApp: z.boolean().default(true),
    services: z.array(z.string().uuid("ID de servicio inválido")).min(1, "Debe seleccionar al menos un servicio")
});