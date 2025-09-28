// --- Componentes de Formulario y UI Reutilizables ---

export function showModal(title, content) {
    const modalContainer = document.getElementById('modal-container');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `<h2>${title}</h2>` + content;
    modalContainer.style.display = 'flex';

    const closeBtn = modalContainer.querySelector('.modal-close-btn');
    closeBtn.onclick = () => hideModal();

    // --- CORRECCIÓN AÑADIDA ---
    // Buscamos el botón de cancelar dentro del contenido del modal y le asignamos la función.
    const cancelBtn = modalContainer.querySelector('.form-actions .btn-secondary');
    if (cancelBtn) {
        cancelBtn.onclick = () => hideModal();
    }
    // --- FIN DE LA CORRECCIÓN ---
}

export function hideModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.style.display = 'none';
    modalContainer.querySelector('#modal-body').innerHTML = '';
}

export function createTable(headers, dataRows) {
    const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
    const bodyHtml = dataRows.length > 0
        ? dataRows.map(row => `<tr>${row.map((cell, index) => `<td data-label="${headers[index]}">${cell}</td>`).join('')}</tr>`).join('')
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

// Función para corregir la zona horaria al mostrar fechas
export function formatDateWithTimezone(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);
    return correctedDate.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}