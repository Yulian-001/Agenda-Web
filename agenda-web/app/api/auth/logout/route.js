// app/api/auth/logout/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
    // Creamos una redirección a /login y le borramos la cookie al pasar
    const response = NextResponse.redirect(new URL('/login', request.url));

    response.cookies.set({
        name: 'token',
        value: '',
        httpOnly: true,
        expires: new Date(0), // Fecha en el pasado para forzar el borrado
        path: '/'
    });

    return response;
}