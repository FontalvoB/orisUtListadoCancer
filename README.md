# ORIS - Listado de Cáncer

Aplicación web para la gestión y visualización de registros de cáncer con autenticación de usuarios, control de roles y auditoría de cambios.

## 🚀 Características

- **Autenticación segura** con Firebase Authentication
- **Control de acceso basado en roles** (RBAC)
- **Gestión de usuarios y roles** para administradores
- **Registro de actividades** con auditoría completa de cambios
- **Gestión de registros de cáncer** con filtros avanzados
- **Dashboard intuitivo** con resumen de información
- **Perfil de usuario** personalizable
- **Interfaz responsiva** moderna y accesible

## 📋 Requisitos previos

- Node.js 18 o superior
- Yarn o npm
- Cuenta de Firebase configurada
- Variables de entorno configuradas

## 🔧 Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd OrisListadoCancer
```

2. **Instalar dependencias**
```bash
yarn install
# o
npm install
```

3. **Configurar variables de entorno**
Crea un archivo `.env` en la raíz del proyecto con tus credenciales de Firebase:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 📦 Scripts disponibles

```bash
# Desarrollo
yarn dev          # Inicia el servidor de desarrollo (puerto 5173)

# Compilación
yarn build        # Compila TypeScript y construye con Vite
yarn preview      # Vista previa de la compilación producción

# Linting
yarn lint         # Verifica el código con ESLint

# Firebase
firebase deploy   # Despliega hosting y reglas de Firestore
firebase login    # Inicia sesión en Firebase
```

## 📁 Estructura del proyecto

```
src/
├── components/          # Componentes reutilizables
│   └── ProtectedRoute.tsx
├── config/              # Configuración de servicios
│   └── firebase.ts
├── context/             # Contexto de React (Auth, etc.)
│   └── AuthContext.tsx
├── layouts/             # Layouts principales
│   └── AdminLayout.tsx
├── pages/               # Páginas de la aplicación
│   ├── DashboardPage.tsx
│   ├── LoginPage.tsx
│   ├── ProfilePage.tsx
│   ├── RolesPage.tsx
│   ├── SetupPage.tsx
│   ├── UnauthorizedPage.tsx
│   └── UsersPage.tsx
├── services/            # Servicios (API, Firestore, etc.)
│   ├── cancerService.ts
│   └── firestore.ts
├── types/               # Definiciones de tipos TypeScript
│   └── index.ts
├── App.tsx              # Componente principal
├── main.tsx             # Punto de entrada
├── index.css            # Estilos globales
└── App.css              # Estilos de componentes

public/                 # Archivos estáticos
dist/                   # Compilación producción (generado)
```

## 🔐 Autenticación y Roles

### Roles disponibles:
- **superadmin**: Acceso total al sistema
- **admin**: Gestión de usuarios y roles
- **user**: Acceso básico a funcionalidades

### Rutas protegidas:
- `/admin/*` - Requiere rol de admin o superior
- `/profile` - Requiere estar autenticado
- `/` - Acceso público

## 🗄️ Base de datos

### Colecciones principales:
- **users**: Información de usuarios
- **roles**: Definición de roles y permisos
- **cancerRecords**: Registros de casos de cáncer
- **activityLog**: Auditoría de cambios

### Reglas de Firestore:
Las reglas se encuentran en `firestore.rules` y se despliegan automáticamente.

## 🛠️ Tecnologías

- **React 18** - Librería de UI
- **TypeScript** - Tipado estático
- **Vite** - Bundler y servidor dev
- **Firebase** - Backend y autenticación
- **React Router** - Enrutamiento
- **React Icons** - Iconografía
- **ESLint** - Linting de código

## 📝 Convenciones de código

- Componentes funcionales con hooks
- Archivos en formato camelCase
- Exportación por defecto en archivos de componentes
- TypeScript con tipos explícitos
- ESLint configurado para TypeScript

## 🚢 Despliegue

Para desplegar la aplicación:

```bash
# 1. Compilar
yarn build

# 2. Desplegar a Firebase Hosting
firebase deploy
```

## 🐛 Resolución de problemas

### Error "No hay permisos para acceder"
- Verifica tu rol en la base de datos
- Comprueba las reglas de Firestore en `firestore.rules`

### Error de conexión a Firebase
- Verifica que `.env` tiene las credenciales correctas
- Asegúrate de que el proyecto Firebase está activo

### Puerto 5173 en uso
```bash
# Mata procesos en el puerto 5173
kill -9 $(lsof -t -i :5173)
```

## 📄 Licencia

Especifica la licencia de tu proyecto aquí.

## 👥 Contribución

Para contribuir al proyecto:

1. Crea una rama para tu feature: `git checkout -b feature/nombre-feature`
2. Commit tus cambios: `git commit -am 'Agrega nueva feature'`
3. Push a la rama: `git push origin feature/nombre-feature`
4. Abre un Pull Request

## 📞 Soporte

Para reportar bugs o solicitar features, abre un issue en el repositorio.

---

**Última actualización:** Febrero 2026
