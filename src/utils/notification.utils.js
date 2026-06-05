import db from "../models/index.model.js";

export const createNotification = async ({ titulo, mensaje, tipo, id_rol_destino = null, id_usuario_destino = null }, transaction = null) => {
  try {
    await db.Notification.create({
      titulo,
      mensaje,
      tipo,
      id_rol_destino,
      id_usuario_destino,
      is_read: false,
      fecha_registro: new Date()
    }, { transaction });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const checkProductStockAndNotify = async (product, transaction = null) => {
  try {
    if (product.stock_buen_estado <= 5) {
      const title = `Stock Bajo: ${product.nombre}`;
      const existing = await db.Notification.findOne({
        where: {
          titulo: title,
          is_read: false
        },
        transaction
      });

      if (!existing) {
        await db.Notification.create({
          titulo: title,
          mensaje: `El repuesto "${product.nombre}" (Referencia: ${product.referencia}) tiene stock bajo (${product.stock_buen_estado} unidades restantes).`,
          tipo: "stock_bajo",
          id_rol_destino: 1, // Rol de Administrador / Master
          is_read: false,
          fecha_registro: new Date()
        }, { transaction });
      }
    }
  } catch (error) {
    console.error("Error checking product stock for notification:", error);
  }
};
