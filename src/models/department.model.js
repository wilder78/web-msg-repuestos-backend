export default (sequelize, DataTypes) => {
  const Department = sequelize.define(
    "Department",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true, // ✅ agregado
        field: "id",         // ✅ corregido
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "nombre",
      },
    },
    {
      tableName: "departamentos",
      timestamps: false,
      freezeTableName: true,
    }
  );

  Department.associate = (models) => {
    Department.hasMany(models.Municipality, {
      foreignKey: "departmentId", // ✅ nombre del atributo en el modelo, no la columna DB
      as: "municipios",
    });
  };

  return Department;
};