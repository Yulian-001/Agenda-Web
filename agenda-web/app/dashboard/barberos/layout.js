import { notFound, redirect } from 'next/navigation';
import { teamManagers } from '../../../config/barberRoles';
import { verifyAuth } from '../../../utils/auth';

export default async function BarbersLayout({ children }) {
    try {
        await verifyAuth(teamManagers);
    } catch (error) {
        if (error.statusCode === 401) redirect('/login');
        if (error.statusCode === 403) notFound();
        throw error;
    }
    return children;
}
