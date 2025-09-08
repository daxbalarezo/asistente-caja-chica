// --- app.js (Actualizado con Seguridad) ---
import { db } from './db.js'; // Necesitamos el cliente de Supabase aquí
import { renderDashboard } from './ui/cuadre.js';
import { renderEmpresas } from './ui/empresas.js';
import { renderDesembolsos } from './ui/desembolsos.js';
import { renderRendiciones } from './ui/rendiciones.js';
import { renderCuadre } from './ui/cuadre.js';
import { renderAuth } from './ui/auth.js'; // Importamos la nueva vista de login

const routes = {
    '/': renderDashboard,
    '/empresas': renderEmpresas,
    '/desembolsos': renderDesembolsos,
    '/rendiciones': renderRendiciones,
    '/cuadre': renderCuadre,
    '#auth': renderAuth, // Añadimos la ruta de login
};

const appRoot = document.getElementById('app-root');

async function router() {
    // Verificamos si hay un usuario logueado
    const { data: { session } } = await db.auth.getSession();
    
    // Si no hay sesión y no estamos en la página de login, redirigir a login
    if (!session && window.location.hash !== '#auth') {
        window.location.hash = '#auth';
        return; // Detenemos la ejecución para no renderizar nada más
    }
    
    // Si SÍ hay sesión y el usuario intenta ir a la página de login, lo mandamos al dashboard
    if (session && window.location.hash === '#auth') {
        window.location.hash = '/';
        return;
    }

    const path = window.location.hash || '/';
    const viewRenderer = routes[path] || routes['#auth'];
    
    try {
        appRoot.innerHTML = '<h2>Cargando...</h2>';
        await viewRenderer(appRoot);
        updateActiveLink(session);
    } catch (error) {
        console.error(`Error al renderizar la vista para ${path}:`, error);
        appRoot.innerHTML = `<p class="error">Error al cargar la página.</p>`;
    }
}

function updateActiveLink(session) {
    const nav = document.querySelector('header nav');
    const settings = document.querySelector('.settings-menu');
    
    // Si hay sesión, mostramos la navegación, si no, la ocultamos
    if (session) {
        nav.style.display = 'flex';
        settings.style.display = 'flex';
        const path = window.location.hash.slice(1) || '/';
        document.querySelectorAll('nav a').forEach(a => {
            const linkPath = a.getAttribute('href').slice(1);
            a.classList.toggle('active', linkPath === path || (path === '/' && linkPath === ''));
        });
    } else {
        nav.style.display = 'none';
        settings.style.display = 'none';
    }
}

// --- Event Listeners ---
window.addEventListener('hashchange', router);
window.addEventListener('load', router);

// El resto del código de app.js (modo oscuro, etc.) no lo necesitamos aquí,
// ya que solo es visible para usuarios logueados y su lógica
// ya está en las vistas correspondientes o no es crítica ahora.
// Por simplicidad, lo mantenemos así.