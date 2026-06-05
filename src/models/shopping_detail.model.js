export default (sequelize, DataTypes) => {
  const PurchaseDetail = sequelize.define(
    "PurchaseDetail",
    {
      id_compra: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        field: "id_compra",
      },
      id_producto: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        field: "id_producto",
      },
      cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "cantidad",
      },
      costo_unitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        field: "costo_unitario",
      },
      subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
        field: "subtotal",
      },
    },
    {
      tableName: "detalle_compra",
      timestamps: false,
      freezeTableName: true,
    },
  );

  PurchaseDetail.associate = (models) => {
    PurchaseDetail.belongsTo(models.Purchase, {
      foreignKey: "id_compra",
      as: "compra",
    });

    PurchaseDetail.belongsTo(models.Product, {
      foreignKey: "id_producto",
      as: "producto",
    });
  };

  return PurchaseDetail;
};
