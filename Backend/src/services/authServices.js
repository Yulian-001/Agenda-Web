

//! LÓGICA DE NEGOCIO 


//* Prueba 
export const checkServerHealth = () => {
    return {
        status: 'SANOS',
        message: 'Servidor ejecutado correctamente.',
        timestamp: new Date().toDateString()
    }
}