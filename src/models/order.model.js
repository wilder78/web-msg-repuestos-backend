export default (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "Order",
    {
      id_pedido: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_pedido",
      },
      id_cliente: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_cliente",
      },
      fecha_pedido: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "fecha_pedido",
      },
      id_vendedor: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 4,
        field: "id_vendedor",
      },
      id_origen_pedido: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_origen_pedido",
      },
      id_estado_pedido: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: "id_estado_pedido",
      },
      total_neto: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
        field: "total_neto",
      },
      tipo_pago: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "tipo_pago",
      },
    },
    {
      tableName: "pedidos",
      timestamps: false,
      freezeTableName: true,
    },
  );

  Order.associate = (models) => {
    Order.hasMany(models.OrderDetail, {
      foreignKey: "id_pedido",
      as: "detalles",
    });
    Order.belongsTo(models.Customer, {
      foreignKey: "id_cliente",
      as: "cliente",
    });

    if (models.Sale) {
      Order.hasOne(models.Sale, {
        foreignKey: "idPedido",
        as: "venta",
      });
    }

    if (models.Seller) {
      Order.belongsTo(models.Seller, {
        foreignKey: "id_vendedor",
        as: "vendedor",
      });
    }
  };

  return Order;
};
