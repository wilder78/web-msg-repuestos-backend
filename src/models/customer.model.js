export default (sequelize, DataTypes) => {
  const Customer = sequelize.define(
    "Customer",
    {
      idCliente: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_cliente",
      },
      idTipoDocumento: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_tipo_documento",
        validate: {
          notNull: { msg: "El tipo de documento es obligatorio." },
          isInt: { msg: "El tipo de documento debe ser un valor numérico." },
        },
      },
      numeroDocumento: {
        type: DataTypes.STRING(15),
        allowNull: false,
        field: "numero_documento",
        validate: {
          notEmpty: { msg: "El número de documento es obligatorio." },
          len: {
            args: [5, 15],
            msg: "El documento debe tener entre 5 y 15 caracteres.",
          },
        },
      },
      razonSocial: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: "razon_social",
        validate: {
          notEmpty: { msg: "La razón social o nombre es obligatorio." },
        },
      },
      personaContacto: {
        type: DataTypes.STRING(150), // Ajustado a 150 según tu código previo
        allowNull: true,
        field: "persona_contacto",
      },
      direccion: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "direccion",
        validate: {
          notEmpty: { msg: "La dirección es obligatoria." },
        },
      },
      telefono: {
        type: DataTypes.STRING(15),
        allowNull: false,
        field: "telefono",
        validate: {
          notEmpty: { msg: "El teléfono de contacto es obligatorio." },
        },
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "email",
        validate: {
          isEmailIfNotEmpty(value) {
            if (value && value.trim() !== "" && !/^\S+@\S+\.\S+$/.test(value)) {
              throw new Error("Debe ingresar un correo electrónico válido.");
            }
          },
        },
      },
      tipoCliente: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "tipo_cliente",
        defaultValue: "General",
        validate: {
          isIn: {
            args: [["General", "Mayorista", "Minorista", "Consumidor final"]],
            msg: "Tipo de cliente no válido.",
          },
        },
      },
      cupoCredito: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        field: "cupo_credito",
        validate: {
          isDecimal: true,
          min: { args: [0], msg: "El cupo de crédito no puede ser negativo." },
        },
      },
      idEstado: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        field: "id_estado",
      },
      idZona: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_zona",
        validate: {
          notNull: { msg: "La zona es obligatoria." },
        },
      },
      fechaRegistro: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "fecha_registro",
      },
      // ÚNICA CLAVE FORÁNEA REAL DE UBICACIÓN (Según image_bb7ff8.png)
      municipioId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "municipio_id",
      },
    },
    {
      tableName: "clientes",
      timestamps: false,
      freezeTableName: true,
      indexes: [
        {
          unique: true,
          fields: ["numero_documento", "id_tipo_documento"],
          name: "clientes_num_doc_tipo_doc_unique"
        }
      ]
    },
  );

  Customer.associate = (models) => {
    // Relación con Tipo de Documento
    if (models.TipoDocumento) {
      Customer.belongsTo(models.TipoDocumento, {
        foreignKey: "idTipoDocumento",
        as: "tipoDocumento",
      });
    }

    // Relación con Zona
    if (models.Zona) {
      Customer.belongsTo(models.Zona, {
        foreignKey: "idZona",
        as: "zona",
      });
    }

    // RELACIÓN DE UBICACIÓN: Cliente -> Municipio -> Departamento
    if (models.Municipality) {
      Customer.belongsTo(models.Municipality, {
        foreignKey: "municipioId",
        as: "municipio",
      });
    }

    // RELACIÓN CON USUARIO: Un cliente puede tener un usuario de login asociado
    if (models.Usuario) {
      Customer.hasOne(models.Usuario, {
        foreignKey: "idCliente",
        as: "usuario",
      });
    }
  };

  return Customer;
};
