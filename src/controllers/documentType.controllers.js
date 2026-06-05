import db from "../models/index.model.js";
const TipoDocumento = db.TipoDocumento;

// 1. Obtener todos
export const getAllTipos = async (req, res) => {
  try {
    const tipos = await TipoDocumento.findAll();
    res.status(200).json(tipos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener tipos de documento" });
  }
};

// 2. Consultar por ID
export const getTipoById = async (req, res) => {
  try {
    const { id } = req.params;
    const tipo = await TipoDocumento.findByPk(id);

    if (!tipo) {
      return res.status(404).json({ error: "Tipo de documento no encontrado" });
    }

    res.status(200).json(tipo);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar el registro" });
  }
};

// 3. Crear uno nuevo
export const createTipo = async (req, res) => {
  try {
    const { sigla, descripcion } = req.body;
    const nuevo = await TipoDocumento.create({ sigla, descripcion });
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ error: "Error al crear el registro" });
  }
};

// 4. Actualizar
export const updateTipo = async (req, res) => {
  try {
    const { id } = req.params;
    const { sigla, descripcion } = req.body;
    const registro = await TipoDocumento.findByPk(id);

    if (!registro) return res.status(404).json({ error: "No encontrado" });

    await registro.update({ sigla, descripcion });
    res.json({ message: "Actualizado correctamente", data: registro });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar" });
  }
};

// 5. Eliminar
export const deleteTipo = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TipoDocumento.destroy({
      where: { idTipoDocumento: id },
    });

    if (deleted === 0)
      return res
        .status(404)
        .json({ error: "Registro no encontrado para eliminar" });

    res.json({ message: "Eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar" });
  }
};

const documentTypeController = {
  getAllTipos,
  getTipoById,
  createTipo,
  updateTipo,
  deleteTipo,
};

export default documentTypeController;
