export default (sequelize, DataTypes) => {
  const Zona = sequelize.define(
    "Zona",
    {
      idZona: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_zona",
      },
      nombreZona: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "nombre_zona",
        validate: {
          notEmpty: { msg: "El nombre de la zona es obligatorio" },
        },
      },
      descripcion: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "descripcion",
      },
      idEstado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: "id_estado",
      },
    },
    {
      tableName: "zonas",
      timestamps: false,
      freezeTableName: true,
    },
  );

  Zona.associate = (models) => {
    if (models.Customer) {
      Zona.hasMany(models.Customer, {
        foreignKey: "idZona",
        as: "clientes",
      });
    }
    // Si tienes un modelo de Estado, podrías asociarlo aquí:
    if (models.Estado) {
      Zona.belongsTo(models.Estado, {
        foreignKey: "id_estado",
        as: "estado",
      });
    }
  };

  return Zona;
};
