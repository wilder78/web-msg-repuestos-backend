import { response } from "express";
import db from "../models/index.model.js";

/**
 * ⚠️  ADVERTENCIA DE CONSISTENCIA DE INVENTARIO — LEER ANTES DE MODIFICAR
 * -------------------------------------------------------------------------
 * La base de datos contiene un disparador llamado `tg_restar_stock_venta`
 * que descuenta stock al insertar en la tabla `ventas`.
 *
 * El descuento de stock YA ocurrió en order.controllers.js cuando el pedido
 * pasó a estado Separación (2). Si el trigger estuviese activo, volvería a
 * descontar el stock al crear la venta, corrompiendo el inventario.
 *
 * REGLA: Este controlador NO modifica el stock bajo ninguna circunstancia.
 *        El trigger `tg_restar_stock_venta` DEBE estar deshabilitado en la DB.
 *        Para deshabilitarlo ejecutar:
 *          ALTER TABLE ventas DISABLE TRIGGER tg_restar_stock_venta;
 */

const saleController = {
  // 1. Crear una Venta a partir de un Pedido (Cierre de Facturación)
  createSale: async (req, res = response) => {
    const t = await db.sequelize.transaction();
    try {
      const { idPedido, idFormaPago, totalVenta, rutaPdf } = req.body;

      // Buscar el pedido y validar existencia
      const order = await db.Order.findByPk(idPedido, { transaction: t });
      if (!order) {
        await t.rollback();
        return res.status(404).json({
          status: "error",
          message: "El pedido especificado no existe.",
        });
      }

      // Solo se pueden facturar pedidos en estado Separación (2), Entregado (4) o Pagado (5).
      // Un pedido en Cotización (1) no tiene stock separado y no debe facturarse.
      const estadoPedido = Number(order.id_estado_pedido);
      if (estadoPedido !== 2 && estadoPedido !== 4 && estadoPedido !== 5) {
        await t.rollback();
        return res.status(400).json({
          status: "error",
          message:
            "Solo se pueden facturar pedidos en estado Separación (2), Entregado (4) o Pagado (5). " +
            `Estado actual del pedido: ${estadoPedido}.`,
        });
      }

      // Crear el registro de la venta.
      // ⚠️ Este INSERT activa `tg_restar_stock_venta` si está habilitado en la DB.
      // El trigger DEBE estar deshabilitado (ver advertencia al inicio del archivo).
      const newSale = await db.Sale.create(
        {
          idPedido,
          idFormaPago,
          totalVenta: totalVenta || order.total_neto,
          idEstadoVenta: 1,
          rutaPdf,
        },
        { transaction: t },
      );

      // Registro de venta exitoso.
      // ⚠️ El estado del pedido se gestionará de forma independiente según la lógica de negocio.
      // (Se elimina la actualización automática a estado 5 - Pagado)

      await t.commit();
      return res.status(201).json({
        status: "success",
        message: "Venta registrada con éxito y pedido marcado como 'Pagado'.",
        data: newSale,
      });
    } catch (error) {
      if (!t.finished) await t.rollback();
      return res.status(500).json({
        status: "error",
        message: "Error al procesar la venta",
        error: error.message,
      });
    }
  },

  // 2. Obtener todas las ventas con relaciones decodificadas
  getAllSales: async (req, res = response) => {
    try {
      const sales = await db.Sale.findAll({
        include: [
          {
            model: db.Order,
            as: "pedido",
            include: [
              { model: db.estadoPedido, as: "estado" },
              { model: db.Customer, as: "cliente" },
              {
                model: db.OrderDetail,
                as: "detalles",
                include: [{ model: db.Product, as: "producto" }],
              },
            ],
          },
          { model: db.CustomerReturn, as: "devoluciones" },
        ],
        order: [["idVenta", "DESC"]],
      });
      return res.json(sales);
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error al obtener las ventas",
        error: error.message,
      });
    }
  },


  // 3. Top 5 clientes por ingresos en un periodo obligatorio
  getTopCustomers: async (req, res = response) => {
    try {
      const { fechaDesde, fechaHasta } = req.query;

      if (!fechaDesde || !fechaHasta) {
        return res.status(400).json({
          status: "error",
          message: "Los parámetros fechaDesde y fechaHasta son obligatorios.",
        });
      }

      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(fechaDesde) || !datePattern.test(fechaHasta)) {
        return res.status(400).json({
          status: "error",
          message: "Las fechas deben enviarse en formato YYYY-MM-DD.",
        });
      }

      const desde = `${fechaDesde} 00:00:00`;
      const hasta = `${fechaHasta} 23:59:59`;

      const topCustomers = await db.sequelize.query(
        `
          SELECT
            c.id_cliente AS idCliente,
            c.razon_social AS razonSocial,
            c.tipo_cliente AS clasificacionComercial,
            COUNT(DISTINCT p.id_pedido) AS conteoPedidos,
            COALESCE(SUM(v.total_venta), 0) AS ingresos
          FROM ventas v
          INNER JOIN pedidos p ON p.id_pedido = v.id_pedido
          INNER JOIN clientes c ON c.id_cliente = p.id_cliente
          WHERE v.fecha_venta BETWEEN :fechaDesde AND :fechaHasta
          GROUP BY c.id_cliente, c.razon_social, c.tipo_cliente
          ORDER BY ingresos DESC
          LIMIT 5
        `,
        {
          replacements: { fechaDesde: desde, fechaHasta: hasta },
          type: db.Sequelize.QueryTypes.SELECT,
        },
      );

      return res.json(
        topCustomers.map((customer) => ({
          idCliente: customer.idCliente,
          razonSocial: customer.razonSocial,
          cliente: customer.razonSocial,
          clasificacionComercial: customer.clasificacionComercial,
          tipoCliente: customer.clasificacionComercial,
          conteoPedidos: Number(customer.conteoPedidos) || 0,
          pedidos: Number(customer.conteoPedidos) || 0,
          ingresos: Number(customer.ingresos) || 0,
          totalVenta: Number(customer.ingresos) || 0,
        })),
      );
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error al obtener el top de clientes",
        error: error.message,
      });
    }
  },
  // 3. Obtener el detalle de una venta específica
  getSaleById: async (req, res = response) => {
    try {
      const { id } = req.params;
      const sale = await db.Sale.findByPk(id, {
        include: [
          {
            model: db.Order,
            as: "pedido",
            include: [
              { model: db.estadoPedido, as: "estado" },
              { model: db.Customer, as: "cliente" },
              {
                model: db.OrderDetail,
                as: "detalles",
                include: [{ model: db.Product, as: "producto" }],
              },
            ],
          },
          "devoluciones",
        ],
      });

      if (!sale) {
        return res.status(404).json({
          status: "error",
          message: "Venta no encontrada",
        });
      }
      return res.json(sale);
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error al obtener la venta",
        error: error.message,
      });
    }
  },
};

export default saleController;
