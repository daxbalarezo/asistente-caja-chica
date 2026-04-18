from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import inch
from datetime import datetime
import io
import os

class CotizadorTierras:
    ASESOR = "Daniel Balarezo"
    CELULAR = "936 897 318"
    EMPRESA = "Inmobiliaria GANESHA"
    PROYECTO = "TORRES DE MONACO"

    def __init__(self, logo_path="logo.png"):
        self.logo_path = logo_path if os.path.exists(logo_path) else None
        self.styles = getSampleStyleSheet()

    def _formatear_precio(self, precio):
        try:
            val = float(str(precio).replace(',', ''))
            return f"S/ {val:,.2f}"
        except:
            return f"S/ {precio}"

    def _clean_float(self, valor):
        if not valor: return 0.0
        return float(str(valor).replace(',', ''))

    def _formatear_celular(self, numero):
        if not numero: return ""
        limpio = str(numero).replace(" ", "").strip()
        if len(limpio) == 9 and limpio.isdigit():
            return f"{limpio[:3]} {limpio[3:6]} {limpio[6:]}"
        return numero

    def generar_pdf_buffer(self, datos_cliente, lote, pago_inicial, bono_monto, nombre_bono, cuota_flexible, nombre_asesor=None, celular_asesor=None, proyecto_seleccionado=None, tipo_inmueble="Departamento", es_contado=False, estacionamiento_info=None):
        
        if nombre_asesor: self.ASESOR = nombre_asesor
        if celular_asesor: self.CELULAR = self._formatear_celular(celular_asesor)
        if proyecto_seleccionado: self.PROYECTO = proyecto_seleccionado

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        elementos = []

        elementos.extend(self._crear_encabezado())
        elementos.append(Spacer(1, 0.15*inch))
        elementos.extend(self._crear_info_cliente(datos_cliente))
        elementos.append(Spacer(1, 0.2*inch))

        elementos.extend(self._crear_tabla_lote_individual(lote, tipo_inmueble))
        elementos.append(Spacer(1, 0.1*inch))
        
        if es_contado:
            elementos.extend(self._crear_resumen_contado(lote, tipo_inmueble, bono_monto, nombre_bono))
            if estacionamiento_info:
                elementos.extend(self._crear_resumen_contado_estacionamiento(estacionamiento_info))
        else:
            elementos.extend(self._crear_tabla_resumen_financiero(lote, pago_inicial, bono_monto, nombre_bono, tipo_inmueble))

            estilo_titulo = ParagraphStyle('Opc', fontSize=12, alignment=TA_CENTER, textColor=colors.HexColor('#1a365d'), spaceBefore=15, spaceAfter=10)
            
            if tipo_inmueble == "Lote":
                elementos.append(Paragraph("<b>PLAN DE PAGOS (CRÉDITO DIRECTO SIN INTERESES)</b>", estilo_titulo))
                elementos.extend(self._crear_plan_lote(lote, pago_inicial, bono_monto))
            else:
                elementos.append(Paragraph("<b>ELIGE TU PLAN DE PAGOS DEL DEPA (COMPARATIVO)</b>", estilo_titulo))
                elementos.extend(self._crear_comparativo_opciones(lote, pago_inicial, bono_monto, cuota_flexible))
                
            if estacionamiento_info:
                elementos.extend(self._crear_tabla_financiamiento_estacionamiento(estacionamiento_info))
                elementos.append(Paragraph("<b>PLAN DE PAGOS DEL ESTACIONAMIENTO</b>", estilo_titulo))
                elementos.extend(self._crear_plan_estacionamiento(estacionamiento_info))

        elementos.extend(self._crear_pie_pagina())
        doc.build(elementos)
        buffer.seek(0)
        return buffer

    def _crear_resumen_contado(self, lote, tipo_inmueble, bono, nombre_bono):
        precio_lista = self._clean_float(lote['precio_lista'])
        descuento = self._clean_float(lote['descuento'])
        saldo_final = precio_lista - descuento - bono
        lbl_inmueble = "DEL LOTE" if tipo_inmueble == "Lote" else "DEL DEPA"
        
        data = [
            [Paragraph(f"<b>RESUMEN DE INVERSIÓN {lbl_inmueble} (MODALIDAD CONTADO)</b>", ParagraphStyle('tfin', fontSize=11, alignment=TA_CENTER, textColor=colors.white)), ''],
            [f'PRECIO DE LISTA', self._formatear_precio(precio_lista)]
        ]
        
        estilos = [
            ('SPAN', (0,0), (1,0)),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#276749')), 
            ('ALIGN', (1,1), (1,-1), 'RIGHT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#2c5282')),
        ]
        
        row_idx = 2
        if descuento > 0: 
            data.append(['(-) DESCUENTO POR PAGO CONTADO', f"- {self._formatear_precio(descuento)}"])
            estilos.extend([('TEXTCOLOR', (0,row_idx), (1,row_idx), colors.red), ('FONT', (0,row_idx), (1,row_idx), 'Helvetica-Bold')])
            row_idx += 1
            
        if bono > 0:
            data.append([f'(-) {nombre_bono}', f"- {self._formatear_precio(bono)}"])
            estilos.extend([('TEXTCOLOR', (0,row_idx), (1,row_idx), colors.red), ('FONT', (0,row_idx), (1,row_idx), 'Helvetica-Bold')])
            row_idx += 1
            
        data.append([f'TOTAL A PAGAR {lbl_inmueble}', self._formatear_precio(saldo_final)])
        estilos.extend([
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#c6f6d5')),
            ('FONT', (0,-1), (-1,-1), 'Helvetica-Bold', 12),
            ('TEXTCOLOR', (1,-1), (1,-1), colors.HexColor('#22543d')), 
        ])
        
        tabla = Table(data, colWidths=[4.5*inch, 2.7*inch])
        tabla.setStyle(TableStyle(estilos))
        return [tabla]

    def _crear_resumen_contado_estacionamiento(self, estac_info):
        data = [
            [Paragraph("<b>RESUMEN DE INVERSIÓN ESTACIONAMIENTO (MODALIDAD CONTADO)</b>", ParagraphStyle('tfin', fontSize=11, alignment=TA_CENTER, textColor=colors.white)), ''],
            [f"ESTACIONAMIENTO N° {estac_info['numero']}", self._formatear_precio(estac_info['precio_contado'])],
            ['TOTAL A PAGAR ESTACIONAMIENTO', self._formatear_precio(estac_info['precio_contado'])]
        ]
        tabla = Table(data, colWidths=[4.5*inch, 2.7*inch])
        estilos = [
            ('SPAN', (0,0), (1,0)),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2b6cb0')),
            ('ALIGN', (1,1), (1,-1), 'RIGHT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#2c5282')),
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#ebf8ff')),
            ('FONT', (0,-1), (-1,-1), 'Helvetica-Bold', 12),
        ]
        tabla.setStyle(TableStyle(estilos))
        return [Spacer(1, 0.15*inch), tabla]

    def _crear_tabla_resumen_financiero(self, lote, pago_inicial, bono, nombre_bono, tipo_inmueble):
        lbl_inmueble = "DEL LOTE" if tipo_inmueble == "Lote" else "DEL DEPA"
        elementos = []
        elementos.append(Table([[Paragraph(f"<b>RESUMEN FINANCIERO {lbl_inmueble}</b>", ParagraphStyle('tfin', fontSize=11, alignment=TA_CENTER, textColor=colors.white))]], colWidths=[7.2*inch], style=TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#2c5282'))])))
        
        precio_lista = self._clean_float(lote['precio_lista'])
        descuento = self._clean_float(lote['descuento'])
        saldo = precio_lista - descuento - bono - pago_inicial
        
        data = [[f'PRECIO DE LISTA', self._formatear_precio(precio_lista)]]
        row_idx = 0
        estilos = [('ALIGN', (1,0), (1,-1), 'RIGHT'), ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#2c5282')), ('FONT', (0,-1), (-1,-1), 'Helvetica-Bold', 10)]
        
        if descuento > 0: 
            data.append(['(-) DESCUENTO ESPECIAL', f"- {self._formatear_precio(descuento)}"])
            row_idx += 1
            estilos.extend([('TEXTCOLOR', (0,row_idx), (1,row_idx), colors.red), ('FONT', (0,row_idx), (1,row_idx), 'Helvetica-Bold')])
            
        if bono > 0: 
            data.append([f'(-) {nombre_bono}', f"- {self._formatear_precio(bono)}"])
            row_idx += 1
            estilos.extend([('TEXTCOLOR', (0,row_idx), (1,row_idx), colors.red), ('FONT', (0,row_idx), (1,row_idx), 'Helvetica-Bold')])
            
        data.append([f'(-) PAGO INICIAL {lbl_inmueble}', f"- {self._formatear_precio(pago_inicial)}"])
        row_idx += 1
        estilos.extend([('TEXTCOLOR', (0,row_idx), (1,row_idx), colors.red), ('FONT', (0,row_idx), (1,row_idx), 'Helvetica-Bold')])
        
        data.append([f'SALDO A FINANCIAR {lbl_inmueble}', self._formatear_precio(saldo)])
        estilos.extend([('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#f0fff4')), ('FONT', (0,-1), (-1,-1), 'Helvetica-Bold', 12), ('TEXTCOLOR', (1,-1), (1,-1), colors.HexColor('#c53030'))])
        
        tabla = Table(data, colWidths=[4.5*inch, 2.7*inch])
        tabla.setStyle(TableStyle(estilos))
        return elementos + [tabla]

    def _crear_tabla_financiamiento_estacionamiento(self, estac_info):
        precio = estac_info['precio_financiado']
        inicial = estac_info['inicial']
        saldo = precio - inicial
        data = [
            [Paragraph("<b>RESUMEN FINANCIERO ESTACIONAMIENTO</b>", ParagraphStyle('tfin', fontSize=11, alignment=TA_CENTER, textColor=colors.white)), ''],
            [f"ESTACIONAMIENTO N° {estac_info['numero']}", self._formatear_precio(precio)],
            ['(-) PAGO INICIAL ESTACIONAMIENTO', f"- {self._formatear_precio(inicial)}"],
            ['SALDO A FINANCIAR ESTACIONAMIENTO', self._formatear_precio(saldo)]
        ]
        tabla = Table(data, colWidths=[4.5*inch, 2.7*inch])
        estilos = [
            ('SPAN', (0,0), (1,0)),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2b6cb0')),
            ('ALIGN', (1,1), (1,-1), 'RIGHT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0,2), (1,2), colors.red),
            ('FONT', (0,2), (1,2), 'Helvetica-Bold'),
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#ebf8ff')),
            ('FONT', (0,-1), (-1,-1), 'Helvetica-Bold', 12),
        ]
        tabla.setStyle(TableStyle(estilos))
        return [Spacer(1, 0.2*inch), tabla]

    def _crear_plan_lote(self, lote, pago_inicial, bono):
        precio_lista = self._clean_float(lote['precio_lista'])
        descuento = self._clean_float(lote['descuento'])
        saldo = precio_lista - descuento - bono - pago_inicial
        cuota_mensual = saldo / 36
        data = [
            ['CONCEPTO LOTE', 'DETALLE'],
            ['PLAZO DE CRÉDITO', '36 MESES (SIN INTERESES)'],
            ['CUOTA MENSUAL FIJA', self._formatear_precio(cuota_mensual)],
            ['TOTAL A FINANCIAR', self._formatear_precio(saldo)]
        ]
        tabla = Table(data, colWidths=[3.5*inch, 3.5*inch])
        estilos = [
            ('GRID', (0,0), (-1,-1), 0.5, colors.gray),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONT', (0,0), (-1,0), 'Helvetica-Bold', 11),
            ('BACKGROUND', (0,2), (-1,2), colors.HexColor('#e6fffa')),
            ('TEXTCOLOR', (1,2), (1,2), colors.HexColor('#2c5282')),
            ('FONT', (1,2), (1,2), 'Helvetica-Bold', 12),
        ]
        tabla.setStyle(TableStyle(estilos))
        return [tabla]

    def _crear_comparativo_opciones(self, lote, pago_inicial, bono, cuota_flexible):
        precio_lista = self._clean_float(lote['precio_lista'])
        descuento = self._clean_float(lote['descuento'])
        saldo = precio_lista - descuento - bono - pago_inicial
        cuota_A = saldo / 36
        saldo_B_final = saldo - (cuota_flexible * 24)
        data = [
            ['CONCEPTO', 'OPCIÓN A: ESTABILIDAD\n(36 Cuotas Iguales)', 'OPCIÓN B: FLEXIBLE\n(24 Meses + Hipotecario)'],
            ['Meses 1 al 24', self._formatear_precio(cuota_A), self._formatear_precio(cuota_flexible)],
            ['Meses 25 al 36', self._formatear_precio(cuota_A), 'TRÁMITE DE CRÉDITO HIPOTECARIO'],
            ['SALDO FINAL', 'S/ 0.00', f"{self._formatear_precio(saldo_B_final)}\n(Aprob. Crédito Hipotecario)"]
        ]
        tabla = Table(data, colWidths=[2.2*inch, 2.5*inch, 2.5*inch])
        estilos = [
            ('GRID', (0,0), (-1,-1), 0.5, colors.gray),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONT', (0,0), (-1,0), 'Helvetica-Bold', 9),
            ('BACKGROUND', (2,1), (2,1), colors.HexColor('#e6fffa')),
            ('FONT', (2,1), (2,1), 'Helvetica-Bold', 11),
            ('TEXTCOLOR', (2,1), (2,1), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (2,3), (2,3), colors.red),
            ('FONT', (2,3), (2,3), 'Helvetica-Bold', 10),
        ]
        tabla.setStyle(TableStyle(estilos))
        return [tabla]

    def _crear_plan_estacionamiento(self, estac_info):
        saldo = estac_info['precio_financiado'] - estac_info['inicial']
        cuota = saldo / 36
        data = [
            ['CONCEPTO ESTACIONAMIENTO', 'DETALLE'],
            ['PLAZO DE CRÉDITO', '36 MESES (SIN INTERESES)'],
            ['CUOTA MENSUAL FIJA', self._formatear_precio(cuota)]
        ]
        tabla = Table(data, colWidths=[3.5*inch, 3.5*inch])
        estilos = [
            ('GRID', (0,0), (-1,-1), 0.5, colors.gray),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2b6cb0')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONT', (0,0), (-1,0), 'Helvetica-Bold', 10),
            ('BACKGROUND', (0,2), (-1,2), colors.HexColor('#ebf8ff')),
            ('TEXTCOLOR', (1,2), (1,2), colors.HexColor('#2c5282')),
            ('FONT', (1,2), (1,2), 'Helvetica-Bold', 11),
        ]
        tabla.setStyle(TableStyle(estilos))
        return [tabla]

    def _crear_encabezado(self):
        elementos = []
        if self.logo_path:
            logo = Image(self.logo_path, width=0.7*inch, height=0.7*inch)
            p1 = Paragraph(f'<b>{self.EMPRESA}</b>', ParagraphStyle('emp', fontSize=15, textColor=colors.HexColor('#1a365d')))
            p2 = Paragraph(f'<b>{self.PROYECTO}</b>', ParagraphStyle('proy', fontSize=13, textColor=colors.HexColor('#d69e2e')))
            p3 = Paragraph(f'Asesor: {self.ASESOR} | Cel: {self.CELULAR}', ParagraphStyle('ases', fontSize=8, textColor=colors.HexColor('#4a5568')))
            tabla = Table([[logo, Table([[p1], [p2], [p3]], colWidths=[6.2*inch])]], colWidths=[0.9*inch, 6.2*inch])
            elementos.append(tabla)
        else:
            elementos.append(Paragraph(f'<b>{self.PROYECTO}</b>', ParagraphStyle('T', fontSize=16, alignment=TA_CENTER, textColor=colors.HexColor('#d69e2e'))))
        elementos.append(Spacer(1, 0.1*inch))
        elementos.append(Table([['']], colWidths=[7.2*inch], style=TableStyle([('LINEABOVE', (0,0), (-1,-1), 1.5, colors.HexColor('#d69e2e'))])))
        return elementos

    def _crear_info_cliente(self, datos):
        info = datos['nombre']
        if 'celular' in datos and datos['celular']:
            cel_bonito = self._formatear_celular(datos['celular'])
            info += f" | Cel: {cel_bonito}"
        data = [['CLIENTE:', info, 'FECHA:', datos.get('fecha', datetime.now().strftime('%d/%m/%Y'))]]
        tabla = Table(data, colWidths=[1*inch, 4*inch, 0.8*inch, 1.4*inch])
        tabla.setStyle(TableStyle([('FONT', (0,0), (-1,-1), 'Helvetica-Bold', 9), ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.gray), ('VALIGN', (0,0), (-1,-1), 'TOP')]))
        return [tabla]

    def _crear_tabla_lote_individual(self, lote, tipo_inmueble):
        etiqueta = "LOTE" if tipo_inmueble == "Lote" else "DEPARTAMENTO"
        titulo = Paragraph(f"<b>{etiqueta}: {lote['numero']}</b> (Área: {lote['area']} m²)", ParagraphStyle('tlote', fontSize=11, textColor=colors.HexColor('#2c5282')))
        elementos = [titulo]
        if 'distribucion' in lote and lote['distribucion'] and tipo_inmueble != "Lote":
            style_dist = ParagraphStyle('dist', fontSize=9, textColor=colors.HexColor('#4a5568'), leftIndent=10)
            elementos.append(Paragraph(f"<i>Distribución: {lote['distribucion']}</i>", style_dist))
        return elementos

    def _crear_pie_pagina(self):
        return [Spacer(1, 0.3*inch), Table([['']], colWidths=[7.2*inch], style=TableStyle([('LINEABOVE', (0,0), (-1,-1), 1, colors.HexColor('#d69e2e'))])), Paragraph(f"Cotización válida por 48 horas. {self.PROYECTO}", ParagraphStyle('pie', fontSize=7, alignment=TA_CENTER, textColor=colors.gray))]