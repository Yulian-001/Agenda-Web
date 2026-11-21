import EmailLinkActions from '../../components/EmailLinkActions';

export const metadata = { referrer: 'no-referrer', robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }) {
    const { token } = await searchParams;
    return <EmailLinkActions endpoint="/api/users/me/email/verify" token={typeof token === 'string' ? token : ''} />;
}
