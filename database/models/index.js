import sequelizeConnection from "@/db_connection";
import { Sequelize, Model } from "sequelize";

// import model modules so their init() runs
import UserMod from "./User.js";
import AuditLogMod from "./AuditLog.js";
import CustomerMod from "./Customer.js";
import PowerProductionPlanMod from "./PowerProductionPlan.js";
import PowerProductionPlanItemMod from "./PowerProductionPlanitem.js";
import ReportMod from "./Report.js";
import ReportDataMod from "./ReportData.js";
import SecurityLogMod from "./SecurityLog.js";
import SiteDetailMod from "./SiteDetail.js";
import SupportQueryMod from "./SupportQuery.js";
import SupportQueryCategoryMod from "./SupportQueryCategory.js";
import SupportQueryMessageMod from "./SupportQueryMessage.js";
import SupportQueryStatusMod from "./SupportQueryStatus.js";
import TextTemplateMod from "./Texttemplate.js";
import UserRoleMod from "./UserRole.js";
import UserSessionMod from "./UserSession.js";
import VerificationCodeMod from "./VerificationCode.js";

const resolve = (m) => (m && m.default ? m.default : m);

let models;

if (!global._sequelizeModels) {
  console.log("🔄 Initializing Sequelize models (minimal associations)...");

  // resolve module classes (this causes the files to run Model.init)
  const UserClass = resolve(UserMod);
  const AuditLogClass = resolve(AuditLogMod);
  const CustomerClass = resolve(CustomerMod);
  const PowerProductionPlanClass = resolve(PowerProductionPlanMod);
  const PowerProductionPlanItemClass = resolve(PowerProductionPlanItemMod);
  const ReportClass = resolve(ReportMod);
  const ReportDataClass = resolve(ReportDataMod);
  const SecurityLogClass = resolve(SecurityLogMod);
  const SiteDetailClass = resolve(SiteDetailMod);
  const SupportQueryClass = resolve(SupportQueryMod);
  const SupportQueryCategoryClass = resolve(SupportQueryCategoryMod);
  const SupportQueryMessageClass = resolve(SupportQueryMessageMod);
  const SupportQueryStatusClass = resolve(SupportQueryStatusMod);
  const TextTemplateClass = resolve(TextTemplateMod);
  const UserRoleClass = resolve(UserRoleMod);
  const UserSessionClass = resolve(UserSessionMod);
  const VerificationCodeClass = resolve(VerificationCodeMod);

  // map of module classes for reference
  const moduleClasses = {
    User: UserClass,
    AuditLog: AuditLogClass,
    Customer: CustomerClass,
    PowerProductionPlan: PowerProductionPlanClass,
    PowerProductionPlanItem: PowerProductionPlanItemClass,
    Report: ReportClass,
    ReportData: ReportDataClass,
    SecurityLog: SecurityLogClass,
    SiteDetail: SiteDetailClass,
    SupportQuery: SupportQueryClass,
    SupportQueryCategory: SupportQueryCategoryClass,
    SupportQueryMessage: SupportQueryMessageClass,
    SupportQueryStatus: SupportQueryStatusClass,
    TextTemplate: TextTemplateClass,
    UserRole: UserRoleClass,
    UserSession: UserSessionClass,
    VerificationCode: VerificationCodeClass,
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

  // export the registryModels as your app-wide models object
  global._sequelizeModels = registryModels;
  models = registryModels;

  // DEBUG: list exported model names and key associations for verification
  console.log("🔎 exported model keys:", Object.keys(models));
  console.log("🔎 Enabled associations:", Array.from(enabledAssociations));
  if (models.SupportQuery) console.log("🔎 SupportQuery associations:", Object.keys(models.SupportQuery.associations || {}));
  if (models.User) console.log("🔎 User associations:", Object.keys(models.User.associations || {}));
} else {
  models = global._sequelizeModels;
}

export default models;