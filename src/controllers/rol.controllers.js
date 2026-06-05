import db from "../models/index.model.js";

const { Rol } = db;
const { Op } = db.Sequelize;

const rolController = {
  // 1. Obtener todos los roles
  getAllRoles: async (req, res) => {
    try {
      const roles = await Rol.findAll({
        attributes: ["idRol", "nombreRol", "descripcion", "idEstado"],
        order: [["idRol", "ASC"]],
      });
      return res.status(200).json(roles);
    } catch (error) {
      console.error("❌ Error en getAllRoles:", error);
      return res.status(500).json({ error: "Error al obtener roles" });
    }
  },

  // 2. Obtener un rol específico por su ID
  getRolById: async (req, res) => {
    try {
      const { id } = req.params;
      const rol = await Rol.findByPk(id, {
        attributes: ["idRol", "nombreRol", "descripcion", "idEstado"],
      });

      if (!rol) {
        return res.status(404).json({ error: "Rol no encontrado" });
      }

      return res.status(200).json(rol);
    } catch (error) {
      console.error("❌ Error en getRolById:", error);
      return res.status(500).json({ error: "Error al obtener el rol" });
    }
  },

  // 3. Crear un nuevo rol
  createRol: async (req, res) => {
    try {
      const { nombreRol, descripcion } = req.body;

      if (!nombreRol || nombreRol.trim() === "") {
        return res
          .status(400)
          .json({ error: "El nombre del rol es obligatorio" });
      }

      const nombreRolTrimmed = nombreRol.trim();
      if (!/^[a-zA-Z\s]+$/.test(nombreRolTrimmed)) {
        return res.status(400).json({
          error: "El nombre del rol solo puede contener letras y espacios.",
        });
      }

      // Validación de existencia previa
      const existingRol = await Rol.findOne({
        where: { nombreRol: nombreRolTrimmed },
      });

      if (existingRol) {
        return res.status(400).json({
          error: `El rol "${nombreRol}" ya existe en el sistema.`,
        });
      }

      const newRol = await Rol.create({
        nombreRol: nombreRolTrimmed,
        descripcion,
        idEstado: 1,
      });

      return res.status(201).json({
        message: "Rol creado con éxito",
        data: newRol,
      });
    } catch (error) {
      console.error("❌ Error en createRol:", error);
      return res.status(500).json({ error: "Error interno al crear el rol" });
    }
  },

  // 4. Modificar un rol existente
  updateRol: async (req, res) => {
    try {
      const { id } = req.params;
      let { nombreRol, descripcion, idEstado } = req.body;

      // 1. Buscar si el registro existe
      const rolExistente = await Rol.findByPk(id);
      if (!rolExistente) {
        return res.status(404).json({ error: "Rol no encontrado" });
      }

      // 2. Lógica de Protección Especial para el Rol Master (ID: 1)
      if (Number(id) === 1) {
        // Bloqueamos el cambio de nombre y estado para el ID 1
        nombreRol = rolExistente.nombreRol;
        idEstado = rolExistente.idEstado;

        console.log(
          "⚠️ Intento de modificar campos protegidos en Rol Master (ID 1) fue omitido.",
        );
      }

      // 3. Validación de Duplicados (solo si el nombre cambia y no es el ID 1)
      if (
        nombreRol &&
        nombreRol.trim().toLowerCase() !== rolExistente.nombreRol.toLowerCase()
      ) {
        // Usamos Op.like si lo tienes importado para ser más precisos con MySQL
        const nombreDuplicado = await Rol.findOne({
          where: { nombreRol: nombreRol.trim() },
        });

        if (nombreDuplicado) {
          return res
            .status(400)
            .json({ error: "El nuevo nombre de rol ya está en uso." });
        }
      }

      // 4. Actualización Directa en la BD
      const [updatedRows] = await Rol.update(
        {
          nombreRol:
            nombreRol !== undefined ? nombreRol.trim() : rolExistente.nombreRol,
          descripcion:
            descripcion !== undefined ? descripcion : rolExistente.descripcion,
          idEstado: idEstado !== undefined ? idEstado : rolExistente.idEstado,
        },
        {
          where: { idRol: id }, // Usamos idRol que es el nombre en tu modelo
        },
      );

      // 5. Verificar si hubo cambios reales o si se intentó algo no permitido
      if (updatedRows === 0) {
        return res.status(200).json({
          ok: true,
          message:
            Number(id) === 1
              ? "No se aplicaron cambios (en el Rol Master solo se permite editar la descripción)."
              : "No se detectaron cambios en el registro.",
          data: rolExistente,
        });
      }

      // 6. Obtener el registro actualizado para confirmar
      const rolActualizado = await Rol.findByPk(id);

      return res.status(200).json({
        ok: true,
        message:
          Number(id) === 1
            ? "Rol Master actualizado (solo se modificó la descripción)."
            : "Rol actualizado exitosamente.",
        data: rolActualizado,
      });
    } catch (error) {
      console.error("❌ Error al actualizar rol:", error);
      return res.status(500).json({
        ok: false,
        error: "Error interno al procesar la actualización",
        details: error.message,
      });
    }
  },

  // 5. Eliminación de un rol
  deleteRol: async (req, res) => {
    try {
      const { id } = req.params;

      if (Number(id) === 1) {
        return res.status(403).json({
          error: "Operación prohibida: El rol Master no puede ser eliminado.",
        });
      }

      const deleted = await Rol.destroy({ where: { idRol: id } });

      if (deleted) {
        return res.status(200).json({
          message: "El rol ha sido eliminado permanentemente.",
        });
      } else {
        return res.status(404).json({ error: "Rol no encontrado" });
      }
    } catch (error) {
      console.error("❌ Error en deleteRol:", error);
      if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(400).json({
          error:
            "No se puede eliminar el rol porque tiene usuarios o permisos asociados.",
        });
      }
      return res
        .status(500)
        .json({ error: "Error interno al eliminar el rol" });
    }
  },
};

export default rolController;
