export function showModal(title, content) {
    const modalContainer = document.getElementById('modal-container');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `<h2>${title}</h2>` + content;
    modalContainer.style.display = 'flex';

    const closeBtn = modalContainer.querySelector('.modal-close-btn');
    closeBtn.onclick = () => hideModal();
}

export function hideModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.style.display = 'none';
    modalContainer.querySelector('#modal-body').innerHTML = '';
}

export function createTable(headers, dataRows) {
    const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
    // La modificación clave está en la siguiente línea para añadir "data-label"
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

export const formatCurrency = (amount, currency = 'PEN') => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(amount);
};