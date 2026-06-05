export default (sequelize, DataTypes) => {
  const OrderDetail = sequelize.define(
    "OrderDetail",
    {
      id_detalle_pedido: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_detalle_pedido",
      },
      id_pedido: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_pedido",
      },
      id_producto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_producto",
      },
      cantidad_solicitada: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: "cantidad_solicitada",
      },
      precio_venta: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: "precio_venta",
      },
      descuento_aplicado: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: "descuento_aplicado",
      },
      subtotal_linea: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: "subtotal_linea",
      },
    },
    {
      tableName: "detalle_pedido",
      timestamps: false,
      freezeTableName: true,
    }
  );

  OrderDetail.associate = (models) => {
    OrderDetail.belongsTo(models.Order, { foreignKey: "id_pedido", as: "pedido" });
    OrderDetail.belongsTo(models.Product, { foreignKey: "id_producto", as: "producto" });
  };

  return OrderDetail;
};