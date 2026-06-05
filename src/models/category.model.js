export default (sequelize, DataTypes) => {
  const Category = sequelize.define(
    "Category",
    {
      id_categoria: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_categoria",
      },
      nombre_categoria: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "nombre_categoria",
        validate: {
          notEmpty: { msg: "El nombre de la categoría es obligatorio" },
        },
      },
      descripcion: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "descripcion",
      },
      // CAMBIO: Se renombró 'activo' a 'id_estado'
      id_estado: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        field: "id_estado", // Mapeo exacto a la nueva columna en la DB
      },
    },
    {
      tableName: "categorias",
      timestamps: false,
      freezeTableName: true,
    },
  );

  return Category;
};

// export default (sequelize, DataTypes) => {
//   const Category = sequelize.define(
//     "Category",
//     {
//       id_categoria: {
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true,
//         field: "id_categoria",
//       },
//       nombre_categoria: {
//         type: DataTypes.STRING(50),
//         allowNull: false,
//         field: "nombre_categoria",
//         validate: {
//           notEmpty: { msg: "El nombre de la categoría es obligatorio" },
//         },
//       },
//       descripcion: {
//         type: DataTypes.STRING(255),
//         allowNull: true,
//         field: "descripcion",
//       },
//       activo: {
//         type: DataTypes.TINYINT(1),
//         allowNull: false,
//         defaultValue: 1,
//         field: "activo",
//       },
//     },
//     {
//       tableName: "categorias",
//       timestamps: false,
//       freezeTableName: true,
//     }
//   );

//   return Category;
// };
