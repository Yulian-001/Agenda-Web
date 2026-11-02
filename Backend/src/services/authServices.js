import prisma from '../config/prisma.js';
import  bcrypt  from 'bcrypt';
import jwt from 'jsonwebtoken';


//* Prueba 
export const checkServerHealth = () => {
    return {
        status: 'SANOS',
        message: 'Servidor ejecutado correctamente.',
        timestamp: new Date().toDateString()
    }
}

//* Función para registrar un nuevo usuario 


export const createUserService = async ({name,phone,password,role,photo,state,description,haveWhatsApp,services}) => {
    const validPayload =( {name,phone,password,role,photo,state,description,haveWhatsApp,services}) => {
        //* Regex de contraseña */
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!#$%&/(){}*+<>]).{8,}$/;

        if(!passwordRegex.test(password)){
                throw new Error('Contraseña débil, su contraseña debe incluir minúsculas, mayúsculas, y alguno de estos signos !#$%&/(){}*+<>')
            }
        
        if(!name || name.trim() === '') throw new Error('Debe ingresar un nombre');
        
        const phoneStr = String(phone).trim();

        if(!phone || phoneStr.length !== 10 || isNaN(phoneStr) || !phoneStr.startsWith('3')){
            throw new Error('Debe ingresar un número de telefono válido');
        }

        if(!description || description.trim().length !== 20){
            throw new Error('Debe ingresar una descripcion personal válida');
        }

        if(!services || !Array.isArray(services) || services.length < 1){
            throw new Error('Debe seleccionar al menos un servicio',)
        }

        const permitRoles = Object.values(prisma._engineConfig?.inlineSchemaObject?.enumMap?.Role || {});

        if(!role){
            throw new Error('Debe seleccionar un rol para continuar');
        }

        if(!permitRoles.includes(role)){
            throw new Error(`El rol ${role} no es válido`);
        }

        if(!photo || !/^https?:\/\/.+\.(jpg|jpeg|png)$/i.test(photo)){
            throw new Error('La foto debe ser una URL válida que termine en .jpg, .jpeg, .png ');
        }

        if(!state || typeof state !== 'boolean' ){
            throw new Error('Debe ingresar un estado activo o inactivo para continuar');
        }

        if(!haveWhatsApp || typeof haveWhatsApp !== 'boolean'){
            throw new Error('Debe ingresar si tiene o no WhatsApp');
        }
    }

    validPayload({name,phone,password,role,photo,state,description,haveWhatsApp,services});

    //* Identificar si el usuario ya existe

    const existingUser = prisma.findUnique(phone)

    if(existingUser){
        throw new Error('Este usuario ya se encuentra registrado');
    }




}


