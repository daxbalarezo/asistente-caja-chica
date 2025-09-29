import { db } from '../db.js';
import { showModal, hideModal, createTable, formatCurrency, formatDateWithTimezone } from './components.js';

const TABLE_NAME = 'rendiciones';

export async function renderRendiciones(container) {
    try {
        const { data: empresas, error } = await db.from('empresas').select('id, nombre');
        if (error) console.error("Error cargando empresas para el filtro:", error);

        container.innerHTML = `
            <div class="page-header">
                <h2>Registro de Rendiciones</h2>
                <button id="add-rendicion-btn" class="btn btn-primary">➕ Nueva Rendición</button>
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
            <div id="rendiciones-list" class="card"></div>
        `;

        await new Promise(resolve => setTimeout(resolve, 0));

        await loadRendicionesTable();

        const addButton = document.getElementById('add-rendicion-btn');
        const applyFiltersButton = document.getElementById('apply-filters');
        
        if (addButton) {
            addButton.addEventListener('click', () => showRendicionForm());
        } else {
            console.warn('Botón add-rendicion-btn no encontrado');
        }
        
        if (applyFiltersButton) {
            applyFiltersButton.addEventListener('click', loadRendicionesTable);
        } else {
            console.warn('Botón apply-filters no encontrado');
        }

    } catch (error) {
        console.error("Error en renderRendiciones:", error);
        container.innerHTML = `<p class="error">Error al cargar la página de rendiciones</p>`;
    }
}

async function loadRendicionesTable() {
    const listContainer = document.getElementById('rendiciones-list');
    if (!listContainer) {
        console.error('Contenedor rendiciones-list no encontrado');
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
        
        const { data: rendiciones, error } = await query;

        if (error) {
            console.error("Error al cargar rendiciones:", error);
            listContainer.innerHTML = "<p class='error'>Error al cargar rendiciones.</p>";
            return;
        }

        const headers = ['Fecha', 'Empresa', 'N° Req.', 'Proveedor', 'Descripción', 'Documento', 'Monto', 'Comprobante', 'Acciones'];
        const dataRows = rendiciones.map(r => [
            formatDateWithTimezone(r.fecha),
            r.empresas?.nombre || 'N/A',
            r.numero_requerimiento || '',
            r.proveedor,
            r.descripcion || '',
            r.documento && r.documento.tipo ? `${r.documento.tipo.toUpperCase()} ${r.documento.numero}` : '',
            formatCurrency(r.monto),
            r.imagenDataUrl
                ? `<button class="btn btn-secondary btn-sm download-btn" data-url="${r.imagenDataUrl}" data-id="${r.id}">📥 Descargar</button>` 
                : 'No hay',
            `<div class="actions">
                <button class="btn btn-secondary btn-sm edit-btn" data-id="${r.id}">✏️</button>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${r.id}">🗑️</button>
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
                const { data: rendicion } = await db.from(TABLE_NAME).select('*').eq('id', id).single();
                showRendicionForm(rendicion);
            });
        });

        listContainer.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('¿Eliminar esta rendición?')) {
                    await db.from(TABLE_NAME).delete().eq('id', e.currentTarget.dataset.id);
                    await loadRendicionesTable();
                }
            });
        });

    } catch (error) {
        console.error("Error en loadRendicionesTable:", error);
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
        const filename = `rendicion-${id}.${extension}`;
        
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

async function showRendicionForm(rendicion = null) {
    const isEditing = !!rendicion;
    const { data: empresas } = await db.from('empresas').select('id, nombre');
    
    const formContent = `
        <form id="rendicion-form">
            <input type="hidden" name="id" value="${rendicion?.id || ''}">

            <div class="search-block card">
                <label for="search-req-input">Buscar por N° de Requerimiento</label>
                <div class="search-input-group">
                    <input type="text" id="search-req-input" placeholder="Ej: 001-65">
                    <button type="button" id="search-req-btn" class="btn btn-secondary btn-sm">Buscar</button>
                </div>
                <div id="search-result" class="search-result"></div>
            </div>

            <div class="form-grid">
                <div class="form-group">
                    <label for="fecha">Fecha</label>
                    <input type="date" name="fecha" value="${rendicion?.fecha || new Date().toISOString().slice(0,10)}" required>
                </div>
                <div class="form-group">
                    <label for="empresaId">Empresa</label>
                    <select name="empresaId" required>
                        ${empresas.map(e => `<option value="${e.id}" ${rendicion?.empresaId === e.id ? 'selected' : ''}>${e.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="numero_requerimiento">N° Requerimiento</label>
                    <input type="text" name="numero_requerimiento" value="${rendicion?.numero_requerimiento || ''}">
                </div>
                <div class="form-group">
                    <label for="proveedor">Proveedor</label>
                    <input type="text" name="proveedor" value="${rendicion?.proveedor || ''}" required>
                </div>
                 <div class="form-group">
                    <label for="ruc_proveedor">RUC Proveedor</label>
                    <input type="text" name="ruc_proveedor" value="${rendicion?.ruc_proveedor || ''}" pattern="[0-9]{11}" title="El RUC debe contener 11 dígitos.">
                </div>
                <div class="form-group">
                    <label for="documento_tipo">Tipo Documento</label>
                    <select name="documento_tipo">
                        <option value="boleta" ${rendicion?.documento?.tipo === 'boleta' ? 'selected' : ''}>Boleta</option>
                        <option value="factura" ${rendicion?.documento?.tipo === 'factura' ? 'selected' : ''}>Factura</option>
                        <option value="recibo" ${rendicion?.documento?.tipo === 'recibo' ? 'selected' : ''}>Recibo</option>
                        <option value="otro" ${rendicion?.documento?.tipo === 'otro' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="documento_numero">N° Documento</label>
                    <input type="text" name="documento_numero" value="${rendicion?.documento?.numero || ''}" required>
                </div>
                <div class="form-group">
                    <label for="monto">Monto</label>
                    <input type="number" name="monto" step="0.01" min="0.01" value="${rendicion?.monto || ''}" required>
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="descripcion">Descripción</label>
                    <textarea name="descripcion">${rendicion?.descripcion || ''}</textarea>
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="imagen">Comprobante (Opcional)</label>
                    <input type="file" id="imagen" name="imagen" accept="image/*,application/pdf">
                    ${rendicion?.imagenDataUrl ? '<p style="color: green;">✅ Ya hay un comprobante cargado</p>' : ''}
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">${isEditing ? 'Actualizar' : 'Guardar'}</button>
            </div>
        </form>
    `;
    showModal(isEditing ? 'Editar Rendición' : 'Nueva Rendición', formContent);
    
    const searchBtn = document.getElementById('search-req-btn');
    const searchInput = document.getElementById('search-req-input');
    const searchResultDiv = document.getElementById('search-result');
    const form = document.getElementById('rendicion-form');

    searchBtn.addEventListener('click', async () => {
        const reqNumber = searchInput.value.trim();
        if (!reqNumber) {
            alert('Por favor, ingrese un número de requerimiento para buscar.');
            return;
        }

        searchResultDiv.textContent = 'Buscando...';

        const { data: desembolso, error } = await db
            .from('desembolsos')
            .select('*')
            .eq('numero_requerimiento', reqNumber)
            .single();

        if (error || !desembolso) {
            console.error('Error en la búsqueda o no se encontró:', error);
            searchResultDiv.textContent = 'No se encontró ningún desembolso con ese N° Req.';
            searchResultDiv.style.color = 'var(--danger-color)';
            return;
        }

        searchResultDiv.textContent = `Desembolso encontrado: ${desembolso.descripcion}`;
        searchResultDiv.style.color = 'var(--success-color)';
        
        form.elements.numero_requerimiento.value = desembolso.numero_requerimiento;
        form.elements.empresaId.value = desembolso.empresaId;
        form.elements.proveedor.value = desembolso.responsable;
        form.elements.monto.value = desembolso.monto;
    });

    document.getElementById('rendicion-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const fileInput = document.getElementById('imagen');
        
        const data = Object.fromEntries(formData.entries());

        data.monto = parseFloat(data.monto);
        data.documento = {
            tipo: data.documento_tipo,
            numero: data.documento_numero
        };
        delete data.documento_tipo;
        delete data.documento_numero;
        delete data.imagen;
        
        const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });

        try {
            if (fileInput.files.length > 0) {
                data.imagenDataUrl = await readFileAsDataURL(fileInput.files[0]);
            } else if (rendicion && rendicion.imagenDataUrl) {
                data.imagenDataUrl = rendicion.imagenDataUrl;
            }

            if (data.id) {
                const id = data.id;
                delete data.id;
                const { error } = await db.from(TABLE_NAME).update(data).eq('id', id);
                if (error) throw error;
            } else {
                delete data.id;
                const { error } = await db.from(TABLE_NAME).insert([data]);
                if (error) throw error;
            }

            hideModal();
            await loadRendicionesTable();

        } catch (error) {
            console.error("Error al guardar rendición:", error);
            alert("Error al guardar la rendición: " + error.message);
        }
    });
}