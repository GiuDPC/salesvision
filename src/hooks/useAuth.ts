import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Obtener sesión actual al cargar
        const getSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);
            } catch (error) {
                console.error('Error getting session:', error);
            } finally {
                setLoading(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        // Cleanup: cuando el componente se "desmonta", cancelamos la suscripción
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Retornamos los valores que otros componentes necesitan
    return {
        user,      // Usuario actual (o null)
        loading,   // ¿Estamos cargando?
        isAuthenticated: !!user,  // !! convierte a booleano: true si hay user
    };
}
