import db from "../models/index.model.js";
const { Credit, Customer } = db;
const { Op } = db.Sequelize;

// ─── Helpers ────────────────────────────────────────────────────────────────

const CUSTOMER_ATTRS = ["idCliente", "numeroDocumento", "razonSocial"];

const withCliente = {
  include: [{ model: Customer, as: "cliente", attributes: CUSTOMER_ATTRS }],
};

const sanitizeCredit = (credit) => {
  const { id_cliente, id_estado, idEstadoCredito, ...clean } =
    credit.toJSON?.() ?? credit;
  return clean;
};

const notFound = (res) =>
  res.status(404).json({ ok: false, message: "Crédito no encontrado" });

// ─── Controller ─────────────────────────────────────────────────────────────

const CREDIT_ALERT_STATUS_IDS = [0, 2, 3];
const CREDIT_STATUS_BUCKETS = {
  AL_DIA: "Activos / Al día",
  MORA: "Mora Temprana",
  SUSPENDIDO: "Suspendidos",
};
const CREDIT_STATUS_COLORS = {
  [CREDIT_STATUS_BUCKETS.AL_DIA]: "#16a34a",
  [CREDIT_STATUS_BUCKETS.MORA]: "#ea580c",
  [CREDIT_STATUS_BUCKETS.SUSPENDIDO]: "#dc2626",
};

const parseDateOnly = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : value;
};

const buildPortfolioDateFilter = (query) => {
  const fechaDesde = parseDateOnly(
    query.fechaDesde ??
      query.desde ??
      query.dateFrom ??
      query.startDate ??
      query.from,
  );
  const fechaHasta = parseDateOnly(
    query.fechaHasta ??
      query.hasta ??
      query.dateTo ??
      query.endDate ??
      query.to,
  );

  if (fechaDesde && fechaHasta) {
    return { fechaAprobacion: { [Op.between]: [fechaDesde, fechaHasta] } };
  }

  if (fechaDesde) {
    return { fechaAprobacion: { [Op.gte]: fechaDesde } };
  }

  if (fechaHasta) {
    return { fechaAprobacion: { [Op.lte]: fechaHasta } };
  }

  return {};
};

const toNumber = (value) => Number(value ?? 0);

const EXCLUDED_ORDER_STATUS_IDS = [3, 5];
const BALANCE_TOLERANCE = 0.009;

const getClientPendingDebt = async (clientId, transaction) => {
  if (!clientId) return 0;

  const orders = await db.Order.findAll({
    attributes: [
      "id_pedido",
      "total_neto",
      [
        db.sequelize.literal(`(
          SELECT COALESCE(SUM(a.monto_abono), 0)
          FROM abonos AS a
          WHERE a.id_pedido = Order.id_pedido
          AND a.id_estado != 3
        )`),
        "total_abonado",
      ],
    ],
    where: {
      id_cliente: clientId,
      id_estado_pedido: { [Op.notIn]: EXCLUDED_ORDER_STATUS_IDS },
    },
    raw: true,
    transaction,
  });

  return orders.reduce((acc, order) => {
    const total = Number(order.total_neto ?? 0);
    const abonado = Number(order.total_abonado ?? 0);
    const saldo = Math.max(total - abonado, 0);
    if (saldo <= BALANCE_TOLERANCE) {
      return acc;
    }

    return acc + saldo;
  }, 0);
};

const syncCreditDebt = async (credito, transaction) => {
  const deudaReal = await getClientPendingDebt(credito.idCliente, transaction);
  const deudaRedondeada = Number(deudaReal.toFixed(2));
  const disponibleRedondeado = Number(
    Math.max(Number(credito.cupoAprobado ?? 0) - deudaRedondeada, 0).toFixed(2),
  );

  if (
    Number(credito.cupoUtilizado ?? 0) !== deudaRedondeada ||
    Number(credito.cupoDisponible ?? 0) !== disponibleRedondeado
  ) {
    await credito.update(
      {
        cupoUtilizado: deudaRedondeada,
        cupoDisponible: disponibleRedondeado,
      },
      { transaction },
    );
  }

  return {
    deudaActual: deudaRedondeada,
    cupoDisponibleActual: disponibleRedondeado,
  };
};

const getFilterEcho = (query) => ({
  fechaDesde:
    query.fechaDesde ??
    query.desde ??
    query.dateFrom ??
    query.startDate ??
    query.from ??
    null,
  fechaHasta:
    query.fechaHasta ??
    query.hasta ??
    query.dateTo ??
    query.endDate ??
    query.to ??
    null,
});

const classifyCreditStatusId = (statusId) => {
  const normalized = Number(statusId);

  if (normalized === 3) return CREDIT_STATUS_BUCKETS.MORA;
  if (normalized === 2 || normalized === 0) return CREDIT_STATUS_BUCKETS.SUSPENDIDO;
  return CREDIT_STATUS_BUCKETS.AL_DIA;
};

const buildCreditStatusDistribution = async (where, totalLineasCredito) => {
  const groupedRows = await Credit.findAll({
    attributes: [
      "idEstado",
      [db.sequelize.fn("COUNT", db.sequelize.col("id_credito")), "cantidad"],
    ],
    where,
    group: ["idEstado"],
    raw: true,
  });

  const statusCounts = {
    [CREDIT_STATUS_BUCKETS.AL_DIA]: 0,
    [CREDIT_STATUS_BUCKETS.MORA]: 0,
    [CREDIT_STATUS_BUCKETS.SUSPENDIDO]: 0,
  };

  groupedRows.forEach((row) => {
    const bucket = classifyCreditStatusId(row.idEstado);
    statusCounts[bucket] += toNumber(row.cantidad);
  });

  const total = totalLineasCredito || 1;

  return Object.entries(statusCounts)
    .filter(([, cantidad]) => cantidad > 0)
    .map(([estado, cantidad]) => ({
      estado,
      cantidad,
      porcentaje: Math.round((cantidad / total) * 100),
      color: CREDIT_STATUS_COLORS[estado],
    }));
};

const buildCreditSummary = async (query, { includeDistribution = false } = {}) => {
  const where = buildPortfolioDateFilter(query);
  const alertWhere = {
    ...where,
    idEstado: { [Op.in]: CREDIT_ALERT_STATUS_IDS },
  };

  const credits = await Credit.findAll({
    ...withCliente,
    where,
  });

  let carteraTotalColocada = 0;
  let cupoDisponibleGlobal = 0;

  for (const credito of credits) {
    const { deudaActual, cupoDisponibleActual } = await syncCreditDebt(credito);
    carteraTotalColocada += deudaActual;
    cupoDisponibleGlobal += cupoDisponibleActual;
  }

  const creditosEnAlerta = await Credit.count({ where: alertWhere });
  const totalLineasCredito = credits.length;
  const summary = {
    carteraTotalColocada: Number(carteraTotalColocada.toFixed(2)),
    cupoDisponibleGlobal: Number(cupoDisponibleGlobal.toFixed(2)),
    creditosEnAlerta,
    totalLineasCredito,
    filtros: getFilterEcho(query),
  };

  if (includeDistribution) {
    summary.distribucionEstado = await buildCreditStatusDistribution(
      where,
      totalLineasCredito,
    );
  }

  return summary;
};

const creditController = {
  getPortfolioSummary: async (req, res) => {
    try {
      const summary = await buildCreditSummary(req.query);

      res.json({
        ok: true,
        ...summary,
        data: summary,
      });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  },

  getCarteraSummary: async (req, res) => {
    try {
      const summary = await buildCreditSummary(req.query, {
        includeDistribution: true,
      });

      res.json({
        ok: true,
        ...summary,
        data: summary,
      });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 1. Consulta global de cartera
  getAllCredits: async (req, res) => {
    try {
      const credits = await Credit.findAll(withCliente);

      // --- Sincronización automática basada en saldos pendientes reales por pedido ---
      for (const credito of credits) {
        await syncCreditDebt(credito);
      }
      // ------------------------------------------------------------------

      res.json(credits.map(sanitizeCredit));
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 2. Apertura de línea crediticia
  createCredit: async (req, res) => {
    try {
      const { idCliente, cupoAprobado, idEstado, idEstadoCredito, id_estado } =
        req.body;

      const existe = await Credit.findOne({ where: { idCliente } });
      if (existe) {
        return res.status(400).json({
          ok: false,
          message: "Este cliente ya tiene una línea de crédito activa.",
        });
      }

      // Validar historial mínimo de 5 compras pagadas (estado 5)
      const pagadasCount = await db.Order.count({
        where: {
          id_cliente: idCliente,
          id_estado_pedido: 5
        }
      });

      if (pagadasCount < 5) {
        return res.status(400).json({
          ok: false,
          message: `No se puede asignar crédito: El cliente debe contar con un historial mínimo de 5 compras realizadas y pagadas (Actuales: ${pagadasCount}/5)`,
        });
      }

      const cupoAprobadoNum = Number.parseFloat(cupoAprobado);
      if (cupoAprobadoNum > 5000000) {
        return res.status(400).json({
          ok: false,
          message: "El cupo aprobado excede el límite máximo permitido por la empresa de $5,000,000.",
        });
      }

      const nuevo = await Credit.create({
        idCliente,
        cupoAprobado,
        cupoDisponible: cupoAprobado,
        cupoUtilizado: 0,
        idEstado: idEstado ?? idEstadoCredito ?? id_estado ?? 1,
      });

      res.status(201).json({ ok: true, credit: sanitizeCredit(nuevo) });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 3. Gestión de cupos y saldos
  updateCreditLimit: async (req, res) => {
    try {
      const { id } = req.params;
      const { cupoUtilizado } = req.body;

      const credito = await Credit.findByPk(id);
      if (!credito) return notFound(res);

      const nuevoDisponible =
        parseFloat(credito.cupoAprobado) - parseFloat(cupoUtilizado);

      if (nuevoDisponible < 0) {
        return res.status(400).json({
          ok: false,
          message: "Cupo insuficiente para esta transacción",
        });
      }

      await credito.update({ cupoUtilizado, cupoDisponible: nuevoDisponible });

      res.json({
        ok: true,
        message: "Cupo actualizado correctamente",
        data: {
          aprobado: credito.cupoAprobado,
          utilizado: cupoUtilizado,
          disponible: nuevoDisponible,
        },
      });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 4. Actualizar cupo aprobado e idEstado
  updateCredit: async (req, res) => {
    try {
      const { id } = req.params;
      const { cupoAprobado, idEstado } = req.body;

      const credito = await Credit.findByPk(id);
      if (!credito) return notFound(res);

      const dataToUpdate = {};

      if (cupoAprobado !== undefined) {
        const nuevoCupo = parseFloat(cupoAprobado);
        if (isNaN(nuevoCupo) || nuevoCupo < 0) {
          return res.status(400).json({
            ok: false,
            message: "El cupo aprobado debe ser un número mayor o igual a 0.",
          });
        }
        dataToUpdate.cupoAprobado = nuevoCupo;
        dataToUpdate.cupoDisponible =
          nuevoCupo - (parseFloat(credito.cupoUtilizado) || 0);
      }

      if (idEstado !== undefined) {
        dataToUpdate.idEstado = Number(idEstado);
      }

      await credito.update(dataToUpdate);

      const updated = await Credit.findByPk(id, withCliente);
      res.json({
        ok: true,
        message: "Crédito actualizado correctamente",
        credit: sanitizeCredit(updated),
      });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 5. Eliminación de línea crediticia
  deleteCredit: async (req, res) => {
    try {
      const { id } = req.params;

      const credito = await Credit.findByPk(id);
      if (!credito) return notFound(res);

      await credito.destroy();
      res.json({ ok: true, message: "Crédito eliminado correctamente" });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  },
  // 5. Eliminar una línea de crédito por ID
  deleteCredit: async (req, res) => {
    try {
      const { id } = req.params;
      const credito = await Credit.findByPk(id);
      if (!credito) {
        return res.status(404).json({ ok: false, message: "Crédito no encontrado." });
      }
      await credito.destroy();
      res.json({ ok: true, message: "Línea de crédito eliminada correctamente." });
    } catch (error) {
      if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).json({
          ok: false,
          message: "No se puede eliminar: el crédito tiene transacciones asociadas.",
        });
      }
      res.status(500).json({ ok: false, message: error.message });
    }
  },

};

export default creditController;
