// app/api/auth/logout/route.js
import { NextResponse } from 'next/server';

export async function GET() {
    const response = new NextResponse(null, {
        status: 307,
        headers: { Location: '/login' }
    });

    response.cookies.set({
        name: 'token',
        value: '',
        httpOnly: true,
        expires: new Date(0), // Fecha en el pasado para forzar el borrado
        path: '/'
    });

    return response;
}
