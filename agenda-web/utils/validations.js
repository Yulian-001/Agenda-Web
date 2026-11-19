// utils/validations.js
import { z } from 'zod';
import { Role, DayOfWeek } from '@prisma/client';
import { securePasswordPattern, securePasswordMessage } from '../config/auth';
import { slotKey } from '../config/schedule';
import { teamBarberRoles } from '../config/barberRoles';
import { jpegPhotoPrefix, maxBarberPhotoBytes } from './barberPhoto';


export const registerSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").trim(),
    phone: z.string()
        .trim()
        .length(10, "El teléfono debe tener 10 dígitos")
        .startsWith('3', "El teléfono debe iniciar con 3"),
    password: z.string().regex(securePasswordPattern, securePasswordMessage),
    role: z.nativeEnum(Role, { errorMap: () => ({ message: "Rol inválido" }) }),
    photo: z.string().url("Debe ser una URL válida").regex(/\.(jpg|jpeg|png)$/i, "La foto debe ser JPG o PNG"),
    description: z.string().min(10, "La descripción es muy corta"),
    haveWhatsApp: z.boolean().default(true),
    services: z.array(z.string().uuid("ID de servicio inválido")).min(1, "Debe seleccionar al menos un servicio")
});

export const serviceSchema = z.object({
    name: z.string().min(3, "Mínimo 3 caracteres").trim(),
    description: z.string().min(10, "Mínimo 10 caracteres").trim(),
    duration: z.number().int("Debe ser entero").positive("Debe ser mayor a 0"),
    price: z.number().positive("El precio debe ser mayor a 0")
});

export const updateServiceSchema = serviceSchema.partial();

export const scheduleDateSchema = z.iso.date('Selecciona una fecha válida.');
const scheduleTimeSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)').transform(slotKey);

export const weeklyScheduleSchema = z.object({
    changes: z.array(z.object({
        day: z.enum(DayOfWeek),
        timeSlot: scheduleTimeSchema,
        isActive: z.boolean()
    })).min(1).max(350)
});

export const dailyScheduleSchema = z.object({
    date: scheduleDateSchema,
    wholeDay: z.boolean().nullable().optional(),
    hours: z.record(z.string(), z.boolean()).default({})
}).refine(data => Object.keys(data.hours).every(slot =>
    scheduleTimeSchema.safeParse(slot).success && slot === slotKey(slot)
) && (data.wholeDay !== undefined || Object.keys(data.hours).length > 0), 'Selecciona horas o una opción para todo el día.');

export const createAppointmentSchema = z.object({
    clientName: z.string().min(2, "El nombre es requerido").trim(),
    clientPhone: z.string().length(10, "El teléfono debe tener 10 dígitos").trim(),
    barberId: z.string().uuid("ID de barbero inválido"),
    serviceId: z.string().uuid("ID de servicio inválido"),
    date: scheduleDateSchema,
    timeSlot: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)")
});

const teamRoleSchema = z.enum(Object.keys(teamBarberRoles), { error: 'Selecciona un rol del equipo.' });
const externalPhotoSchema = z.url({ protocol: /^https?$/, hostname: /.+/ });

export const barberPhotoSchema = z.string().trim().min(1, 'La foto del barbero es obligatoria.')
    .refine(photo => {
        if (!photo.startsWith(jpegPhotoPrefix)) return externalPhotoSchema.safeParse(photo).success;

        const base64 = photo.slice(jpegPhotoPrefix.length);
        if (base64.length > Math.ceil(maxBarberPhotoBytes / 3) * 4 ||
            base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return false;

        const bytes = Buffer.from(base64, 'base64');
        return bytes.length >= 4 && bytes.length <= maxBarberPhotoBytes &&
            bytes[0] === 0xff && bytes[1] === 0xd8 &&
            bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
    }, 'Usa una URL http o https de una imagen, o pega la foto en el formulario.');

const barberServicesSchema = z.array(z.uuid('ID de servicio inválido'));
const commissionSchema = z.number().min(0).max(1);

export const createBarberSchema = registerSchema.extend({
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
    phone: z.string().trim().regex(/^3\d{9}$/, 'El teléfono debe tener 10 dígitos e iniciar con 3'),
    description: z.string().trim().min(10, 'La descripción debe tener al menos 10 caracteres'),
    photo: barberPhotoSchema,
    role: teamRoleSchema,
    commissionRate: commissionSchema.optional(),
    services: barberServicesSchema.default([])
});

export const updateUserSchema = z.object({
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
    photo: barberPhotoSchema.optional(),
    description: z.string().trim().min(5, 'La descripción debe tener al menos 5 caracteres').optional(),
    haveWhatsApp: z.boolean().optional(),
    commissionRate: commissionSchema.optional(),
    services: barberServicesSchema.optional(),
    state: z.boolean().optional(),
    role: teamRoleSchema.optional()
});

export const updateOwnProfileSchema = updateUserSchema.pick({
    name: true,
    photo: true,
    description: true,
    haveWhatsApp: true
}).strict();

const recoveryPhone = z.string().trim().regex(/^\d{10}$/, 'Ingresa un número de teléfono de diez dígitos.');

export const forgotPasswordSchema = z.object({ phone: recoveryPhone });

export const verifyRecoverySchema = z.object({
    phone: recoveryPhone,
    otpCode: z.string().regex(/^\d{6}$/, 'Ingresa los seis dígitos del código.')
});

export const resetPasswordSchema = verifyRecoverySchema.extend({
    newPassword: z.string().regex(securePasswordPattern, securePasswordMessage)
});
