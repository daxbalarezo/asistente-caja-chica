from flask import Flask, render_template, request, send_file
from cotizador import CotizadorTierras
from datetime import datetime
import re

app = Flask(__name__)

ASESORES = {
    "daniel_balarezo": {"nombre": "Daniel Balarezo", "celular": "936 897 318"},
    "alexandra_arroyo": {"nombre": "Alexandra Arroyo", "celular": "945 562 868"},
    "vania_yzquierdo": {"nombre": "Vania Yzquierdo", "celular": "925 667 678"},
    "maritza_olivos": {"nombre": "Maritza Olivos", "celular": "937 354 445"},
    "cecilia_chuman": {"nombre": "Cecilia Chuman", "celular": "939 074 942"},
    "ingrid_ayasta": {"nombre": "Ingrid Ayasta", "celular": "948 629 272"},
    "maribel_orrego": {"nombre": "Maribel Orrego", "celular": "928 823 455"},
    "Ganesha_Solutions": {"nombre": "Ganesha Solutions", "celular": "922 824 225"}
            }

def _limpiar_unidad(texto_raw, proyecto):
    if not texto_raw: return ""
    texto = texto_raw.upper().strip()
    if proyecto == 'torres':
        match = re.match(r"^(\d+)\s*([A-Z])$", texto)
        if match:
            texto = f"{match.group(1)}-{match.group(2)}"
        if not texto.startswith("DPTO") and not texto.startswith("DEPA"):
            texto = f"DPTO {texto}"
    elif proyecto == 'tierras':
        texto = texto.replace("MANZANA", "MZ").replace("MZA", "MZ")
        texto = texto.replace("LOTE", "LT")
    return texto

@app.route('/')
def inicio():
    return render_template('index.html', asesores=ASESORES)

@app.route('/generar', methods=['POST'])
def generar():
    nombre_cliente = request.form.get('nombre', 'Cliente').title()
    celular = request.form.get('celular', '')
    
    asesor_key = request.form.get('asesor', 'daniel_balarezo')
    asesor_info = ASESORES.get(asesor_key, ASESORES["daniel_balarezo"]) 
    asesor_nombre = asesor_info["nombre"]
    asesor_celular = asesor_info["celular"]
    
    proyecto_opcion = request.form.get('proyecto', 'torres')
    
    if proyecto_opcion == 'tierras':
        nombre_proyecto = "TIERRAS DEL SOL"
        tipo_inmueble = "Lote"
        distribucion = "" 
    else:
        nombre_proyecto = "TORRES DE MONACO"
        tipo_inmueble = "Departamento"
        distribucion = "3 Hab, 2 Baños, Sala, Comedor"

    numero_unidad_raw = request.form.get('numero_depa', '000')
    numero_unidad = _limpiar_unidad(numero_unidad_raw, proyecto_opcion)
    
    area_unidad = request.form.get('area', '0.00')
    precio_lista = float(request.form.get('precio_lista', 0))
    descuento_promo = float(request.form.get('descuento', 0))
    
    es_contado = request.form.get('es_contado') == 'on'
    
    incluye_estac = request.form.get('incluye_estac') == 'on'
    num_estac = request.form.get('num_estac', '')
    try:
        inicial_estac = float(request.form.get('inicial_estac', 1000))
    except ValueError:
        inicial_estac = 1000.0

    estacionamiento_info = None
    if incluye_estac and proyecto_opcion == 'torres':
        estacionamiento_info = {
            'numero': num_estac,
            'precio_contado': 18000,
            'precio_financiado': 20000,
            'inicial': inicial_estac
        }
    
    bono_monto = float(request.form.get('bono', 0))
    nombre_bono = request.form.get('nombre_bono', 'BONO')
    pago_inicial = float(request.form.get('inicial', 0))
    cuota_flexible = float(request.form.get('cuota_flex', 1000))

    cliente = {
        'nombre': nombre_cliente,
        'celular': celular,
        'fecha': datetime.now().strftime('%d/%m/%Y')
    }
    
    lote_info = {
        'numero': numero_unidad,
        'area': area_unidad,
        'distribucion': distribucion,
        'precio_lista': precio_lista,
        'descuento': descuento_promo 
    }

    mi_cotizador = CotizadorTierras()
    
    buffer = mi_cotizador.generar_pdf_buffer(
        cliente, 
        lote_info, 
        pago_inicial=pago_inicial, 
        bono_monto=bono_monto,
        nombre_bono=nombre_bono,
        cuota_flexible=cuota_flexible,
        nombre_asesor=asesor_nombre,
        celular_asesor=asesor_celular,
        proyecto_seleccionado=nombre_proyecto,
        tipo_inmueble=tipo_inmueble,
        es_contado=es_contado,
        estacionamiento_info=estacionamiento_info
    )

    nombre_seguro = "".join([c for c in nombre_cliente if c.isalnum() or c==' ']).replace(' ', '_')
    unidad_segura = numero_unidad.replace(' ', '').replace('-', '_').replace('/', '_')
    
    filename = f"Cotizacion_{nombre_proyecto.replace(' ','')}_{nombre_seguro}_{unidad_segura}.pdf"
    
    return send_file(buffer, as_attachment=True, download_name=filename, mimetype='application/pdf')

if __name__ == '__main__':
    app.run(debug=True)