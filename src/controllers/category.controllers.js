import { response } from "express";
import db from "../models/index.model.js";

const categoryController = {
  // 1. Recuperación de catálogo
  getAllCategories: async (req, res = response) => {
    try {
      if (!db.Category) {
        throw new Error("El modelo Category no está inicializado.");
      }

      const categories = await db.Category.findAll({
        // Se mantiene el orden por la PK corregida
        order: [["id_categoria", "ASC"]],
      });
      return res.status(200).json(categories);
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error al obtener las categorías",
        error: error.message,
      });
    }
  },

  // 2. Consulta puntual de clasificación
  getCategoryById: async (req, res = response) => {
    const { id } = req.params;
    try {
      const category = await db.Category.findByPk(id);
      if (!category) {
        return res.status(404).json({
          status: "error",
          message: "Categoría no encontrada",
        });
      }
      return res.json(category);
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error al obtener la categoría",
        error: error.message,
      });
    }
  },

  // 3. Creación de taxonomía
  createCategory: async (req, res = response) => {
    try {
      if (!req.body.nombre_categoria) {
        return res.status(400).json({
          status: "error",
          message: "El nombre de la categoría es obligatorio.",
        });
      }

      // El modelo ahora persistirá req.body incluyendo id_estado si viene, o usará el default (1)
      const newCategory = await db.Category.create(req.body);
      return res.status(201).json({
        status: "success",
        message: "Categoría creada con éxito",
        data: newCategory,
      });
    } catch (error) {
      const errorMsg =
        error.name === "SequelizeValidationError"
          ? error.errors.map((e) => e.message).join(", ")
          : error.message;

      return res.status(400).json({
        status: "error",
        message: "No se pudo crear la categoría.",
        error: errorMsg,
      });
    }
  },

  // 4. Mantenimiento de registros
  updateCategory: async (req, res = response) => {
    const { id } = req.params;
    try {
      // Limpiamos req.body de las claves primarias para evitar conflictos
      const { id_categoria, ...dataToUpdate } = req.body;

      const [updated] = await db.Category.update(dataToUpdate, {
        where: { id_categoria: id },
      });

      if (updated === 0) {
        return res.status(404).json({
          status: "error",
          message: "Categoría no encontrada o sin cambios aplicados.",
        });
      }

      const categoryUpdated = await db.Category.findByPk(id);
      return res.json({
        status: "success",
        message: "Categoría actualizada con éxito",
        data: categoryUpdated,
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error al actualizar la categoría",
        error: error.message,
      });
    }
  },

  // 5. Gestión de estatus (Baja Lógica)
  deleteCategory: async (req, res = response) => {
    const { id } = req.params;
    try {
      // CORRECCIÓN: Se cambió 'activo' por 'id_estado' para coincidir con el modelo y DB
      const [result] = await db.Category.update(
        { id_estado: 0 },
        {
          where: { id_categoria: id },
        },
      );

      if (result === 0) {
        return res.status(404).json({
          status: "error",
          message: "No se encontró la categoría para desactivar.",
        });
      }

      return res.json({
        status: "success",
        message: "Categoría desactivada correctamente",
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error al desactivar la categoría",
        error: error.message,
      });
    }
  },
};

export default categoryController;

// import { response } from "express";
// import db from "../models/index.model.js";

// const categoryController = {
//   // 1. Recuperación de catálogo: Extrae todas las categorías registradas, ordenadas por su identificador para facilitar la jerarquía en el frontend.
//   getAllCategories: async (req, res = response) => {
//     try {
//       if (!db.Category) {
//         throw new Error("El modelo Category no está inicializado.");
//       }

//       const categories = await db.Category.findAll({
//         order: [["id_categoria", "ASC"]],
//       });
//       return res.status(200).json(categories);
//     } catch (error) {
//       return res.status(500).json({
//         status: "error",
//         message: "Error al obtener las categorías",
//         error: error.message,
//       });
//     }
//   },

//   // 2. Consulta puntual de clasificación: Localiza una categoría específica mediante su clave primaria para validar metadatos o relaciones.
//   getCategoryById: async (req, res = response) => {
//     const { id } = req.params;
//     try {
//       const category = await db.Category.findByPk(id);
//       if (!category) {
//         return res.status(404).json({
//           status: "error",
//           message: "Categoría no encontrada",
//         });
//       }
//       return res.json(category);
//     } catch (error) {
//       return res.status(500).json({
//         status: "error",
//         message: "Error al obtener la categoría",
//         error: error.message,
//       });
//     }
//   },

//   // 3. Creación de taxonomía: Valida la integridad de la entrada y persiste una nueva clasificación para la organización de repuestos.
//   createCategory: async (req, res = response) => {
//     try {
//       if (!req.body.nombre_categoria) {
//         return res.status(400).json({
//           status: "error",
//           message: "El nombre de la categoría es obligatorio.",
//         });
//       }

//       const newCategory = await db.Category.create(req.body);
//       return res.status(201).json({
//         status: "success",
//         message: "Categoría creada con éxito",
//         data: newCategory,
//       });
//     } catch (error) {
//       const errorMsg =
//         error.name === "SequelizeValidationError"
//           ? error.errors.map((e) => e.message).join(", ")
//           : error.message;

//       return res.status(400).json({
//         status: "error",
//         message: "No se pudo crear la categoría.",
//         error: errorMsg,
//       });
//     }
//   },

//   // 4. Mantenimiento de registros: Actualiza las propiedades de la categoría protegiendo la inmutabilidad de la clave primaria.
//   updateCategory: async (req, res = response) => {
//     const { id } = req.params;
//     try {
//       const { id_categoria, ...dataToUpdate } = req.body;

//       const [updated] = await db.Category.update(dataToUpdate, {
//         where: { id_categoria: id },
//       });

//       if (updated === 0) {
//         return res.status(404).json({
//           status: "error",
//           message: "Categoría no encontrada o sin cambios aplicados.",
//         });
//       }

//       const categoryUpdated = await db.Category.findByPk(id);
//       return res.json({
//         status: "success",
//         message: "Categoría actualizada con éxito",
//         data: categoryUpdated,
//       });
//     } catch (error) {
//       return res.status(500).json({
//         status: "error",
//         message: "Error al actualizar la categoría",
//         error: error.message,
//       });
//     }
//   },

//   // 5. Gestión de estatus: Implementa una baja lógica mediante la bandera de actividad para preservar la integridad referencial de los productos asociados.
//   deleteCategory: async (req, res = response) => {
//     const { id } = req.params;
//     try {
//       const [result] = await db.Category.update(
//         { activo: 0 },
//         {
//           where: { id_categoria: id },
//         },
//       );

//       if (result === 0) {
//         return res.status(404).json({
//           status: "error",
//           message: "No se encontró la categoría para desactivar.",
//         });
//       }

//       return res.json({
//         status: "success",
//         message: "Categoría desactivada correctamente",
//       });
//     } catch (error) {
//       return res.status(500).json({
//         status: "error",
//         message: "Error al desactivar la categoría",
//         error: error.message,
//       });
//     }
//   },
// };

// export default categoryController;
