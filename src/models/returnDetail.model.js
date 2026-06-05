export default (sequelize, DataTypes) => {
  const ReturnDetail = sequelize.define(
    "ReturnDetail",
    {
      idDetalleDevolucion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_detalle_devolucion",
      },
      idDevolucion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_devolucion",
      },
      idProducto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_producto",
      },
      cantidadDevuelta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "cantidad_devuelta",
      },
      precioUnitario: {
        type: DataTypes.DECIMAL(10, 2),
        field: "precio_unitario",
      },
      subtotalLinea: {
        type: DataTypes.DECIMAL(12, 2),
        field: "subtotal_linea",
      },
    },
    {
      tableName: "detalle_devolucion",
      timestamps: false,
    },
  );

  ReturnDetail.associate = (models) => {
    ReturnDetail.belongsTo(models.CustomerReturn, {
      foreignKey: "idDevolucion",
      as: "cabecera",
    });

    ReturnDetail.belongsTo(models.Product, {
      foreignKey: "idProducto",
      as: "producto",
    });
  };

  return ReturnDetail;
};
