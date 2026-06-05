import { response } from "express";
import db from "../models/index.model.js";

const zonaController = {
  // 1. Obtener todas las zonas registradas
  getAllZonas: async (req, res = response) => {
    try {
      if (!db.Zona) {
        throw new Error("El modelo Zona no está inicializado.");
      }

      const zonas = await db.Zona.findAll({
        order: [["idZona", "ASC"]],
      });
      return res.status(200).json(zonas);
    } catch (error) {
      console.error("Error en getAllZonas:", error);
      return res.status(500).json({
        status: "error",
        message: "Error al obtener las zonas",
        error: error.message,
      });
    }
  },

  // 2. Obtener una zona específica por su ID
  getZonaById: async (req, res = response) => {
    const { id } = req.params;
    try {
      const zona = await db.Zona.findByPk(id);
      if (!zona) {
        return res.status(404).json({
          status: "error",
          message: "Zona no encontrada",
        });
      }
      return res.json(zona);
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error al obtener la zona",
        error: error.message,
      });
    }
  },

  // 3. Crear una nueva zona en el sistema
  createZona: async (req, res = response) => {
    try {
      // ✅ Se recibe id_estado o idEstado del body
      const { nombre_zona, descripcion, id_estado, idEstado } = req.body;

      if (!nombre_zona) {
        return res.status(400).json({
          status: "error",
          message: "El nombre de la zona es obligatorio.",
        });
      }

      const nuevaZona = await db.Zona.create({
        nombreZona: nombre_zona,
        descripcion: descripcion,
        // ✅ Adaptado al nuevo campo idEstado
        idEstado: idEstado || id_estado || 1,
      });

      return res.status(201).json({
        status: "success",
        message: "Zona creada con éxito",
        data: nuevaZona,
      });
    } catch (error) {
      const errorMsg =
        error.name === "SequelizeValidationError"
          ? error.errors.map((e) => e.message).join(", ")
          : error.message;

      return res.status(400).json({
        status: "error",
        message: "No se pudo crear la zona.",
        error: errorMsg,
      });
    }
  },

  // 4. Actualizar los datos de una zona existente
  updateZona: async (req, res = response) => {
    const { id } = req.params;
    try {
      const { nombre_zona, descripcion, id_estado, idEstado } = req.body;
      const dataToUpdate = {};

      if (nombre_zona) dataToUpdate.nombreZona = nombre_zona;
      if (descripcion !== undefined) dataToUpdate.descripcion = descripcion;

      // ✅ Adaptado al nuevo campo idEstado
      const estadoFinal = idEstado || id_estado;
      if (estadoFinal !== undefined) dataToUpdate.idEstado = estadoFinal;

      const [updated] = await db.Zona.update(dataToUpdate, {
        where: { idZona: id },
      });

      if (updated === 0) {
        return res.status(404).json({
          status: "error",
          message: "Zona no encontrada o sin cambios aplicados.",
        });
      }

      const zonaActualizada = await db.Zona.findByPk(id);
      return res.json({
        status: "success",
        message: "Zona actualizada con éxito",
        data: zonaActualizada,
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error al actualizar la zona",
        error: error.message,
      });
    }
  },

  // 5. Eliminar una zona (Borrado físico)
  deleteZona: async (req, res = response) => {
    const { id } = req.params;
    try {
      // Intentamos encontrar el registro primero para verificar su existencia
      const zona = await db.Zona.findByPk(id);

      if (!zona) {
        return res.status(404).json({
          status: "error",
          message: "No se encontró la zona que intenta eliminar.",
        });
      }

      // Ejecución del borrado físico en la base de datos
      await zona.destroy();

      return res.status(200).json({
        status: "success",
        message: "Zona eliminada permanentemente del sistema.",
      });
    } catch (error) {
      console.error("❌ Error en deleteZona:", error);

      // Manejo de error por integridad referencial (si la zona tiene clientes asociados)
      if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).json({
          status: "error",
          message:
            "No se puede eliminar la zona porque tiene registros (clientes) asociados. Considere inactivarla en su lugar.",
        });
      }

      return res.status(500).json({
        status: "error",
        message: "Error interno al intentar eliminar la zona.",
        error: error.message,
      });
    }
  },
};

export default zonaController;
