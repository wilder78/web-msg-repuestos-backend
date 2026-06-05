export default (sequelize, DataTypes) => {
  const TipoDocumento = sequelize.define(
    "TipoDocumento",
    {
      idTipoDocumento: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "id_tipo_documento",
      },
      sigla: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
        field: "sigla",
      },
      descripcion: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "descripcion",
      },
    },
    {
      tableName: "tipo_documento",
      timestamps: false,
      freezeTableName: true,
    }
  );

  return TipoDocumento;
};