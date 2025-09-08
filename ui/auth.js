// En ui/auth.js, reemplaza solo la función renderAuth

export function renderAuth(container) {
    container.innerHTML = `
        <div class="auth-container card">
            <h2>Iniciar Sesión / Registrarse</h2>
            <p>Introduce tu email y contraseña para acceder.</p>
            <form id="auth-form">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="password">Contraseña</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <div id="auth-error" style="color:red; margin-bottom:1rem; min-height: 1.2em;"></div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Iniciar Sesión</button>
                    <button type="button" id="register-btn" class="btn btn-secondary">Registrarse</button>
                </div>
            </form>
        </div>
        <style>
            .auth-container { max-width: 400px; margin: 3rem auto; }
        </style>
    `;

    const form = document.getElementById('auth-form');
    const registerBtn = document.getElementById('register-btn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('auth-error');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.textContent = '';
        
        // Hacemos el llamado a Supabase
        const { data, error } = await db.auth.signInWithPassword({
            email: emailInput.value,
            password: passwordInput.value,
        });

        // --- PUNTO DE PAUSA ---
        // El navegador se detendrá aquí para que podamos inspeccionar
        debugger; 

        if (error) {
            errorDiv.textContent = 'Email o contraseña incorrectos.';
            console.error('Error de inicio de sesión:', error.message);
        }
        // ... el resto del código ...
    });

    // ... el resto de la función (botón de registro) se queda igual ...
    registerBtn.addEventListener('click', async () => {
        errorDiv.textContent = '';
        if (confirm('¿Seguro que quieres registrar este nuevo usuario?')) {
            const { error } = await db.auth.signUp({
                email: emailInput.value,
                password: passwordInput.value,
            });
            if (error) {
                errorDiv.textContent = 'Error: ' + error.message;
            } else {
                alert('¡Registro exitoso! Por favor, revisa tu correo para confirmar la cuenta e inicia sesión.');
            }
        }
    });
}