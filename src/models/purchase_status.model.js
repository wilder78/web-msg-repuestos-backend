export default (sequelize, DataTypes) => {
  const PurchaseStatus = sequelize.define(
    "PurchaseStatus",
    {
      idEstadoCompra: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_estado_compra",
      },
      nombre_estado: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "nombre_estado",
      },
      descripcion: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "descripcion",
      },
      color_hex: {
        type: DataTypes.STRING(7),
        allowNull: true,
        defaultValue: "#6B7280",
        field: "color_hex",
      },
    },
    {
      tableName: "estados_compra",
      timestamps: false,
      freezeTableName: true,
    },
  );

  return PurchaseStatus;
};
