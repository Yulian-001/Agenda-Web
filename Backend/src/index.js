import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import ratelimit from 'express-rate-limit';

//? variables de entorno .env

dotenv.config()

const app = expres();
const PORT = process.env.PORT || 3000;


//? Limitador de peticiones port IP

const lmt = ratelimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        status: 'ERROR',
        message: 'Demasiadas peticiones de esta IP, intente más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false
})

//? Middlewars globales 

app.use(cors());
app.use(helmet());
app.use(morgan());
app.use(lmt);
app.use(express.json());
app.use('/api/auth', authRoutes);

app.get('/api/health',(req, res)=> {
    res.json({status: 'SANO', message: 'Servidor corriendo correctamente.'})
});

//? Ruta de prueba protegida 