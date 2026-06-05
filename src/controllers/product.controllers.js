import { response } from "express";
import db from "../models/index.model.js";
import { resolveImageUrl } from "../services/image.service.js";

const { Op } = db.Sequelize;
const DEFAULT_MIN_STOCK = 5;

const parseDateOnly = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : value;
};

const getDateFilterValue = (query, keys) => {
  for (const key of keys) {
    if (query[key]) return query[key];
  }
  return null;
};

const buildInventoryDateFilter = (query) => {
  const fechaDesde = parseDateOnly(
    getDateFilterValue(query, ["fechaDesde", "desde", "dateFrom", "startDate", "from"]),
  );
  const fechaHasta = parseDateOnly(
    getDateFilterValue(query, ["fechaHasta", "hasta", "dateTo", "endDate", "to"]),
  );

  if (fechaDesde && fechaHasta) {
    return { fecha_registro: { [Op.between]: [fechaDesde, fechaHasta] } };
  }

  if (fechaDesde) {
    return { fecha_registro: { [Op.gte]: fechaDesde } };
  }

  if (fechaHasta) {
    return { fecha_registro: { [Op.lte]: fechaHasta } };
  }

  return {};
};

const toNumber = (value) => Number(value ?? 0);

const getInventoryFilterEcho = (query) => ({
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

const productController = {
  getInventorySummary: async (req, res = response) => {
    try {
      const minStock = Number(req.query.umbralMinimo ?? req.query.minStock ?? DEFAULT_MIN_STOCK);
      const safeMinStock = Number.isFinite(minStock) ? minStock : DEFAULT_MIN_STOCK;
      const where = {
        id_estado: 1,
        ...buildInventoryDateFilter(req.query),
      };

      const summaryRows = await db.Product.findAll({
        attributes: [
          [
            db.sequelize.fn(
              "COALESCE",
              db.sequelize.fn(
                "SUM",
                db.sequelize.literal("stock_buen_estado * precio_compra"),
              ),
              0,
            ),
            "valorTotalInventario",
          ],
          [
            db.sequelize.fn(
              "COALESCE",
              db.sequelize.fn("SUM", db.sequelize.col("stock_defectuoso")),
              0,
            ),
            "mermaStockDefectuoso",
          ],
        ],
        where,
        raw: true,
      });

      const productosAgotadosCriticos = await db.Product.count({
        where: {
          ...where,
          [Op.or]: [
            { stock_buen_estado: 0 },
            { stock_buen_estado: { [Op.lt]: safeMinStock } },
          ],
        },
      });
      const productosActivos = await db.Product.count({ where });
      const summaryRow = summaryRows[0] ?? {};
      const summary = {
        valorTotalInventario: toNumber(summaryRow.valorTotalInventario),
        productosAgotadosCriticos,
        mermaStockDefectuoso: toNumber(summaryRow.mermaStockDefectuoso),
        productosActivos,
        umbralMinimo: safeMinStock,
        filtros: getInventoryFilterEcho(req.query),
      };

      return res.status(200).json({
        ok: true,
        ...summary,
        data: summary,
      });
    } catch (error) {
      console.error("Error en getInventorySummary:", error);
      return res.status(500).json({
        status: "error",
        message: "Error al obtener resumen de inventario",
        error: error.message,
      });
    }
  },

  getInventoryList: async (req, res = response) => {
    try {
      const where = {
        id_estado: 1,
        ...buildInventoryDateFilter(req.query),
      };

      const products = await db.Product.findAll({
        attributes: [
          "id_producto",
          "referencia",
          "nombre",
          "marca",
          "precio_compra",
          "stock_buen_estado",
          "stock_defectuoso",
          "fecha_registro",
        ],
        where,
        order: [["nombre", "ASC"]],
        raw: true,
      });

      const inventory = products.map((product) => ({
        id_producto: product.id_producto,
        referencia: product.referencia,
        nombre: product.nombre,
        marca: product.marca,
        precio_compra: toNumber(product.precio_compra),
        stock_buen_estado: toNumber(product.stock_buen_estado),
        stock_defectuoso: toNumber(product.stock_defectuoso),
        fecha_registro: product.fecha_registro,
      }));

      return res.status(200).json({
        ok: true,
        total: inventory.length,
        filtros: getInventoryFilterEcho(req.query),
        data: inventory,
      });
    } catch (error) {
      console.error("Error en getInventoryList:", error);
      return res.status(500).json({
        status: "error",
        message: "Error al obtener inventario operativo",
        error: error.message,
      });
    }
  },

  // 1. Obtener todos los productos
  getAllProducts: async (req, res = response) => {
    try {
      const products = await db.Product.findAll({
        attributes: [
          "id_producto",
          "referencia",
          "nombre",
          "descripcion",
          "marca",
          "modelo",
          "imagen_url",
          "precio_compra",
          "precio_publico",
          "precio_mayorista",
          "precio_minorista",
          "stock_buen_estado",
          "stock_defectuoso",
          "fecha_registro",
          "id_categoria",
          "id_estado",
        ],
        include: [
          {
            model: db.Category,
            as: "categoria",
            attributes: ["nombre_categoria"],
          },
        ],
        order: [["id_producto", "ASC"]],
      });
      const formattedProducts = products.map((prod) => {
        const plain = prod.toJSON ? prod.toJSON() : prod;
        const stock = plain.stock_buen_estado ?? 0;
        
        let newName = plain.nombre;
        if (plain.referencia) {
          newName += ` (${plain.referencia})`;
        }
        newName += ` [Disponibles: ${stock}]`;
        
        return {
          ...plain,
          nombre_original: plain.nombre,
          nombre: newName
        };
      });

      return res.status(200).json(formattedProducts);
    } catch (error) {
      console.error("Error en getAllProducts:", error);
      return res.status(500).json({
        status: "error",
        message: "Error al obtener productos",
        error: error.message,
      });
    }
  },

  // 2. Obtener producto por ID
  getProductById: async (req, res = response) => {
    const { id } = req.params;
    try {
      const product = await db.Product.findByPk(id, {
        attributes: { exclude: ["id_categoria"] },
        include: [
          {
            model: db.Category,
            as: "categoria",
            attributes: ["nombre_categoria"],
          },
        ],
      });

      if (!product) {
        return res
          .status(404)
          .json({ status: "error", message: "Producto no encontrado" });
      }
      return res.json(product);
    } catch (error) {
      console.error("Error en getProductById:", error);
      return res.status(500).json({ status: "error", error: error.message });
    }
  },

  // 3. Crear producto
  createProduct: async (req, res = response) => {
    try {
      const {
        id_categoria,
        stock_buen_estado,
        stock_defectuoso,
        precio_compra,
        precio_publico,
        precio_mayorista,
        precio_minorista,
        id_estado,
        fecha_registro,
        ...rest
      } = req.body;

      const newProduct = await db.Product.create({
        ...rest,
        id_categoria: parseInt(id_categoria),
        stock_buen_estado: parseInt(stock_buen_estado) || 0,
        stock_defectuoso: parseInt(stock_defectuoso) || 0,
        precio_compra: parseFloat(precio_compra) || 0,
        precio_publico: parseFloat(precio_publico) || 0,
        precio_mayorista: parseFloat(precio_mayorista) || 0,
        precio_minorista: parseFloat(precio_minorista) || 0,
        imagen_url: resolveImageUrl(req.file),
        id_estado: parseInt(id_estado) || 1,
        fecha_registro: fecha_registro || undefined,
      });

      return res.status(201).json({
        status: "success",
        message: "Producto registrado con éxito",
        data: newProduct,
      });
    } catch (error) {
      console.error("Error en createProduct:", error);
      return res.status(500).json({
        status: "error",
        message: "Error al procesar la solicitud",
        error: error.message,
      });
    }
  },

  // 4. Actualizar producto
  updateProduct: async (req, res = response) => {
    const { id } = req.params;
    try {
      const {
        id_categoria,
        stock_buen_estado,
        stock_defectuoso,
        precio_compra,
        precio_publico,
        precio_mayorista,
        precio_minorista,
        id_estado,
        fecha_registro,
        ...data
      } = req.body;

      const dataToUpdate = { ...data };

      // Conversiones numéricas seguras (solo si el campo está presente en el body)
      if (id_categoria !== undefined)
        dataToUpdate.id_categoria = parseInt(id_categoria);
      if (stock_buen_estado !== undefined)
        dataToUpdate.stock_buen_estado = parseInt(stock_buen_estado);
      if (stock_defectuoso !== undefined)
        dataToUpdate.stock_defectuoso = parseInt(stock_defectuoso);
      if (precio_compra !== undefined)
        dataToUpdate.precio_compra = parseFloat(precio_compra);
      if (precio_publico !== undefined)
        dataToUpdate.precio_publico = parseFloat(precio_publico);
      if (precio_mayorista !== undefined)
        dataToUpdate.precio_mayorista = parseFloat(precio_mayorista);
      if (precio_minorista !== undefined)
        dataToUpdate.precio_minorista = parseFloat(precio_minorista);
      if (id_estado !== undefined)
        dataToUpdate.id_estado = parseInt(id_estado);
      if (fecha_registro !== undefined)
        dataToUpdate.fecha_registro = fecha_registro;

      // Actualiza la imagen solo si se subió un nuevo archivo
      if (req.file) {
        dataToUpdate.imagen_url = resolveImageUrl(req.file);
      }

      const [rowsUpdated] = await db.Product.update(dataToUpdate, {
        where: { id_producto: id },
      });

      if (rowsUpdated === 0) {
        return res.status(404).json({
          status: "error",
          message: "Producto no encontrado o sin cambios",
        });
      }

      const productUpdated = await db.Product.findByPk(id);
      return res.json({ status: "success", data: productUpdated });
    } catch (error) {
      console.error("Error en updateProduct:", error);
      return res.status(500).json({ status: "error", error: error.message });
    }
  },

  // 5. Eliminar producto
  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const producto = await db.Product.findByPk(id);

      if (!producto) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }

      await producto.destroy();

      return res.json({
        status: "success",
        message: "Producto eliminado correctamente",
      });
    } catch (error) {
      console.error("Error al eliminar:", error);
      return res.status(500).json({ message: "Error al eliminar el producto" });
    }
  },
};

export default productController;
