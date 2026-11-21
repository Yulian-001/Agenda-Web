import { redirect } from 'next/navigation';
import DashboardSidebar from '../../components/DashboardSidebar';
import { getDashboardProfile } from '../../services/user.service';
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
        <DashboardSidebar profile={await getDashboardProfile(user)}>
            {children}
        </DashboardSidebar>
    );
}
