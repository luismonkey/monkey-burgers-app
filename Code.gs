// ============================================================
// GOOGLE APPS SCRIPT - MONKEY BURGERS
// API para menú, pedidos y control de stock
// ============================================================


// ============================================================
// CONFIGURACIÓN
// ============================================================

const MENU_SHEET_NAME = 'Menu';
const ORDERS_SHEET_NAME = 'Pedidos';
const PAYMENT_SHEET_NAME = 'MetodosPago';
const LOG_SHEET_NAME = 'Logs';


// ============================================================
// GET - OBTENER MENÚ Y MÉTODOS DE PAGO
// ============================================================

function doGet(e) {
  try {

    if (!e || !e.parameter) {
      return createJsonOutput({
        success: false,
        message: 'Esta función debe ser llamada como Web App. Usa ?action=getMenu'
      });
    }

    const action = e.parameter.action;

    if (action === 'getMenu') {
      return getMenu();
    }

    return createJsonOutput({
      success: false,
      message: 'Acción no válida. Usa ?action=getMenu'
    });

  } catch (error) {

    Logger.log('Error en doGet: ' + error.toString());

    return createJsonOutput({
      success: false,
      message: 'Error en GET: ' + error.toString()
    });
  }
}


// ============================================================
// POST - RECIBIR PEDIDO
// ============================================================

function doPost(e) {
  try {

    logToSheet('========== NUEVO PEDIDO ==========');
    Logger.log('========== NUEVO PEDIDO ==========');

    if (!e || !e.postData || !e.postData.contents) {
      logToSheet('ERROR: No se recibió información del pedido');
      return createJsonOutput({
        success: false,
        message: 'No se recibió información del pedido'
      });
    }

    logToSheet('Contenido recibido: ' + e.postData.contents);
    Logger.log('Contenido recibido:');
    Logger.log(e.postData.contents);

    const orderData = JSON.parse(e.postData.contents);

    logToSheet('Pedido parseado: ' + JSON.stringify(orderData));
    Logger.log('Pedido parseado:');
    Logger.log(JSON.stringify(orderData));

    const result = saveOrder(orderData);

    logToSheet('Resultado saveOrder: ' + JSON.stringify(result));
    return result;

  } catch (error) {

    logToSheet('ERROR en doPost: ' + error.toString());
    Logger.log('ERROR en doPost: ' + error.toString());

    return createJsonOutput({
      success: false,
      message: 'Error al procesar el pedido: ' + error.toString()
    });
  }
}


// ============================================================
// OBTENER MENÚ
// ============================================================

function getMenu() {

  try {

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ----------------------------
    // Menú
    // ----------------------------

    const menuSheet = ss.getSheetByName(MENU_SHEET_NAME);

    if (!menuSheet) {
      throw new Error('No existe la hoja "' + MENU_SHEET_NAME + '"');
    }

    const menuData = getSheetData(menuSheet);


    // ----------------------------
    // Métodos de pago
    // ----------------------------

    const paymentSheet = ss.getSheetByName(PAYMENT_SHEET_NAME);

    let paymentData = [];

    if (paymentSheet) {
      paymentData = getSheetData(paymentSheet);
    }


    // ----------------------------
    // Respuesta
    // ----------------------------

    return createJsonOutput({

      success: true,

      menu: menuData,

      paymentMethods: paymentData

    });

  } catch (error) {

    Logger.log('Error en getMenu: ' + error.toString());

    return createJsonOutput({

      success: false,

      message: 'Error al obtener el menú: ' + error.toString()

    });
  }
}


// ============================================================
// GUARDAR PEDIDO
// ============================================================

function saveOrder(orderData) {

  try {

    // --------------------------------------------------------
    // VALIDAR DATOS DEL PEDIDO
    // --------------------------------------------------------

    if (!orderData) {
      throw new Error('El pedido está vacío');
    }

    if (!Array.isArray(orderData.items)) {
      throw new Error('El pedido no contiene items válidos');
    }

    if (orderData.items.length === 0) {
      throw new Error('El pedido no contiene productos');
    }


    // --------------------------------------------------------
    // OBTENER HOJAS
    // --------------------------------------------------------

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    const menuSheet = ss.getSheetByName(MENU_SHEET_NAME);

    if (!ordersSheet) {
      throw new Error('No existe la hoja "' + ORDERS_SHEET_NAME + '"');
    }

    if (!menuSheet) {
      throw new Error('No existe la hoja "' + MENU_SHEET_NAME + '"');
    }


    // --------------------------------------------------------
    // ACTUALIZAR STOCK
    // --------------------------------------------------------

    logToSheet('Iniciando actualización de stock...');
    Logger.log('Iniciando actualización de stock...');

    const stockUpdateResult = updateStock(
      menuSheet,
      orderData.items
    );

    logToSheet('Resultado updateStock: ' + JSON.stringify(stockUpdateResult));


    // Si el stock no se pudo actualizar,
    // NO guardar el pedido.

    if (!stockUpdateResult.success) {

      Logger.log(
        'Pedido rechazado por stock: ' +
        stockUpdateResult.message
      );

      return createJsonOutput({

        success: false,

        message: stockUpdateResult.message,

        stockUpdated: []

      });
    }


    // --------------------------------------------------------
    // FORMATEAR ITEMS DEL PEDIDO
    // --------------------------------------------------------

    const itemsText = orderData.items
      .map(item => {

        const cantidad = Number(item.cantidad) || 0;

        const precio = Number(item.precio) || 0;

        const subtotal = precio * cantidad;

        return (
          cantidad +
          'x ' +
          item.nombre +
          ' ($' +
          subtotal.toFixed(2) +
          ')'
        );

      })
      .join(', ');


    // --------------------------------------------------------
    // FECHA / HORA
    // --------------------------------------------------------

    const timestamp = new Date();


    // --------------------------------------------------------
    // UBICACIÓN
    // --------------------------------------------------------

    let ubicacion = orderData.tipo_pedido || '';

    if (orderData.tipo_pedido === 'mesa') {

      ubicacion =
        'Mesa ' +
        (orderData.mesa || '');

    } else if (orderData.tipo_pedido === 'delivery') {

      ubicacion =
        'Delivery: ' +
        (orderData.direccion || '');

    } else if (orderData.tipo_pedido === 'llevar') {

      ubicacion = 'Para Llevar';
    }


    // --------------------------------------------------------
    // MÉTODO DE PAGO
    // --------------------------------------------------------

    let metodoPago = orderData.metodo_pago || '';

    if (orderData.metodo_pago === 'pago-movil') {

      metodoPago = 'Pago Móvil';

    } else if (orderData.metodo_pago === 'efectivo') {

      metodoPago = 'Efectivo';
    }


    // --------------------------------------------------------
    // TOTAL
    // --------------------------------------------------------

    const total =
      Number(orderData.total) || 0;


    // --------------------------------------------------------
    // CREAR FILA DEL PEDIDO
    // --------------------------------------------------------

    const newRow = [

      timestamp,

      orderData.cliente || '',

      orderData.telefono || '',

      ubicacion,

      orderData.direccion || '',

      itemsText,

      total,

      metodoPago,

      'Pendiente'

    ];


    // --------------------------------------------------------
    // GUARDAR PEDIDO
    // --------------------------------------------------------

    ordersSheet.appendRow(newRow);

    // Forzar escritura inmediata
    SpreadsheetApp.flush();


    Logger.log('Pedido guardado correctamente');

    Logger.log(
      'Stock actualizado: ' +
      JSON.stringify(stockUpdateResult.updatedItems)
    );

    // Agregar debug en columna Estado para ver resultado de updateStock
    const lastRow = ordersSheet.getLastRow();
    ordersSheet.getRange(lastRow, 9).setValue(
      'DEBUG: ' + JSON.stringify(stockUpdateResult)
    );


    // --------------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------------

    return createJsonOutput({

      success: true,

      message: 'Pedido guardado exitosamente',

      stockUpdated: stockUpdateResult.updatedItems

    });


  } catch (error) {

    Logger.log(
      'ERROR en saveOrder: ' +
      error.toString()
    );

    return createJsonOutput({

      success: false,

      message:
        'Error al guardar el pedido: ' +
        error.toString(),

      stockUpdated: []

    });

  } finally {

    // --------------------------------------------------------
    // LIBERAR LOCK
    // --------------------------------------------------------

    try {

      lock.releaseLock();

      Logger.log('Lock liberado');

    } catch (lockError) {

      Logger.log(
        'Error liberando lock: ' +
        lockError.toString()
      );
    }
  }
}


// ============================================================
// ACTUALIZAR STOCK
// ============================================================

function updateStock(menuSheet, items) {

  try {

    logToSheet('========== UPDATE STOCK ==========');
    Logger.log('========== UPDATE STOCK ==========');


    // --------------------------------------------------------
    // LEER DATOS DE LA HOJA
    // --------------------------------------------------------

    const data =
      menuSheet.getDataRange().getValues();

    if (data.length < 2) {

      logToSheet('ERROR: La hoja Menu no contiene productos');
      return {

        success: false,

        message: 'La hoja Menu no contiene productos',

        updatedItems: []

      };
    }


    const headers = data[0];

    const rows = data.slice(1);

    logToSheet('Headers: ' + headers.join(', '));


    // --------------------------------------------------------
    // BUSCAR COLUMNAS
    // --------------------------------------------------------

    const idIndex =
      headers.indexOf('id');

    const stockIndex =
      headers.indexOf('stock_actual');


    logToSheet('idIndex = ' + idIndex + ', stockIndex = ' + stockIndex);
    Logger.log(
      'idIndex = ' +
      idIndex +
      ', stockIndex = ' +
      stockIndex
    );


    // --------------------------------------------------------
    // VALIDAR COLUMNAS
    // --------------------------------------------------------

    if (idIndex === -1) {

      logToSheet('ERROR: No existe la columna "id" en la hoja Menu');
      return {

        success: false,

        message:
          'No existe la columna "id" en la hoja Menu',

        updatedItems: []

      };
    }


    if (stockIndex === -1) {

      logToSheet('ERROR: No existe la columna "stock_actual" en la hoja Menu');
      return {

        success: false,

        message:
          'No existe la columna "stock_actual" en la hoja Menu',

        updatedItems: []

      };
    }


    // ========================================================
    // PASO 1
    // VALIDAR TODO EL PEDIDO ANTES DE DESCONTAR
    // ========================================================

    const itemsToUpdate = [];


    for (let i = 0; i < items.length; i++) {

      const item = items[i];

      logToSheet('Procesando item: ' + JSON.stringify(item));
      Logger.log(
        'Procesando item: ' +
        JSON.stringify(item)
      );


      // ------------------------------------------------------
      // VALIDAR ID
      // ------------------------------------------------------

      if (
        item.id === undefined ||
        item.id === null ||
        item.id === ''
      ) {

        return {

          success: false,

          message:
            'El producto "' +
            (item.nombre || 'sin nombre') +
            '" no tiene un ID válido',

          updatedItems: []

        };
      }


      // ------------------------------------------------------
      // VALIDAR CANTIDAD
      // ------------------------------------------------------

      const quantityNeeded =
        Number(item.cantidad);


      if (
        !Number.isFinite(quantityNeeded) ||
        quantityNeeded <= 0
      ) {

        return {

          success: false,

          message:
            'Cantidad inválida para "' +
            (item.nombre || 'producto') +
            '": ' +
            item.cantidad,

          updatedItems: []

        };
      }


      // ------------------------------------------------------
      // BUSCAR PRODUCTO
      // ------------------------------------------------------

      const rowIndex =
        rows.findIndex(row =>

          String(row[idIndex]).trim() ===
          String(item.id).trim()

        );


      logToSheet('ID buscado: ' + item.id + ' | rowIndex: ' + rowIndex);
      Logger.log(
        'ID buscado: ' +
        item.id +
        ' | rowIndex: ' +
        rowIndex
      );


      // ------------------------------------------------------
      // PRODUCTO NO ENCONTRADO
      // ------------------------------------------------------

      if (rowIndex === -1) {

        logToSheet('ERROR: No se encontró el producto "' + (item.nombre || '') + '" con ID "' + item.id + '" en la hoja Menu');
        return {

          success: false,

          message:
            'No se encontró el producto "' +
            (item.nombre || '') +
            '" con ID "' +
            item.id +
            '" en la hoja Menu',

          updatedItems: []

        };
      }


      // ------------------------------------------------------
      // STOCK ACTUAL
      // ------------------------------------------------------

      const currentStock =
        Number(rows[rowIndex][stockIndex]) || 0;


      logToSheet('Producto: ' + item.nombre + ' | Stock: ' + currentStock + ' | Necesario: ' + quantityNeeded);
      Logger.log(
        'Producto: ' +
        item.nombre +
        ' | Stock: ' +
        currentStock +
        ' | Necesario: ' +
        quantityNeeded
      );


      // ------------------------------------------------------
      // VALIDAR STOCK
      // ------------------------------------------------------

      if (currentStock < quantityNeeded) {

        logToSheet('ERROR: Stock insuficiente para "' + item.nombre + '". Disponible: ' + currentStock + ', Necesario: ' + quantityNeeded);
        return {

          success: false,

          message:
            'Stock insuficiente para "' +
            item.nombre +
            '". Disponible: ' +
            currentStock +
            ', Necesario: ' +
            quantityNeeded,

          updatedItems: []

        };
      }


      // ------------------------------------------------------
      // CALCULAR NUEVO STOCK
      // ------------------------------------------------------

      const newStock =
        currentStock - quantityNeeded;


      logToSheet('Calculando nuevo stock para ' + item.nombre + ': ' + currentStock + ' - ' + quantityNeeded + ' = ' + newStock);

      itemsToUpdate.push({

        rowIndex: rowIndex,

        sheetRow:
          rowIndex + 2,

        id: item.id,

        nombre: item.nombre,

        oldStock: currentStock,

        newStock: newStock,

        quantityUsed: quantityNeeded

      });

    }


    // ========================================================
    // PASO 2
    // AHORA SÍ MODIFICAR STOCK
    // ========================================================

    const updatedItems = [];


    itemsToUpdate.forEach(update => {

      const range =
        menuSheet.getRange(
          update.sheetRow,
          stockIndex + 1
        );


      range.setValue(
        update.newStock
      );


      logToSheet('Stock actualizado en hoja: ' + update.nombre + ' | ' + update.oldStock + ' -> ' + update.newStock);
      Logger.log(
        'Stock actualizado: ' +
        update.nombre +
        ' | ' +
        update.oldStock +
        ' -> ' +
        update.newStock
      );


      // ------------------------------------------------------
      // Si llega a 0, marcar disponible = false
      // SOLO si existe la columna disponible.
      // ------------------------------------------------------

      const disponibleIndex =
        headers.indexOf('disponible');


      if (
        disponibleIndex !== -1 &&
        update.newStock <= 0
      ) {

        menuSheet
          .getRange(
            update.sheetRow,
            disponibleIndex + 1
          )
          .setValue(false);

      }


      // ------------------------------------------------------
      // Resultado
      // ------------------------------------------------------

      updatedItems.push({

        id: update.id,

        nombre: update.nombre,

        oldStock: update.oldStock,

        newStock: update.newStock,

        quantityUsed: update.quantityUsed

      });

    });


    // --------------------------------------------------------
    // FORZAR ESCRITURA
    // --------------------------------------------------------

    SpreadsheetApp.flush();


    Logger.log(
      'Stock actualizado correctamente.'
    );


    return {

      success: true,

      updatedItems: updatedItems

    };


  } catch (error) {

    Logger.log(
      'ERROR en updateStock: ' +
      error.toString()
    );


    return {

      success: false,

      message:
        'Error al actualizar stock: ' +
        error.toString(),

      updatedItems: []

    };
  }
}


// ============================================================
// CONVERTIR HOJA A ARRAY DE OBJETOS
// ============================================================

function getSheetData(sheet) {

  const data =
    sheet.getDataRange().getValues();


  if (data.length === 0) {

    return [];
  }


  const headers = data[0];

  const rows = data.slice(1);


  return rows.map(row => {

    const obj = {};


    headers.forEach((header, index) => {

      const key =
        String(header)
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]/g, '_');


      obj[key] = row[index];

    });


    return obj;

  });
}


// ============================================================
// CREAR RESPUESTA JSON
// ============================================================

function createJsonOutput(data) {

  return ContentService

    .createTextOutput(
      JSON.stringify(data)
    )

    .setMimeType(
      ContentService.MimeType.JSON
    );
}


// ============================================================
// CONFIGURAR HOJAS
// ============================================================

function setupSheets() {

  try {

    const ss =
      SpreadsheetApp.getActiveSpreadsheet();


    createMenuSheet(ss);

    createPaymentSheet(ss);

    createOrdersSheet(ss);


    Logger.log(
      'Configuración completada exitosamente'
    );


    return 'Configuración completada';


  } catch (error) {

    Logger.log(
      'Error en setupSheets: ' +
      error.toString()
    );

    throw error;
  }
}


// ============================================================
// CREAR HOJA MENU
// ============================================================

function createMenuSheet(ss) {

  let menuSheet =
    ss.getSheetByName(MENU_SHEET_NAME);


  if (!menuSheet) {

    menuSheet =
      ss.insertSheet(MENU_SHEET_NAME);


    const headers = [[

      'id',

      'categoria',

      'nombre',

      'descripcion',

      'precio_usd',

      'disponible',

      'stock_actual'

    ]];


    menuSheet
      .getRange(1, 1, 1, 7)
      .setValues(headers);


    const data = [

      [
        1,
        'Hamburguesas',
        'Monkey Classic',
        'Carne 150g, queso, lechuga, tomate',
        8.00,
        true,
        20
      ],

      [
        2,
        'Hamburguesas',
        'Monkey Bacon',
        'Carne 150g, bacon, queso, cebolla caramelizada',
        10.00,
        true,
        15
      ],

      [
        3,
        'Hamburguesas',
        'Monkey Doble',
        'Doble carne 150g, doble queso, vegetales',
        12.00,
        true,
        10
      ],

      [
        4,
        'Papas',
        'Papas Fritas',
        'Papas crujientes con salsa',
        4.00,
        true,
        50
      ],

      [
        5,
        'Papas',
        'Papas con Queso',
        'Papas con queso derretido y bacon',
        6.00,
        true,
        30
      ],

      [
        6,
        'Bebidas',
        'Refresco',
        'Coca-Cola, Pepsi, Sprite',
        2.00,
        true,
        100
      ],

      [
        7,
        'Bebidas',
        'Jugo Natural',
        'Naranja, limón, piña',
        3.00,
        true,
        50
      ]

    ];


    menuSheet
      .getRange(
        2,
        1,
        data.length,
        7
      )
      .setValues(data);


    Logger.log(
      'Hoja Menu creada'
    );


  } else {

    Logger.log(
      'Hoja Menu ya existe'
    );
  }
}


// ============================================================
// CREAR HOJA METODOS PAGO
// ============================================================

function createPaymentSheet(ss) {

  let paymentSheet =
    ss.getSheetByName(PAYMENT_SHEET_NAME);


  if (!paymentSheet) {

    paymentSheet =
      ss.insertSheet(PAYMENT_SHEET_NAME);


    const headers = [[

      'id',

      'tipo',

      'banco',

      'cedula_rif',

      'telefono',

      'titular',

      'activo'

    ]];


    paymentSheet
      .getRange(1, 1, 1, 7)
      .setValues(headers);


    const data = [[

      1,

      'Pago Móvil',

      'Banesco',

      'V-12345678',

      '0414-1234567',

      'Monkey Burgers C.A.',

      true

    ]];


    paymentSheet
      .getRange(2, 1, 1, 7)
      .setValues(data);


    Logger.log(
      'Hoja MetodosPago creada'
    );


  } else {

    Logger.log(
      'Hoja MetodosPago ya existe'
    );
  }
}


// ============================================================
// CREAR HOJA PEDIDOS
// ============================================================

function createOrdersSheet(ss) {

  let ordersSheet =
    ss.getSheetByName(ORDERS_SHEET_NAME);


  if (!ordersSheet) {

    ordersSheet =
      ss.insertSheet(ORDERS_SHEET_NAME);


    const headers = [[

      'FechaHora',

      'Cliente',

      'Telefono',

      'TipoUbicacion',

      'DireccionDelivery',

      'DetallePedido',

      'MontoTotal',

      'MetodoPago',

      'Estado'

    ]];


    ordersSheet
      .getRange(1, 1, 1, 9)
      .setValues(headers);


    Logger.log(
      'Hoja Pedidos creada'
    );


  } else {

    Logger.log(
      'Hoja Pedidos ya existe'
    );
  }
}


// ============================================================
// LOGGING A HOJA
// ============================================================

function logToSheet(message) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(LOG_SHEET_NAME);

    if (!logSheet) {
      logSheet = ss.insertSheet(LOG_SHEET_NAME);
      logSheet.getRange(1, 1).setValue('Timestamp');
      logSheet.getRange(1, 2).setValue('Mensaje');
      logSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    }

    const timestamp = new Date();
    logSheet.appendRow([timestamp, message]);

  } catch (error) {
    Logger.log('Error en logToSheet: ' + error.toString());
  }
}