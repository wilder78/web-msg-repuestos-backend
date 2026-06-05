/**
 * Modelo para la tabla maestra de estados de pedidos en MSG Repuestos.
 * Define los estados: En Proceso, Despachado, Cancelado, Entregado.
 */
export const EstadoPedidoModel = (sequelize, DataTypes) => {
  return sequelize.define(
    "estados_pedido",
    {
      id_estado_pedido: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre_estado: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      descripcion: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      color_hex: {
        type: DataTypes.STRING(7),
        allowNull: true,
        defaultValue: "#6B7280", // Color gris por defecto
      },
    },
    {
      timestamps: false, // No necesitamos createdAt/updatedAt para esta tabla maestra
      freezeTableName: true, // Evita que Sequelize pluralice el nombre a 'estados_pedidos'
    },
  );
};
