import db from "../models/index.model.js";
import { checkProductStockAndNotify } from "../utils/notification.utils.js";

/**
 * ⚠️  ADVERTENCIA DE CONSISTENCIA DE INVENTARIO
 * -----------------------------------------------
 * La base de datos contiene un disparador llamado `tg_restar_stock_venta`
 * que también descuenta stock al insertar en la tabla `ventas`.
 *
 * TODA la lógica de descuento de stock está centralizada en ESTE controlador:
 *   • createOrder  → estado 2 (Separación): descuenta stock al crear.
 *   • confirmSeparation → promueve Cotización (1) → Separación (2): descuenta stock.
 *
 * El disparador `tg_restar_stock_venta` DEBE estar deshabilitado en la DB
 * para evitar descuentos duplicados que corrompan el inventario.
 * Para deshabilitarlo ejecutar: ALTER TABLE ventas DISABLE TRIGGER tg_restar_stock_venta;
 */

const orderController = {};
const DEFAULT_AUTONOMOUS_SELLER_EMPLOYEE_ID = 3;

const buildPaymentStatus = (order) => {
  const totalNeto = Number(order.total_neto ?? order.totalNeto ?? 0);
  const orderStatusId = Number(
    order.id_estado_pedido ??
      order.idEstado ??
      order.id_estado ??
      order.estado?.idEstado ??
      order.estado?.id_estado ??
      0,
  );
  let totalAbonado = Number(order.get?.("total_abonado") ?? order.total_abonado ?? 0);
  let saldoPendiente = Math.max(totalNeto - totalAbonado, 0);

  let estadoPago = "Pendiente";
  if (orderStatusId === 5) {
    totalAbonado = Math.max(totalAbonado, totalNeto);
    saldoPendiente = 0;
    estadoPago = "Pagado";
  } else if (totalNeto > 0 && saldoPendiente <= 0.009) {
    estadoPago = "Pagado";
  } else if (totalAbonado > 0) {
    estadoPago = "Abono parcial";
  }

  return {
    total_abonado: Number(totalAbonado.toFixed(2)),
    saldo_pendiente: Number(saldoPendiente.toFixed(2)),
    estado_pago: estadoPago,
  };
};

const serializeOrderHistory = (order) => {
  const plainOrder = order.toJSON ? order.toJSON() : order;
  const paymentStatus = buildPaymentStatus(order);

  return {
    ...plainOrder,
    ...paymentStatus,
    estado_despacho:
      plainOrder.estado?.nombre_estado ||
      plainOrder.estado?.nombreEstado ||
      "Sin estado",
  };
};

const resolveEmployeeSellerId = async (sellerId, transaction) => {
  const normalizedSellerId =
    sellerId === undefined || sellerId === null || sellerId === ""
      ? DEFAULT_AUTONOMOUS_SELLER_EMPLOYEE_ID
      : sellerId;

  const id = Number(normalizedSellerId);
  if (!Number.isFinite(id)) return normalizedSellerId;

  const empleadoPorId = await db.Empleado.findByPk(id, { transaction });
  if (empleadoPorId) return empleadoPorId.idEmpleado;

  const empleadoPorUsuario = await db.Empleado.findOne({
    where: { idUsuario: id },
    transaction,
  });
  if (empleadoPorUsuario) return empleadoPorUsuario.idEmpleado;

  // Fallback: If default seller employee is not found, get the first available employee in database
  if (id === DEFAULT_AUTONOMOUS_SELLER_EMPLOYEE_ID) {
    const fallbackEmpleado = await db.Empleado.findOne({ transaction });
    if (fallbackEmpleado) return fallbackEmpleado.idEmpleado;
  }

  throw new Error(`El vendedor seleccionado no está vinculado a un empleado válido.`);
};

const resolveOrderSellerId = async (sellerId, transaction) => {
  try {
    return await resolveEmployeeSellerId(sellerId, transaction);
  } catch (error) {
    if (
      (sellerId === undefined || sellerId === null || sellerId === "") &&
      error.message.includes("no est")
    ) {
      throw new Error(
        `No existe el empleado por defecto (${DEFAULT_AUTONOMOUS_SELLER_EMPLOYEE_ID}) para registrar pedidos desde el carrito.`
      );
    }

    throw error;
  }
};

/**
 * ESTADOS DE PEDIDO:
 *   1 = Cotización  → No afecta stock.
 *   2 = Separación  → Resta stock_buen_estado (gestionado por el controlador).
 *   3 = Cancelado   → No afecta stock (el stock ya fue devuelto al revertir).
 *   4 = Entregado   → Descuenta cupo de crédito si aplica (ver updateOrder).
 *   5 = Pagado      → Estado final; la venta queda registrada en `ventas`.
 *
 * IMPORTANTE: El trigger `tg_restar_stock_venta` debe estar DESHABILITADO en la DB.
 * Ver advertencia al inicio del archivo.
 */

// 1. Obtener todos los pedidos con sus clientes y productos detallados
orderController.getAllOrders = async (req, res) => {
  try {
    const pedidos = await db.Order.findAll({
      attributes: {
        include: [
          [
            db.sequelize.literal(`(
              SELECT COALESCE(SUM(m_a.monto_abono), 0)
              FROM abonos AS m_a
              WHERE m_a.id_pedido = Order.id_pedido
              AND m_a.id_estado != 3
            )`),
            'total_abonado'
          ]
        ]
      },
      include: [
        { model: db.Customer, as: "cliente" },
        {
          model: db.OrderDetail,
          as: "detalles",
          include: [{ model: db.Product, as: "producto" }],
        },
        { model: db.Sale, as: "venta" },
        { model: db.estadoPedido, as: "estado" },
      ],
      order: [["id_pedido", "DESC"]],
    });

    const enrichedPedidos = pedidos.map((pedido) => {
      const plainOrder = pedido.toJSON ? pedido.toJSON() : pedido;
      const statusId = Number(plainOrder.id_estado_pedido ?? plainOrder.idEstado ?? 1);
      
      let stock_disponible = true;
      const missing_stock_products = [];

      // Solo evaluamos viabilidad de stock si está en estado 1 (Cotización / En Proceso)
      if (statusId === 1) {
        (plainOrder.detalles || []).forEach((detalle) => {
          const prod = detalle.producto;
          if (prod) {
            const requested = Number(detalle.cantidad_solicitada || 1);
            const available = Number(prod.stock_buen_estado || 0);
            if (available < requested) {
              stock_disponible = false;
              missing_stock_products.push({
                id_producto: prod.idProducto || prod.id_producto,
                nombre: prod.nombre,
                solicitado: requested,
                disponible: available
              });
            }
          }
        });
      }

      return {
        ...plainOrder,
        stock_disponible,
        missing_stock_products
      };
    });

    return res.json(enrichedPedidos);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

orderController.getMyOrderHistory = async (req, res) => {
  try {
    const roleId = Number(req.user?.idRol);
    const userId = Number(req.user?.idUsuario);
    let where = null;

    if (roleId === 3) {
      const empleado = await db.Empleado.findOne({
        where: { idUsuario: userId },
      });

      if (!empleado) {
        return res.status(200).json([]);
      }

      where = { id_vendedor: empleado.idEmpleado };
    } else if (roleId === 4 || roleId === 7) {
      const usuario = await db.Usuario.findByPk(userId);

      if (!usuario?.idCliente) {
        return res.status(200).json([]);
      }

      where = { id_cliente: usuario.idCliente };
    } else {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para consultar este historial.",
      });
    }

    const pedidos = await db.Order.findAll({
      where,
      attributes: {
        include: [
          [
            db.sequelize.literal(`(
              SELECT COALESCE(SUM(m_a.monto_abono), 0)
              FROM abonos AS m_a
              WHERE m_a.id_pedido = Order.id_pedido
              AND m_a.id_estado != 3
            )`),
            "total_abonado",
          ],
        ],
      },
      include: [
        { model: db.Customer, as: "cliente" },
        { model: db.Sale, as: "venta" },
        { model: db.estadoPedido, as: "estado" },
        {
          model: db.OrderDetail,
          as: "detalles",
          include: [{ model: db.Product, as: "producto" }],
        },
      ],
      order: [["id_pedido", "DESC"]],
    });

    const enriched = pedidos.map(serializeOrderHistory).map((plainOrder) => {
      const statusId = Number(plainOrder.id_estado_pedido ?? plainOrder.idEstado ?? 1);
      let stock_disponible = true;
      const missing_stock_products = [];

      if (statusId === 1) {
        (plainOrder.detalles || []).forEach((detalle) => {
          const prod = detalle.producto;
          if (prod) {
            const requested = Number(detalle.cantidad_solicitada || 1);
            const available = Number(prod.stock_buen_estado || 0);
            if (available < requested) {
              stock_disponible = false;
              missing_stock_products.push({
                id_producto: prod.idProducto || prod.id_producto,
                nombre: prod.nombre,
                solicitado: requested,
                disponible: available
              });
            }
          }
        });
      }

      return {
        ...plainOrder,
        stock_disponible,
        missing_stock_products
      };
    });

    return res.json(enriched);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 2. Crear un nuevo Pedido o Cotización (Maneja lógica de stock y crédito)
orderController.createOrder = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const {
      id_cliente,
      id_vendedor,
      id_origen_pedido,
      tipo_pago,
      id_estado_pedido,
      detalles,
      total_neto: totalNetoFromFrontend,
    } = req.body;

    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
      if (!t.finished) await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: "El pedido debe contener al menos un producto." 
      });
    }

    // --- EARLY VALIDATION: STOCK ---
    // Validación temprana estricta: iteramos los detalles antes de cualquier INSERT
    // para abortar inmediatamente si algún producto no tiene stock suficiente.
    for (const item of detalles) {
      const producto = await db.Product.findByPk(item.id_producto, { transaction: t });
      if (!producto) {
        if (!t.finished) await t.rollback();
        return res.status(400).json({ success: false, message: `El repuesto ID ${item.id_producto} no existe.` });
      }
      
      const cantidad = Number(item.cantidad ?? item.cantidad_solicitada ?? 1);
      if (producto.stock_buen_estado < cantidad) {
        if (!t.finished) await t.rollback();
        return res.status(400).json({ 
          success: false, 
          message: `Stock insuficiente para el producto seleccionado: ${producto.nombre}` 
        });
      }
    }
    // ---------------------------------

    const estadoActual = Number(id_estado_pedido) || 1;
    const sellerEmployeeId = await resolveOrderSellerId(id_vendedor, t);

    const nuevoPedido = await db.Order.create(
      {
        id_cliente,
        id_vendedor: sellerEmployeeId,
        id_origen_pedido,
        tipo_pago,
        id_estado_pedido: estadoActual,
        total_neto: 0,
      },
      { transaction: t }
    );

    let acumuladoSubtotal = 0;

    for (const item of detalles) {
      const producto = await db.Product.findByPk(item.id_producto, { transaction: t });
      if (!producto) throw new Error(`El repuesto ID ${item.id_producto} no existe.`);

      const cantidad = Number(item.cantidad ?? item.cantidad_solicitada ?? 1);
      const precioVenta = Number(item.precio_unitario ?? item.precio_venta ?? 0);

      let descuentoAplicado = 0;
      if (item.descuento_aplicado !== undefined && item.descuento_aplicado !== null) {
        descuentoAplicado = Number(item.descuento_aplicado);
      } else if (item.descuento_porcentaje) {
        const pct = Math.min(Math.max(Number(item.descuento_porcentaje), 0), 100);
        descuentoAplicado = parseFloat(((cantidad * precioVenta * pct) / 100).toFixed(2));
      }

      const subtotalLinea = parseFloat(Math.max(cantidad * precioVenta - descuentoAplicado, 0).toFixed(2));
      acumuladoSubtotal += subtotalLinea;


      if (estadoActual === 2 || estadoActual === 4 || estadoActual === 5) {
        await producto.update(
          { stock_buen_estado: producto.stock_buen_estado - cantidad },
          { transaction: t }
        );
        await checkProductStockAndNotify(producto, t);
      }

      await db.OrderDetail.create(
        {
          id_pedido: nuevoPedido.id_pedido,
          id_producto: item.id_producto,
          cantidad_solicitada: cantidad,
          precio_venta: precioVenta,
          descuento_aplicado: descuentoAplicado,
          subtotal_linea: subtotalLinea,
        },
        { transaction: t }
      );
    }

    const totalNetoFinal = (totalNetoFromFrontend !== undefined && Number(totalNetoFromFrontend) > 0)
      ? parseFloat(Number(totalNetoFromFrontend).toFixed(2))
      : parseFloat(acumuladoSubtotal.toFixed(2));

    await nuevoPedido.update({ total_neto: totalNetoFinal }, { transaction: t });

    // --- Lógica de cupo de crédito (Nuevo Pedido) ---
    // Si el pedido es a crédito y está en un estado que representa deuda activa (2: Separación, 4: Entregado)
    if (tipo_pago === "Credito" && (estadoActual === 2 || estadoActual === 4)) {
      const credito = await db.Credit.findOne({
        where: { idCliente: id_cliente },
        transaction: t,
      });
      if (credito) {
        const nuevoUtilizado = (parseFloat(credito.cupoUtilizado) || 0) + totalNetoFinal;
        const nuevoDisponible = parseFloat(credito.cupoAprobado) - nuevoUtilizado;
        
        if (nuevoDisponible < 0) {
          throw new Error(`Cupo insuficiente. Disponible: $${parseFloat(credito.cupoDisponible).toLocaleString()}`);
        }

        await credito.update(
          {
            cupoUtilizado: parseFloat(nuevoUtilizado.toFixed(2)),
            cupoDisponible: parseFloat(nuevoDisponible.toFixed(2)),
          },
          { transaction: t }
        );
      }
    }
    // Notificación de nuevo pedido creado (visible a Admin y al Vendedor asignado)
    const sellerEmployee = await db.Empleado.findByPk(sellerEmployeeId, { transaction: t });
    const sellerUserId = sellerEmployee ? sellerEmployee.idUsuario : null;

    const stateName = estadoActual === 1 ? "Cotización" : estadoActual === 2 ? "Separación" : `Estado ${estadoActual}`;

    await db.Notification.create({
      titulo: `Nuevo Pedido Registrado: #${nuevoPedido.id_pedido}`,
      mensaje: `Se ha registrado el pedido #${nuevoPedido.id_pedido} como "${stateName}".`,
      tipo: "estado_pedido",
      id_usuario_destino: sellerUserId,
      id_rol_destino: 1, // Administrador
      is_read: false,
      fecha_registro: new Date()
    }, { transaction: t });

    await t.commit();

    const pedidoCreado = await db.Order.findByPk(nuevoPedido.id_pedido, {
      include: [
        { model: db.Customer, as: "cliente" },
        { model: db.OrderDetail, as: "detalles", include: [{ model: db.Product, as: "producto" }] },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Pedido registrado exitosamente",
      data: pedidoCreado,
    });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    return res.status(400).json({ success: false, message: error.message });
  }
  
};

// 3. Confirmar Separación: Pasar una Cotización (1) a Pedido Real (2)
orderController.confirmSeparation = async (req, res) => {
  const { id } = req.params;
  const t = await db.sequelize.transaction();
  try {
    const pedido = await db.Order.findByPk(id, {
      include: [{ model: db.OrderDetail, as: "detalles" }],
      transaction: t,
    });

    if (!pedido) throw new Error("Pedido no encontrado.");
    if (Number(pedido.id_estado_pedido) !== 1) {
      throw new Error("Solo se pueden separar pedidos en estado de Cotización.");
    }

    for (const detalle of pedido.detalles) {
      const producto = await db.Product.findByPk(detalle.id_producto, { transaction: t });
      if (!producto) throw new Error(`Producto ID ${detalle.id_producto} no encontrado.`);

      if (producto.stock_buen_estado < detalle.cantidad_solicitada) {
        throw new Error(`Stock insuficiente para: ${producto.nombre}`);
      }

      await producto.update(
        { stock_buen_estado: producto.stock_buen_estado - detalle.cantidad_solicitada },
        { transaction: t }
      );
      await checkProductStockAndNotify(producto, t);
    }

    await pedido.update({ id_estado_pedido: 2 }, { transaction: t });

    // Notificación de Cambio de Estado: Cotización -> Separación
    const sellerEmployee = await db.Empleado.findByPk(pedido.id_vendedor, { transaction: t });
    const sellerUserId = sellerEmployee ? sellerEmployee.idUsuario : null;

    await db.Notification.create({
      titulo: `Pedido Separado: #${pedido.id_pedido}`,
      mensaje: `El pedido #${pedido.id_pedido} ha sido confirmado y separado con éxito.`,
      tipo: "estado_pedido",
      id_usuario_destino: sellerUserId,
      id_rol_destino: 1, // Administrador
      is_read: false,
      fecha_registro: new Date()
    }, { transaction: t });

    await t.commit();

    return res.json({ success: true, message: "Separación confirmada con éxito." });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    return res.status(400).json({ success: false, message: error.message });
  }
};

// 4. Obtener detalle de un pedido por ID
orderController.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await db.Order.findByPk(id, {
      include: [
        {
          model: db.OrderDetail,
          as: "detalles",
          include: [{ model: db.Product, as: "producto" }],
        },
        { model: db.Customer, as: "cliente" },
      ],
    });

    if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
    return res.json(pedido);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 5. Actualizar pedido: permite cambiar estado y datos generales del pedido.
orderController.updateOrder = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const pedido = await db.Order.findByPk(id, { 
      include: [{ model: db.OrderDetail, as: "detalles" }],
      transaction: t 
    });

    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Pedido no encontrado" });
    }

    const estadoAnterior = Number(pedido.id_estado_pedido);
    const estadoNuevo = req.body.id_estado_pedido !== undefined
      ? Number(req.body.id_estado_pedido)
      : estadoAnterior;

    if (req.body.id_estado_pedido !== undefined && estadoNuevo !== estadoAnterior && estadoNuevo <= estadoAnterior) {
      await t.rollback();
      return res.status(400).json({
        error: "Operación inválida. No es posible revertir el pedido a un estado anterior."
      });
    }

    const tipoPago = req.body.tipo_pago || pedido.tipo_pago || "";

    const updatableFields = [
      "id_cliente",
      "id_origen_pedido",
      "id_estado_pedido",
      "total_neto",
      "tipo_pago",
    ];

    const dataToUpdate = {};
    if (req.body.id_vendedor !== undefined && req.body.id_vendedor !== null && req.body.id_vendedor !== "") {
      dataToUpdate.id_vendedor = await resolveEmployeeSellerId(req.body.id_vendedor, t);
    }

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== "") {
        dataToUpdate[field] = req.body[field];
      }
    });

    if (Object.keys(dataToUpdate).length > 0) {
      await pedido.update(dataToUpdate, { transaction: t });
    }

    // ── Lógica de cupo de crédito ─────────────────────────────────────────────
    if (tipoPago === "Credito" && estadoNuevo !== estadoAnterior) {
      const totalPedido = parseFloat(req.body.total_neto ?? pedido.total_neto ?? 0);
      const idCliente = req.body.id_cliente ?? pedido.id_cliente;

      const credito = await db.Credit.findOne({
        where: { idCliente },
        transaction: t,
      });

      if (credito && totalPedido > 0) {
        let nuevoUtilizado = parseFloat(credito.cupoUtilizado) || 0;

        const esDeudaActivaAnterior = (estadoAnterior === 2 || estadoAnterior === 4);
        const esDeudaActivaNueva = (estadoNuevo === 2 || estadoNuevo === 4);

        // Si pasa de NO DEUDA a DEUDA (Ej: Cotización -> Separación)
        if (esDeudaActivaNueva && !esDeudaActivaAnterior) {
          nuevoUtilizado = nuevoUtilizado + totalPedido;
        }
        // Si pasa de DEUDA a NO DEUDA (Ej: Entregado -> Pagado o Cancelado)
        else if (!esDeudaActivaNueva && esDeudaActivaAnterior) {
          nuevoUtilizado = Math.max(nuevoUtilizado - totalPedido, 0);
        }

        const nuevoDisponible = Math.max(
          parseFloat(credito.cupoAprobado) - nuevoUtilizado,
          0
        );

        await credito.update(
          {
            cupoUtilizado: parseFloat(nuevoUtilizado.toFixed(2)),
            cupoDisponible: parseFloat(nuevoDisponible.toFixed(2)),
          },
          { transaction: t }
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // --- Lógica de Inventario (Ciclo de vida) ---
    // 1: En Proceso (sin descuento)
    // 2: Despachado (descuenta)
    // 3: Cancelado (reversa)
    // 4: Entregado (ya descontado)
    // 5: Pagado (ya descontado)
    const esStockActivoAnterior = [2, 4, 5].includes(estadoAnterior);
    const esStockActivoNuevo = [2, 4, 5].includes(estadoNuevo);
    const detailsChanged = Array.isArray(req.body.detalles) && req.body.detalles.length > 0;

    // Si el pedido estaba activo y (pasa a inactivo o cambiaron los detalles), reversamos el stock actual.
    if (esStockActivoAnterior && (!esStockActivoNuevo || detailsChanged)) {
      for (const item of pedido.detalles) {
        const producto = await db.Product.findByPk(item.id_producto, { transaction: t });
        if (producto) {
          await producto.update(
            { stock_buen_estado: producto.stock_buen_estado + item.cantidad_solicitada },
            { transaction: t }
          );
        }
      }
    }
    // --------------------------------------------

    if (detailsChanged) {
      await db.OrderDetail.destroy({ where: { id_pedido: id }, transaction: t });
      let totalNeto = 0;
      for (const item of req.body.detalles) {
        const idProd = item.id_producto ?? item.idProducto;
        if (!idProd) continue;

        const cantidad = Number(item.cantidad_solicitada ?? item.cantidad ?? 0);
        const precio = Number(item.precio_venta ?? item.precio_unitario ?? 0);
        const descuento = Number(item.descuento_aplicado ?? 0);
        const subtotalLinea = Number(item.subtotal_linea ?? Math.max(cantidad * precio - descuento, 0));
        totalNeto += subtotalLinea;

        if (esStockActivoNuevo) {
          const producto = await db.Product.findByPk(idProd, { transaction: t });
          if (producto) {
            if (producto.stock_buen_estado < cantidad) {
              throw new Error(`Stock insuficiente para ${producto.nombre}.`);
            }
            await producto.update(
              { stock_buen_estado: producto.stock_buen_estado - cantidad },
              { transaction: t }
            );
            await checkProductStockAndNotify(producto, t);
          }
        }

        await db.OrderDetail.create(
          {
            id_pedido: id,
            id_producto: idProd,
            cantidad_solicitada: cantidad,
            precio_venta: precio,
            descuento_aplicado: descuento,
            subtotal_linea: subtotalLinea,
          },
          { transaction: t },
        );
      }
      await pedido.update({ total_neto: req.body.total_neto ?? totalNeto }, { transaction: t });
    } else {
      // Si no cambiaron los detalles pero el pedido pasa de inactivo a activo, descontamos.
      if (!esStockActivoAnterior && esStockActivoNuevo) {
        for (const item of pedido.detalles) {
          const producto = await db.Product.findByPk(item.id_producto, { transaction: t });
          if (producto) {
            if (producto.stock_buen_estado < item.cantidad_solicitada) {
              throw new Error(`Stock insuficiente para ${producto.nombre}.`);
            }
            await producto.update(
              { stock_buen_estado: producto.stock_buen_estado - item.cantidad_solicitada },
              { transaction: t }
            );
            await checkProductStockAndNotify(producto, t);
          }
        }
      }
    }

    // Notificación de Cambio de Estado en la actualización si cambió de estado
    if (estadoNuevo !== estadoAnterior) {
      const sellerEmployee = await db.Empleado.findByPk(pedido.id_vendedor, { transaction: t });
      const sellerUserId = sellerEmployee ? sellerEmployee.idUsuario : null;

      const estadoObj = await db.estadoPedido.findByPk(estadoNuevo, { transaction: t });
      const stateName = estadoObj ? estadoObj.nombre_estado : `Estado ${estadoNuevo}`;

      await db.Notification.create({
        titulo: `Pedido Actualizado: #${pedido.id_pedido}`,
        mensaje: `El pedido #${pedido.id_pedido} ha cambiado su estado a "${stateName}".`,
        tipo: "estado_pedido",
        id_usuario_destino: sellerUserId,
        id_rol_destino: 1, // Administrador
        is_read: false,
        fecha_registro: new Date()
      }, { transaction: t });
    }

    await t.commit();

    const updatedPedido = await db.Order.findByPk(id, {
      include: [
        { model: db.Customer, as: "cliente" },
        { model: db.OrderDetail, as: "detalles", include: [{ model: db.Product, as: "producto" }] },
        { model: db.Sale, as: "venta" },
      ],
    });

    return res.json({ success: true, message: "Pedido actualizado correctamente.", data: updatedPedido });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error("Error in updateOrder:", error);
    if (error.message && error.message.includes("Stock insuficiente")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
};

orderController.getPendingCount = async (req, res) => {
  try {
    const total = await db.Order.count({
      where: {
        id_estado_pedido: 1
      }
    });
    return res.json({ success: true, total });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default orderController;
