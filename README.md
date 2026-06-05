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
│   ├── services/            # Servicios externos (imagen, PDF)
│   └── utils/               # Utilidades (notificaciones)
├── .env                     # Variables de entorno
├── package.json
└── README.md
```

---

## Endpoints Principales

Todas las rutas parten del prefijo `/api`.

### Seguridad y Accesos
| Recurso              | Ruta                     |
| -------------------- | ------------------------ |
| Usuarios             | `/api/users`             |
| Roles                | `/api/roles`             |
| Permisos             | `/api/permissions`       |
| Roles-Permisos       | `/api/role-permissions`  |

### Maestros y Referencias
| Recurso              | Ruta                     |
| -------------------- | ------------------------ |
| Tipo Documento       | `/api/tipo-documento`    |
| Zonas                | `/api/zonas`             |
| Categorías           | `/api/categories`        |
| Departamentos        | `/api/departments`       |
| Municipios           | `/api/municipalities`    |
| Empresa              | `/api/company`           |

### Entidades de Negocio
| Recurso              | Ruta                     |
| -------------------- | ------------------------ |
| Empleados            | `/api/employees`         |
| Proveedores          | `/api/suppliers`         |
| Clientes             | `/api/customers`         |
| Créditos             | `/api/credits`           |
| Productos            | `/api/products`          |
| Inventario           | `/api/inventory`         |
| Dashboard            | `/api/dashboard`         |
| Búsqueda             | `/api/search`            |
| Notificaciones       | `/api/notifications`     |

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
