import { response } from "express";
import db from "../models/index.model.js";
import { generateReturnPDF } from "../services/pdf.services.js";


const returnController = {
  // 1. Crear una nueva devolución
  createReturn: async (req, res = response) => {
    const t = await db.sequelize.transaction();
    try {
      const {
        idCliente,
        idPedido,
        idVenta, // Puede venir como idVenta o id_venta
        totalDevolucion,
        motivo,
        itemsDevueltos,
        detalles: detallesInput,
      } = req.body;

      // --- 1. Identificar la Venta (Reforzado) ---
      // Buscamos el ID en el body bajo ambos posibles nombres (camelCase y snake_case)
      let finalIdVenta = idVenta || req.body.id_venta;

      // Si aún no tenemos idVenta, intentamos localizarlo mediante el idPedido
      if (!finalIdVenta && idPedido) {
        const saleRecord = await db.Sale.findOne({ 
            where: { idPedido: idPedido } // Ajusta a 'id_pedido' si en tu modelo de Sale el campo es snake_case
        });
        
        if (saleRecord) {
            finalIdVenta = saleRecord.idVenta || saleRecord.id_venta;
        }
      }

      // Si después de los intentos no hay ID de venta, devolvemos error descriptivo
      if (!finalIdVenta) {
        await t.rollback();
        return res.status(400).json({
          status: "error",
          message: `No se encontró una venta asociada al pedido #${idPedido}. Asegúrese de que el pedido esté facturado.`,
        });
      }

      // --- 2. Crear cabecera de devolución ---
      const newReturn = await db.CustomerReturn.create(
        {
          idVenta: finalIdVenta,
          idCliente,
          totalAjuste: totalDevolucion || req.body.totalAjuste || 0,
          motivo,
          idEstadoDevolucion: 1,
          tipoAjuste: "Devolución de Mercancía",
        },
        { transaction: t },
      );

      // --- 3. Procesar Detalles y Stock ---
      const rawDetails = detallesInput || itemsDevueltos || [];
      const processedDetailsForPDF = [];

      for (const item of rawDetails) {
        const cantidad = Number(item.cantidadDevuelta || item.cantDevolver || 0);
        const precio = Number(item.precioUnitario || 0);
        const subtotal = Number(item.subtotalLinea || cantidad * precio);

        await db.ReturnDetail.create(
          {
            idDevolucion: newReturn.idDevolucion,
            idProducto: item.idProducto || item.id_producto,
            cantidadDevuelta: cantidad,
            precioUnitario: precio,
            subtotalLinea: subtotal,
          },
          { transaction: t },
        );

        // Incrementar stock físico
        await db.Product.increment("stock_buen_estado", {
          by: cantidad,
          where: { id_producto: item.idProducto || item.id_producto },
          transaction: t,
        });

        processedDetailsForPDF.push({
          idProducto: item.idProducto || item.id_producto,
          nombreProducto: item.nombreProducto || "Producto",
          cantidadDevuelta: cantidad,
          precioUnitario: precio,
          subtotalLinea: subtotal,
        });
      }

      // Confirmar en DB (Commit) antes de procesos externos (Cloudinary)
      await t.commit();

      // --- 4. Generación de PDF y Registro de URL en DB ---
      let pdfUrl = null;
      try {
        const cleanReturnData = newReturn.get({ plain: true });

        // Obtenemos la URL segura de Cloudinary
        pdfUrl = await generateReturnPDF(
          { 
            ...cleanReturnData, 
            clienteNombre: req.body.clienteNombre,
            numeroDocumento: req.body.numeroDocumento 
          },
          processedDetailsForPDF,
        );

        // Actualizamos el registro con la URL del comprobante
        if (pdfUrl) {
          await newReturn.update({ urlComprobante: pdfUrl });
        }
      } catch (pdfError) {
        console.error("⚠️ Error con Cloudinary/PDF:", pdfError);
      }

      return res.status(201).json({
        status: "success",
        message: "Devolución registrada exitosamente.",
        pdfUrl,
        data: newReturn,
      });
    } catch (error) {
      if (!t.finished) await t.rollback();
      console.error("❌ Error en createReturn:", error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  },

  // 2. Anular una devolución
  cancelReturn: async (req, res = response) => {
    const { id } = req.params;
    const { idUsuarioAutoriza } = req.body;
    const t = await db.sequelize.transaction();

    try {
      const devolucion = await db.CustomerReturn.findByPk(id, {
        include: [{ model: db.ReturnDetail, as: "detalles" }],
        transaction: t,
      });

      if (!devolucion) {
        await t.rollback();
        return res.status(404).json({ status: "error", message: "Devolución no encontrada." });
      }

      if (devolucion.idEstadoDevolucion === 2) {
        await t.rollback();
        return res.status(400).json({ status: "error", message: "Esta devolución ya está anulada." });
      }

      // Revertir Stock
      if (devolucion.detalles) {
        for (const item of devolucion.detalles) {
          await db.Product.decrement("stock_buen_estado", {
            by: item.cantidadDevuelta,
            where: { id_producto: item.idProducto },
            transaction: t,
          });
        }
      }

      await devolucion.update(
        {
          idEstadoDevolucion: 2,
          idUsuarioAnulo: idUsuarioAutoriza || null,
          fechaAnulacion: new Date(),
        },
        { transaction: t },
      );

      await t.commit();
      return res.json({
        status: "success",
        message: "Devolución anulada y stock actualizado.",
      });
    } catch (error) {
      if (!t.finished) await t.rollback();
      console.error("❌ Error en cancelReturn:", error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  },

  // 3. Obtener historial (Incluyendo la nueva URL)
  getAllReturns: async (req, res = response) => {
    try {
      const includes = [
        {
          model: db.ReturnDetail,
          as: "detalles",
          include: [
            {
              model: db.Product,
              as: "producto",
              attributes: ["nombre", "referencia"],
            },
          ],
        },
      ];

      if (db.Customer) {
        includes.push({
          model: db.Customer,
          as: "cliente",
          attributes: ["razonSocial"],
        });
      }

      const UserModel = db.User || db.Usuario;
      if (UserModel) {
        includes.push({
          model: UserModel,
          as: "usuarioAnulo",
          attributes: ["nombreUsuario"],
        });
      }

      const returns = await db.CustomerReturn.findAll({
        include: includes,
        order: [["idDevolucion", "DESC"]],
      });

      return res.json(returns);
    } catch (error) {
      console.error("❌ Error en getAllReturns:", error);
      return res.status(500).json({ status: "error", message: error.message });
    }
  },
};

export default returnController;
