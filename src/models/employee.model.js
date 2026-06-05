export default (sequelize, DataTypes) => {
  const Employee = sequelize.define(
    "empleado",
    {
      idEmpleado: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_empleado",
      },
      idTipoDocumento: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_tipo_documento",
      },
      numeroDocumento: {
        type: DataTypes.STRING(15),
        allowNull: false,
        field: "numero_documento",
      },
      nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "nombres",
      },
      apellido: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "apellidos",
      },
      telefono: {
        type: DataTypes.STRING(15),
        allowNull: true,
        field: "telefono",
      },
      idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "id_usuario",
        references: {
          model: "usuarios",
          key: "id_usuario",
        },
      },
      disponibilidad: {
        type: DataTypes.BOOLEAN, // Si este también cambió a estado en la DB, cámbialo a INTEGER
        allowNull: false,
        defaultValue: 1,
        field: "disponibilidad",
      },
      // CAMBIO REALIZADO: De 'activo' (booleano) a 'idEstado' (entero)
      idEstado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // Asumiendo que 1 es 'Activo'
        field: "id_estado",
      },
    },
    {
      tableName: "empleado",
      timestamps: false,
      freezeTableName: true,
    },
  );

  // Definición de asociaciones
  Employee.associate = (models) => {
    // Relación con Usuario
    if (models.Usuario) {
      Employee.belongsTo(models.Usuario, {
        foreignKey: "idUsuario",
        as: "usuario",
      });
    }
    // Opcional: Si tienes una tabla de Estados, podrías relacionarla aquí
    if (models.Estado) {
      Employee.belongsTo(models.Estado, {
        foreignKey: "idEstado",
        as: "estado",
      });
    }
  };

  return Employee;
};

// export default (sequelize, DataTypes) => {
//   const Employee = sequelize.define(
//     "empleado",
//     {
//       idEmpleado: {
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true,
//         field: "id_empleado",
//       },
//       idTipoDocumento: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         field: "id_tipo_documento",
//       },
//       numeroDocumento: {
//         type: DataTypes.STRING(15),
//         allowNull: false,
//         field: "numero_documento",
//       },
//       nombre: {
//         type: DataTypes.STRING(100),
//         allowNull: false,
//         field: "nombres",
//       },
//       apellido: {
//         type: DataTypes.STRING(100),
//         allowNull: false,
//         field: "apellidos",
//       },
//       telefono: {
//         type: DataTypes.STRING(15),
//         allowNull: true,
//         field: "telefono",
//       },
//       rolOperativo: {
//         type: DataTypes.STRING(50),
//         allowNull: false,
//         field: "rol_operativo",
//       },
//       idUsuario: {
//         type: DataTypes.INTEGER,
//         allowNull: true,
//         field: "id_usuario",
//       },
//       disponibilidad: {
//         type: DataTypes.BOOLEAN,
//         allowNull: false,
//         defaultValue: 1,
//         field: "disponibilidad",
//       },
//       activo: {
//         type: DataTypes.BOOLEAN,
//         allowNull: false,
//         defaultValue: 1,
//         field: "activo",
//       },
//     },
//     {
//       tableName: "empleado",
//       timestamps: false,
//       freezeTableName: true,
//     },
//   );

//   return Employee;
// };
