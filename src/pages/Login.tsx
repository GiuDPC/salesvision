import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp } from '../lib/supabase';
import Swal from 'sweetalert2';
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();

    // Calcular fuerza de contraseña
    const getPasswordStrength = (pwd: string): 'weak' | 'medium' | 'strong' | null => {
        if (pwd.length === 0) return null;
        if (pwd.length < 6) return 'weak';
        if (pwd.length < 10) return 'medium';
        return 'strong';
    };

    const passwordStrength = getPasswordStrength(password);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);

                await Swal.fire({
                    title: '¡Bienvenido!',
                    text: 'Iniciando sesión...',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#1e293b',
                    color: '#f1f5f9',
                });

                navigate('/dashboard');
            } else {
                await signUp(email, password);

                await Swal.fire({
                    title: '¡Cuenta Creada!',
                    html: `
                        <p style="margin-bottom: 1rem;">Te hemos enviado un email a:</p>
                        <strong style="color: #8b5cf6; font-size: 1.1rem;">${email}</strong>
                        <p style="margin-top: 1rem; color: #94a3b8;">Por favor confirma tu cuenta haciendo clic en el enlace del correo.</p>
                    `,
                    icon: 'success',
                    confirmButtonText: 'Ir a Iniciar Sesión',
                    confirmButtonColor: '#8b5cf6',
                    background: '#1e293b',
                    color: '#f1f5f9',
                });

                setIsLogin(true);
                setPassword('');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error desconocido';

            await Swal.fire({
                title: 'Error',
                text: message,
                icon: 'error',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#ef4444',
                background: '#1e293b',
                color: '#f1f5f9',
            });
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

                <form
                    onSubmit={handleSubmit}
                    className={`login-form ${isLogin ? 'login-mode' : 'register-mode'}`}
                >
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
                        <div className="password-input-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="password-toggle-button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {!isLogin && passwordStrength && (
                            <div className="password-strength">
                                <div className={`password-strength-bar ${passwordStrength}`} />
                            </div>
                        )}

                        {!isLogin && password.length > 0 && password.length < 6 && (
                            <p className="password-hint">La contraseña debe tener al menos 6 caracteres</p>
                        )}
                    </div>

                    <button type="submit" disabled={loading} className="submit-button">
                        {loading ? (
                            <>
                                <div className="spinner-small"></div>
                                Procesando...
                            </>
                        ) : (
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
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setPassword('');
                            }}
                            className="link-button"
                        >
                            {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
}
