import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import * as supabaseLib from '../../lib/supabase';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'login.loginTitle': 'Iniciar Sesión',
                'login.registerTitle': 'Crear Cuenta',
                'login.email': 'Email',
                'login.emailPlaceholder': 'tu@email.com',
                'login.password': 'Contraseña',
                'login.passwordPlaceholder': '••••••••',
                'login.showPassword': 'Mostrar contraseña',
                'login.hidePassword': 'Ocultar contraseña',
                'login.loginButton': 'Iniciar Sesión',
                'login.registerButton': 'Crear Cuenta',
                'login.noAccount': '¿No tienes cuenta?',
                'login.hasAccount': '¿Ya tienes cuenta?',
                'login.registerHere': 'Regístrate aquí',
                'login.loginHere': 'Inicia sesión',
                'login.processing': 'Procesando...',
                'login.passwordMinLength': 'La contraseña debe tener al menos 6 caracteres',
            };
            return translations[key] || key;
        },
        i18n: { changeLanguage: vi.fn() }
    })
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../../lib/supabase', () => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
    supabase: {},
}));

vi.mock('sweetalert2', () => ({
    default: {
        fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
    },
}));

const LoginWrapper = () => (
    <BrowserRouter>
        <Login />
    </BrowserRouter>
);

describe('Login Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza el formulario de login correctamente', () => {
        render(<LoginWrapper />);
        expect(screen.getByText('SalesVision')).toBeInTheDocument();
        expect(screen.getByText('Plataforma de Analytics de Ventas')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument();
    });

    it('cambia entre modo login y registro', async () => {
        render(<LoginWrapper />);
        expect(screen.getByRole('heading', { name: 'Iniciar Sesión' })).toBeInTheDocument();

        const toggleButton = screen.getByText('Regístrate aquí');
        fireEvent.click(toggleButton);

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Crear Cuenta' })).toBeInTheDocument();
        });
    });

    it('toggle de visibilidad de contraseña funciona', () => {
        render(<LoginWrapper />);

        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
        const toggleButton = screen.getByRole('button', { name: /mostrar contraseña/i });

        expect(passwordInput.type).toBe('password');
        fireEvent.click(toggleButton);
        expect(passwordInput.type).toBe('text');
    });

    it('muestra indicador de fuerza en modo registro', async () => {
        render(<LoginWrapper />);

        const toggleButton = screen.getByText('Regístrate aquí');
        fireEvent.click(toggleButton);

        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
        fireEvent.change(passwordInput, { target: { value: 'test123' } });

        await waitFor(() => {
            const strengthBar = document.querySelector('.password-strength-bar');
            expect(strengthBar).toBeInTheDocument();
        });
    });

    it('maneja el submit del formulario de login', async () => {
        const mockSignIn = vi.mocked(supabaseLib.signIn);
        mockSignIn.mockResolvedValueOnce(undefined);

        render(<LoginWrapper />);

        const emailInput = screen.getByPlaceholderText('tu@email.com');
        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        const form = document.querySelector('form') as HTMLFormElement;
        fireEvent.submit(form);

        await waitFor(() => {
            expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
        });
    });

    it('muestra validacion para contrasena corta', async () => {
        render(<LoginWrapper />);

        const toggleButton = screen.getByText('Regístrate aquí');
        fireEvent.click(toggleButton);

        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
        fireEvent.change(passwordInput, { target: { value: '123' } });

        await waitFor(() => {
            expect(screen.getByText('La contraseña debe tener al menos 6 caracteres')).toBeInTheDocument();
        });
    });
});
