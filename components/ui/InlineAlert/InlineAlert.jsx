import classes from "./inlineAlert.module.css";

/**
 * Inline alert used for form-level feedback (validation errors, success
 * confirmations, informational notes). Renders nothing if no message.
 *
 * Props:
 *   message   string     Text to display. If falsy, component renders null.
 *   variant   string     "error" | "success" | "info". Defaults to "error".
 *   icon      ReactNode  Optional icon rendered to the left of the message.
 */
export default function InlineAlert({ message, variant = "error", icon = null }) {
  if (!message) return null;
  const variantClass = classes[variant] || classes.error;
  const role = variant === "error" ? "alert" : "status";
  return (
    <div className={`${classes.alert} ${variantClass}`} role={role}>
      {icon && <span className={classes.iconSlot}>{icon}</span>}
      <span className={classes.message}>{message}</span>
    </div>
  );
}
