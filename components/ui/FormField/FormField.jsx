import classes from './formField.module.css';

/**
 * A labeled form field wrapper. Renders label + input/textarea/select + optional hint/error.
 * Use PasswordField for password inputs with visibility toggle.
 *
 * Props:
 *   label     string
 *   required  boolean
 *   hint      string — helper text below the field
 *   error     string — error text below the field (overrides hint when set)
 *   type      HTML input type; defaults 'text'. Use 'textarea' or 'select' for those.
 *   value, onChange, name, disabled, placeholder, maxLength, min, max, step, inputMode — standard input props
 *   children  <option> nodes when type='select'
 */
export default function FormField({
    label,
    required,
    hint,
    error,
    type = 'text',
    value,
    onChange,
    name,
    id,
    disabled,
    placeholder,
    maxLength,
    inputMode,
    children,
    rows,
    ...rest
}) {
    const fieldId = id || name;

    let control;
    if (type === 'textarea') {
        control = (
            <textarea
                className={classes.textarea}
                id={fieldId}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                rows={rows}
                {...rest}
            />
        );
    } else if (type === 'select') {
        control = (
            <select
                className={classes.select}
                id={fieldId}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                {...rest}
            >
                {children}
            </select>
        );
    } else {
        control = (
            <input
                type={type}
                className={classes.input}
                id={fieldId}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                maxLength={maxLength}
                inputMode={inputMode}
                {...rest}
            />
        );
    }

    return (
        <div className={classes.group}>
            {label && (
                <label htmlFor={fieldId} className={`${classes.label} ${required ? classes.required : ''}`}>
                    {label}
                </label>
            )}
            {control}
            {error ? <span className={classes.error}>{error}</span>
                : hint ? <span className={classes.hint}>{hint}</span>
                    : null}
        </div>
    );
}
