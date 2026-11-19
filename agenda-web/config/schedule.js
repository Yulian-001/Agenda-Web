export const weekDays = [
    ['MONDAY', 'Lunes'], ['TUESDAY', 'Martes'], ['WEDNESDAY', 'Miércoles'],
    ['THURSDAY', 'Jueves'], ['FRIDAY', 'Viernes'], ['SATURDAY', 'Sábado'], ['SUNDAY', 'Domingo']
];

export const standardHours = Array.from({ length: 15 }, (_, index) =>
    String(index + 8).padStart(2, '0') + ':00'
);

export const scheduleRoles = ['BARBER_AFFILIATE', 'BARBER_BOSS'];

const businessClock = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23'
});

export const scheduleNow = () => businessClock.format(new Date()).split(' ');
export const civilDate = date => new Date(date + 'T00:00:00.000Z');
export const weekdayOf = date => weekDays[(date.getUTCDay() + 6) % 7][0];
export const slotKey = slot => slot.padStart(5, '0');
