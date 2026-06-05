export default (sequelize, DataTypes) => {
  const Rol = sequelize.define(
    "Rol",
    {
      idRol: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_rol",
      },
      nombreRol: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: "nombre_rol",
      },
      descripcion: {
        type: DataTypes.STRING(255),
        allowNull: true, 
        field: "descripcion",
        comment: "Explicación de las acciones y capacidades del rol",
      },
      idEstado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: "id_estado",
      },
    },
    {
      tableName: "roles",
      timestamps: false,
      freezeTableName: true,
    },
  );

  Rol.associate = (models) => {
    // 1. Relación Uno a Muchos con Usuarios
    if (models.Usuario) {
      Rol.hasMany(models.Usuario, {
        foreignKey: "idRol",
        as: "usuarios",
      });
    }

    // 2. Relación Muchos a Muchos con Permisos (vía tabla intermedia)
    if (models.Permission && models.RolePermission) {
      Rol.belongsToMany(models.Permission, {
        through: models.RolePermission,
        foreignKey: "idRol", 
        otherKey: "idPermiso", 
        as: "permisos",
      });
    }
  };

  return Rol;
};
