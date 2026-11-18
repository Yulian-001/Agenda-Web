// utils/logger.js
const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
    // Solo se imprime en desarrollo (ej. para ver el OTP o variables)
    dev: (...args) => {
        if (isDev) {
            console.log('🛠️ [DEV ONLY]:', ...args);
        }
    },
    // Errores reales, se imprimen siempre en consola del servidor
    error: (...args) => {
        console.error('🚨 [ERROR]:', ...args);
    }
};