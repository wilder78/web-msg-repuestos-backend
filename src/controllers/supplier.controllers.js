import { response } from "express";
import db from "../models/index.model.js";

const { Supplier, TipoDocumento, Municipality, Department } = db;

const supplierController = {
  getAllSuppliers: async (req, res = response) => {
    try {
      const suppliers = await Supplier.findAll({
        include: [
          {
            model: TipoDocumento,
            as: "tipoDocumento",
            attributes: ["sigla", "descripcion"],
          },
          {
            model: Municipality,
            as: "municipio",
            attributes: ["id", "name"],
            include: [
              {
                model: Department,
                as: "departamento",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
        order: [["idProveedor", "ASC"]],
      });
      return res.json(suppliers);
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  },

  getSupplierById: async (req, res = response) => {
    try {
      const { id } = req.params;
      const supplier = await Supplier.findByPk(id, {
        include: [
          { model: TipoDocumento, as: "tipoDocumento" },
          {
            model: Municipality,
            as: "municipio",
            include: [{ model: Department, as: "departamento" }],
          },
        ],
      });
      if (!supplier) {
        return res.status(404).json({ message: "Proveedor no encontrado" });
      }
      return res.json(supplier);
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  },

  createSupplier: async (req, res = response) => {
    try {
      const {
        id_tipo_documento,
        numero_documento,
        nombre_empresa,
        contacto,
        telefono,
        email,
        direccion,
        condiciones_comerciales,
        id_estado,
        id_municipio,
      } = req.body;

      const newSupplier = await Supplier.create({
        idTipoDocumento: id_tipo_documento,
        numeroDocumento: numero_documento,
        nombreEmpresa: nombre_empresa,
        contacto: contacto,
        telefono: telefono,
        email: email,
        direccion: direccion,
        condicionesComerciales: condiciones_comerciales || null,
        idEstado: id_estado ?? 1,
        municipioId: id_municipio || null,
      });

      return res.status(201).json({ ok: true, data: newSupplier });
    } catch (error) {
      return res.status(400).json({
        ok: false,
        message: error.message,
        errors: error.errors?.map((e) => ({
          field: e.path,
          message: e.message,
          value: e.value,
        })),
      });
    }
  },

  updateSupplier: async (req, res = response) => {
    try {
      const { id } = req.params;

      // ✅ Desestructuramos todo explícitamente — sin ...rest para evitar pasar campos no mapeados
      const {
        id_tipo_documento,
        numero_documento,
        nombre_empresa,
        contacto,
        telefono,
        email,
        direccion,
        condiciones_comerciales,
        id_estado,
        id_municipio,
      } = req.body;

      const currentSupplier = await Supplier.findByPk(id);

      if (!currentSupplier) {
        return res.status(404).json({ message: "Proveedor no encontrado" });
      }

      const isMaster = Number(req.user?.idRol) === 1;
      const changesDocumentType =
        id_tipo_documento !== undefined &&
        Number(id_tipo_documento) !== Number(currentSupplier.idTipoDocumento);
      const changesDocumentNumber =
        numero_documento !== undefined &&
        String(numero_documento) !== String(currentSupplier.numeroDocumento);

      if (!isMaster && (changesDocumentType || changesDocumentNumber)) {
        return res.status(403).json({
          ok: false,
          message:
            "Solo el usuario Master puede modificar el tipo o número de documento.",
        });
      }

      const dataToUpdate = {
        ...(isMaster &&
          id_tipo_documento !== undefined && {
            idTipoDocumento: id_tipo_documento,
          }),
        ...(isMaster &&
          numero_documento !== undefined && {
            numeroDocumento: numero_documento,
          }),
        ...(nombre_empresa !== undefined && { nombreEmpresa: nombre_empresa }),
        ...(contacto !== undefined && { contacto: contacto }),
        ...(telefono !== undefined && { telefono: telefono }),
        ...(email !== undefined && { email: email }),
        ...(direccion !== undefined && { direccion: direccion }),
        ...(condiciones_comerciales !== undefined && {
          condicionesComerciales: condiciones_comerciales,
        }),
        ...(id_estado !== undefined && { idEstado: id_estado }),
        ...(id_municipio !== undefined && { municipioId: id_municipio }),
      };

      const [updatedRows] = await Supplier.update(dataToUpdate, {
        where: { idProveedor: id },
      });

      if (updatedRows === 0) {
        return res
          .status(404)
          .json({ message: "Proveedor no encontrado o sin cambios" });
      }

      const updatedSupplier = await Supplier.findByPk(id);
      return res.json({ ok: true, data: updatedSupplier });
    } catch (error) {
      return res.status(400).json({
        ok: false,
        message: error.message,
        errors: error.errors?.map((e) => ({
          // ✅ mismo detalle que createSupplier
          field: e.path,
          message: e.message,
          value: e.value,
        })),
      });
    }
  },

  deleteSupplier: async (req, res = response) => {
    try {
      const { id } = req.params;
      const [result] = await Supplier.update(
        { idEstado: 0 },
        { where: { idProveedor: id } },
      );
      if (result === 0) {
        return res.status(404).json({ message: "No se encontró el proveedor" });
      }
      return res.json({
        ok: true,
        message: "Proveedor desactivado correctamente",
      });
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }
  },
};

export default supplierController;
