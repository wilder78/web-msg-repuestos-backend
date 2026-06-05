export default (sequelize, DataTypes) => {
  const Permission = sequelize.define(
    "Permission",
    {
      idPermiso: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_permiso",
      },
      nombrePermiso: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "nombre_permiso",
      },
      modulo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "modulo",
      },
      categoria: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "categoria",
      },
      descripcion: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "descripcion",
      },
      // Agregamos la columna tal como está en tu tabla 'permisos'
      idEstado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: "id_estado",
        // Eliminamos 'references' porque la tabla estados aún no existe
      },
    },
    {
      tableName: "permisos",
      timestamps: false,
      freezeTableName: true,
    },
  );

  Permission.associate = (models) => {
    // Mantén solo la relación Muchos a Muchos con Roles
    Permission.belongsToMany(models.Rol, {
      through: models.RolePermission,
      foreignKey: "idPermiso",
      otherKey: "idRol",
      as: "roles",
    });

    // NOTA: No agregamos Permission.belongsTo(models.Estado)
    // hasta que decidas crear ese modelo y esa tabla.
  };

  return Permission;
};
