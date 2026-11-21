export const teamBarberRoles = {
    ADMIN: 'Administrador',
    BARBER_BOSS: 'Jefe',
    BARBER_AFFILIATE: 'Afiliado'
};

export const teamManagers = ['ADMIN', 'BARBER_BOSS'];
export const adminProtection = 'El barbero jefe no puede retirar ni desactivar una cuenta administradora ni cambiar su rol.';
export const adminGrantProtection = 'Solo un administrador puede conceder el rol de administrador.';
export const independentRole = 'BARBER_INDEPENDENT';
export const catalogManagers = [...teamManagers, independentRole];
export const publiclyBookable = {
    state: true, archivedAt: null,
    OR: [{ role: { in: ['BARBER_BOSS', 'BARBER_AFFILIATE'] } }, { role: independentRole, isOwner: true }]
};
export const roleLabels = { ...teamBarberRoles, [independentRole]: 'Independiente' };
