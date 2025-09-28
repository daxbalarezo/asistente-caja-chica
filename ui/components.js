// --- Componentes de Formulario y UI Reutilizables ---

export function showModal(title, content) {
    const modalContainer = document.getElementById('modal-container');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `<h2>${title}</h2>` + content;
    modalContainer.style.display = 'flex';

    const closeBtn = modalContainer.querySelector('.modal-close-btn');
    closeBtn.onclick = () => hideModal();

    // El código que cerraba el modal al hacer clic afuera ha sido eliminado.
}

export function hideModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.style.display = 'none';
    modalContainer.querySelector('#modal-body').innerHTML = '';
}

export function createTable(headers, dataRows) {
    const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
    const bodyHtml = dataRows.length > 0
        ? dataRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${headers.length}" style="text-align:center;">No hay datos para mostrar.</td></tr>`;

    return `
        <div class="table-container">
            <table>
                <thead>
                    <tr>${headerHtml}</tr>
                </thead>
                <tbody>
                    ${bodyHtml}
                </tbody>
            </table>
        </div>
    `;
}

// Utilidad para formatear moneda
export const formatCurrency = (amount, currency = 'PEN') => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(amount);
};
// En ui/components.js, AÑADE ESTA FUNCIÓN AL FINAL

/**
 * Formatea una fecha de tipo string 'YYYY-MM-DD' a una fecha local,
 * corrigiendo el problema de la zona horaria (UTC).
 * @param {string} dateString La fecha en formato 'YYYY-MM-DD'.
 * @returns {string} La fecha formateada en el idioma local (ej. "dd/mm/yyyy").
 */
export function formatDateWithTimezone(dateString) {
    if (!dateString) return '';
    // Creamos un objeto de fecha, que JavaScript interpretará como UTC a la medianoche.
    const date = new Date(dateString);
    // Obtenemos el desfase de la zona horaria del usuario en minutos y lo convertimos a milisegundos.
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    // Creamos una nueva fecha sumando el desfase, lo que efectivamente "corrige" la fecha a la zona horaria local.
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);
    // Devolvemos la fecha formateada en un formato local estándar.
    return correctedDate.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}