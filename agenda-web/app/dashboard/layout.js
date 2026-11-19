import { redirect } from 'next/navigation';
import DashboardSidebar from '../../components/DashboardSidebar';
import { verifyAuth } from '../../utils/auth';

export default async function DashboardLayout({ children }) {
    let user;
    try {
        user = await verifyAuth();
    } catch (error) {
        if (error.statusCode === 401) redirect('/login');
        throw error;
    }

    return (
        <DashboardSidebar userName={user.name} role={user.role}>
            {children}
        </DashboardSidebar>
    );
}
