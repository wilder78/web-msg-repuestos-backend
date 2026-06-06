export default (sequelize, DataTypes) => {
  const Product = sequelize.define(
    "Product",
    {
      id_producto: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_producto",
      },
      referencia: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      nombre: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      descripcion: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      marca: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      modelo: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      imagen_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: "default_producto.png",
        field: "imagen_url",
      },
      precio_compra: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        field: "precio_compra",
      },
      // --- NUEVAS COLUMNAS DE PRECIO ---
      precio_publico: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        field: "precio_publico",
      },
      precio_mayorista: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        field: "precio_mayorista",
      },
      precio_minorista: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        field: "precio_minorista",
      },
      // ---------------------------------
      stock_buen_estado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "stock_buen_estado",
      },
      stock_defectuoso: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "stock_defectuoso",
      },
      fecha_registro: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "fecha_registro",
      },
      id_categoria: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_categoria",
      },
      id_estado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: "id_estado",
      },
      esNuevo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "es_nuevo",
      },
    },
    {
      tableName: "productos",
      timestamps: false,
      freezeTableName: true,
    },
  );

  Product.associate = (models) => {
    Product.belongsTo(models.Category, {
      foreignKey: "id_categoria",
      as: "categoria",
    });

    if (models.Estado) {
      Product.belongsTo(models.Estado, {
        foreignKey: "id_estado",
        as: "estado",
      });
    }

    if (models.PurchaseDetail) {
      Product.hasMany(models.PurchaseDetail, {
        foreignKey: "id_producto",
        as: "detallesCompra",
      });
    }
  };

  return Product;
};

// export default (sequelize, DataTypes) => {
//   const Product = sequelize.define(
//     "Product",
//     {
//       id_producto: {
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true,
//         field: "id_producto",
//       },
//       referencia: {
//         type: DataTypes.STRING(50),
//         allowNull: false,
//       },
//       nombre: {
//         type: DataTypes.STRING(150),
//         allowNull: false,
//       },
//       descripcion: {
//         type: DataTypes.STRING(255),
//         allowNull: true,
//       },
//       marca: {
//         type: DataTypes.STRING(50),
//         allowNull: false,
//       },
//       modelo: {
//         type: DataTypes.STRING(50),
//         allowNull: true,
//       },
//       imagen_url: {
//         type: DataTypes.STRING(255),
//         allowNull: true,
//         defaultValue: "default_producto.png",
//         field: "imagen_url",
//       },
//       precio_compra: {
//         type: DataTypes.DECIMAL(10, 2),
//         allowNull: false,
//         defaultValue: 0.0,
//         field: "precio_compra",
//       },
//       stock_buen_estado: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         defaultValue: 0,
//         field: "stock_buen_estado",
//       },
//       stock_defectuoso: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         defaultValue: 0,
//         field: "stock_defectuoso",
//       },
//       // --- NUEVA COLUMNA AGREGADA ---
//       fecha_registro: {
//         type: DataTypes.DATEONLY, // Representa el tipo 'date' de MySQL
//         allowNull: false,
//         defaultValue: DataTypes.NOW, // Usa la fecha actual por defecto
//         field: "fecha_registro",
//       },
//       // ------------------------------
//       id_categoria: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         field: "id_categoria",
//       },
//       id_estado: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         defaultValue: 1,
//         field: "id_estado",
//       },
//     },
//     {
//       tableName: "productos",
//       timestamps: false,
//       freezeTableName: true,
//     },
//   );

//   Product.associate = (models) => {
//     Product.belongsTo(models.Category, {
//       foreignKey: "id_categoria",
//       as: "categoria",
//     });

//     if (models.Estado) {
//       Product.belongsTo(models.Estado, {
//         foreignKey: "id_estado",
//         as: "estado",
//       });
//     }

//     if (models.PurchaseDetail) {
//       Product.hasMany(models.PurchaseDetail, {
//         foreignKey: "id_producto",
//         as: "detallesCompra",
//       });
//     }
//   };

//   return Product;
// };
