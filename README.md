# MSG Repuestos - Backend

API REST para la gestión integral de inventarios, cartera, créditos, clientes y pedidos del sistema MSG Repuestos.

---

## Tecnologías Utilizadas

- **Node.js** v22
- **Express** 5
- **MySQL** 8+
- **Sequelize** 6 (ORM)
- **JWT** (jsonwebtoken) — autenticación
- **bcrypt** — hash de contraseñas
- **Cloudinary** + multer — almacenamiento de imágenes
- **PDFKit** — generación de reportes PDF
- **Nodemailer** — servicio de envío de correos electrónicos (verificación y recuperación)
- **dotenv** — variables de entorno

---

## Requisitos Previos

- Node.js >= 18 (v22 recomendada)
- npm >= 9
- MySQL 8+ instalado y corriendo

---

## Instalación y Configuración

```bash
# Clonar el repositorio
git clone <repo-url>
cd msg-repuestos-backend

# Instalar dependencias
npm install
```

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto con base en la siguiente plantilla:

```env
# Configuración general
PORT=8080
NODE_ENV=development

# JWT
JWT_SECRET=tu_s3cr3to_3xtr3_jwt
JWT_EXPIRES=1h

# MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=msg_repuestos

# Cloudinary (opcional — para subida de imágenes)
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
VITE_CLOUDINARY_API_KEY=tu_api_key
VITE_CLOUDINARY_API_SECRET=tu_api_secret

# Servidor de Correo (Nodemailer / Gmail SMTP)
EMAIL_USER=tu_correo_gmail@gmail.com
EMAIL_PASS=tu_contraseña_aplicacion_gmail
```

> La base de datos `DB_NAME` debe existir previamente en MySQL. El esquema de tablas se sincroniza automáticamente al iniciar el servidor en modo `development`.

---

## Comandos de Ejecución

```bash
# Desarrollo (con recarga automática)
npm run dev

# Producción
npm start
```

El servidor se inicia en `http://localhost:8080` (o el puerto definido en `PORT`).

---

## Estructura de Carpetas

```
msg-repuestos-backend/
├── public/reports/          # Reportes PDF generados
├── src/
│   ├── app.js               # Punto de entrada del servidor
│   ├── config/              # Configuración (MySQL, Cloudinary)
│   ├── controllers/         # Lógica de negocio por recurso
│   ├── middleware/           # Autenticación JWT, multer
│   ├── models/              # Definiciones de Sequelize (28 modelos)
│   ├── routes/              # Definición de rutas Express
│   ├── services/            # Servicios externos (imagen, PDF, emailService)
│   └── utils/               # Utilidades (notificaciones)
├── .env                     # Variables de entorno
├── package.json
└── README.md
```

---

## Endpoints Principales

Todas las rutas parten del prefijo `/api`.

### Seguridad y Accesos
| Recurso              | Ruta                     | Descripción / Funcionalidad Adicional |
| -------------------- | ------------------------ | ------------------------------------- |
| Usuarios             | `/api/users`             | Gestión de usuarios base. |
| Registro             | `POST /api/users`        | Registro. Genera token de verificación de email y vincula información geográfica (`municipioId`). |
| Verificación Correo  | `GET /api/users/verify-email` | Activa la cuenta con el token enviado por correo. |
| Recuperación Clave   | `POST /api/users/forgot-password` | Envía enlace temporal para restablecer la contraseña. |
| Restablecer Clave    | `POST /api/users/reset-password` | Actualiza la clave utilizando un reset token válido. |
| Disponibilidad Doc   | `GET /api/users/check-document` | Verifica en tiempo real si un número de documento ya está registrado (Público). |
| Perfil               | `GET /api/users/profile` | Retorna los datos y vinculación del perfil autenticado. |
| Roles                | `/api/roles`             | Gestión de perfiles y roles. |
| Permisos             | `/api/permissions`       | Lista granular de permisos del sistema. |
| Roles-Permisos       | `/api/role-permissions`  | Cruce de permisos asociados a roles. |

### Maestros y Referencias
| Recurso              | Ruta                     | Descripción / Funcionalidad Adicional |
| -------------------- | ------------------------ | ------------------------------------- |
| Tipo Documento       | `/api/tipo-documento`    | **GET / público** para uso en el selector del formulario de registro y carrito. |
| Zonas                | `/api/zonas`             | |
| Categorías           | `/api/categories`        | |
| Departamentos        | `/api/departments`       | Público (Usado en geolocalización) |
| Municipios           | `/api/municipalities`    | Público (Usado en geolocalización) |
| Empresa              | `/api/company`           | |

### Entidades de Negocio
| Recurso              | Ruta                     | Descripción / Funcionalidad Adicional |
| -------------------- | ------------------------ | ------------------------------------- |
| Empleados            | `/api/employees`         | Fichas del personal interno. |
| Proveedores          | `/api/suppliers`         | Socios de reabastecimiento. |
| Clientes             | `/api/customers`         | Directorio de clientes vinculados. |
| Créditos             | `/api/credits`           | Estado y cupo de cartera asignada. |
| Productos            | `/api/products`          | **Catálogo con filtros avanzados y paginación.**<br>Soporta: `page`, `limit`, `search`, `categoria`, `marca`, `precioMin`, `precioMax`, `soloNuevos`. |
| Productos Total      | `GET /api/products/all-list` | Lista plana no paginada de todos los productos (Modales del Dashboard). |
| Marcas Únicas        | `GET /api/products/brands` | Retorna marcas de productos activos (Sidebar dinámico). |
| Feeds de Home        | `GET /api/products/latest`<br>`GET /api/products/home/top-repuestos`<br>`GET /api/products/home/top-accesorios` | Endpoints aislados para los carruseles de la página principal (Home). |
| Inventario           | `/api/inventory`         | Estado actual del stock físico y mermas. |
| Dashboard            | `/api/dashboard`         | Estadísticas consolidadas e indicadores operativos. |
| Búsqueda             | `/api/search`            | Módulo centralizado de búsquedas. |
| Notificaciones       | `/api/notifications`     | Avisos e historial del sistema. |

### Transacciones
| Recurso              | Ruta                     |
| -------------------- | ------------------------ |
| Compras              | `/api/shopping`          |
| Pedidos              | `/api/orders`            |
| Ventas               | `/api/sales`             |
| Devoluciones         | `/api/returns`           |
| Abonos               | `/api/abonos`            |
| Rutas                | `/api/rutas`             |

### Salud del Servidor
| Recurso              | Ruta                     |
| -------------------- | ------------------------ |
| Health Check         | `GET /health`            |
| Health Check         | `GET /api/health`        |

---

## Licencia

ISC

