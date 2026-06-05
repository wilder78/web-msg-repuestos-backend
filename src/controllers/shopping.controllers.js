import db from "../models/index.model.js";

// Mapeo de IDs estables de acuerdo a los registros de la tabla estados_compra
const ESTADOS_COMPRA = {
  PENDIENTE:         1,
  RECIBIDA:          2,
  EN_VERIFICACION:   3,
  DEVUELTA:          4,
  CANCELADA:         5,
};

const parsePositiveInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const incrementStockFromDetails = async (detalles, transaction) => {
  for (const item of detalles) {
    const product = await db.Product.findByPk(item.id_producto, { transaction });
    if (product) {
      await product.update(
        {
          stock_buen_estado:
            Number(product.stock_buen_estado || 0) + Number(item.cantidad || 0),
          precio_compra: item.costo_unitario,
        },
        { transaction },
      );
    }
  }
};

const decrementStockFromDetails = async (detalles, transaction) => {
  for (const item of detalles) {
    const product = await db.Product.findByPk(item.id_producto, { transaction });
    if (product) {
      await product.update(
        {
          stock_buen_estado: Math.max(
            Number(product.stock_buen_estado || 0) - Number(item.cantidad || 0),
            0,
          ),
        },
        { transaction },
      );
    }
  }
};

const shoppingController = {
  // 1. Registrar una nueva compra o pedido (Inicia transacción)
  createPurchase: async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
      const {
        id_proveedor,
        idProveedor,
        proveedor,
        supplier,
        id_empleado,
        idEmpleado,
        total,
        productos,
        id_estado_compra,
        idEstadoCompra,
      } = req.body;

      if (!productos || productos.length === 0) {
        if (!t.finished) await t.rollback();
        return res.status(400).json({
          ok: false,
          msg: "La compra debe tener al menos un producto.",
        });
      }

      const proveedorId = parsePositiveInteger(
        id_proveedor ??
          idProveedor ??
          proveedor?.idProveedor ??
          proveedor?.id_proveedor ??
          supplier?.idProveedor ??
          supplier?.id_proveedor,
      );

      if (!proveedorId) {
        if (!t.finished) await t.rollback();
        return res.status(400).json({
          ok: false,
          msg: "Debe seleccionar un proveedor válido para registrar la compra.",
        });
      }

      const proveedorExiste = await db.Supplier.findByPk(proveedorId, {
        transaction: t,
      });

      if (!proveedorExiste) {
        if (!t.finished) await t.rollback();
        return res.status(400).json({
          ok: false,
          msg: `El proveedor seleccionado (id ${proveedorId}) no existe en la base de datos.`,
        });
      }

      let empleadoId = parsePositiveInteger(id_empleado ?? idEmpleado);
      let empleadoExiste = empleadoId
        ? await db.Empleado.findByPk(empleadoId, { transaction: t })
        : null;

      if (!empleadoExiste) {
        empleadoExiste = await db.Empleado.findOne({
          where: { nombre: "PLATAFORMA" },
          transaction: t,
        });
      }

      if (!empleadoExiste) {
        empleadoExiste = await db.Empleado.findOne({
          order: [["idEmpleado", "ASC"]],
          transaction: t,
        });
      }

      if (!empleadoExiste) {
        if (!t.finished) await t.rollback();
        return res.status(400).json({
          ok: false,
          msg: "No existe un empleado válido para asociar la compra.",
        });
      }

      empleadoId = empleadoExiste.idEmpleado;
      const estadoIdParaDB = (id_estado_compra ?? idEstadoCompra)
        ? parsePositiveInteger(id_estado_compra ?? idEstadoCompra)
        : ESTADOS_COMPRA.PENDIENTE;

      if (!Object.values(ESTADOS_COMPRA).includes(estadoIdParaDB)) {
        if (!t.finished) await t.rollback();
        return res.status(400).json({ ok: false, msg: "ID de estado de compra inválido o inexistente." });
      }

      const nuevaCompra = await db.Purchase.create(
        {
          idProveedor: proveedorId,
          idEmpleado: empleadoId,
          idEstadoCompra: estadoIdParaDB,
          total: Number(total) || 0,
        },
        { transaction: t }
      );

      const detallesData = productos.map((item) => {
        const cantidad       = Number(item.cantidad) || 0;
        const costoUnitario  = Number(item.costo_unitario ?? item.costoUnitario ?? item.precioUnitario ?? 0);
        const productoId     = parsePositiveInteger(item.id_producto ?? item.idProducto);

        return {
          id_compra:      nuevaCompra.idCompra,
          id_producto:    productoId,
          cantidad,
          costo_unitario: costoUnitario,
          subtotal:       cantidad * costoUnitario,
        };
      });

      const detalleInvalido = detallesData.find(
        (item) => !item.id_producto || item.cantidad <= 0 || item.costo_unitario < 0,
      );

      if (detalleInvalido) {
        if (!t.finished) await t.rollback();
        return res.status(400).json({
          ok: false,
          msg: "Cada producto de la compra debe tener producto, cantidad y costo válidos.",
        });
      }

      const productoIds = [...new Set(detallesData.map((item) => item.id_producto))];
      const productosExistentes = await db.Product.count({
        where: { id_producto: { [db.Sequelize.Op.in]: productoIds } },
        transaction: t,
      });

      if (productosExistentes !== productoIds.length) {
        if (!t.finished) await t.rollback();
        return res.status(400).json({
          ok: false,
          msg: "Uno o más productos de la compra no existen en la base de datos.",
        });
      }

      await db.PurchaseDetail.bulkCreate(detallesData, { transaction: t });

      if (estadoIdParaDB === ESTADOS_COMPRA.RECIBIDA) {
        await incrementStockFromDetails(detallesData, t);
      }

      await t.commit();

      return res.status(201).json({
        ok: true,
        msg:
          estadoIdParaDB === ESTADOS_COMPRA.RECIBIDA
            ? "Compra registrada como RECIBIDA. Stock incrementado correctamente."
            : "Compra registrada. Stock sin cambios hasta que el estado sea RECIBIDA.",
        id_compra:            nuevaCompra.idCompra,
        id_empleado_registrado: empleadoId,
        id_estado_registrado: estadoIdParaDB,
      });
    } catch (error) {
      if (!t.finished) await t.rollback();
      console.error("❌ Error en createPurchase:", error);
      if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(400).json({
          ok: false,
          msg: "La compra contiene referencias inválidas de proveedor, empleado o producto.",
          error: error.message,
        });
      }
      return res.status(500).json({ ok: false, msg: "Error al crear la compra", error: error.message });
    }
  },

  // 2. Confirmar recepción de mercancía y actualizar stock
  confirmReceipt: async (req, res) => {
    const { id } = req.params;
    const t = await db.sequelize.transaction();

    try {
      const compra = await db.Purchase.findByPk(id, {
        include: [
          { model: db.PurchaseDetail, as: "detalles" },
          { model: db.PurchaseStatus, as: "estado" },
        ],
      });

      if (!compra) {
        if (!t.finished) await t.rollback();
        return res.status(404).json({ ok: false, msg: "Compra no encontrada." });
      }

      if (compra.idEstadoCompra !== ESTADOS_COMPRA.PENDIENTE) {
        if (!t.finished) await t.rollback();
        return res.status(400).json({
          ok: false,
          msg: `Solo se pueden confirmar pedidos en estado 'Pendiente'. Estado actual: ${
            compra.estado ? compra.estado.nombre_estado : compra.idEstadoCompra
          }`,
        });
      }

      await compra.update({ idEstadoCompra: ESTADOS_COMPRA.RECIBIDA }, { transaction: t });

      await incrementStockFromDetails(compra.detalles, t);
      await t.commit();

      return res.json({ ok: true, msg: "Recepción confirmada y stock incrementado con éxito." });
    } catch (error) {
      if (!t.finished) await t.rollback();
      return res.status(500).json({ ok: false, error: error.message });
    }
  },

  // 3. Listar historial de compras
  getAllPurchases: async (req, res) => {
    try {
      const purchases = await db.Purchase.findAll({
        include: [
          {
            model: db.PurchaseDetail,
            as: "detalles",
            include: [{ model: db.Product, as: "producto", attributes: ["nombre", "marca"] }],
          },
          { model: db.Supplier,       as: "proveedor", attributes: ["nombre_empresa"] },
          { model: db.Empleado,       as: "empleado",  attributes: ["nombre", "apellido"] },
          { model: db.PurchaseStatus, as: "estado",    attributes: ["nombre_estado", "color_hex"] },
        ],
        order: [["idCompra", "DESC"]],
      });
      return res.json({ ok: true, data: purchases });
    } catch (error) {
      console.error("❌ Error en getAllPurchases:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  },

  // 4. Obtener detalle de una compra específica por ID
  getPurchaseById: async (req, res) => {
    try {
      const { id } = req.params;
      const purchase = await db.Purchase.findByPk(id, {
        include: [
          {
            model: db.PurchaseDetail,
            as: "detalles",
            include: [{ model: db.Product, as: "producto" }],
          },
          { model: db.Supplier,       as: "proveedor", attributes: ["nombre_empresa", "contacto"] },
          { model: db.Empleado,       as: "empleado",  attributes: ["nombre", "apellido"] },
          { model: db.PurchaseStatus, as: "estado",    attributes: ["nombre_estado", "descripcion", "color_hex"] },
        ],
      });

      if (!purchase) {
        return res.status(404).json({ ok: false, msg: "Compra inexistente." });
      }

      return res.json({ ok: true, data: purchase });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  },

  // 5. Obtener historial de precios de compra de un producto
  getProductPurchaseHistory: async (req, res) => {
    try {
      const { idProducto } = req.params;
      const history = await db.PurchaseDetail.findAll({
        where: { id_producto: idProducto },
        attributes: ["cantidad", "costo_unitario", "subtotal"],
        include: [
          {
            model: db.Purchase,
            as: "compra",
            attributes: ["idCompra", "fechaRegistro", "idEstadoCompra"],
            include: [
              { model: db.Supplier,       as: "proveedor", attributes: ["nombre_empresa"] },
              { model: db.PurchaseStatus, as: "estado",    attributes: ["nombre_estado", "color_hex"] },
            ],
          },
        ],
        order: [[{ model: db.Purchase, as: "compra" }, "fechaRegistro", "DESC"]],
      });

      return res.json({ ok: true, data: history });
    } catch (error) {
      console.error("❌ Error en getProductPurchaseHistory:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  },

  // 6. Listar todos los estados de compra (para el dropdown del frontend)
  getAllStatuses: async (req, res) => {
    try {
      const statuses = await db.PurchaseStatus.findAll({
        order: [["idEstadoCompra", "ASC"]],
      });
      return res.json({ ok: true, data: statuses });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  },

  // 7. Actualizar el estado de una compra directamente (con gestión de stock transaccional)
  updatePurchaseStatus: async (req, res) => {
    const { id } = req.params;
    const { id_estado_compra } = req.body;

    if (!id_estado_compra) {
      return res.status(400).json({ ok: false, msg: "Se requiere id_estado_compra." });
    }

    const nuevoEstadoId = parseInt(id_estado_compra);
    if (!Object.values(ESTADOS_COMPRA).includes(nuevoEstadoId)) {
      return res.status(400).json({ ok: false, msg: "ID de estado de compra inválido." });
    }

    const t = await db.sequelize.transaction();
    try {
      const compra = await db.Purchase.findByPk(id, {
        include: [{ model: db.PurchaseDetail, as: "detalles" }],
        transaction: t,
      });

      if (!compra) {
        await t.rollback();
        return res.status(404).json({ ok: false, msg: "Compra no encontrada." });
      }

      const estadoAnterior = compra.idEstadoCompra;

      // Cualquier estado distinto de Recibida -> Recibida incrementa stock.
      if (estadoAnterior !== ESTADOS_COMPRA.RECIBIDA && nuevoEstadoId === ESTADOS_COMPRA.RECIBIDA) {
        await incrementStockFromDetails(compra.detalles, t);
      }

      // Recibida -> cualquier otro estado revierte stock.
      if (
        estadoAnterior === ESTADOS_COMPRA.RECIBIDA &&
        nuevoEstadoId !== ESTADOS_COMPRA.RECIBIDA
      ) {
        await decrementStockFromDetails(compra.detalles, t);
      }

      await compra.update({ idEstadoCompra: nuevoEstadoId }, { transaction: t });
      await t.commit();

      return res.json({
        ok: true,
        msg: "Estado de compra actualizado correctamente.",
        id_estado_compra: nuevoEstadoId,
      });
    } catch (error) {
      if (!t.finished) await t.rollback();
      return res.status(500).json({ ok: false, error: error.message });
    }
  },
};

export default shoppingController;
