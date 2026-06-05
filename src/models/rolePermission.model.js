export default (sequelize, DataTypes) => {
  const RolePermission = sequelize.define(
    "RolePermission",
    {
      idRolesPermisos: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_roles_permisos",
      },
      idRol: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_rol",
      },
      idPermiso: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_permiso",
      },
      fechaAsignacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "fecha_asignacion",
      },
    },
    {
      tableName: "roles_permisos",
      timestamps: false,
      freezeTableName: true,
    },
  );

  RolePermission.associate = (models) => {
    // CORRECCIÓN: Usar el nombre del atributo definido arriba para evitar conflictos de mapeo
    RolePermission.belongsTo(models.Rol, {
      foreignKey: "idRol",
      as: "rol",
    });

    RolePermission.belongsTo(models.Permission, {
      foreignKey: "idPermiso",
      as: "permiso",
    });
  };

  return RolePermission;
};

// export default (sequelize, DataTypes) => {
//   const RolePermission = sequelize.define(
//     "RolePermission",
//     {
//       idRolesPermisos: {
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true,
//         field: "id_roles_permisos",
//       },
//       idRol: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         field: "id_rol",
//       },
//       idPermiso: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         field: "id_permiso",
//       },
//       fechaAsignacion: {
//         type: DataTypes.DATE,
//         allowNull: false,
//         defaultValue: DataTypes.NOW,
//         field: "fecha_asignacion",
//       },
//     },
//     {
//       tableName: "roles_permisos",
//       timestamps: false,
//       freezeTableName: true,
//     },
//   );

//   RolePermission.associate = (models) => {
//     // Asociación con Rol
//     RolePermission.belongsTo(models.Rol, {
//       foreignKey: "idRol", // Atributo definido arriba
//       as: "rol",
//     });

//     // Asociación con Permission
//     RolePermission.belongsTo(models.Permission, {
//       foreignKey: "idPermiso", // Atributo definido arriba
//       as: "permiso",
//     });
//   };

//   return RolePermission;
// };
