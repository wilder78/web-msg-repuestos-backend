import db from "../models/index.model.js";
import colombia from "colombia-data-social";

const { Municipality, Department } = db;
const { departamentos } = colombia.data;

/**
 * Obtener municipios filtrados por departamento
 */
export const getMunicipalitiesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const municipalities = await Municipality.findAll({
      where: { departmentId },
      order: [["name", "ASC"]],
    });

    res.status(200).json(municipalities);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener los municipios por departamento",
      error: error.message,
    });
  }
};

/**
 * Sincronizar municipios desde la librería
 */
export const seedMunicipalities = async (req, res) => {
  try {
    const dbDepartments = await Department.findAll();

    if (dbDepartments.length === 0) {
      return res.status(400).json({
        message: "Primero debes poblar la tabla de departamentos.",
      });
    }

    let allMunicipalities = [];

    departamentos.forEach((dept) => {
      const departmentFound = dbDepartments.find(
        (d) => d.id === parseInt(dept.codigo)
      );

      if (departmentFound) {
        dept.municipios.forEach((city) => {
          allMunicipalities.push({
            name: city.nombre,
            departmentId: departmentFound.id,
          });
        });
      }
    });

    await Municipality.bulkCreate(allMunicipalities, {
      ignoreDuplicates: true, // ✅ más seguro que updateOnDuplicate sin PK manual
    });

    res.status(201).json({
      message: "Municipios sincronizados exitosamente",
      count: allMunicipalities.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al sincronizar municipios",
      error: error.message,
    });
  }
};

/**
 * Obtener todos los municipios con su departamento (Eager Loading)
 */
export const getAllMunicipalities = async (req, res) => {
  try {
    const municipalities = await Municipality.findAll({
      include: [
        {
          model: db.Department,
          as: "departamento",
          attributes: ["id", "name"],
        },
      ],
      order: [["name", "ASC"]],
    });

    res.status(200).json(municipalities);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener la lista completa",
      error: error.message,
    });
  }
};