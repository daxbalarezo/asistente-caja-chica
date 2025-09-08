// Funciones para crear objetos de datos con valores por defecto y validación básica.

export function createEmpresa(nombre) {
    if (!nombre || nombre.trim() === '') throw new Error('El nombre de la empresa es obligatorio.');
    return {
        id: crypto.randomUUID(),
        nombre: nombre.trim(),
        estado: 'activa',
        createdAt: new Date().toISOString()
    };
}

export function createDesembolso(data) {
    // Validaciones
    if (!data.empresaId || !data.responsable || !data.monto || !data.fecha) {
        throw new Error('Empresa, responsable, monto y fecha son obligatorios.');
    }
    if (parseFloat(data.monto) <= 0) {
        throw new Error('El monto debe ser un número positivo.');
    }

    return {
        id: crypto.randomUUID(),
        empresaId: data.empresaId,
        fecha: data.fecha,
        responsable: data.responsable.trim(),
        monto: parseFloat(data.monto),
        moneda: data.moneda || 'PEN',
        medioPago: data.medioPago || 'efectivo',
        descripcion: data.descripcion?.trim() || '',
        imagenDataUrl: data.imagenDataUrl || null,
        createdAt: new Date().toISOString()
    };
}

export function createRendicion(data) {
    // Validaciones
    if (!data.empresaId || !data.proveedor || !data.monto || !data.fecha || !data.documento?.numero) {
        throw new Error('Empresa, proveedor, documento, monto y fecha son obligatorios.');
    }
    if (parseFloat(data.monto) <= 0) {
        throw new Error('El monto debe ser un número positivo.');
    }

    return {
        id: crypto.randomUUID(),
        empresaId: data.empresaId,
        fecha: data.fecha,
        proveedor: data.proveedor.trim(),
        documento: {
            tipo: data.documento.tipo || 'boleta',
            numero: data.documento.numero.trim()
        },
        monto: parseFloat(data.monto),
        categoria: data.categoria?.trim() || 'Varios',
        desembolsosVinculados: data.desembolsosVinculados || [],
        imagenDataUrl: data.imagenDataUrl || null,
        createdAt: new Date().toISOString()
    };
}