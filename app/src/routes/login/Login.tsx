import { useLocation, useNavigate } from 'react-router-dom';
import { ApiToken, useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import TokenLogin from './components/TokenLogin';
import { useEffect } from 'react';

export type LoginProps = {
    onSuccess: (token: ApiToken) => void
}

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

    const onSuccess = (token: ApiToken | null) => {
        login(token);
        navigate(from, { replace: true });
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="max-w-md w-full mx-4 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center border-2">
                <CardTitle className='text-center mb-4'>
                    <div className="flex flex-col items-center">
                        Ploomber - Debugger
                    </div>
                </CardTitle>
                <CardContent className='pb-4 w-full'>
                    <TokenLogin onSuccess={onSuccess} />
                </CardContent>
            </Card>
        </div>
    )
};

export default Login;
