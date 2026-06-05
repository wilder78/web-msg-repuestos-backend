export default (sequelize, DataTypes) => {
  const CustomerReturn = sequelize.define(
    "CustomerReturn",
    {
      idDevolucion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_devolucion",
      },
      idVenta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_venta",
      },
      idCliente: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_cliente",
      },
      fechaDevolucion: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "fecha_devolucion",
      },
      motivo: {
        type: DataTypes.STRING(255),
        allowNull: false, // Donde registras comentarios/detalles
        field: "motivo",
      },
      tipoAjuste: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "Devolución de Mercancía",
        field: "tipo_ajuste",
      },
      idEstadoDevolucion: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        field: "id_estado_devolucion",
      },
      totalAjuste: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.0,
        field: "total_ajuste",
      },
      // --- NUEVA COLUMNA PARA CLOUDINARY ---
      urlComprobante: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "url_comprobante",
      },
      // -------------------------------------
      idUsuarioAnulo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "id_usuario_anulo",
      },
      fechaAnulacion: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "fecha_anulacion",
      },
    },
    {
      tableName: "devoluciones",
      timestamps: false,
    },
  );

  CustomerReturn.associate = (models) => {
    // 1. Relación con Detalles
    if (models.ReturnDetail) {
      CustomerReturn.hasMany(models.ReturnDetail, {
        foreignKey: "idDevolucion",
        as: "detalles",
      });
    }

    // 2. Relación con Clientes
    if (models.Customer) {
      CustomerReturn.belongsTo(models.Customer, {
        foreignKey: "idCliente",
        as: "cliente",
      });
    }

    // 3. Relación con Ventas (Sale)
    if (models.Sale) {
      CustomerReturn.belongsTo(models.Sale, {
        foreignKey: "idVenta",
        as: "venta",
      });
    }

    // 4. Relación con Usuario que anuló
    const UserModel = models.User || models.Usuario || models.Users;
    if (UserModel) {
      CustomerReturn.belongsTo(UserModel, {
        foreignKey: "idUsuarioAnulo",
        as: "usuarioAnulo",
      });
    }
  };

  return CustomerReturn;
};
