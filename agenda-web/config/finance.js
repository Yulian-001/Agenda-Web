export { teamManagers as financeRoles } from './barberRoles';

export const settlementDirections = {
    BUSINESS_PAYS_BARBER: 'El negocio liquida al barbero',
    BARBER_PAYS_BUSINESS: 'El barbero liquida al negocio'
};

export const defaultSettlementDirection = 'BUSINESS_PAYS_BARBER';
export const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const cancellationRoles = {
    ADMIN: 'Administrador',
    BARBER_BOSS: 'Barbero jefe',
    BARBER_AFFILIATE: 'Barbero afiliado',
    BARBER_INDEPENDENT: 'Barbero independiente',
    CLIENT: 'Cliente',
    UNKNOWN: 'Autor desconocido'
};
