export default (sequelize, DataTypes) => {
  const Supplier = sequelize.define(
    "Supplier",
    {
      idProveedor: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_proveedor",
      },
      idTipoDocumento: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_tipo_documento",
        validate: {
          notNull: { msg: "El tipo de documento es obligatorio" },
        },
      },
      numeroDocumento: {
        type: DataTypes.STRING(15),
        allowNull: false,
        unique: true,
        field: "numero_documento",
        validate: {
          notEmpty: { msg: "El número de documento no puede estar vacío" },
        },
      },
      nombreEmpresa: {
        type: DataTypes.STRING(150),
        allowNull: false,
        field: "nombre_empresa",
        validate: {
          notEmpty: { msg: "El nombre de la empresa es obligatorio" },
        },
      },
      contacto: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "contacto",
      },
      direccion: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "direccion",
        validate: {
          notEmpty: { msg: "La dirección es obligatoria" },
        },
      },
      telefono: {
        type: DataTypes.STRING(15),
        allowNull: false,
        field: "telefono",
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "email",
        validate: {
          isEmail: { msg: "Debe ser un correo electrónico válido" },
        },
      },
      condicionesComerciales: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "condiciones_comerciales",
      },
      idEstado: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        field: "id_estado",
      },
      municipioId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "municipio_id",
      },
    },
    {
      tableName: "proveedores",
      timestamps: false,
      freezeTableName: true,
    },
  );

  Supplier.associate = (models) => {
    Supplier.belongsTo(models.TipoDocumento, {
      foreignKey: "idTipoDocumento",
      as: "tipoDocumento",
    });

    Supplier.belongsTo(models.Municipality, {
      foreignKey: "municipioId",
      as: "municipio",
    });
  };

  return Supplier; 
};
