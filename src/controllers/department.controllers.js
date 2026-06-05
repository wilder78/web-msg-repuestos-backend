import db from "../models/index.model.js";
import colombia from "colombia-data-social";

const { Department } = db;
const { departamentos } = colombia.data;

export const getDepartments = async (req, res) => {
  try {
    const departmentList = await Department.findAll({
      order: [["name", "ASC"]],
    });
    res.status(200).json(departmentList);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener los departamentos",
      error: error.message,
    });
  }
};

export const seedDepartments = async (req, res) => {
  try {
    const departmentsData = departamentos.map((item) => ({
      // ✅ Sin 'id' — la PK es autoIncrement, la BD la genera
      name: item.nombre,
    }));

    await Department.bulkCreate(departmentsData, {
      ignoreDuplicates: true, // ✅ más seguro sin PK manual
    });

    res.status(201).json({
      message: "Departamentos sincronizados exitosamente",
      count: departmentsData.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al sincronizar departamentos",
      error: error.message,
    });
  }
};

export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findByPk(id, {
      include: ["municipios"],
    });

    if (!department) {
      return res.status(404).json({ message: "Departamento no encontrado" });
    }

    res.status(200).json(department);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener el departamento",
      error: error.message,
    });
  }
};