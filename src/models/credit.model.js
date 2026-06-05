export default (sequelize, DataTypes) => {
  const Credit = sequelize.define(
    "Credit",
    {
      idCredito: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_credito",
      },
      idCliente: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_cliente",
        references: {
          model: "clientes",
          key: "id_cliente",
        },
      },
      cupoAprobado: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
        field: "cupo_aprobado",
      },
      cupoUtilizado: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
        field: "cupo_utilizado",
      },
      cupoDisponible: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
        field: "cupo_disponible",
      },
      idEstado: {
        type: DataTypes.TINYINT(1),
        defaultValue: 1,
        field: "id_estado",
      },
      fechaAprobacion: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
        field: "Fecha_Aprobacion",
      },
    },
    {
      tableName: "creditos",
      timestamps: false,
      freezeTableName: true,
    }
  );

  Credit.associate = (models) => {
    
    Credit.belongsTo(models.Customer, {
      foreignKey: "idCliente",
      as: "cliente",
    });
  };

  return Credit;
};
