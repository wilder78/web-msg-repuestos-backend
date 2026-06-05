// rutaDetail.model.js
export default (sequelize, DataTypes) => {
  const RutaDetail = sequelize.define(
    "RutaDetail",
    {
      idDetalleRuta: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_detalle_ruta",
      },
      idRuta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_ruta",
      },
      secuenciaParada: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: "secuencia_parada",
      },
      idCliente: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_cliente",
      },
      idPedido: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "id_pedido",
      },
      fechaLlegadaReal: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "fecha_llegada_real",
      },
      fechaSalidaReal: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "fecha_salida_real",
      },
      estadoVisita: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "estado_visita",
        validate: {
          notEmpty: { msg: "El estado de la visita es obligatorio" },
        },
      },
    },
    {
      tableName: "detalle_ruta",
      timestamps: false,
      freezeTableName: true,
    },
  );

  RutaDetail.associate = (models) => {
    RutaDetail.belongsTo(models.Ruta, {
      foreignKey: "idRuta",
      as: "cabeceraRuta",
    });
    RutaDetail.belongsTo(models.Customer, {
      foreignKey: "idCliente",
      as: "cliente",
    });
    
    RutaDetail.belongsTo(models.Order, {
      foreignKey: "idPedido",
      as: "pedido",
    });
  };

  return RutaDetail;
};
