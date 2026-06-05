import db from "../models/index.model.js";
import { Op } from "sequelize";

const notificationController = {
  // Obtener notificaciones del usuario
  getNotifications: async (req, res) => {
    try {
      const idRol = req.user?.idRol;
      const idUsuario = req.user?.idUsuario;

      const notifications = await db.Notification.findAll({
        where: {
          [Op.or]: [
            { id_rol_destino: idRol },
            { id_usuario_destino: idUsuario },
            { id_rol_destino: null, id_usuario_destino: null }
          ]
        },
        order: [["fecha_registro", "DESC"]],
        limit: 50 // límite razonable de las últimas 50 notificaciones
      });

      return res.json({ ok: true, data: notifications });
    } catch (error) {
      console.error("Error in getNotifications:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  },

  // Marcar una notificación como leída
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const idRol = req.user?.idRol;
      const idUsuario = req.user?.idUsuario;

      const notification = await db.Notification.findOne({
        where: {
          id_notification: id,
          [Op.or]: [
            { id_rol_destino: idRol },
            { id_usuario_destino: idUsuario },
            { id_rol_destino: null, id_usuario_destino: null }
          ]
        }
      });

      if (!notification) {
        return res.status(404).json({ ok: false, error: "Notificación no encontrada o no autorizada." });
      }

      await notification.update({ is_read: true });

      return res.json({ ok: true, message: "Notificación marcada como leída.", data: notification });
    } catch (error) {
      console.error("Error in markAsRead:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  },

  // Marcar todas como leídas
  markAllAsRead: async (req, res) => {
    try {
      const idRol = req.user?.idRol;
      const idUsuario = req.user?.idUsuario;

      await db.Notification.update(
        { is_read: true },
        {
          where: {
            is_read: false,
            [Op.or]: [
              { id_rol_destino: idRol },
              { id_usuario_destino: idUsuario },
              { id_rol_destino: null, id_usuario_destino: null }
            ]
          }
        }
      );

      return res.json({ ok: true, message: "Todas las notificaciones fueron marcadas como leídas." });
    } catch (error) {
      console.error("Error in markAllAsRead:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }
};

export default notificationController;
