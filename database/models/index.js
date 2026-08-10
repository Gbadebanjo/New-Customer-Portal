import sequelizeConnection from "@/db_connection";
import { Sequelize, Model } from "sequelize";

// import model modules so their init() runs
import UserMod from "./User.js";
import AuditLogMod from "./AuditLog.js";
import CustomerMod from "./Customer.js";
import PowerProductionPlanMod from "./PowerProductionPlan.js";
import PowerProductionPlanItemMod from "./PowerProductionPlanitem.js";
import ReportDataMod from "./ReportData.js";
import SecurityLogMod from "./SecurityLog.js";
import SupportQueryMod from "./SupportQuery.js";
import SupportQueryCategoryMod from "./SupportQueryCategory.js";
import SupportQueryMessageMod from "./SupportQueryMessage.js";
import SupportQueryStatusMod from "./SupportQueryStatus.js";
import TextTemplateMod from "./TextTemplate.js";
import ReportNoteMod from "./ReportNote.js";
import UserRoleMod from "./UserRole.js";
import UserSessionMod from "./UserSession.js";
import VerificationCodeMod from "./VerificationCode.js";
import ApiKeyMod from "./ApiKey.js";
import NotificationMod from "./Notification.js";
import CronRunMod from "./CronRun.js";
import CustomerSiteMappingMod from "./CustomerSiteMapping.js";

const resolve = (m) => (m && m.default ? m.default : m);

let models;

// Model classes we consider mandatory. If any of these is missing from
// the cached registry (typically because a new model was added since
// the dev process started), rebuild — otherwise the caller sees a very
// unhelpful "Cannot read properties of undefined (reading 'findAll')".
// Names as they appear on `sequelizeConnection.models` — this is each
// model's `modelName` field, NOT the file name. SecurityLog(s) is
// registered as `SecurityLogs` (plural) because its model class is
// `class SecurityLogs extends Model`; using the singular name here
// would make the cache-invalidation check always report it missing
// and rebuild the whole registry on every request.
const REQUIRED_MODELS = [
  'User', 'AuditLog', 'Customer', 'PowerProductionPlan', 'PowerProductionPlanItem',
  'ReportData', 'SecurityLogs', 'SupportQuery',
  'SupportQueryCategory', 'SupportQueryMessage', 'SupportQueryStatus',
  'TextTemplate', 'UserRole', 'ReportNote', 'UserSession', 'VerificationCode',
  'ApiKey', 'Notification', 'CronRun', 'CustomerSiteMapping',
];

if (global._sequelizeModels) {
  const cached = global._sequelizeModels;
  const missing = REQUIRED_MODELS.filter((n) => !cached[n]);
  if (missing.length > 0) {
    console.warn('Sequelize model cache is missing:', missing.join(', '), '— rebuilding.');
    global._sequelizeModels = null;
  }
}

if (!global._sequelizeModels) {

  // resolve module classes (this causes the files to run Model.init)
  const UserClass = resolve(UserMod);
  const AuditLogClass = resolve(AuditLogMod);
  const CustomerClass = resolve(CustomerMod);
  const PowerProductionPlanClass = resolve(PowerProductionPlanMod);
  const PowerProductionPlanItemClass = resolve(PowerProductionPlanItemMod);
  const ReportDataClass = resolve(ReportDataMod);
  const SecurityLogClass = resolve(SecurityLogMod);
  const SupportQueryClass = resolve(SupportQueryMod);
  const SupportQueryCategoryClass = resolve(SupportQueryCategoryMod);
  const SupportQueryMessageClass = resolve(SupportQueryMessageMod);
  const SupportQueryStatusClass = resolve(SupportQueryStatusMod);
  const TextTemplateClass = resolve(TextTemplateMod);
  const UserRoleClass = resolve(UserRoleMod);
  const ReportNoteClass = resolve(ReportNoteMod);
  const UserSessionClass = resolve(UserSessionMod);
  const VerificationCodeClass = resolve(VerificationCodeMod);
  const ApiKeyClass = resolve(ApiKeyMod);
  const NotificationClass = resolve(NotificationMod);
  const CronRunClass = resolve(CronRunMod);
  const CustomerSiteMappingClass = resolve(CustomerSiteMappingMod);

  // map of module classes for reference
  const moduleClasses = {
    User: UserClass,
    AuditLog: AuditLogClass,
    Customer: CustomerClass,
    PowerProductionPlan: PowerProductionPlanClass,
    PowerProductionPlanItem: PowerProductionPlanItemClass,
    ReportData: ReportDataClass,
    SecurityLog: SecurityLogClass,
    SupportQuery: SupportQueryClass,
    SupportQueryCategory: SupportQueryCategoryClass,
    SupportQueryMessage: SupportQueryMessageClass,
    SupportQueryStatus: SupportQueryStatusClass,
    TextTemplate: TextTemplateClass,
    UserRole: UserRoleClass,
    ReportNote: ReportNoteClass,
    UserSession: UserSessionClass,
    VerificationCode: VerificationCodeClass,
    ApiKey: ApiKeyClass,
    Notification: NotificationClass,
    CronRun: CronRunClass,
    CustomerSiteMapping: CustomerSiteMappingClass,
  };

  // Build base models object from sequelize registry (these are the real model classes with static methods)
  const registryModels = { sequelize: sequelizeConnection, Sequelize };
  Object.keys(sequelizeConnection.models).forEach((name) => {
    registryModels[name] = sequelizeConnection.models[name];
  });

  // Only enable associations for these models (minimal set)
  const enabledAssociations = new Set(["User", "SupportQuery", "SupportQueryMessage"]);

  // Attach associate implementations from module classes onto the corresponding registered models,
  // but only for enabledAssociations. This leaves other models initialized but with no associations run.
  Object.entries(moduleClasses).forEach(([name, ModClass]) => {
    if (!ModClass) return;
    const registered = registryModels[name];
    if (registered && typeof ModClass.associate === "function" && enabledAssociations.has(name)) {
      registered.associate = ModClass.associate.bind(registered);
    }
  });

  // Run associations only on registered models that have associate (only User & SupportQuery will execute)
  Object.entries(registryModels).forEach(([key, m]) => {
    if (!m || typeof m !== "function") return;
    if (m.prototype instanceof Model && typeof m.associate === "function" && enabledAssociations.has(key)) {
      try {
        m.associate(registryModels);
      } catch (err) {
        console.error(`Failed to run associate for model ${key}:`, err);
      }
    }
  });

  global._sequelizeModels = registryModels;
  models = registryModels;
} else {
  models = global._sequelizeModels;
}

export default models;