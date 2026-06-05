export default (sequelize, DataTypes) => {
  const Municipality = sequelize.define(
    "Municipality",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true, // ✅ agregado
        field: "id",
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "nombre",
      },
      departmentId: {
        type: DataTypes.INTEGER,
        allowNull: true, // ✅ la tabla dice Nulo: Sí
        field: "departamento_id",
      },
    },
    {
      tableName: "municipios",
      timestamps: false,
      freezeTableName: true,
    },
  );

  Municipality.associate = (models) => {
    Municipality.belongsTo(models.Department, {
      foreignKey: "departmentId",
      as: "departamento",
    });

    if (models.Customer) {
      Municipality.hasMany(models.Customer, {
        foreignKey: "municipioId",
        as: "clientes",
      });
    }

    if (models.Supplier) {
      Municipality.hasMany(models.Supplier, {
        foreignKey: "municipioId",
        as: "proveedores",
      });
    }
  };

  return Municipality;
};
