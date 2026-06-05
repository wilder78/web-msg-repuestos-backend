// ruta.model.js
export default (sequelize, DataTypes) => {
  const Ruta = sequelize.define(
    "Ruta",
    {
      idRuta: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_ruta",
      },
      nombreRuta: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "nombre_ruta",
      },
      idZona: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_zona",
      },
      idEmpleado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_empleado",
      },
      fechaPlanificada: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "fecha_planificada",
      },
      idEstadoRuta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: "id_estado_ruta",
      },
      fechaEjecucionInicio: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "fecha_ejecucion_inicio",
      },
      fechaEjecucionFin: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "fecha_ejecucion_fin",
      },
    },
    {
      tableName: "rutas",
      timestamps: false,
      freezeTableName: true,
    },
  );

  Ruta.associate = (models) => {
    Ruta.hasMany(models.RutaDetail, {
      foreignKey: "idRuta",
      as: "detalles",
    });
    Ruta.belongsTo(models.Zona, {
      foreignKey: "idZona",
      as: "zona",
    });
    Ruta.belongsTo(models.Empleado, {
      foreignKey: "idEmpleado",
      as: "empleado",
    });
  };

  return Ruta;
};