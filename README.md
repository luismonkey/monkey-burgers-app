# Monkey Burgers - Web App de Pedidos

Web App liviana, costo $0, tipo Mobile-First para el negocio de hamburguesas "Monkey Burgers".

## 📋 Arquitectura

- **Frontend**: Single Page Application (HTML + Tailwind CSS + JavaScript nativo)
- **Backend & BBDD**: Google Sheets manejado mediante Google Apps Script
- **Notificación**: Redirección automática a WhatsApp Web API

## 🚀 Instrucciones de Despliegue

### Paso 1: Configurar Google Sheets

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una nueva hoja de cálculo
2. Nómbrala como "Monkey Burgers - Pedidos"
3. El script `Code.gs` creará automáticamente las pestañas necesarias, pero puedes crearlas manualmente:

#### Pestaña "Menu"
| id | categoria | nombre | descripcion | precio_usd | disponible | stock_actual | medallones_por_burger |
|----|-----------|--------|-------------|------------|------------|--------------|---------------------|
| 1 | Hamburguesas | Monkey Classic | Carne 150g, queso, lechuga, tomate | 8.00 | TRUE | 20 | 1 |
| 2 | Hamburguesas | Monkey Bacon | Carne 150g, bacon, queso, cebolla caramelizada | 10.00 | TRUE | 15 | 1 |
| 3 | Hamburguesas | Monkey Doble | Doble carne 150g, doble queso, vegetales | 12.00 | TRUE | 10 | 2 |
| 4 | Papas | Papas Fritas | Papas crujientes con salsa | 4.00 | TRUE | 50 | 0 |

**Nuevas columnas de control de stock:**
- `stock_actual`: Cantidad de medallones de carne disponibles
- `medallones_por_burger`: Cuántos medallones usa cada hamburguesa (0 para productos sin carne)

#### Pestaña "MetodosPago"
| id | tipo | banco | cedula_rif | telefono | titular | activo |
|----|------|-------|------------|----------|---------|--------|
| 1 | Pago Móvil | Banesco | V-12345678 | 0414-1234567 | Monkey Burgers C.A. | TRUE |

#### Pestaña "Pedidos"
| FechaHora | Cliente | Telefono | TipoUbicacion | DireccionDelivery | DetallePedido | MontoTotal | MetodoPago | Estado |
|-----------|---------|----------|---------------|-------------------|---------------|------------|------------|--------|
*Esta pestaña se llenará automáticamente con los pedidos*

### Paso 2: Configurar Google Apps Script

1. En tu hoja de cálculo de Google Sheets, ve a **Extensiones** > **Apps Script**
2. Borra cualquier código existente
3. Copia el contenido del archivo `Code.gs` y pégalo en el editor
4. Guarda el proyecto (Ctrl+S o Cmd+S)

### Paso 3: Ejecutar la configuración inicial

1. En el editor de Apps Script, selecciona la función `setupSheets` en el menú desplegable
2. Haz clic en **Ejecutar**
3. Google te pedirá permisos - haz clic en **Revisar permisos**
4. Selecciona tu cuenta de Google
5. Si aparece un mensaje de "Google hasn't verified this app", haz clic en **Advanced** > **Go to Monkey Burgers (unsafe)**
6. Haz clic en **Allow**
7. La función creará las pestañas necesarias con datos de ejemplo

### Paso 4: Desplegar la Web App

1. En el editor de Apps Script, haz clic en **Implementar** > **Nueva implementación**
2. Selecciona el tipo: **Aplicación web**
3. Configura los siguientes campos:
   - **Descripción**: "API Monkey Burgers v1"
   - **Ejecutar como**: "Yo"
   - **Quién tiene acceso**: "Cualquier persona" (importante para que funcione el frontend)
4. Haz clic en **Implementar**
5. Copia la **URL de la aplicación web** que te proporcionan (termina en `/exec`)

### Paso 5: Configurar el Frontend

1. Abre el archivo `index.html`
2. Busca estas líneas al final del archivo (en la sección `<script>`):
```javascript
const SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
const WHATSAPP_NUMBER = 'YOUR_WHATSAPP_NUMBER_HERE';
```
3. Reemplaza `YOUR_GOOGLE_APPS_SCRIPT_URL_HERE` con la URL que copiaste en el Paso 4
4. Reemplaza `YOUR_WHATSAPP_NUMBER_HERE` con tu número de WhatsApp (formato: 584123456789 sin el +)
5. Guarda el archivo

### Paso 6: Desplegar el Frontend

#### Opción A: GitHub Pages (Recomendado)

1. Crea un repositorio en GitHub
2. Sube el archivo `index.html` al repositorio
3. Ve a **Settings** > **Pages**
4. En "Source", selecciona la rama `main` y la carpeta `/ (root)`
5. Haz clic en **Save**
6. Tu sitio estará disponible en `https://tu-usuario.github.io/tu-repositorio`

#### Opción B: Vercel

1. Instala Vercel CLI: `npm i -g vercel`
2. En la carpeta del proyecto, ejecuta: `vercel`
3. Sigue las instrucciones en pantalla
4. Tu sitio estará disponible en la URL que Vercel te proporcione

#### Opción C: Netlify Drop

1. Ve a [app.netlify.com/drop](https://app.netlify.com/drop)
2. Arrastra la carpeta del proyecto al navegador
3. Tu sitio estará disponible instantáneamente

### Paso 7: Probar la Aplicación

1. Abre la URL de tu frontend
2. Verifica que el menú se carga correctamente
3. Agrega productos al carrito
4. Completa el formulario de checkout
5. Envía el pedido
6. Verifica que:
   - El pedido se guarda en la pestaña "Pedidos" de Google Sheets
   - Se abre WhatsApp con el mensaje formateado

## 📱 Personalización

### Cambiar Colores

En el archivo `index.html`, busca la configuración de Tailwind:

```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                monkey: {
                    primary: '#FF6B35',    // Color principal (naranja)
                    secondary: '#F7C59F',  // Color secundario (beige)
                    dark: '#2D2D2D',        // Fondo oscuro
                    darker: '#1A1A1A',      // Fondo más oscuro
                    accent: '#4ECDC4'       // Color de acento (turquesa)
                }
            }
        }
    }
}
```

### Agregar más productos

En Google Sheets, agrega filas a la pestaña "Menu":
- `disponible = TRUE` para mostrar el producto
- `disponible = FALSE` para ocultarlo temporalmente
- `stock_actual`: Cantidad de medallones disponibles
- `medallones_por_burger`: Cuántos medallones usa cada producto (0 para productos sin carne)

### Configurar métodos de pago adicionales

En la pestaña "MetodosPago", agrega más filas con diferentes cuentas bancarias.

## 📊 Control de Stock

El sistema incluye control automático de inventario basado en medallones de carne.

### Cómo funciona:

1. **Configuración inicial**: En la pestaña "Menu", configura:
   - `stock_actual`: Cantidad de medallones de carne disponibles
   - `medallones_por_burger`: Cuántos medallones usa cada hamburguesa (0 para papas/bebidas)

2. **Validación en el frontend**:
   - Los productos muestran el stock disponible
   - Indicador "¡POCO STOCK!" cuando quedan 5 o menos unidades
   - Productos agotados se muestran con etiqueta "AGOTADO" y botón deshabilitado
   - El sistema impide agregar más productos de los que hay en stock

3. **Actualización automática**:
   - Al confirmar un pedido, el sistema resta automáticamente los medallones usados
   - Si no hay suficiente stock, el pedido es rechazado con mensaje de error
   - El stock se actualiza en tiempo real en Google Sheets

### Ejemplo de configuración:

| Producto | Medallones por burger | Stock inicial | Max unidades |
|----------|---------------------|--------------|--------------|
| Monkey Classic | 1 | 20 | 20 |
| Monkey Bacon | 1 | 15 | 15 |
| Monkey Doble | 2 | 10 | 5 |
| Papas Fritas | 0 | 50 | ∞ |

### Reponer stock:

Simplemente actualiza el valor de `stock_actual` en Google Sheets. El frontend reflejará los cambios automáticamente al recargar la página.

## 🔧 Solución de Problemas

### Error CORS al conectar con Google Apps Script

Si recibes errores de CORS:
1. Asegúrate de que la Web App esté configurada como "Cualquier persona" puede acceder
2. Vuelve a desplegar la Web App después de cambios en el código
3. El frontend usa `mode: 'no-cors'` para evitar problemas de CORS

### El menú no carga

1. Verifica que la URL del script en `index.html` sea correcta
2. Revisa que la pestaña "Menu" exista en Google Sheets
3. Verifica que los productos tengan `disponible = TRUE`

### WhatsApp no se abre

1. Verifica que el número de WhatsApp esté en formato correcto (584123456789)
2. Asegúrate de no incluir el símbolo `+` en el número

## 📊 Estructura de Datos

### Objeto de Pedido (enviado al backend)

```json
{
  "cliente": "Juan Pérez",
  "telefono": "04141234567",
  "tipo_pedido": "mesa",
  "mesa": "5",
  "direccion": "",
  "metodo_pago": "pago-movil",
  "items": [
    {
      "id": 1,
      "nombre": "Monkey Classic",
      "cantidad": 2,
      "precio": 8.00
    }
  ],
  "total": 16.00
}
```

## 💰 Costos

- **Google Sheets**: Gratis
- **Google Apps Script**: Gratis (con límites generosos)
- **GitHub Pages**: Gratis
- **Vercel**: Gratis (plan hobby)
- **Netlify**: Gratis

**Costo total: $0** 💵

## 🎨 Características

- ✅ Diseño Mobile-First responsive
- ✅ Carga dinámica desde Google Sheets
- ✅ Carrito de compras en tiempo real
- ✅ Filtrado por categorías
- ✅ Formulario de checkout completo
- ✅ Integración con WhatsApp
- ✅ Modo oscuro atractivo
- ✅ Animaciones suaves
- ✅ Validación de formularios
- ✅ Datos de demostración para pruebas

## 📞 Soporte

Si encuentras algún problema:
1. Revisa la consola del navegador (F12)
2. Verifica los logs de ejecución en Google Apps Script
3. Asegúrate de que todos los permisos estén configurados correctamente

---

**Desarrollado para Monkey Burgers** 🍔
