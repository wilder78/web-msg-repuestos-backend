export const AbonoModel = (sequelize, DataTypes) => {
  const Abono = sequelize.define(
    "Abono",
    {
      idAbono: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_abono",
      },
      idCliente: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_cliente",
      },
      idCredito: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "id_credito",
      },
      idPedido: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "id_pedido",
      },
      montoAbono: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "monto_abono",
      },
      tipoAbono: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "tipo_abono", // "credito" o "pedido"
      },
      metodoPago: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "metodo_pago",
      },
      descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "descripcion",
      },
      idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_usuario",
      },
      idEstado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // 1 = Activo, 3 = Cancelado
        field: "id_estado",
      },
      fechaAbono: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "fecha_abono",
      },
    },
    {
      tableName: "abonos",
      timestamps: false,
    }
  );

  Abono.associate = (models) => {
    Abono.belongsTo(models.Customer, { foreignKey: "idCliente", as: "cliente" });
    Abono.belongsTo(models.Usuario, { foreignKey: "idUsuario", as: "usuario" });
    if (models.Credit) {
      Abono.belongsTo(models.Credit, { foreignKey: "idCredito", as: "credito" });
    }
    if (models.Order) {
      Abono.belongsTo(models.Order, { foreignKey: "idPedido", as: "pedido" });
    }
  };

  return Abono;
};

export default AbonoModel;
