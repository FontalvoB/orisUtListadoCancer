export type RoleName = "superadmin" | "admin" | "editor" | "user";

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
  {
    id: "users.view",
    name: "Ver Usuarios",
    description: "Ver lista de usuarios",
    module: "users",
  },
  {
    id: "users.create",
    name: "Crear Usuarios",
    description: "Crear nuevos usuarios",
    module: "users",
  },
  {
    id: "users.edit",
    name: "Editar Usuarios",
    description: "Editar usuarios existentes",
    module: "users",
  },
  {
    id: "users.delete",
    name: "Eliminar Usuarios",
    description: "Eliminar usuarios",
    module: "users",
  },
  // Roles module
  {
    id: "roles.view",
    name: "Ver Roles",
    description: "Ver lista de roles",
    module: "roles",
  },
  {
    id: "roles.create",
    name: "Crear Roles",
    description: "Crear nuevos roles",
    module: "roles",
  },
  {
    id: "roles.edit",
    name: "Editar Roles",
    description: "Editar roles existentes",
    module: "roles",
  },
  {
    id: "roles.delete",
    name: "Eliminar Roles",
    description: "Eliminar roles",
    module: "roles",
  },
  // Profiles module
  {
    id: "profiles.view",
    name: "Ver Perfiles",
    description: "Ver perfiles",
    module: "profiles",
  },
  {
    id: "profiles.edit",
    name: "Editar Perfiles",
    description: "Editar perfiles",
    module: "profiles",
  },
  // Dashboard
  {
    id: "dashboard.view",
    name: "Ver Dashboard",
    description: "Ver dashboard de administración",
    module: "dashboard",
  },
  // Cancer Registry
  {
    id: "cancer.view",
    name: "Ver Registros Cáncer",
    description: "Ver registros de cáncer",
    module: "cancer",
  },
  {
    id: "cancer.create",
    name: "Crear Registros Cáncer",
    description: "Crear registros de cáncer",
    module: "cancer",
  },
  {
    id: "cancer.edit",
    name: "Editar Registros Cáncer",
    description: "Editar registros de cáncer",
    module: "cancer",
  },
  {
    id: "cancer.delete",
    name: "Eliminar Registros Cáncer",
    description: "Eliminar registros de cáncer",
    module: "cancer",
  },
  {
    id: "cancer.import",
    name: "Importar Excel Cáncer",
    description: "Importar registros desde Excel",
    module: "cancer",
  },
  // Activity Log
  {
    id: "activity.view",
    name: "Ver Registro de Actividad",
    description: "Ver el log de actividad de la plataforma",
    module: "activity",
  },
];

export const DEFAULT_ROLES: Omit<Role, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "superadmin",
    displayName: "Super Administrador",
    description: "Acceso total al sistema",
    permissions: DEFAULT_PERMISSIONS.map((p) => p.id),
  },
  {
    name: "admin",
    displayName: "Administrador",
    description: "Administración de usuarios, roles y perfiles",
    permissions: DEFAULT_PERMISSIONS.map((p) => p.id),
  },
  {
    name: "editor",
    displayName: "Editor",
    description: "Puede editar contenido",
    permissions: [
      "dashboard.view",
      "profiles.view",
      "profiles.edit",
      "cancer.view",
      "cancer.create",
      "cancer.edit",
      "cancer.delete",
      "cancer.import",
      "activity.view",
    ],
  },
  {
    name: "user",
    displayName: "Usuario",
    description: "Usuario básico del sistema",
    permissions: ["dashboard.view", "profiles.view", "cancer.view"],
  },
];

// ==================== CANCER REGISTRY ====================
export interface CancerRecord {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  primerApellido: string;
  segundoApellido: string;
  primerNombre: string;
  segundoNombre: string;
  edad: number;
  cursoDeVida: string;
  sexo: string;
  nombreEstablecimiento: string;
  epcCiudad: string;
  epcDepartamento: string;
  regionalNormalizada: string;
  discapacidad: string;
  lgtbiq: string;
  gruposEtnicos: string;
  estado: string;
  novedad: string;
  // Enfermedades — "1" si aplica, "" si no
  hipertensionHTA: string;
  diabetesMellitusDM: string;
  vih: string;
  sifilis: string;
  varicela: string;
  tuberculosis: string;
  hiperlipidemia: string;
  asma: string;
  enfermedadRenalCronicaERC: string;
  desnutricion: string;
  obesidad: string;
  epilepsia: string;
  hipotiroidismo: string;
  enfermedadPulmonarObstructivaCronicaEPOC: string;
  artritis: string;
  cancerCA: string;
  tipoDeCancer: string;
  patologiasCardiacas: string;
  trastornoSaludMental: string;
  gestantes: string;
  mujeresConTrastornosMenstruales: string;
  endometriosis: string;
  amenorrea: string;
  glaucoma: string;
  consumoDeSPA: string;
  enfermedadHuerfana: string;
  hiperplasiaDeProstata: string;
  hemofilia: string;
  otrosTrastornosVisuales: string;
  numeroDERiesgos: string;
  // Consultas/procedimientos — contienen fechas (DD/MM/YYYY) o vacío
  valoracionMedicinaGeneralFamiliar: string;
  consultaJoven: string;
  consultaAdultez: string;
  consultaVejez: string;
  citologiaTamizajeCACervix: string;
  resultadoCitologia: string;
  planificacionFamiliar: string;
  metodo: string;
  consultaDeMama: string;
  mamografia: string;
  resultadoMamografia: string;
  tamizajeCAProstata: string;
  resultadoProstata: string;
  tamizajeCADeColon: string;
  resultadoColon: string;
  // Laboratorios — contienen fechas o vacío
  creatinina: string;
  glicemia: string;
  hdl: string;
  colesterolTotal: string;
  ldl: string;
  trigliceridos: string;
  // Especialidades — contienen fechas o vacío
  pediatria: string;
  medicinaInterna: string;
  educacion: string;
  odontologia: string;
  tomaVIH: string;
  tomaSifilis: string;
  tomaHepatitisB: string;
  psicologia: string;
  nutricion: string;
  ginecologia: string;
  ortopedia: string;
  endocrinologia: string;
  oftalmologia: string;
  psiquiatria: string;
  terapiaFisica: string;
  intervenciones: string;
  createdAt: Date;
  updatedAt: Date;
}

// Map Excel column headers to CancerRecord fields
export const EXCEL_TO_FIELD_MAP: Record<
  string,
  keyof Omit<CancerRecord, "id" | "createdAt" | "updatedAt">
> = {
  TIPO_DOCUMENTO: "tipoDocumento",
  NUMERO_DOCUMENTO: "numeroDocumento",
  PRIMER_APELLIDO: "primerApellido",
  SEGUNDO_APELLIDO: "segundoApellido",
  PRIMER_NOMBRE: "primerNombre",
  SEGUNDO_NOMBRE: "segundoNombre",
  EDAD: "edad",
  "CURSO DE VIDA": "cursoDeVida",
  SEXO: "sexo",
  NOMBRE_ESTABLECIMIENTO: "nombreEstablecimiento",
  EPC_CIUDAD: "epcCiudad",
  EPC_DEPARTAMENTO: "epcDepartamento",
  REGIONAL_NORMALIZADA: "regionalNormalizada",
  DISCAPACIDAD: "discapacidad",
  "LGTBIQ+": "lgtbiq",
  "GRUPOS ETNICOS": "gruposEtnicos",
  ESTADO: "estado",
  NOVEDAD: "novedad",
  "Hipertensión (HTA)": "hipertensionHTA",
  "Diabetes Mellitus (DM)": "diabetesMellitusDM",
  VIH: "vih",
  SIFILIS: "sifilis",
  VARICELA: "varicela",
  Tuberculosis: "tuberculosis",
  Hiperlipidemia: "hiperlipidemia",
  Asma: "asma",
  "Enfermedad Renal Crónica (ERC)": "enfermedadRenalCronicaERC",
  Desnutricion: "desnutricion",
  Obesidad: "obesidad",
  Epilepsia: "epilepsia",
  Hipotiroidismo: "hipotiroidismo",
  "Enfermedad Pulmonar Obstructiva Crónica (EPOC)":
    "enfermedadPulmonarObstructivaCronicaEPOC",
  Artritis: "artritis",
  "Cáncer (CA)": "cancerCA",
  "Tipo de cancer": "tipoDeCancer",
  "Patologías Cardíacas": "patologiasCardiacas",
  "TRASTORNO/SALUD MENTAL": "trastornoSaludMental",
  GESTANTES: "gestantes",
  "Mujeres con trastornos menstruales": "mujeresConTrastornosMenstruales",
  Endometriosis: "endometriosis",
  AMENORREA: "amenorrea",
  Glaucoma: "glaucoma",
  "CONSUMO DE SPA": "consumoDeSPA",
  "ENFERMEDAD HUERFANA": "enfermedadHuerfana",
  "HIPERPLASIA DE PROSTATA": "hiperplasiaDeProstata",
  HEMOFILIA: "hemofilia",
  "OTROS TRASTORNOS VISUALES": "otrosTrastornosVisuales",
  "NUMERO DE RIESGOS": "numeroDERiesgos",
  "VALORACION MEDICINA GENERAL/FAMILIAR": "valoracionMedicinaGeneralFamiliar",
  "CONSULTA JOVEN": "consultaJoven",
  "CONSULTA ADULTEZ": "consultaAdultez",
  "CONSULTA VEJEZ": "consultaVejez",
  "CITOLOGIA-TAMIZAJE CA DE CERVIX": "citologiaTamizajeCACervix",
  "RESULTADO CITOLOGIA": "resultadoCitologia",
  "PLANIFICACION FAMILIAR": "planificacionFamiliar",
  METODO: "metodo",
  "CONSULTA DE MAMA": "consultaDeMama",
  MAMOGRAFIA: "mamografia",
  "RESULTADO MAMOGRAFIA": "resultadoMamografia",
  "TAMIZAJE CA PROSTATA": "tamizajeCAProstata",
  "RESULTADO PROSTATA": "resultadoProstata",
  "TAMIZAJE CA DE COLON": "tamizajeCADeColon",
  "RESULTADO COLON": "resultadoColon",
  CREATININA: "creatinina",
  GLICEMIA: "glicemia",
  HDL: "hdl",
  "COLESTEROL TOTAL": "colesterolTotal",
  LDL: "ldl",
  TRIGLICERIDOS: "trigliceridos",
  PEDIATRIA: "pediatria",
  "MEDICINA INTERNA": "medicinaInterna",
  EDUCACION: "educacion",
  ODONTOLOGIA: "odontologia",
  "TOMA VIH": "tomaVIH",
  "TOMA SIFILIS": "tomaSifilis",
  "TOMA HEPATITIS B": "tomaHepatitisB",
  PSICOLOGIA: "psicologia",
  NUTRICION: "nutricion",
  GINECOLOGIA: "ginecologia",
  ORTOPEDIA: "ortopedia",
  ENDOCRINOLOGIA: "endocrinologia",
  OFTALMOLOGIA: "oftalmologia",
  PSIQUIATRIA: "psiquiatria",
  "TERAPIA FISICA": "terapiaFisica",
  INTERVENCIONES: "intervenciones",
};
