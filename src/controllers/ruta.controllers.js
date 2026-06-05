import db from "../models/index.model.js";

const { Ruta, RutaDetail, Empleado, Zona, Customer } = db;

// ✅ Helper definido DESPUÉS de desestructurar los modelos
const includeDetalles = (full = false) => ({
  model: RutaDetail,
  as: "detalles",
  required: false,
  attributes: [
    "idDetalleRuta",
    "secuenciaParada",
    "idCliente",
    "idPedido",
    "estadoVisita",
    ...(full ? ["fechaLlegadaReal", "fechaSalidaReal"] : []),
  ],
  include: [
    {
      model: Customer,
      as: "cliente",
      required: false,
      attributes: ["idCliente", "razonSocial", "direccion", "telefono"],
    },
  ],
});

const rutaController = {
  // 1. Crear una nueva ruta con sus paradas detalladas
  createRuta: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { nombreRuta, idZona, idEmpleado, fechaPlanificada, detalles } =
        req.body;

      const nuevaRuta = await Ruta.create(
        { nombreRuta, idZona, idEmpleado, fechaPlanificada, idEstadoRuta: 1 },
        { transaction: t },
      );

      if (detalles && detalles.length > 0) {
        await RutaDetail.bulkCreate(
          detalles.map((p, index) => ({
            idRuta: nuevaRuta.idRuta,
            secuenciaParada: index + 1,
            idCliente: p.idCliente,
            idPedido: p.idPedido || null,
            estadoVisita: "Pendiente",
          })),
          { transaction: t },
        );
      }

      await t.commit();
      return res.status(201).json({
        ok: true,
        message: "Ruta y detalles creados exitosamente",
        idRuta: nuevaRuta.idRuta,
      });
    } catch (error) {
      if (!t.finished) await t.rollback();
      return res
        .status(500)
        .json({
          ok: false,
          message: "Error al procesar la ruta",
          error: error.message,
        });
    }
  },

  // 2. Obtener listado general de rutas
  getAllRutas: async (req, res) => {
    try {
      const rutas = await Ruta.findAll({
        attributes: [
          "idRuta",
          "nombreRuta",
          "idZona",
          "idEmpleado",
          "fechaPlanificada",
          "idEstadoRuta",
          "fechaEjecucionInicio",
          "fechaEjecucionFin",
        ],
        include: [
          {
            model: Empleado,
            as: "empleado",
            attributes: ["nombre", "apellido"],
          },
          { model: Zona, as: "zona", attributes: ["nombreZona"] },
          includeDetalles(),
        ],
        order: [["idRuta", "DESC"]],
      });
      return res.json(rutas);
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 3. Obtener detalle profundo de una ruta específica
  getRutaById: async (req, res) => {
    try {
      const { id } = req.params;
      const ruta = await Ruta.findByPk(id, {
        attributes: [
          "idRuta",
          "nombreRuta",
          "idZona",
          "idEmpleado",
          "fechaPlanificada",
          "idEstadoRuta",
        ],
        include: [
          includeDetalles(true),
          {
            model: Empleado,
            as: "empleado",
            attributes: ["nombre", "apellido"],
          },
          { model: Zona, as: "zona", attributes: ["nombreZona"] },
        ],
      });

      if (!ruta)
        return res
          .status(404)
          .json({ ok: false, message: "La ruta no existe" });
      return res.json(ruta);
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 4. Actualizar cabecera + detalles
  updateRuta: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { id } = req.params;
      const {
        nombreRuta,
        idZona,
        idEmpleado,
        fechaPlanificada,
        idEstadoRuta,
        detalles,
      } = req.body;

      const ruta = await Ruta.findByPk(id);
      if (!ruta) {
        await t.rollback();
        return res
          .status(404)
          .json({ ok: false, message: "La ruta no existe" });
      }

      await ruta.update(
        {
          nombreRuta: nombreRuta ?? ruta.nombreRuta,
          idZona: idZona ?? ruta.idZona,
          idEmpleado: idEmpleado ?? ruta.idEmpleado,
          fechaPlanificada: fechaPlanificada ?? ruta.fechaPlanificada,
          idEstadoRuta: idEstadoRuta ?? ruta.idEstadoRuta,
        },
        { transaction: t },
      );

      if (Array.isArray(detalles)) {
        await RutaDetail.destroy({ where: { idRuta: id }, transaction: t });
        if (detalles.length > 0) {
          await RutaDetail.bulkCreate(
            detalles.map((d, index) => ({
              idRuta: parseInt(id),
              secuenciaParada: index + 1,
              idCliente: d.idCliente,
              idPedido: d.idPedido || null,
              estadoVisita: d.estadoVisita || "Pendiente",
            })),
            { transaction: t },
          );
        }
      }

      await t.commit();

      const rutaActualizada = await Ruta.findByPk(id, {
        include: [
          {
            model: Empleado,
            as: "empleado",
            attributes: ["nombre", "apellido"],
          },
          { model: Zona, as: "zona", attributes: ["nombreZona"] },
          includeDetalles(true),
        ],
      });

      return res.json({
        ok: true,
        message: "Ruta actualizada exitosamente",
        data: rutaActualizada,
      });
    } catch (error) {
      await t.rollback();
      console.error("Error en updateRuta:", error);
      return res
        .status(500)
        .json({
          ok: false,
          message: "Error al actualizar la ruta",
          error: error.message,
        });
    }
  },

  // 5. Actualizar el estado de una visita específica
  updateVisita: async (req, res) => {
    try {
      const { idDetalleRuta } = req.params;
      const { estadoVisita, fechaLlegadaReal, fechaSalidaReal } = req.body;

      const [updated] = await RutaDetail.update(
        { estadoVisita, fechaLlegadaReal, fechaSalidaReal },
        { where: { idDetalleRuta } },
      );

      if (updated) {
        return res.json({
          ok: true,
          message: "Visita actualizada correctamente",
        });
      }
      return res
        .status(404)
        .json({ ok: false, message: "Detalle de ruta no encontrado" });
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  },

  // 6. Eliminar una ruta y sus detalles asociados
  deleteRuta: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { id } = req.params;

      const ruta = await Ruta.findByPk(id);
      if (!ruta) {
        return res
          .status(404)
          .json({ ok: false, message: "La ruta no existe" });
      }

      if (ruta.idEstadoRuta === 2) {
        return res
          .status(400)
          .json({
            ok: false,
            message: "No se puede eliminar una ruta que está en ejecución",
          });
      }

      await RutaDetail.destroy({ where: { idRuta: id }, transaction: t });
      await Ruta.destroy({ where: { idRuta: id }, transaction: t });

      await t.commit();
      return res.json({ ok: true, message: "Ruta eliminada correctamente" });
    } catch (error) {
      await t.rollback();
      console.error("Error en deleteRuta:", error);
      return res
        .status(500)
        .json({
          ok: false,
          message: "Error al eliminar la ruta",
          error: error.message,
        });
    }
  },

  // 7. Asignación masiva de pedidos a una ruta mediante filtros por zona
  assignOrdersByZone: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { idRuta } = req.params;

      const ruta = await Ruta.findByPk(idRuta, { transaction: t });
      if (!ruta) {
        await t.rollback();
        return res.status(404).json({ ok: false, message: "La ruta no existe" });
      }

      // Buscar pedidos en estado "Separación" (id_estado_pedido = 2)
      // de clientes que pertenezcan a la misma zona de la ruta
      const pedidosParaAsignar = await db.Order.findAll({
        where: { id_estado_pedido: 2 },
        include: [
          {
            model: Customer,
            as: "cliente",
            where: { idZona: ruta.idZona },
            attributes: ["idCliente"],
          },
        ],
        transaction: t,
      });

      if (pedidosParaAsignar.length === 0) {
        await t.rollback();
        return res.status(404).json({
          ok: false,
          message: "No se encontraron pedidos listos (en Separación) para esta zona.",
        });
      }

      // Obtener la última secuencia de parada actual para no sobreescribir
      const maxSecuencia = await RutaDetail.max("secuenciaParada", {
        where: { idRuta },
        transaction: t,
      });
      let nextSecuencia = (maxSecuencia || 0) + 1;

      // Obtener pedidos que YA están en la ruta para no duplicar
      const detallesActuales = await RutaDetail.findAll({
        where: { idRuta },
        attributes: ["idPedido"],
        transaction: t,
      });
      const pedidosYaAsignados = new Set(detallesActuales.map((d) => d.idPedido));

      const nuevosDetalles = [];
      for (const pedido of pedidosParaAsignar) {
        if (!pedidosYaAsignados.has(pedido.id_pedido)) {
          nuevosDetalles.push({
            idRuta: parseInt(idRuta),
            secuenciaParada: nextSecuencia++,
            idCliente: pedido.cliente.idCliente,
            idPedido: pedido.id_pedido,
            estadoVisita: "Pendiente",
          });
        }
      }

      if (nuevosDetalles.length > 0) {
        await RutaDetail.bulkCreate(nuevosDetalles, { transaction: t });
      }

      await t.commit();

      return res.json({
        ok: true,
        message: `Se asignaron ${nuevosDetalles.length} pedidos a la ruta exitosamente.`,
      });
    } catch (error) {
      await t.rollback();
      console.error("Error en assignOrdersByZone:", error);
      return res.status(500).json({
        ok: false,
        message: "Error al asignar pedidos por zona",
        error: error.message,
      });
    }
  },
};

export default rutaController;
