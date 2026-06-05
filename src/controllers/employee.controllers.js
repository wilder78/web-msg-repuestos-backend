import db from "../models/index.model.js";

const Employee = db.Empleado;
const Usuario = db.Usuario;
const Rol = db.Rol;

const employeeController = {
  // 1. Registro de nuevo personal
  create: async (req, res) => {
    try {
      const { numeroDocumento, nombre, apellido } = req.body;

      // 1. Validación de campos obligatorios (opcional pero recomendada)
      if (!numeroDocumento || !nombre || !apellido) {
        return res.status(400).json({
          status: "error",
          message:
            "El número de documento, nombre y apellido son obligatorios.",
        });
      }

      // 2. Verificación de duplicados
      // Buscamos si ya existe un empleado con ese mismo número de documento
      const empleadoExistente = await Employee.findOne({
        where: { numeroDocumento: numeroDocumento },
      });

      if (empleadoExistente) {
        return res.status(400).json({
          status: "error",
          message: `El empleado con documento ${numeroDocumento} ya se encuentra registrado.`,
        });
      }

      // 3. Creación del registro
      const nuevoEmpleado = await Employee.create(req.body);

      return res.status(201).json({
        status: "success",
        message: "Empleado registrado exitosamente",
        data: nuevoEmpleado,
      });
    } catch (error) {
      console.error("❌ Error en createEmployee:", error);

      // Manejo de errores específicos de Sequelize (Unique Constraints)
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(400).json({
          status: "error",
          message: "El número de documento ya está en uso.",
          error: error.errors[0].message,
        });
      }

      return res.status(500).json({
        status: "error",
        message: "Error interno del servidor al procesar el registro.",
        error: error.message,
      });
    }
  },

  // 2. Consulta global: Filtrado por idEstado
  findAll: async (req, res) => {
    try {
      // Cambio: Ahora filtramos por idEstado: 1 (asumiendo 1 como activo)
      const empleados = await Employee.findAll({
        where: req.query.soloActivos === "true" ? { idEstado: 1 } : {},
        include: [
          {
            model: Usuario,
            as: "usuario",
            attributes: { exclude: ["id_rol", "passwordHash"] },
            include: [
              {
                model: Rol,
                as: "rol",
                attributes: ["idRol", "nombreRol"],
              },
            ],
          },
        ],
      });

      res.status(200).json(empleados);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Error al recuperar la lista de empleados",
        error: error.message,
      });
    }
  },

  // 3. Consulta individual
  findOne: async (req, res) => {
    try {
      const { id } = req.params;
      const empleado = await Employee.findByPk(id, {
        include: [
          {
            model: Usuario,
            as: "usuario",
            attributes: { exclude: ["id_rol", "passwordHash"] },
            include: [
              { model: Rol, as: "rol", attributes: ["idRol", "nombreRol"] },
            ],
          },
        ],
      });

      if (!empleado) {
        return res.status(404).json({
          status: "error",
          message: `El empleado con ID ${id} no existe.`,
        });
      }

      res.status(200).json(empleado);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Error al buscar el empleado",
        error: error.message,
      });
    }
  },

  // 4. Actualización de datos
  update: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10); // ← parseo explícito

      if (isNaN(id)) {
        return res.status(400).json({
          status: "error",
          message: "ID de empleado inválido.",
        });
      }

      // Filtra solo los campos que el modelo acepta para evitar ruido
      const {
        nombre,
        apellido,
        telefono,
        idUsuario,
        disponibilidad,
        idEstado,
        idTipoDocumento,
        numeroDocumento,
      } = req.body;

      const empleadoActual = await Employee.findByPk(id);

      if (!empleadoActual) {
        return res.status(404).json({
          status: "error",
          message: "El empleado no existe.",
        });
      }

      const isMaster = Number(req.user?.idRol) === 1;
      const changesDocumentType =
        idTipoDocumento !== undefined &&
        Number(idTipoDocumento) !== Number(empleadoActual.idTipoDocumento);
      const changesDocumentNumber =
        numeroDocumento !== undefined &&
        String(numeroDocumento) !== String(empleadoActual.numeroDocumento);

      if (!isMaster && (changesDocumentType || changesDocumentNumber)) {
        return res.status(403).json({
          status: "error",
          message:
            "Solo el usuario Master puede modificar el tipo o número de documento.",
        });
      }

      const camposActualizar = {
        ...(nombre !== undefined && { nombre }),
        ...(apellido !== undefined && { apellido }),
        ...(telefono !== undefined && { telefono }),
        ...(idUsuario !== undefined && { idUsuario }),
        ...(disponibilidad !== undefined && { disponibilidad }),
        ...(idEstado !== undefined && { idEstado }),
        ...(isMaster && idTipoDocumento !== undefined && { idTipoDocumento }),
        ...(isMaster && numeroDocumento !== undefined && { numeroDocumento }),
      };

      const [updatedRows] = await Employee.update(camposActualizar, {
        where: { idEmpleado: id }, // ← ahora es INTEGER
      });

      if (updatedRows === 0) {
        return res.status(404).json({
          status: "error",
          message: "No se realizaron cambios o el empleado no existe.",
        });
      }

      const empleadoActualizado = await Employee.findByPk(id);
      res.status(200).json({
        status: "success",
        data: empleadoActualizado,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Error durante la actualización",
        error: error.message,
      });
    }
  },

  // 5. Remoción de registro: Protección por Roles 1, 2 y 3
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ status: "error", message: "ID no válido." });
      }

      const empleado = await Employee.findByPk(id, {
        include: [
          {
            model: Usuario,
            as: "usuario",
            attributes: ["idRol"],
          },
        ],
      });

      if (!empleado) {
        return res.status(404).json({
          status: "error",
          message: "No se encontró el empleado.",
        });
      }

      const rolesProtegidos = [1, 2, 3];
      const idRolEmpleado = empleado.usuario
        ? empleado.usuario.idRol || empleado.usuario.id_rol
        : null;

      if (rolesProtegidos.includes(Number(idRolEmpleado))) {
        return res.status(403).json({
          status: "error",
          message:
            "Operación denegada: Este perfil cuenta con un rol administrativo o de ventas protegido. No se permite su eliminación física.",
        });
      }

      await Employee.destroy({
        where: { idEmpleado: id },
      });

      return res.status(200).json({
        status: "success",
        message: "Empleado eliminado permanentemente.",
      });
    } catch (error) {
      if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).json({
          status: "error",
          message:
            "No se puede eliminar: El empleado tiene historial de registros asociados. Se recomienda cambiar su idEstado a inactivo.",
        });
      }
      res.status(500).json({ status: "error", error: error.message });
    }
  },
};

export default employeeController;

// import db from "../models/index.model.js";

// const Employee = db.Empleado;

// const employeeController = {
//   // 1. Registro de nuevo personal: Valida y persiste un nuevo empleado en la base de datos.
//   create: async (req, res) => {
//     try {
//       const nuevoEmpleado = await Employee.create(req.body);

//       res.status(201).json({
//         status: "success",
//         message: "Empleado registrado exitosamente",
//         data: nuevoEmpleado,
//       });
//     } catch (error) {
//       res.status(400).json({
//         status: "error",
//         message:
//           "No se pudo crear el empleado. Verifique los campos obligatorios.",
//         error: error.message,
//       });
//     }
//   },

//   // 2. Consulta global: Recupera todos los registros, permitiendo filtrar opcionalmente solo los empleados con estatus activo.
//   findAll: async (req, res) => {
//     try {
//       const empleados = await Employee.findAll({
//         where: req.query.soloActivos === "true" ? { activo: 1 } : {},
//       });

//       res.status(200).json(empleados);
//     } catch (error) {
//       res.status(500).json({
//         status: "error",
//         message: "Error al recuperar la lista de empleados",
//         error: error.message,
//       });
//     }
//   },

//   // 3. Consulta individual: Localiza un empleado específico mediante su clave primaria (ID) y valida su existencia.
//   findOne: async (req, res) => {
//     try {
//       const { id } = req.params;
//       const empleado = await Employee.findByPk(id);

//       if (!empleado) {
//         return res.status(404).json({
//           status: "error",
//           message: `El empleado con ID ${id} no existe.`,
//         });
//       }

//       res.status(200).json(empleado);
//     } catch (error) {
//       res.status(500).json({
//         status: "error",
//         message: "Error al buscar el empleado",
//         error: error.message,
//       });
//     }
//   },

//   // 4. Actualización de datos: Modifica los campos enviados en el cuerpo de la petición para el ID especificado y retorna el registro actualizado.
//   update: async (req, res) => {
//     try {
//       const { id } = req.params;

//       const [updatedRows] = await Employee.update(req.body, {
//         where: { idEmpleado: id },
//       });

//       if (updatedRows === 0) {
//         return res.status(404).json({
//           status: "error",
//           message: "No se realizaron cambios o el empleado no existe.",
//         });
//       }

//       const empleadoActualizado = await Employee.findByPk(id);
//       res.status(200).json({
//         status: "success",
//         message: "Información actualizada correctamente",
//         data: empleadoActualizado,
//       });
//     } catch (error) {
//       res.status(500).json({
//         status: "error",
//         message: "Error durante la actualización",
//         error: error.message,
//       });
//     }
//   },

//   // 5. Remoción de registro: Borrado físico con validación por nombre de rol operativo
//   delete: async (req, res) => {
//     try {
//       const { id } = req.params;

//       // 1. Validar formato del ID
//       if (!id || isNaN(id)) {
//         return res.status(400).json({
//           status: "error",
//           message: "El ID proporcionado no es válido.",
//         });
//       }

//       // 2. Buscar al empleado para verificar su rol operativo antes de proceder
//       const empleado = await Employee.findByPk(id);

//       if (!empleado) {
//         return res.status(404).json({
//           status: "error",
//           message: "No se encontró ningún empleado con ese ID.",
//         });
//       }

//       // 3. CONDICIÓN DE SEGURIDAD: Bloquear borrado por nombre de rol
//       // Definimos la lista de cargos que no se pueden eliminar de la base de datos
//       const cargosProtegidos = [
//         "Administrador",
//         "Asistente Administrativo",
//         "Vendedor",
//       ];

//       // Verificamos si el rolOperativo del empleado está en la lista negra
//       if (cargosProtegidos.includes(empleado.rolOperativo)) {
//         return res.status(403).json({
//           status: "error",
//           message: `Operación denegada: Los registros con el cargo "${empleado.rolOperativo}" no pueden ser eliminados. Se recomienda cambiar su estado a inactivo.`,
//         });
//       }

//       // 4. Ejecutar la destrucción si pasó las validaciones anteriores
//       const rowsDeleted = await Employee.destroy({
//         where: { idEmpleado: id },
//       });

//       if (rowsDeleted === 0) {
//         return res.status(404).json({
//           status: "error",
//           message: "El registro ya no existe o no pudo ser eliminado.",
//         });
//       }

//       return res.status(200).json({
//         status: "success",
//         message: `El empleado ${empleado.nombre} ${empleado.apellido} ha sido eliminado permanentemente.`,
//       });
//     } catch (error) {
//       console.error("❌ Error en deleteEmployee:", error);

//       // Manejo de error de integridad referencial (llaves foráneas en MySQL)
//       if (error.name === "SequelizeForeignKeyConstraintError") {
//         return res.status(409).json({
//           status: "error",
//           message:
//             "No se puede eliminar porque el empleado tiene historial de ventas, compras o pedidos. Use el borrado lógico (inactivar).",
//         });
//       }

//       return res.status(500).json({
//         status: "error",
//         message: "Error interno al intentar eliminar el registro.",
//         details: error.message,
//       });
//     }
//   },
// };

// export default employeeController;
