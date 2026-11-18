// app/dashboard/layout.js
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import DashboardSidebar from '../../components/DashboardSidebar';

export default async function DashboardLayout({ children }) {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) redirect('/login');

    // Validar token y obtener nombre
    let userName = "Usuario";
    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        userName = payload.name || "Usuario";
    } catch (error) {
        redirect('/login');
    }

    return (
        <DashboardSidebar userName={userName}>
            {children}
        </DashboardSidebar>
    );
}