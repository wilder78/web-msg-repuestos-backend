import { response } from "express";
import db from "../models/index.model.js";
import { Op } from "sequelize";

const { Customer, Product, Order } = db;

const searchController = {
  globalSearch: async (req, res = response) => {
    try {
      const { q } = req.query;
      if (!q || q.trim().length < 3) {
        return res.status(200).json({
          clientes: [],
          pedidos: [],
          productos: []
        });
      }

      const query = String(q).trim();

      // 1. Clientes: razonSocial, numeroDocumento, telefono
      const clientesPromise = Customer.findAll({
        where: {
          [Op.or]: [
            { razonSocial: { [Op.like]: `%${query}%` } },
            { numeroDocumento: { [Op.like]: `%${query}%` } },
            { telefono: { [Op.like]: `%${query}%` } }
          ]
        },
        limit: 5,
        attributes: ["idCliente", "razonSocial", "numeroDocumento"]
      });

      // 2. Productos: nombre, referencia
      const productosPromise = Product.findAll({
        where: {
          [Op.or]: [
            { nombre: { [Op.like]: `%${query}%` } },
            { referencia: { [Op.like]: `%${query}%` } }
          ]
        },
        limit: 5,
        attributes: ["id_producto", "nombre", "referencia"]
      });

      // 3. Pedidos: id_pedido
      let ordersWhere;
      const parsedId = parseInt(query, 10);
      if (!isNaN(parsedId)) {
        ordersWhere = { id_pedido: parsedId };
      } else {
        ordersWhere = db.sequelize.where(
          db.sequelize.cast(db.sequelize.col("id_pedido"), "CHAR"),
          { [Op.like]: `%${query}%` }
        );
      }

      const pedidosPromise = Order.findAll({
        where: ordersWhere,
        limit: 5,
        attributes: ["id_pedido", "fecha_pedido", "id_estado_pedido"],
        include: [
          {
            model: Customer,
            as: "cliente",
            attributes: ["razonSocial"]
          }
        ]
      });

      // Execute queries concurrently
      const [clientes, productos, pedidos] = await Promise.all([
        clientesPromise,
        productosPromise,
        pedidosPromise
      ]);

      return res.status(200).json({
        clientes,
        productos,
        pedidos
      });
    } catch (error) {
      console.error("Error en búsqueda global:", error);
      return res.status(500).json({
        status: "error",
        message: "Error interno al realizar la búsqueda global",
        error: error.message
      });
    }
  }
};

export default searchController;
