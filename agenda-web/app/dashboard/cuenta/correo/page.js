import { redirect } from 'next/navigation';
import { prisma } from '../../../../utils/prisma';
import { verifyAuth } from '../../../../utils/auth';
import EmailSettings from './EmailSettings';

export default async function AccountEmailPage() {
    const user = await verifyAuth().catch(error => {
        if (error.statusCode === 401) redirect('/login');
        throw error;
    });
    const { email, pendingEmail, emailVerifiedAt } = await prisma.user.findUniqueOrThrow({
        where: { id: user.id }, select: { email: true, pendingEmail: true, emailVerifiedAt: true }
    });
    return <EmailSettings email={email} pendingEmail={pendingEmail} verified={Boolean(emailVerifiedAt)} />;
}
