// Google Apps Script para Monkey Burgers
// Este script maneja la API para el menú y los pedidos

/**
 * doGet - Maneja las solicitudes GET para obtener datos del menú y métodos de pago
 * @param {Object} e - Event object con parámetros de la solicitud
 * @return {ContentService.TextOutput} - Respuesta JSON
 */
function doGet(e) {
  // Manejar caso cuando e es undefined (ejecución manual desde editor)
  if (!e || !e.parameter) {
    return createJsonOutput({
      success: false,
      message: 'Esta función debe ser llamada como Web App. Usa ?action=getMenu en la URL.'
    });
  }
  
  const action = e.parameter.action;
  
  if (action === 'getMenu') {
    return getMenu();
  } else {
    return createJsonOutput({
      success: false,
      message: 'Acción no válida. Usa ?action=getMenu'
    });
  }
}

/**
 * doPost - Maneja las solicitudes POST para recibir nuevos pedidos
 * @param {Object} e - Event object con datos del POST
 * @return {ContentService.TextOutput} - Respuesta JSON
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    return saveOrder(postData);
  } catch (error) {
    return createJsonOutput({
      success: false,
      message: 'Error al procesar el pedido: ' + error.toString()
    });
  }
}

/**
 * getMenu - Obtiene los datos del menú y métodos de pago
 * @return {ContentService.TextOutput} - JSON con menu y paymentMethods
 */
function getMenu() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Obtener datos de la pestaña Menu
    const menuSheet = ss.getSheetByName('Menu');
    const menuData = getSheetData(menuSheet);
    
    // Obtener datos de la pestaña MetodosPago
    const paymentSheet = ss.getSheetByName('MetodosPago');
    const paymentData = getSheetData(paymentSheet);
    
    return createJsonOutput({
      success: true,
      menu: menuData,
      paymentMethods: paymentData
    });
  } catch (error) {
    return createJsonOutput({
      success: false,
      message: 'Error al obtener el menú: ' + error.toString()
    });
  }
}

/**
 * saveOrder - Guarda un nuevo pedido en la pestaña Pedidos y actualiza stock
 * @param {Object} orderData - Datos del pedido
 * @return {ContentService.TextOutput} - Respuesta JSON
 */
function saveOrder(orderData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName('Pedidos');
    const menuSheet = ss.getSheetByName('Menu');
    
    // Verificar y actualizar stock antes de guardar el pedido
    const stockUpdateResult = updateStock(menuSheet, orderData.items);
    if (!stockUpdateResult.success) {
      return createJsonOutput({
        success: false,
        message: stockUpdateResult.message
      });
    }
    
    // Formatear items del pedido como texto
    const itemsText = orderData.items.map(item => 
      `${item.cantidad}x ${item.nombre} ($${(item.precio * item.cantidad).toFixed(2)})`
    ).join(', ');
    
    // Obtener fecha y hora actual
    const timestamp = new Date();
    
    // Determinar ubicación según el tipo de pedido
    let ubicacion = orderData.tipo_pedido;
    if (orderData.tipo_pedido === 'mesa') {
      ubicacion = 'Mesa ' + orderData.mesa;
    } else if (orderData.tipo_pedido === 'delivery') {
      ubicacion = 'Delivery: ' + orderData.direccion;
    }
    
    // Formatear método de pago
    const metodoPago = orderData.metodo_pago === 'pago-movil' ? 'Pago Móvil' : 'Efectivo';
    
    // Crear nueva fila con los datos del pedido
    const newRow = [
      timestamp,
      orderData.cliente,
      orderData.telefono,
      ubicacion,
      orderData.direccion || '',
      itemsText,
      orderData.total,
      metodoPago,
      'Pendiente'
    ];
    
    // Agregar la fila a la hoja
    ordersSheet.appendRow(newRow);
    
    return createJsonOutput({
      success: true,
      message: 'Pedido guardado exitosamente',
      stockUpdated: stockUpdateResult.updatedItems
    });
  } catch (error) {
    return createJsonOutput({
      success: false,
      message: 'Error al guardar el pedido: ' + error.toString()
    });
  }
}

/**
 * updateStock - Actualiza el stock de unidades después de un pedido
 * @param {Sheet} menuSheet - Hoja de menú
 * @param {Array} items - Items del pedido
 * @return {Object} - Resultado de la actualización
 */
function updateStock(menuSheet, items) {
  try {
    Logger.log('Iniciando updateStock...');
    const data = menuSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    Logger.log('Headers: ' + headers.join(', '));
    
    // Encontrar índices de columnas
    const idIndex = headers.indexOf('id');
    const stockIndex = headers.indexOf('stock_actual');
    
    Logger.log('idIndex: ' + idIndex + ', stockIndex: ' + stockIndex);
    
    // Si la columna de stock no existe, omitir control de stock
    if (stockIndex === -1) {
      Logger.log('Columna stock_actual no encontrada');
      return {
        success: true,
        updatedItems: [],
        message: 'Columna de stock no configurada, pedido guardado sin control de stock'
      };
    }
    
    const updatedItems = [];
    
    // Actualizar stock para cada item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      Logger.log('Procesando item: ' + JSON.stringify(item));
      
      // FIX 1: Comparar convirtiendo ambos valores a String para evitar descalces entre Number y String
      const rowIndex = rows.findIndex(row => String(row[idIndex]) === String(item.id));
      Logger.log('rowIndex encontrado: ' + rowIndex);
      
      if (rowIndex !== -1) {
        // FIX 2: Convertir explícitamente a número para garantizar cálculos correctos
        const currentStock = Number(rows[rowIndex][stockIndex]) || 0;
        const quantityNeeded = Number(item.cantidad) || 0;
        
        Logger.log('Stock actual: ' + currentStock + ', Cantidad necesaria: ' + quantityNeeded);
        
        if (currentStock < quantityNeeded) {
          Logger.log('Stock insuficiente');
          return {
            success: false,
            message: `Stock insuficiente para ${item.nombre}. Disponible: ${currentStock}, Necesario: ${quantityNeeded}`
          };
        }
        
        // Actualizar stock en la hoja
        const newStock = currentStock - quantityNeeded;
        Logger.log('Actualizando stock de ' + currentStock + ' a ' + newStock);
        
        // +2 porque data.slice(1) descarta headers (1) y las filas en Sheets son Base-1 (+1)
        menuSheet.getRange(rowIndex + 2, stockIndex + 1).setValue(newStock);
        Logger.log('Stock actualizado en la hoja');
        
        // Actualizar la matriz local en memoria para evitar incongruencias si el mismo item viene duplicado en el array
        rows[rowIndex][stockIndex] = newStock;

        updatedItems.push({
          id: item.id,
          nombre: item.nombre,
          oldStock: currentStock,
          newStock: newStock,
          quantityUsed: quantityNeeded
        });
      } else {
        Logger.log('No se encontró fila para item id: ' + item.id);
      }
    }
    
    Logger.log('updateStock completado exitosamente. Items actualizados: ' + updatedItems.length);
    return {
      success: true,
      updatedItems: updatedItems
    };
  } catch (error) {
    Logger.log('Error en updateStock: ' + error.toString());
    return {
      success: false,
      message: 'Error al actualizar stock: ' + error.toString()
    };
  }
}

/**
 * getSheetData - Obtiene los datos de una hoja como array de objetos
 * @param {Sheet} sheet - Hoja de Google Sheets
 * @return {Array} - Array de objetos con los datos
 */
function getSheetData(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      // Convertir nombres de columnas a formato camelCase
      const key = header.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      obj[key] = row[index];
    });
    return obj;
  });
}

/**
 * createJsonOutput - Crea una respuesta JSON con headers CORS
 * @param {Object} data - Datos a retornar
 * @return {ContentService.TextOutput} - Respuesta JSON
 */
function createJsonOutput(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  return output;
}

/**
 * setupSheets - Configura las hojas si no existen (función auxiliar)
 * Ejecutar esta función una vez para crear la estructura inicial
 */
function setupSheets() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('Obteniendo spreadsheet...');
    
    // Crear pestaña Menu si no existe
    createMenuSheet(ss);
    
    // Crear pestaña MetodosPago si no existe
    createPaymentSheet(ss);
    
    // Crear pestaña Pedidos si no existe
    createOrdersSheet(ss);
    
    Logger.log('Configuración completada exitosamente');
    return 'Configuración completada';
  } catch (error) {
    Logger.log('Error en setupSheets: ' + error.toString());
    throw error;
  }
}

/**
 * createMenuSheet - Crea la hoja de menú si no existe
 */
function createMenuSheet(ss) {
  let menuSheet = ss.getSheetByName('Menu');
  if (!menuSheet) {
    Logger.log('Creando hoja Menu...');
    menuSheet = ss.insertSheet('Menu');
    
    // Headers con columna de stock (simplificado)
    const headers = [['id', 'categoria', 'nombre', 'descripcion', 'precio_usd', 'disponible', 'stock_actual']];
    menuSheet.getRange(1, 1, 1, 7).setValues(headers);
    
    // Datos de ejemplo en una sola operación
    const data = [
      [1, 'Hamburguesas', 'Monkey Classic', 'Carne 150g, queso, lechuga, tomate', 8.00, true, 20],
      [2, 'Hamburguesas', 'Monkey Bacon', 'Carne 150g, bacon, queso, cebolla caramelizada', 10.00, true, 15],
      [3, 'Hamburguesas', 'Monkey Doble', 'Doble carne 150g, doble queso, vegetales', 12.00, true, 10],
      [4, 'Papas', 'Papas Fritas', 'Papas crujientes con salsa', 4.00, true, 50],
      [5, 'Papas', 'Papas con Queso', 'Papas con queso derretido y bacon', 6.00, true, 30],
      [6, 'Bebidas', 'Refresco', 'Coca-Cola, Pepsi, Sprite', 2.00, true, 100],
      [7, 'Bebidas', 'Jugo Natural', 'Naranja, limón, piña', 3.00, true, 50]
    ];
    menuSheet.getRange(2, 1, data.length, 7).setValues(data);
    Logger.log('Hoja Menu creada con columna de stock');
  } else {
    Logger.log('Hoja Menu ya existe');
  }
}

/**
 * createPaymentSheet - Crea la hoja de métodos de pago si no existe
 */
function createPaymentSheet(ss) {
  let paymentSheet = ss.getSheetByName('MetodosPago');
  if (!paymentSheet) {
    Logger.log('Creando hoja MetodosPago...');
    paymentSheet = ss.insertSheet('MetodosPago');
    
    // Headers
    const headers = [['id', 'tipo', 'banco', 'cedula_rif', 'telefono', 'titular', 'activo']];
    paymentSheet.getRange(1, 1, 1, 7).setValues(headers);
    
    // Datos de ejemplo
    const data = [[1, 'Pago Móvil', 'Banesco', 'V-12345678', '0414-1234567', 'Monkey Burgers C.A.', true]];
    paymentSheet.getRange(2, 1, 1, 7).setValues(data);
    Logger.log('Hoja MetodosPago creada');
  } else {
    Logger.log('Hoja MetodosPago ya existe');
  }
}

/**
 * createOrdersSheet - Crea la hoja de pedidos si no existe
 */
function createOrdersSheet(ss) {
  let ordersSheet = ss.getSheetByName('Pedidos');
  if (!ordersSheet) {
    Logger.log('Creando hoja Pedidos...');
    ordersSheet = ss.insertSheet('Pedidos');
    
    // Headers
    const headers = [['FechaHora', 'Cliente', 'Telefono', 'TipoUbicacion', 'DireccionDelivery', 'DetallePedido', 'MontoTotal', 'MetodoPago', 'Estado']];
    ordersSheet.getRange(1, 1, 1, 9).setValues(headers);
    Logger.log('Hoja Pedidos creada');
  } else {
    Logger.log('Hoja Pedidos ya existe');
  }
}
