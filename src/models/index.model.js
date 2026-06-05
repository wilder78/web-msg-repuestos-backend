import { Sequelize, DataTypes } from "sequelize";
import sequelize from "../config/mysql.config.js";

// --- Modelos Geográficos ---
import DepartmentModel from "./department.model.js";
import MunicipalityModel from "./municipality.model.js";

// --- Modelos Base y Negocio ---
import UserModel from "./user.model.js";
import RolModel from "./rol.model.js";
import TipoDocumentoModel from "./document_type.model.js";
import EmployeeModel from "./employee.model.js";
import SupplierModel from "./supplier.model.js";
import ZonaModel from "./zona.model.js";
import CustomerModel from "./customer.model.js";
import CategoryModel from "./category.model.js";
import ProductModel from "./product.model.js";
import PurchaseModel from "./shopping.model.js";
import PurchaseDetailModel from "./shopping_detail.model.js";
import PurchaseStatusModel from "./purchase_status.model.js";
import OrderModel from "./order.model.js";
import OrderDetailModel from "./order_detail.model.js";
import SaleModel from "./sale.model.js";
import ReturnModel from "./return.model.js";
import ReturnDetailModel from "./returnDetail.model.js";
import RutaModel from "./ruta.model.js";
import RutaDetailModel from "./rutaDetail.model.js";
import PermissionModel from "./permission.model.js";
import RolePermissionModel from "./rolePermission.model.js";
import CreditModel from "./credit.model.js";
import AbonoModel from "./abono.model.js";

// ✅ NUEVO: Importar modelo de estados de pedido
import { EstadoPedidoModel } from "./estadoPedido.model.js";
import NotificationModel from "./notification.model.js";

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// 1. INICIALIZACIÓN DE MODELOS
db.Department     = DepartmentModel(sequelize, DataTypes);
db.Municipality   = MunicipalityModel(sequelize, DataTypes);
db.Usuario        = UserModel(sequelize, DataTypes);
db.Rol            = RolModel(sequelize, DataTypes);
db.TipoDocumento  = TipoDocumentoModel(sequelize, DataTypes);
db.Empleado       = EmployeeModel(sequelize, DataTypes);
db.Supplier       = SupplierModel(sequelize, DataTypes);
db.Zona           = ZonaModel(sequelize, DataTypes);
db.Customer       = CustomerModel(sequelize, DataTypes);
db.Category       = CategoryModel(sequelize, DataTypes);
db.Product        = ProductModel(sequelize, DataTypes);
db.Purchase       = PurchaseModel(sequelize, DataTypes);
db.PurchaseDetail = PurchaseDetailModel(sequelize, DataTypes);
db.PurchaseStatus = PurchaseStatusModel(sequelize, DataTypes);
db.Order          = OrderModel(sequelize, DataTypes);
db.OrderDetail    = OrderDetailModel(sequelize, DataTypes);
db.Sale           = SaleModel(sequelize, DataTypes);
db.CustomerReturn = ReturnModel(sequelize, DataTypes);
db.ReturnDetail   = ReturnDetailModel(sequelize, DataTypes);
db.Ruta           = RutaModel(sequelize, DataTypes);
db.RutaDetail     = RutaDetailModel(sequelize, DataTypes);
db.Permission     = PermissionModel(sequelize, DataTypes);
db.RolePermission = RolePermissionModel(sequelize, DataTypes);
db.Credit         = CreditModel(sequelize, DataTypes);
db.Abono          = AbonoModel(sequelize, DataTypes);
db.Notification   = NotificationModel(sequelize, DataTypes);

// ✅ INICIALIZAR NUEVO MODELO
db.estadoPedido   = EstadoPedidoModel(sequelize, DataTypes);

// 2. ASOCIACIONES MANUALES (Para relaciones específicas como la de Pedidos)
// Un estado tiene muchos pedidos
db.estadoPedido.hasMany(db.Order, { 
  foreignKey: 'id_estado_pedido', 
  as: 'pedidos' 
});

// Un pedido pertenece a un estado
db.Order.belongsTo(db.estadoPedido, { 
  foreignKey: 'id_estado_pedido', 
  as: 'estado' 
});

// 3. ASOCIACIONES AUTOMÁTICAS (Llama a los métodos .associate de cada archivo si existen)
Object.keys(db).forEach((modelName) => {
  if (db[modelName] && db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export default db;
