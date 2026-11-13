// services/finance.service.js
import { prisma } from '../utils/prisma';

export const getFinancesService = async (user, filters) => {
    const { period, year, month, semester } = filters;

    // 1. Calcular el rango de fechas (start y end) según el periodo
    let startDate, endDate;
    const currentYear = parseInt(year) || new Date().getFullYear();

    if (period === 'monthly') {
        const currentMonth = parseInt(month) || (new Date().getMonth() + 1);
        startDate = new Date(currentYear, currentMonth - 1, 1);
        endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    } else if (period === 'semiannual') {
        const sem = parseInt(semester) || 1;
        const startMonth = sem === 1 ? 0 : 6; // 0 = Enero, 6 = Julio
        startDate = new Date(currentYear, startMonth, 1);
        endDate = new Date(currentYear, startMonth + 6, 0, 23, 59, 59);
    } else {
        throw { statusCode: 400, message: "Periodo inválido. Use 'monthly' o 'semiannual'." };
    }

    // 2. Construir el filtro base (Solo citas COMPLETADAS)
    let whereClause = {
        date: { gte: startDate, lte: endDate },
        state: 'COMPLETED'
    };

    // 3. RBAC: Si es un barbero (no admin/boss), solo ve sus propias ganancias
    const isAdminOrBoss = ['ADMIN', 'BARBER_BOSS'].includes(user.role);
    if (!isAdminOrBoss) {
        whereClause.barberId = user.id;
    }

    // 4. Traer las citas completadas en ese rango de fechas
    const appointments = await prisma.appointment.findMany({
        where: whereClause,
        include: {
            barber: { select: { id: true, name: true, commissionRate: true } },
            service: { select: { name: true } }
        }
    });

    // 5. Procesar los datos para sacar los totales
    let totalRevenue = 0;
    const servicesCount = {};
    const barbersData = {};

    appointments.forEach(app => {
        const price = app.priceAtBooking;
        totalRevenue += price;

        // Contar servicios para el Top
        servicesCount[app.service.name] = (servicesCount[app.service.name] || 0) + 1;

        // Agrupar por barbero
        if (!barbersData[app.barberId]) {
            barbersData[app.barberId] = {
                id: app.barberId,
                name: app.barber.name,
                commissionRate: app.barber.commissionRate,
                totalSales: 0,
                appointmentsCount: 0
            };
        }
        barbersData[app.barberId].totalSales += price;
        barbersData[app.barberId].appointmentsCount += 1;
    });

    // 6. Formatear el Top de servicios (Porcentaje)
    const topServices = Object.keys(servicesCount).map(serviceName => {
        const count = servicesCount[serviceName];
        const percentage = totalRevenue > 0 ? ((count / appointments.length) * 100).toFixed(1) : 0;
        return { name: serviceName, count, percentage: `${percentage}%` };
    }).sort((a, b) => b.count - a.count); // Ordenar de mayor a menor

    // 7. Formatear los datos de los barberos (con las comisiones)
    const barbersReport = Object.values(barbersData).map(barber => {
        const barberEarnings = barber.totalSales * barber.commissionRate;
        const bossEarnings = barber.totalSales - barberEarnings;

        return {
            ...barber,
            barberEarnings,
            bossEarnings
        };
    });

    // 8. Devolver la respuesta estructurada
    return {
        period: { startDate, endDate, type: period },
        summary: {
            totalRevenue,
            totalAppointments: appointments.length,
            topServices
        },
        // Si es barbero, solo devolvemos sus propios números. Si es admin, devolvemos el desglose.
        teamReport: isAdminOrBoss ? barbersReport : (barbersReport[0] || null)
    };
};