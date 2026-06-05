export default (sequelize, DataTypes) => {
  const Sale = sequelize.define(
    "Sale",
    {
      idVenta: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_venta",
      },
      idPedido: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_pedido",
      },
      fechaVenta: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "fecha_venta",
      },
      totalVenta: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
        field: "total_venta",
      },
      idFormaPago: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_forma_pago",
      },
      idEstadoVenta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: "id_estado_venta",
      },
      rutaPdf: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "ruta_PDF",
      },
    },
    {
      tableName: "ventas",
      timestamps: false,
      freezeTableName: true,
    },
  );

  Sale.associate = (models) => {
    if (models.CustomerReturn) {
      Sale.hasMany(models.CustomerReturn, {
        foreignKey: "idVenta",
        as: "devoluciones",
      });
    }

    if (models.Order) {
      Sale.belongsTo(models.Order, {
        foreignKey: "idPedido",
        as: "pedido",
      });
    }
  };

  return Sale;
};
