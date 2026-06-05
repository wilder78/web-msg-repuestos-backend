export default (sequelize, DataTypes) => {
  const Purchase = sequelize.define(
    "Purchase",
    {
      idCompra: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_compra",
      },
      fechaOrden: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "fecha_orden",
      },
      fechaRegistro: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "fecha_registro",
      },
      idProveedor: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_proveedor",
      },
      idEmpleado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_empleado",
      },
      idEstadoCompra: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, 
        field: "id_estado_compra",
      },
      total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
        field: "total",
      },
      rutaPdf: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "ruta_pdf",
      },
    },
    {
      tableName: "compras",
      timestamps: false,
      freezeTableName: true,
    },
  );

  // ── Elimina las claves raw snake_case que Sequelize duplica cuando
  //    el nombre del atributo (camelCase) difiere del campo de BD (field).
  const _rawSnakeKeys = ["id_proveedor", "id_empleado", "id_estado_compra"];
  const originalToJSON = Purchase.prototype.toJSON;
  Purchase.prototype.toJSON = function () {
    const values = originalToJSON.call(this);
    _rawSnakeKeys.forEach((k) => delete values[k]);
    return values;
  };

  Purchase.associate = (models) => {
    // 1. Relación con Detalles de Compra
    if (models.PurchaseDetail) {
      Purchase.hasMany(models.PurchaseDetail, {
        foreignKey: "id_compra",
        as: "detalles",
      });
    }

    // 2. Relación con Proveedores
    if (models.Supplier) {
      Purchase.belongsTo(models.Supplier, {
        foreignKey: "id_proveedor",
        as: "proveedor",
      });
    }

    // 3. Relación con Empleados
    if (models.Empleado) {
      Purchase.belongsTo(models.Empleado, {
        foreignKey: "id_empleado",
        as: "empleado",
      });
    }

    // 4. Relación depurada con Estados de Compra (Evita caídas del servidor por asincronía)
    if (models.PurchaseStatus) {
      Purchase.belongsTo(models.PurchaseStatus, {
        foreignKey: "id_estado_compra",
        as: "estado",
      });
    } else {
      console.warn("⚠️ Advertencia en Sequelize: El modelo 'PurchaseStatus' no se ha cargado en el objeto 'models' todavía.");
    }
  };

  return Purchase;
};