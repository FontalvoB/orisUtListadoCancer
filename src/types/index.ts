export type RoleName = 'superadmin' | 'admin' | 'editor' | 'user';

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

export interface Role {
  id: string;
  name: RoleName;
  displayName: string;
  description: string;
  permissions: string[]; // Permission IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  uid: string; // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL: string;
  phone: string;
  address: string;
  roleId: string;
  roleName: RoleName;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  profile: UserProfile | null;
}

// Default permissions by module
export const DEFAULT_PERMISSIONS: Permission[] = [
  // Users module
  { id: 'users.view', name: 'Ver Usuarios', description: 'Ver lista de usuarios', module: 'users' },
  { id: 'users.create', name: 'Crear Usuarios', description: 'Crear nuevos usuarios', module: 'users' },
  { id: 'users.edit', name: 'Editar Usuarios', description: 'Editar usuarios existentes', module: 'users' },
  { id: 'users.delete', name: 'Eliminar Usuarios', description: 'Eliminar usuarios', module: 'users' },
  // Roles module
  { id: 'roles.view', name: 'Ver Roles', description: 'Ver lista de roles', module: 'roles' },
  { id: 'roles.create', name: 'Crear Roles', description: 'Crear nuevos roles', module: 'roles' },
  { id: 'roles.edit', name: 'Editar Roles', description: 'Editar roles existentes', module: 'roles' },
  { id: 'roles.delete', name: 'Eliminar Roles', description: 'Eliminar roles', module: 'roles' },
  // Profiles module
  { id: 'profiles.view', name: 'Ver Perfiles', description: 'Ver perfiles', module: 'profiles' },
  { id: 'profiles.edit', name: 'Editar Perfiles', description: 'Editar perfiles', module: 'profiles' },
  // Dashboard
  { id: 'dashboard.view', name: 'Ver Dashboard', description: 'Ver dashboard de administración', module: 'dashboard' },
  // Cancer Registry
  { id: 'cancer.view', name: 'Ver Registros Cáncer', description: 'Ver registros de cáncer', module: 'cancer' },
  { id: 'cancer.create', name: 'Crear Registros Cáncer', description: 'Crear registros de cáncer', module: 'cancer' },
  { id: 'cancer.edit', name: 'Editar Registros Cáncer', description: 'Editar registros de cáncer', module: 'cancer' },
  { id: 'cancer.delete', name: 'Eliminar Registros Cáncer', description: 'Eliminar registros de cáncer', module: 'cancer' },
  { id: 'cancer.import', name: 'Importar Excel Cáncer', description: 'Importar registros desde Excel', module: 'cancer' },
  // Activity Log
  { id: 'activity.view', name: 'Ver Registro de Actividad', description: 'Ver el log de actividad de la plataforma', module: 'activity' },
];

export const DEFAULT_ROLES: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'superadmin',
    displayName: 'Super Administrador',
    description: 'Acceso total al sistema',
    permissions: DEFAULT_PERMISSIONS.map(p => p.id),
  },
  {
    name: 'admin',
    displayName: 'Administrador',
    description: 'Administración de usuarios, roles y perfiles',
    permissions: DEFAULT_PERMISSIONS.map(p => p.id),
  },
  {
    name: 'editor',
    displayName: 'Editor',
    description: 'Puede editar contenido',
    permissions: ['dashboard.view', 'profiles.view', 'profiles.edit', 'cancer.view', 'cancer.create', 'cancer.edit', 'cancer.delete', 'cancer.import', 'activity.view'],
  },
  {
    name: 'user',
    displayName: 'Usuario',
    description: 'Usuario básico del sistema',
    permissions: ['dashboard.view', 'profiles.view', 'cancer.view'],
  },
];

// ==================== CANCER REGISTRY ====================
export interface CancerRecord {
  id: string;
  radicado: string;
  idInterno: string;
  nitPrestador: string;
  razonSocial: string;
  estado: string;
  numeroFactura: string;
  estadoAuditoria: string;
  ciudadPrestador: string;
  periodo: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombreEstablecimiento: string;
  epcCiudad: string;
  epcDepartamento: string;
  regionalNormalizada: string;
  fechaIngreso: string;
  fechaEgreso: string;
  diasEstancia: number;
  tipoServicio: string;
  codigoServicio: string;
  descripcionServicio: string;
  agrupadorServicios: string;
  codDiagnostico: string;
  descDiagnostico: string;
  dx: string;
  cantidad: number;
  valorUnitario: number;
  valorTotal: number;
  tipoContrato: string;
  tutelaUsuario: string;
  conteo: number;
  tutela: string;
  createdAt: Date;
  updatedAt: Date;
}

// Map Excel column headers to CancerRecord fields
export const EXCEL_TO_FIELD_MAP: Record<string, keyof Omit<CancerRecord, 'id' | 'createdAt' | 'updatedAt'>> = {
  'RADICADO': 'radicado',
  'ID INTERNO': 'idInterno',
  'NIT PRESTADOR': 'nitPrestador',
  'RAZON SOCIAL': 'razonSocial',
  'ESTADO': 'estado',
  'NUMERO FACTURA': 'numeroFactura',
  'ESTADO AUDITORIA': 'estadoAuditoria',
  'CIUDAD PRESTADOR': 'ciudadPrestador',
  'PERIODO': 'periodo',
  'TIPO DOCUMENTO': 'tipoDocumento',
  'NUMERO DOCUMENTO': 'numeroDocumento',
  'NOMBRE_ESTABLECIMIENTO DEL PACIENTE': 'nombreEstablecimiento',
  'EPC_CIUDAD DEL PACIENTE': 'epcCiudad',
  'EPC_DEPARTAMENTO DEL PACIENTE': 'epcDepartamento',
  'REGIONAL_NORMALIZADA DEL PACIENTE': 'regionalNormalizada',
  'FECHA INGRESO': 'fechaIngreso',
  'FECHA EGRESO': 'fechaEgreso',
  'DIAS ESTANCIA': 'diasEstancia',
  'TIPO SERVICIO': 'tipoServicio',
  'CODIGO SERVICIO': 'codigoServicio',
  'DESCRIPCION SERVICIO': 'descripcionServicio',
  'AGRUPADOR DE SERVICIOS': 'agrupadorServicios',
  'COD. DIAGNOSTICO': 'codDiagnostico',
  'DESC. DIAGNOSTICO': 'descDiagnostico',
  'dx': 'dx',
  'CANTIDAD': 'cantidad',
  'VALOR UNITARIO': 'valorUnitario',
  'VALOR TOTAL': 'valorTotal',
  'TIPO CONTRATO': 'tipoContrato',
  'TUTELA-USUARIO': 'tutelaUsuario',
  'CONTEO': 'conteo',
  'TUTELA': 'tutela',
};
