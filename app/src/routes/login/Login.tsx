import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import CredentialsLogin from './components/CredentialsLogin';
import { useEffect } from 'react';
import { AuthenticatedUser } from '@/types/auth';

const Login: React.FC = () => {
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname === location.pathname
        ? '/'
        : (location.state?.from?.pathname || '/');

    useEffect(() => {
        if (user) {
            navigate(from, { replace: true });
        }
    }, [user, navigate, from]);

    const onSuccess = (user: AuthenticatedUser) => {
        login(user);
        navigate(from, { replace: true });
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="max-w-md w-full mx-4 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center border-2">
                <CardTitle className='text-center mb-4'>
                    <div className="flex flex-col items-center">
                        Rate Limiter - Admin Dashboard
                    </div>
                </CardTitle>
                <CardContent className='pb-4 w-full'>
                    <CredentialsLogin onSuccess={onSuccess} />
                </CardContent>
            </Card>
        </div>
    )
};

export default Login;
