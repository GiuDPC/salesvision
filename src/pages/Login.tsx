import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp } from '../lib/supabase';
import { toast } from 'sonner';
import { LogIn, UserPlus, Mail, Lock } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);
                navigate('/dashboard');
            } else {
                await signUp(email, password);
                toast.success('Cuenta creada. Revisa tu email.');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card fade-in">
                <div className="login-header">
                    <h1>SalesVision</h1>
                    <p>Plataforma de Analytics de Ventas</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <h2>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>

                    <div className="form-group">
                        <label htmlFor="email">
                            <Mail size={16} /> Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">
                            <Lock size={16} /> Contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <button type="submit" disabled={loading} className="submit-button">
                        {loading ? 'Cargando...' : (
                            <>
                                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                            </>
                        )}
                    </button>

                    <p className="toggle-mode">
                        {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="link-button"
                        >
                            {isLogin ? 'Regístrate' : 'Inicia sesión'}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
}
