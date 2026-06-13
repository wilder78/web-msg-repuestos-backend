import { response } from "express";
import db from "../models/index.model.js";
import { Op } from "sequelize";

const { Customer, TipoDocumento, Municipality, Department, Zona, Usuario } = db;

const sanitizeCustomer = (customer) => {
  const customerJson = customer.toJSON ? customer.toJSON() : customer;
  const { id_zona, ...clean } = customerJson;
  
  if (customerJson.municipio) {
    clean.id_municipio = customerJson.municipio.id;
    clean.idMunicipio = customerJson.municipio.id;
    clean.municipioId = customerJson.municipio.id;
    
    const dept = customerJson.municipio.departamento;
    if (dept) {
      clean.id_departamento = dept.id;
      clean.idDepartamento = dept.id;
    } else if (customerJson.municipio.departmentId) {
      clean.id_departamento = customerJson.municipio.departmentId;
      clean.idDepartamento = customerJson.municipio.departmentId;
    }
  }
  
  return clean;
};

/**
 * Valida el campo telefono:
 * - Solo dígitos (sin letras, espacios ni caracteres especiales)
 * - Longitud entre 7 y 15 caracteres
 * Retorna un mensaje de error o null si es válido.
 */
const validateTelefono = (telefono) => {
  if (telefono === undefined || telefono === null || telefono === "") {
    return null; // Campo opcional; si no se envia, se omite la validacion
  }
  const telefonoStr = String(telefono).trim();
  if (!/^\d+$/.test(telefonoStr)) {
    return "El campo telefono solo debe contener digitos numericos (sin espacios ni caracteres especiales).";
  }
  if (telefonoStr.length < 7 || telefonoStr.length > 15) {
    return "El campo telefono debe tener entre 7 y 15 digitos.";
  }
  return null;
};

const parsePositiveInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeTipoCliente = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "General";
  
  const lower = raw.toLowerCase();
  if (lower.includes("mayor")) return "Mayorista";
  if (lower.includes("minor")) return "Minorista";
  if (lower.includes("public") || lower.includes("consumidor") || lower.includes("final")) return "Consumidor final";
  return "General";
};

const buildCustomerInclude = () => [
  {
    model: TipoDocumento,
    as: "tipoDocumento",
    attributes: ["sigla", "descripcion"],
  },
  {
    model: Municipality,
    as: "municipio",
    attributes: ["id", "name", "departmentId"],
    include: [
      {
        model: Department,
        as: "departamento",
        attributes: ["id", "name"],
      },
    ],
  },
  {
    model: Zona,
    as: "zona",
    attributes: ["nombreZona"],
  },
  {
    model: Usuario,
    as: "usuario",
    attributes: ["idUsuario", "nombreUsuario", "email"],
    required: false,
  },
];

const buildDocumentWhere = (queryOrParams = {}) => {
  const numeroDocumento =
    queryOrParams.numeroDocumento ??
    queryOrParams.numero_documento ??
    queryOrParams.documento;
  const idTipoDocumento = parsePositiveInteger(
    queryOrParams.idTipoDocumento ??
      queryOrParams.id_tipo_documento ??
      queryOrParams.tipoDocumento,
  );

  if (!numeroDocumento) return null;

  return {
    numeroDocumento: String(numeroDocumento).trim(),
    ...(idTipoDocumento ? { idTipoDocumento } : {}),
  };
};

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

const customerController = {
  // 1. Obtener todos los clientes con ubicación completa (Normalizado)
  getAllCustomers: async (req, res = response) => {
    try {
      const where = {};
      if (req.query.email) {
        where.email = String(req.query.email).trim();
      }

      const documentWhere = buildDocumentWhere(req.query);
      if (documentWhere) {
        Object.assign(where, documentWhere);
      }

      const customers = await Customer.findAll({
        // Eliminamos idDepartamento e idMunicipio de los atributos
        attributes: { exclude: ["id_departamento", "id_municipio"] },
        where,
        include: buildCustomerInclude(),
        order: [["idCliente", "ASC"]],
      });

      return res.status(200).json(customers.map(sanitizeCustomer));
    } catch (error) {
      console.error("Error al obtener clientes:", error);
      return res.status(500).json({
        status: "error",
        message: "Error interno al obtener la lista de clientes",
        error: error.message,
      });
    }
  },

  // 2. Obtener un cliente por ID
  getCustomerById: async (req, res = response) => {
    const { id } = req.params;
    try {
      const customer = await Customer.findByPk(id, {
        include: buildCustomerInclude(),
      });

      if (!customer) {
        return res.status(404).json({
          status: "error",
          message: `Cliente con ID ${id} no encontrado`,
        });
      }
      return res.json(sanitizeCustomer(customer));
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error al obtener el cliente",
        error: error.message,
      });
    }
  },

  // 2.5 Obtener el promedio de compras de un cliente (pedidos Pagados(5))
  getCustomerPurchaseAverage: async (req, res = response) => {
    const { id } = req.params;
    try {
      const orders = await db.Order.findAll({
        where: {
          id_cliente: id,
          id_estado_pedido: 5, // Solo pedidos pagados
        },
        attributes: ["total_neto"],
      });

      if (orders.length === 0) {
        return res.json({ average: 0, orderCount: 0 });
      }

      const totalSum = orders.reduce((acc, order) => acc + (Number.parseFloat(order.total_neto) || 0), 0);
      const average = totalSum / orders.length;

      return res.json({ average, orderCount: orders.length });
    } catch (error) {
      console.error("Error al calcular promedio de compras:", error);
      return res.status(500).json({
        status: "error",
        message: "Error al calcular el promedio de compras del cliente",
        error: error.message,
      });
    }
  },

  // 3. Buscar cliente por número de documento
  getCustomerByDocument: async (req, res = response) => {
    try {
      const documentWhere = buildDocumentWhere({
        ...req.query,
        documento: req.params.documento,
      });

      if (!documentWhere) {
        return res.status(400).json({
          status: "error",
          message: "El numero de documento es requerido.",
        });
      }

      const customer = await Customer.findOne({
        where: documentWhere,
        include: buildCustomerInclude(),
      });

      if (!customer) {
        return res.status(200).json({
          exists: false,
          data: null,
        });
      }

      return res.status(200).json({
        exists: true,
        data: sanitizeCustomer(customer),
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error interno en la busqueda.",
        error: error.message,
      });
    }
  },

  getCustomerByEmail: async (req, res = response) => {
    try {
      const email = String(req.params.email ?? req.query.email ?? "").trim();

      if (!email) {
        return res.status(400).json({
          status: "error",
          message: "El correo electronico es requerido.",
        });
      }

      const customer = await Customer.findOne({
        where: { email },
        include: buildCustomerInclude(),
      });

      if (!customer) {
        return res.status(200).json({
          exists: false,
          data: null,
        });
      }

      return res.status(200).json({
        exists: true,
        data: sanitizeCustomer(customer),
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error interno en la busqueda por correo.",
        error: error.message,
      });
    }
  },

  // 4. Crear un nuevo cliente (Usa municipioId)
  createCustomer: async (req, res = response) => {
    let transaction;
    try {
      const idTipoDocumento = parsePositiveInteger(
        req.body.idTipoDocumento ?? req.body.id_tipo_documento,
      );
      const numeroDocumento = String(
        req.body.numeroDocumento ?? req.body.numero_documento ?? "",
      ).trim();
      const razonSocial = String(
        req.body.razonSocial ?? req.body.razon_social ?? "",
      ).trim();
      const direccion = String(req.body.direccion ?? "").trim();
      const telefono = String(req.body.telefono ?? "").trim();
      const email = String(req.body.email ?? "").trim();
      const municipioId = parsePositiveInteger(
        req.body.municipioId ??
          req.body.municipio_id ??
          req.body.idMunicipio ??
          req.body.id_municipio,
      );
      const idEstado =
        parsePositiveInteger(req.body.idEstado ?? req.body.id_estado) ?? 1;
      const idZona =
        parsePositiveInteger(req.body.idZona ?? req.body.id_zona) ?? 1;
      const cupoCredito =
        Number.parseFloat(req.body.cupoCredito ?? req.body.cupo_credito) || 0;
      const tipoCliente = normalizeTipoCliente(
        req.body.tipoCliente ?? req.body.tipo_cliente,
      );

      if (
        !razonSocial ||
        !idTipoDocumento ||
        !numeroDocumento ||
        !direccion ||
        !telefono
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Faltan campos obligatorios: razon social, tipo de documento, numero de documento, direccion o telefono.",
        });
      }

      const telefonoError = validateTelefono(telefono);
      if (telefonoError) {
        return res.status(400).json({ status: "error", message: telefonoError });
      }

      const whereConditions = [{ numeroDocumento, idTipoDocumento }];
      if (email) {
        whereConditions.push({ email });
      }

      const existingCustomer = await Customer.findOne({
        where: { [Op.or]: whereConditions },
      });

      if (existingCustomer) {
        const conflictField =
          existingCustomer.numeroDocumento === numeroDocumento && existingCustomer.idTipoDocumento === idTipoDocumento
            ? "la combinación de tipo y número de documento"
            : "el correo electronico";
        return res.status(400).json({
          status: "error",
          message:
            "Ya existe un cliente registrado con " + conflictField + ".",
        });
      }

      transaction = await db.sequelize.transaction();

      const newCustomer = await Customer.create(
        {
          idTipoDocumento,
          numeroDocumento,
          razonSocial,
          personaContacto: String(
            req.body.personaContacto ?? req.body.persona_contacto ?? "",
          ).trim(),
          direccion,
          telefono,
          email: email || null,
          municipioId,
          idEstado,
          idZona,
          tipoCliente,
          cupoCredito,
        },
        { transaction },
      );

      const sessionUserId = parsePositiveInteger(req.user?.idUsuario);
      const sessionEmail = normalizeEmail(email);
      let sessionUser = null;

      if (sessionUserId) {
        sessionUser = await Usuario.findByPk(sessionUserId, { transaction });
      }

      if (!sessionUser && sessionEmail) {
        sessionUser = await Usuario.findOne({
          where: { email: sessionEmail },
          transaction,
        });
      }

      if (sessionUser) {
        const userEmail = normalizeEmail(sessionUser.email);
        const shouldLinkCustomer =
          Boolean(sessionEmail) && Boolean(userEmail) && userEmail === sessionEmail;

        if (shouldLinkCustomer) {
          sessionUser.idCliente = newCustomer.idCliente;
          await sessionUser.save({ transaction });
        }
      } else if (sessionUserId || sessionEmail) {
        throw new Error(
          "No fue posible encontrar el usuario autenticado para vincular el nuevo cliente.",
        );
      }

      // Notificación de nuevo cliente registrado (visible a Admin/Master (idRol = 1))
      await db.Notification.create({
        titulo: "Nuevo Cliente Registrado",
        mensaje: `Se ha registrado un nuevo cliente: "${razonSocial}" (Documento: ${numeroDocumento}).`,
        tipo: "nuevo_cliente",
        id_rol_destino: 1, // Administrador / Master
        is_read: false,
        fecha_registro: new Date()
      }, { transaction });

      await transaction.commit();

      return res.status(201).json({
        status: "success",
        message: "Cliente creado con exito",
        data: sanitizeCustomer(newCustomer),
      });
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }

      const isClientDataError = [
        "SequelizeValidationError",
        "SequelizeUniqueConstraintError",
        "SequelizeForeignKeyConstraintError",
      ].includes(error.name);

      return res.status(isClientDataError ? 400 : 500).json({
        status: "error",
        message: isClientDataError
          ? "Los datos del cliente no cumplen las restricciones de la base de datos."
          : "Error al crear el cliente.",
        error: error.message,
      });
    }
  },

  // 5. Actualizar cliente
  updateCustomer: async (req, res = response) => {
    try {
      const idNum = parseInt(req.params.id, 10);
      if (isNaN(idNum)) {
        return res.status(400).json({ status: "error", message: "ID de cliente inválido." });
      }

      const { idCliente, fechaRegistro, idDepartamento, ...dataToUpdate } =
        req.body;
      const currentCustomer = await Customer.findByPk(idNum);

      if (!currentCustomer) {
        return res.status(404).json({
          status: "error",
          message: "Cliente no encontrado.",
        });
      }

      const isMaster = Number(req.user?.idRol) === 1;
      const isAdmin = Number(req.user?.idRol) === 2;
      const isClientRole = [4, 7].includes(Number(req.user?.idRol));

      // Check if this customer is linked to any user
      const linkedUser = await Usuario.findOne({ where: { idCliente: idNum } });

      if (linkedUser && linkedUser.idUsuario !== req.user?.idUsuario) {
        // If it is linked to another user, only Master/Admin can modify it
        if (!isMaster && !isAdmin) {
          return res.status(403).json({
            status: "error",
            message: "Este cliente ya tiene un usuario relacionado. No se permiten modificaciones.",
          });
        }
      } else {
        // If it is not linked to any user, and the current user is a client and does not have a linked client record:
        if (!linkedUser && isClientRole && req.user?.idUsuario && !req.user?.idCliente) {
          await Usuario.update(
            { idCliente: idNum },
            { where: { idUsuario: req.user.idUsuario } }
          );
        }
      }

      // If they are not Master/Admin, and they are trying to edit a customer that is NOT theirs
      if (!isMaster && !isAdmin) {
        const userClientMatch = Number(req.user?.idCliente) === idNum || (!req.user?.idCliente && (!linkedUser || linkedUser.idUsuario === req.user?.idUsuario));
        if (!userClientMatch) {
          return res.status(403).json({
            status: "error",
            message: "No tienes permisos para modificar los datos de otra cuenta.",
          });
        }
      }

      const changesDocumentType =
        dataToUpdate.idTipoDocumento !== undefined &&
        Number(dataToUpdate.idTipoDocumento) !==
          Number(currentCustomer.idTipoDocumento);
      const changesDocumentNumber =
        dataToUpdate.numeroDocumento !== undefined &&
        String(dataToUpdate.numeroDocumento) !==
          String(currentCustomer.numeroDocumento);
      const changesEmail =
        dataToUpdate.email !== undefined &&
        String(dataToUpdate.email).trim().toLowerCase() !==
          String(currentCustomer.email ?? "").trim().toLowerCase();

      if (!isMaster && (changesDocumentType || changesDocumentNumber)) {
        return res.status(403).json({
          status: "error",
          message:
            "Solo el usuario Master puede modificar el tipo o número de documento.",
        });
      }

      if (!isMaster) {
        delete dataToUpdate.idTipoDocumento;
        delete dataToUpdate.numeroDocumento;
        if (isClientRole) {
          delete dataToUpdate.email;
        }
      }

      // ✅ Mapea idMunicipio → municipioId si el modelo lo usa así
      if (req.body.idMunicipio) {
        dataToUpdate.municipioId = req.body.idMunicipio;
      }
      delete dataToUpdate.idMunicipio;

      // ✅ Validación de teléfono (longitud y solo dígitos)
      const telefonoError = validateTelefono(dataToUpdate.telefono);
      if (telefonoError) {
        return res.status(400).json({ status: "error", message: telefonoError });
      }

      // Validación de duplicados (Compuesta AND para documento)
      const orConditions = [];
      
      if (changesDocumentType || changesDocumentNumber) {
        orConditions.push({
          numeroDocumento: dataToUpdate.numeroDocumento ?? currentCustomer.numeroDocumento,
          idTipoDocumento: dataToUpdate.idTipoDocumento ?? currentCustomer.idTipoDocumento
        });
      }
      
      if (changesEmail && dataToUpdate.email !== undefined) {
        orConditions.push({ email: dataToUpdate.email });
      }

      if (orConditions.length > 0) {
        const duplicate = await Customer.findOne({
          where: {
            [Op.or]: orConditions,
            idCliente: { [Op.ne]: idNum },
          },
        });

        if (duplicate) {
          return res.status(400).json({
            status: "error",
            message: "El email o la combinación de tipo y número de documento ya están en uso por otro cliente.",
          });
        }
      }

      await Customer.update(dataToUpdate, {
        where: { idCliente: idNum },
      });

      // ✅ Ya no tratamos 0 rows como error — puede ser que los datos sean iguales
      const updatedCustomer = await Customer.findByPk(idNum);

      if (!updatedCustomer) {
        return res.status(404).json({
          status: "error",
          message: "Cliente no encontrado.",
        });
      }

      return res.json({
        status: "success",
        data: sanitizeCustomer(updatedCustomer),
      });
    } catch (error) {
      console.error("❌ Error en updateCustomer:", error);
      return res.status(500).json({
        status: "error",
        message: "Error al actualizar.",
        error: error.message,
      });
    }
  },

  // 6. Eliminar cliente (Con manejo de integridad referencial)
  deleteCustomer: async (req, res = response) => {
    const { id } = req.params;
    try {
      const rowsDeleted = await Customer.destroy({ where: { idCliente: id } });

      if (rowsDeleted === 0) {
        return res
          .status(404)
          .json({ status: "error", message: "Cliente no encontrado." });
      }

      return res.json({
        status: "success",
        message: "Cliente eliminado permanentemente.",
      });
    } catch (error) {
      if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).json({
          status: "warning",
          message:
            "No se puede eliminar: el cliente tiene historial de ventas o créditos activos.",
        });
      }
      return res.status(500).json({
        status: "error",
        message: "Error al eliminar.",
        error: error.message,
      });
    }
  },

  getCustomerPurchaseHistory: async (req, res = response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "El ID del cliente es obligatorio."
        });
      }

      const rawHistory = await db.sequelize.query(
        `
        SELECT 
          p.id_pedido AS idPedido,
          v.id_venta AS idVenta,
          p.fecha_pedido AS fecha,
          p.total_neto AS total,
          p.tipo_pago AS tipoPago,
          ep.nombre_estado AS estadoPedido,
          ep.color_hex AS estadoColor,
          dp.id_detalle_pedido AS idDetallePedido,
          dp.cantidad_solicitada AS cantidad,
          dp.precio_venta AS precioVenta,
          dp.subtotal_linea AS subtotal,
          prod.nombre AS productoNombre,
          prod.referencia AS productoReferencia
        FROM pedidos p
        LEFT JOIN ventas v ON p.id_pedido = v.id_pedido
        INNER JOIN estados_pedido ep ON p.id_estado_pedido = ep.id_estado_pedido
        INNER JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
        INNER JOIN productos prod ON dp.id_producto = prod.id_producto
        WHERE p.id_cliente = :idCliente
        ORDER BY p.fecha_pedido DESC, p.id_pedido DESC
        `,
        {
          replacements: { idCliente: id },
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );

      const purchasesMap = {};
      for (const row of rawHistory) {
        if (!purchasesMap[row.idPedido]) {
          purchasesMap[row.idPedido] = {
            idPedido: row.idPedido,
            idVenta: row.idVenta || null,
            fecha: row.fecha,
            total: parseFloat(row.total || 0),
            tipoPago: row.tipoPago,
            estadoPedido: row.estadoPedido,
            estadoColor: row.estadoColor,
            productos: [],
          };
        }
        purchasesMap[row.idPedido].productos.push({
          idDetallePedido: row.idDetallePedido,
          productoNombre: row.productoNombre,
          productoReferencia: row.productoReferencia,
          cantidad: Number(row.cantidad),
          precioVenta: parseFloat(row.precioVenta || 0),
          subtotal: parseFloat(row.subtotal || 0),
        });
      }

      return res.json({
        status: "success",
        data: Object.values(purchasesMap),
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error al obtener el historial de compras.",
        error: error.message,
      });
    }
  },

  getCustomersWithPurchases: async (req, res = response) => {
    try {
      const query = `
        SELECT 
          c.id_cliente AS idCliente,
          c.razon_social AS razonSocial,
          c.numero_documento AS numeroDocumento,
          c.tipo_cliente AS tipoCliente,
          c.telefono,
          c.email,
          COUNT(p.id_pedido) AS totalPedidos,
          COALESCE(SUM(p.total_neto), 0) AS totalComprado
        FROM clientes c
        INNER JOIN pedidos p ON c.id_cliente = p.id_cliente
        GROUP BY c.id_cliente, c.razon_social, c.numero_documento, c.tipo_cliente, c.telefono, c.email
        ORDER BY totalComprado DESC
      `;
      const results = await db.sequelize.query(query, {
        type: db.Sequelize.QueryTypes.SELECT,
      });

      return res.status(200).json({
        status: "success",
        data: results.map(row => ({
          ...row,
          totalPedidos: Number(row.totalPedidos || 0),
          totalComprado: parseFloat(row.totalComprado || 0)
        }))
      });
    } catch (error) {
      console.error("Error al obtener reporte de compras de clientes:", error);
      return res.status(500).json({
        status: "error",
        message: "Error interno al generar el reporte de compras de clientes.",
        error: error.message,
      });
    }
  },
};

export default customerController;
