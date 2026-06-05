import db from "../models/index.model.js";

const ORDER_STATUS_CANCELLED = 3;
const ORDER_STATUS_DELIVERED = 4;
const ORDER_STATUS_PAID = 5;
const ABONO_STATUS_CANCELLED = 3;
const BALANCE_TOLERANCE = 0.5;

const syncOrderPaymentStatus = async (orderId, transaction) => {
  if (!orderId) return null;

  const pedido = await db.Order.findByPk(orderId, { transaction });
  if (!pedido) return null;

  const totalAbonosActivos = await db.Abono.sum("montoAbono", {
    where: {
      idPedido: orderId,
      idEstado: { [db.Sequelize.Op.ne]: ABONO_STATUS_CANCELLED }
    },
    transaction
  }) || 0;

  const totalPedido = parseFloat(pedido.total_neto) || 0;
  const totalAbonado = parseFloat(totalAbonosActivos) || 0;
  const saldoPendiente = Math.max(totalPedido - totalAbonado, 0);

  let nuevoEstado = Number(pedido.id_estado_pedido);
  if (saldoPendiente <= BALANCE_TOLERANCE) {
    nuevoEstado = ORDER_STATUS_PAID;
  } else if (nuevoEstado === ORDER_STATUS_PAID) {
    nuevoEstado = ORDER_STATUS_DELIVERED;
  }

  if (nuevoEstado !== Number(pedido.id_estado_pedido)) {
    await db.Order.update(
      { id_estado_pedido: nuevoEstado },
      {
        where: { id_pedido: orderId },
        transaction
      }
    );
  }

  return {
    totalPedido,
    totalAbonado,
    saldoPendiente,
    nuevoEstado
  };
};

const abonoController = {
  // 1. Obtener todos los abonos
  getAllAbonos: async (req, res) => {
    try {
      // Intento preventivo de asegurar que la columna existe (si no existe, fallará silenciosamente o lo logueamos)
      try {
        await db.sequelize.query("ALTER TABLE abonos ADD COLUMN IF NOT EXISTS id_estado INT DEFAULT 1");
      } catch (e) {
        // Ignorar si ya existe o si el motor no soporta IF NOT EXISTS de esta forma
      }

      const abonos = await db.Abono.findAll({
        include: [
          { 
            model: db.Customer, 
            as: "cliente", 
            attributes: ["idCliente", "razonSocial", "numeroDocumento"],
            include: [
              { model: db.TipoDocumento, as: "tipoDocumento", attributes: ["sigla"] }
            ]
          },
          {
            model: db.Usuario,
            as: "usuario",
            attributes: ["idUsuario", "nombreUsuario"],
            include: [{
              model: db.Empleado,
              as: "empleado",
              attributes: ["nombre", "apellido"]
            }]
          }
        ],
        order: [["idAbono", "DESC"]],
      });
      res.json(abonos);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // 2. Registrar un nuevo abono
  createAbono: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const fail = async (status, message) => {
        if (t && !t.finished) await t.rollback();
        return res.status(status).json({ success: false, message });
      };

      const {
        id_cliente,
        id_credito,
        id_pedido,
        monto_abono,
        tipo_abono,
        metodo_pago,
        id_usuario,
        descripcion
      } = req.body;

      if (!id_cliente || !monto_abono) {
        return fail(400, "Cliente y monto son requeridos.");
      }

      const montoNum = parseFloat(monto_abono);

      // 0. Protección contra duplicados accidentales (Doble clic)
      // Buscamos un abono idéntico en los últimos 30 segundos
      const existeReciente = await db.Abono.findOne({
        where: {
          idCliente: id_cliente,
          idPedido: id_pedido || null,
          montoAbono: montoNum,
          fechaAbono: { [db.Sequelize.Op.gt]: new Date(Date.now() - 30000) } // 30 segundos
        }
      });

      if (existeReciente) {
        return fail(
          409,
          "Ya se registró un abono idéntico hace un momento. Por favor verifica si el pago ya fue aplicado."
        );
      }

      // 1. Validar el pedido únicamente por saldo y anulación explícita
      if (id_pedido) {
        const pedido = await db.Order.findByPk(id_pedido, { transaction: t });

        if (!pedido) {
          return fail(404, "El pedido seleccionado no existe.");
        }

        if (Number(pedido.id_estado_pedido) === ORDER_STATUS_CANCELLED) {
          return fail(400, "No se pueden registrar abonos sobre pedidos anulados.");
        }

        if (Number(pedido.id_estado_pedido) === ORDER_STATUS_PAID) {
          return fail(400, "Operación inválida: El pedido ya se encuentra pagado y no admite nuevos abonos.");
        }

        const sumaPrevios = await db.Abono.sum("montoAbono", {
          where: {
            idPedido: id_pedido,
            idEstado: { [db.Sequelize.Op.ne]: ABONO_STATUS_CANCELLED }
          },
          transaction: t
        }) || 0;

        const deudaRestante = Math.max(
          parseFloat(pedido.total_neto) - parseFloat(sumaPrevios),
          0
        );

        if (deudaRestante <= BALANCE_TOLERANCE) {
          return fail(400, "No se pueden registrar abonos sobre pedidos con saldo en cero.");
        }

        if (montoNum > (deudaRestante + BALANCE_TOLERANCE)) {
          return fail(
            400,
            `El monto ($${montoNum}) excede la deuda restante del pedido ($${deudaRestante.toFixed(2)}).`
          );
        }
      }

      const nuevoAbono = await db.Abono.create({
        idCliente: id_cliente,
        idCredito: id_credito,
        idPedido: id_pedido,
        montoAbono: monto_abono,
        tipoAbono: tipo_abono,
        metodoPago: metodo_pago,
        idUsuario: id_usuario || 1,
        descripcion: descripcion || "Registro de abono"
      }, { transaction: t });

      // Recalcular inmediatamente el estado financiero del pedido
      if (id_pedido) {
        await syncOrderPaymentStatus(id_pedido, t);
      }

      // Si es un abono a crédito, actualizamos el cupo utilizado inmediatamente
      if (tipo_abono === "credito" && id_cliente) {
        const credito = await db.Credit.findOne({
          where: { idCliente: id_cliente },
          transaction: t
        });

        if (credito) {
          const actualUtilizado = parseFloat(credito.cupoUtilizado) || 0;
          const nuevoUtilizado = Math.max(0, actualUtilizado - montoNum);
          const nuevoDisponible = parseFloat(credito.cupoAprobado) - nuevoUtilizado;

          await credito.update({
            cupoUtilizado: parseFloat(nuevoUtilizado.toFixed(2)),
            cupoDisponible: parseFloat(nuevoDisponible.toFixed(2))
          }, { transaction: t });
        }
      }

      await t.commit();
      res.status(201).json({ success: true, data: nuevoAbono });
    } catch (error) {
      if (t && !t.finished) await t.rollback();
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // 3. Cancelar un abono
  cancelAbono: async (req, res) => {
    const { id } = req.params;
    const t = await db.sequelize.transaction();
    try {
      const abono = await db.Abono.findByPk(id, { transaction: t });
      if (!abono) throw new Error("Abono no encontrado.");
      if (abono.idEstado === 3) throw new Error("Este abono ya se encuentra cancelado.");

      // 1. Marcar como cancelado
      await abono.update({ idEstado: 3 }, { transaction: t });

      // 2. Revertir impacto en Crédito
      if (abono.tipoAbono === "credito" && abono.idCliente) {
        const credito = await db.Credit.findOne({
          where: { idCliente: abono.idCliente },
          transaction: t
        });
        if (credito) {
          const monto = parseFloat(abono.montoAbono);
          const nuevoUtilizado = (parseFloat(credito.cupoUtilizado) || 0) + monto;
          const nuevoDisponible = Math.max(0, parseFloat(credito.cupoAprobado) - nuevoUtilizado);

          await credito.update({
            cupoUtilizado: parseFloat(nuevoUtilizado.toFixed(2)),
            cupoDisponible: parseFloat(nuevoDisponible.toFixed(2))
          }, { transaction: t });
        }
      }

      // 3. Recalcular el estado financiero del pedido si aplica
      if (abono.idPedido) {
        await syncOrderPaymentStatus(abono.idPedido, t);
      }

      await t.commit();
      res.json({ success: true, message: "Abono cancelado exitosamente. Se ha restablecido el saldo de la cuenta." });
    } catch (error) {
      if (t && !t.finished) await t.rollback();
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

export default abonoController;
