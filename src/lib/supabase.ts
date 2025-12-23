import { createClient } from '@supabase/supabase-js';

// URL de tu proyecto Supabase (la obtendrás del dashboard)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// Clave pública (anon key) - es segura para el frontend
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Verificamos que las variables existan
 * Si no están configuradas, mostramos un error claro
 */
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: Faltan las variables de entorno de Supabase');
    console.error('📝 Crea un archivo .env en la raíz del proyecto con:');
    console.error('   VITE_SUPABASE_URL=tu_url_aqui');
    console.error('   VITE_SUPABASE_ANON_KEY=tu_key_aqui');
}


export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);

// Registrar nuevo usuario
export async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) throw error;
    return data;
}

// Iniciar sesión
export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
}

// Cerrar sesión
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

// Obtener usuario actual
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Obtener sesión actual
export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}
