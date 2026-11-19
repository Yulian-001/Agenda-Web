import LoginForm from './LoginForm';

export default async function LoginPage({ searchParams }) {
    const { recovered } = await searchParams;
    return <LoginForm recovered={recovered === '1'} />;
}
