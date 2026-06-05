export default (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
    {
      id_notification: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_notification",
      },
      titulo: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      mensaje: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      tipo: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      id_rol_destino: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "id_rol_destino",
      },
      id_usuario_destino: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "id_usuario_destino",
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_read",
      },
      fecha_registro: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "fecha_registro",
      },
    },
    {
      tableName: "notifications",
      timestamps: false,
      freezeTableName: true,
    }
  );

  return Notification;
};
