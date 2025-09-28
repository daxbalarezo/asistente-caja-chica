import { db } from '../db.js';
import { showModal, hideModal, createTable, formatCurrency, formatDateWithTimezone } from './components.js';

const TABLE_NAME = 'desembolsos';

export async function renderDesembolsos(container) {
    try {
        const { data: empresas, error } = await db.from('empresas').select('id, nombre');
        if (error) console.error("Error cargando empresas para el filtro:", error);

        container.innerHTML = `
            <div class="page-header">
                <h2>Registro de Desembolsos</h2>
                <button id="add-desembolso-btn" class="btn btn-primary">➕ Nuevo Desembolso</button>
            </div>
            <div class="filters card">
                <select id="empresa-filter">
                    <option value="">Todas las empresas</option>
                    ${empresas ? empresas.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('') : ''}
                </select>
                <input type="date" id="start-date-filter">
                <input type="date" id="end-date-filter">
                <button id="apply-filters" class="btn btn-secondary">Filtrar</button>
            </div>
            <div id="desembolsos-list" class="card"></div>
        `;

        await new Promise(resolve => setTimeout(resolve, 0));

        await loadDesembolsosTable();

        const addButton = document.getElementById('add-desembolso-btn');
        const applyFiltersButton = document.getElementById('apply-filters');
        
        if (addButton) {
            addButton.addEventListener('click', () => showDesembolsoForm());
        } else {
            console.warn('Botón add-desembolso-btn no encontrado');
        }
        
        if (applyFiltersButton) {
            applyFiltersButton.addEventListener('click', loadDesembolsosTable);
        } else {
            console.warn('Botón apply-filters no encontrado');
        }

    } catch (error) {
        console.error("Error en renderDesembolsos:", error);
        container.innerHTML = `<p class="error">Error al cargar la página de desembolsos</p>`;
    }
}

async function loadDesembolsosTable() {
    const listContainer = document.getElementById('desembolsos-list');
    if (!listContainer) {
        console.error('Contenedor desembolsos-list no encontrado');
        return;
    }

    listContainer.innerHTML = 'Cargando...';

    try {
        let query = db.from(TABLE_NAME).select(`
            *,
            empresas ( nombre )
        `).order('fecha', { ascending: false });

        const empresaFilter = document.getElementById('empresa-filter');
        const startDateFilter = document.getElementById('start-date-filter');
        const endDateFilter = document.getElementById('end-date-filter');

        if (empresaFilter && empresaFilter.value) query = query.eq('"empresaId"', empresaFilter.value);
        if (startDateFilter && startDateFilter.value) query = query.gte('fecha', startDateFilter.value);
        if (endDateFilter && endDateFilter.value) query = query.lte('fecha', endDateFilter.value);
        
        const { data: desembolsos, error } = await query;

        if (error) {
            console.error("Error al cargar desembolsos:", error);
            listContainer.innerHTML = "<p class='error'>Error al cargar desembolsos.</p>";
            return;
        }

        const headers = ['Fecha', 'Empresa', 'N° Req.', 'Responsable', 'Monto', 'Comprobante', 'Acciones'];
        const dataRows = desembolsos.map(d => [
            formatDateWithTimezone(d.fecha),
            d.empresas?.nombre || 'N/A',
            d.numero_requerimiento || '',
            d.responsable,
            formatCurrency(d.monto, d.moneda),
            (d.imagen_data_url || d.imagenDataUrl || d.imagen)
                ? `<button class="btn btn-secondary btn-sm download-btn" data-url="${d.imagen_data_url || d.imagenDataUrl || d.imagen}" data-id="${d.id}">📥 Descargar</button>` 
                : 'No hay',
            `<div class="actions">
                <button class="btn btn-secondary btn-sm edit-btn" data-id="${d.id}">✏️</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${d.id}">🗑️</button>
            </div>`
        ]);

        listContainer.innerHTML = createTable(headers, dataRows);

        listContainer.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.currentTarget.dataset.url;
                const id = e.currentTarget.dataset.id;
                downloadImage(url, id);
            });
        });

        listContainer.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const { data: desembolso } = await db.from(TABLE_NAME).select('*').eq('id', id).single();
                showDesembolsoForm(desembolso);
            });
        });

        listContainer.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('¿Eliminar este desembolso?')) {
                    await db.from(TABLE_NAME).delete().eq('id', e.currentTarget.dataset.id);
                    await loadDesembolsosTable();
                }
            });
        });

    } catch (error) {
        console.error("Error en loadDesembolsosTable:", error);
        listContainer.innerHTML = "<p class='error'>Error al cargar los datos.</p>";
    }
}

function getFileExtensionFromDataUrl(dataUrl) {
    const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*;/);
    if (match && match[1]) {
        const mimeType = match[1];
        const mimeToExt = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'application/pdf': 'pdf',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'application/vnd.ms-excel': 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
        };
        
        return mimeToExt[mimeType] || 'bin';
    }
    return 'png';
}

function downloadImage(dataUrl, id) {
    try {
        const extension = getFileExtensionFromDataUrl(dataUrl);
        const filename = `desembolso-${id}.${extension}`;
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error al descargar imagen:', error);
        alert('Error al descargar el comprobante');
    }
}

async function showDesembolsoForm(desembolso = null) {
    const isEditing = !!desembolso;
    const { data: empresas } = await db.from('empresas').select('id, nombre');
    
    const formContent = `
        <form id="desembolso-form">
            <input type="hidden" name="id" value="${desembolso?.id || ''}">
            <div class="form-grid">
                <div class="form-group">
                    <label for="fecha">Fecha</label>
                    <input type="date" name="fecha" value="${desembolso?.fecha || new Date().toISOString().slice(0,10)}" required>
                </div>
                <div class="form-group">
                    <label for="empresaId">Empresa</label>
                    <select name="empresaId" required>
                        ${empresas.map(e => `<option value="${e.id}" ${desembolso?.empresaId === e.id ? 'selected' : ''}>${e.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="numero_requerimiento">N° Requerimiento</label>
                    <input type="text" name="numero_requerimiento" value="${desembolso?.numero_requerimiento || ''}">
                </div>
                <div class="form-group">
                    <label for="responsable">Responsable</label>
                    <input type="text" name="responsable" value="${desembolso?.responsable || ''}" required>
                </div>
                <div class="form-group">
                    <label for="monto">Monto</label>
                    <input type="number" name="monto" step="0.01" min="0.01" value="${desembolso?.monto || ''}" required>
                </div>
                <div class="form-group">
                    <label for="medioPago">Medio de Pago</label>
                    <select name="medioPago">
                        <option value="efectivo" ${desembolso?.medioPago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                        <option value="transferencia" ${desembolso?.medioPago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                        <option value="yape" ${desembolso?.medioPago === 'yape' ? 'selected' : ''}>Yape</option>
                        <option value="otro" ${desembolso?.medioPago === 'otro' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="descripcion">Descripción</label>
                    <textarea name="descripcion">${desembolso?.descripcion || ''}</textarea>
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="imagen">Comprobante (Opcional)</label>
                    <input type="file" id="imagen" name="imagen" accept="image/*,application/pdf">
                    ${desembolso?.imagen_data_url || desembolso?.imagenDataUrl ? '<p style="color: green;">✅ Ya hay un comprobante cargado</p>' : ''}
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">${isEditing ? 'Actualizar' : 'Guardar'}</button>
            </div>
        </form>
    `;
    showModal(isEditing ? 'Editar Desembolso' : 'Nuevo Desembolso', formContent);

    document.getElementById('desembolso-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        delete data.imagen;
        data.monto = parseFloat(data.monto);

        const fileInput = document.getElementById('imagen');
        const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });

        try {
            if (fileInput.files.length > 0) {
                data.imagen_data_url = await readFileAsDataURL(fileInput.files[0]);
            } else if (desembolso && (desembolso.imagen_data_url || desembolso.imagenDataUrl)) {
                data.imagen_data_url = desembolso.imagen_data_url || desembolso.imagenDataUrl;
            }

            if (data.id) {
                const id = data.id;
                delete data.id;
                await db.from(TABLE_NAME).update(data).eq('id', id);
            } else {
                delete data.id;
                await db.from(TABLE_NAME).insert([data]);
            }
            hideModal();
            await loadDesembolsosTable();
        } catch (error) {
            console.error("Error al guardar desembolso:", error);
            alert("Error al guardar el desembolso.");
        }
    });
}