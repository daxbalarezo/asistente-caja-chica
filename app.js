// --- app.js (Versión Optimizada para Móviles) ---
import { db } from './db.js';
import { renderDashboard } from './ui/cuadre.js';
import { renderEmpresas } from './ui/empresas.js';
import { renderDesembolsos } from './ui/desembolsos.js';
import { renderRendiciones } from './ui/rendiciones.js';
import { renderCuadre } from './ui/cuadre.js';
import { renderAuth, handleLogout } from './ui/auth.js';

const routes = {
    '/': renderDashboard,
    'empresas': renderEmpresas,
    'desembolsos': renderDesembolsos,
    'rendiciones': renderRendiciones,
    'cuadre': renderCuadre,
    'auth': renderAuth,
};

const appRoot = document.getElementById('app-root');
let currentUser = null;
let isLoading = false;

// Detectar si es móvil
const isMobile = () => window.innerWidth < 768;

// Mostrar/ocultar loading spinner
function showLoading() {
    if (isLoading) return;
    isLoading = true;
    
    // Para móviles, usar un spinner más sutil
    if (isMobile()) {
        const existingSpinner = document.querySelector('.mobile-loading');
        if (!existingSpinner) {
            const spinner = document.createElement('div');
            spinner.className = 'mobile-loading';
            spinner.style.cssText = `
                position: fixed;
                top: 70px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--primary-color);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                z-index: 1000;
                font-size: 0.85rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                animation: slideDown 0.3s ease-out;
            `;
            spinner.innerHTML = `
                <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                Cargando...
            `;
            document.body.appendChild(spinner);
        }
    } else {
        appRoot.innerHTML = '<div style="text-align: center; padding: 2rem;"><h2>Cargando...</h2></div>';
    }
}

function hideLoading() {
    isLoading = false;
    const mobileSpinner = document.querySelector('.mobile-loading');
    if (mobileSpinner) {
        mobileSpinner.remove();
    }
}

// Listener principal que reacciona a los cambios de sesión (Login/Logout)
db.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    router();
});

async function router() {
    try {
        showLoading();
        
        // Lógica del router mejorada
        let path = window.location.hash.slice(1);
        if (path.startsWith('/')) {
            path = path.slice(1);
        }
        
        // Si no hay usuario y no estamos en la página de login, redirigir
        if (!currentUser && path !== 'auth') {
            window.location.hash = 'auth';
            return;
        }
        
        // Si hay usuario y estamos en la página de login, redirigir al dashboard
        if (currentUser && path === 'auth') {
            window.location.hash = '/';
            return;
        }

        // Si la ruta está vacía, es el dashboard
        const routeKey = path === '' ? '/' : path;
        const viewRenderer = routes[routeKey] || routes['/'];
        
        await viewRenderer(appRoot);
        updateUI(currentUser);
        updateMobileNavigation();
        
        // Scroll to top en cambio de ruta (solo móvil)
        if (isMobile()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // Vibración sutil en navegación móvil
        if (isMobile() && 'vibrate' in navigator) {
            navigator.vibrate(25);
        }
        
    } catch (error) {
        console.error(`Error al renderizar la vista para ${path}:`, error);
        appRoot.innerHTML = `
            <div class="error-container" style="text-align: center; padding: 2rem;">
                <h3 style="color: var(--danger-color);">😓 Oops! Algo salió mal</h3>
                <p>Error al cargar la página. Por favor, intenta de nuevo.</p>
                <button class="btn btn-primary" onclick="location.reload()">Recargar</button>
            </div>
        `;
        
        // Mostrar toast de error en móviles
        if (isMobile() && window.MobileUtils) {
            window.MobileUtils.showMobileToast('Error al cargar la página', 'error');
        }
    } finally {
        hideLoading();
    }
}

function updateUI(user) {
    const nav = document.querySelector('header .desktop-nav');
    const mobileNav = document.querySelector('.mobile-nav');
    const settings = document.querySelector('.settings-menu');
    
    if (user) {
        // Mostrar navegaciones
        if (nav) nav.style.display = 'flex';
        if (mobileNav) mobileNav.style.display = 'flex';
        if (settings) settings.style.display = 'flex';

        // Manejar botón de logout
        let logoutBtn = document.getElementById('logout-btn');
        if (!logoutBtn) {
            logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.textContent = 'Cerrar Sesión';
            logoutBtn.className = 'btn btn-danger';
            if (isMobile()) {
                logoutBtn.style.fontSize = '0.85rem';
                logoutBtn.style.padding = '0.5rem 0.875rem';
            }
            settings.appendChild(logoutBtn);
        }
        logoutBtn.onclick = async () => {
            if (confirm('¿Cerrar sesión?')) {
                try {
                    await handleLogout();
                    if (isMobile() && window.MobileUtils) {
                        window.MobileUtils.showMobileToast('Sesión cerrada correctamente', 'info');
                    }
                } catch (error) {
                    console.error('Error al cerrar sesión:', error);
                    if (isMobile() && window.MobileUtils) {
                        window.MobileUtils.showMobileToast('Error al cerrar sesión', 'error');
                    }
                }
            }
        };

        updateActiveNavLinks();

    } else {
        // Ocultar navegaciones
        if (nav) nav.style.display = 'none';
        if (mobileNav) mobileNav.style.display = 'none';
        if (settings) settings.style.display = 'none';
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.remove();
    }
}

function updateActiveNavLinks() {
    let currentPath = window.location.hash.slice(1);
    if (currentPath.startsWith('/')) {
        currentPath = currentPath.slice(1);
    }
    
    // Actualizar navegación desktop
    document.querySelectorAll('.desktop-nav a').forEach(a => {
        let linkPath = a.getAttribute('href').slice(1);
        if (linkPath.startsWith('/')) {
            linkPath = linkPath.slice(1);
        }
        
        if (linkPath === '' && (currentPath === '' || currentPath === '/')) {
            a.classList.add('active');
        } else if (linkPath !== '' && linkPath === currentPath) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });
}

function updateMobileNavigation() {
    if (!isMobile()) return;
    
    const currentPath = window.location.hash.slice(1);
    const normalizedPath = currentPath.startsWith('/') ? currentPath.slice(1) : currentPath;
    
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.classList.remove('active');
        
        const href = link.getAttribute('href').slice(1);
        const linkPath = href.startsWith('/') ? href.slice(1) : href;
        
        if (linkPath === '' && (normalizedPath === '' || normalizedPath === '/')) {
            link.classList.add('active');
        } else if (linkPath !== '' && linkPath === normalizedPath) {
            link.classList.add('active');
        }
    });
}

// Event Listeners
window.addEventListener('hashchange', router);

// Optimizaciones adicionales para móviles
window.addEventListener('DOMContentLoaded', () => {
    // Prevenir zoom en inputs (iOS)
    if (isMobile()) {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
    }
    
    // Manejar cambios de orientación
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            updateMobileNavigation();
            
            // Ajustar viewport después del cambio de orientación
            const modal = document.querySelector('.modal-container');
            if (modal && modal.style.display !== 'none') {
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.style.maxHeight = '85vh';
                }
            }
        }, 500);
    });
    
    // Optimizar rendimiento en dispositivos móviles
    if (isMobile()) {
        // Reducir la frecuencia de eventos de scroll
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            scrollTimeout = setTimeout(() => {
                // Ocultar navegación móvil al hacer scroll hacia abajo
                const mobileNav = document.querySelector('.mobile-nav');
                if (mobileNav && window.scrollY > 100) {
                    mobileNav.style.transform = 'translateY(100%)';
                } else if (mobileNav) {
                    mobileNav.style.transform = 'translateY(0)';
                }
            }, 100);
        }, { passive: true });
        
        // Agregar clase CSS para transiciones suaves
        const mobileNav = document.querySelector('.mobile-nav');
        if (mobileNav) {
            mobileNav.style.transition = 'transform 0.3s ease';
        }
    }
    
    // Mejorar accesibilidad
    setupAccessibilityFeatures();
});

// Funciones de utilidad para móviles
function setupAccessibilityFeatures() {
    // Mejorar contraste en modo oscuro
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.setAttribute('aria-label', 'Cambiar tema');
    }
    
    // Agregar etiquetas ARIA a elementos importantes
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    mobileNavLinks.forEach(link => {
        const text = link.querySelector('span:last-child').textContent;
        link.setAttribute('aria-label', `Ir a ${text}`);
    });
    
    // Mejorar focus para navegación por teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-navigation');
    });
}

// Funciones globales mejoradas para móviles
window.showModal = function(title, content) {
    const modalContainer = document.getElementById('modal-container');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `<h2>${title}</h2>` + content;
    modalContainer.style.display = 'flex';
    
    // Prevenir scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
    
    const closeBtn = modalContainer.querySelector('.modal-close-btn');
    closeBtn.onclick = () => hideModal();
    
    // Mejorar accesibilidad del modal
    const modal = modalContainer.querySelector('.modal-content');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-title');
    
    // Focus trap para accesibilidad
    const focusableElements = modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusableElements.length > 0) {
        focusableElements[0].focus();
    }
    
    // Cerrar con ESC
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            hideModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
};

window.hideModal = function() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.style.display = 'none';
    modalContainer.querySelector('#modal-body').innerHTML = '';
    
    // Restaurar scroll del body
    document.body.style.overflow = '';
    
    // Vibración sutil al cerrar en móviles
    if (isMobile() && 'vibrate' in navigator) {
        navigator.vibrate(25);
    }
};

// Utilidades adicionales para componentes móviles
window.formatCurrencyMobile = function(amount, currency = 'PEN') {
    if (isMobile()) {
        return window.MobileUtils ? 
            window.MobileUtils.formatCurrencyForMobile(amount, currency) :
            new Intl.NumberFormat('es-PE', { 
                style: 'currency', 
                currency,
                minimumFractionDigits: 0 
            }).format(amount);
    }
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(amount);
};

window.showToast = function(message, type = 'info', duration = 3000) {
    if (isMobile() && window.MobileUtils) {
        window.MobileUtils.showMobileToast(message, type, duration);
    } else {
        // Toast para desktop (implementación existente)
        const toastContainer = document.getElementById('toast-container') || createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toastContainer.contains(toast)) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
};

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Exportar funciones útiles
export { router, updateMobileNavigation, showLoading, hideLoading };