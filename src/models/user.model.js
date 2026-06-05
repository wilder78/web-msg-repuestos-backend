import bcrypt from "bcryptjs";

export default (sequelize, DataTypes) => {
  const User = sequelize.define(
    "usuario",
    {
      idUsuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_usuario",
      },
      nombreUsuario: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "nombre_usuario",
      },
      email: {
        type: DataTypes.STRING(125),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
        field: "email",
      },
      // Este campo solo guardará la cadena final ya encriptada de forma segura
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "password_hash",
      },
      // Campo virtual (no existe en la base de datos MySQL) 
      // Sirve para recibir la contraseña del frontend, validarla y luego encriptarla
      password: {
        type: DataTypes.VIRTUAL,
        allowNull: true, // Permitir nulo para cuando actualicemos otros datos sin tocar la clave
        validate: {
          isStrongPassword(value) {
            if (!value) return; // Si no viene password en la petición, ignorar validación
            
            const strongPasswordRegex =
              /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}\[\]:;<>,.?~\\/-]).{8,}$/;
            if (!strongPasswordRegex.test(value)) {
              throw new Error(
                "La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, un número y un carácter especial."
              );
            }
          },
        },
      },
      idEstado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: "id_estado",
      },
      fechaCreacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "fecha_creacion",
      },
      idRol: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "id_rol",
      },
      idCliente: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "id_cliente",
      },
      passwordResetToken: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "password_reset_token",
      },
      passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "password_reset_expires",
      },
      verificationToken: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "verification_token",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_active",
      },
    },
    {
      tableName: "usuario",
      timestamps: false,
      freezeTableName: true,
      // HOOKS: Automatizan la encriptación antes de guardar en MySQL
      hooks: {
        beforeSave: async (user) => {
          // Si el usuario asignó o cambió su contraseña a través del campo virtual 'password'
          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.passwordHash = await bcrypt.hash(user.password, salt);
          }
        },
        beforeUpdate: async (user) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.passwordHash = await bcrypt.hash(user.password, salt);
          }
        }
      }
    }
  );

  User.associate = (models) => {
    User.belongsTo(models.Rol, {
      foreignKey: "idRol",
      as: "rol",
    });
    if (models.Empleado) {
      User.hasOne(models.Empleado, {
        foreignKey: "idUsuario",
        as: "empleado",
      });
    }
    if (models.Customer) {
      User.belongsTo(models.Customer, {
        foreignKey: "idCliente",
        as: "cliente",
      });
    }
  };

  return User;
};