import classes from "./ButtonDefault.module.css";

// Single button-loading pattern across the app: swap the label to a
// loading-tense string and disable the button. No inline spinner —
// keeps button width close to stable and matches the other buttons
// in the app (Roles, Settings, TextTemplate modals, etc.).
//
//   <ButtonDefault buttonText="Login" loadingText="Signing in…" loading={pending} />
//
// If `loadingText` is omitted, falls back to `buttonText + '…'` so
// legacy call sites still get a visible loading affordance without
// changes.
export function ButtonDefault({ onClick, loading = false, buttonText, loadingText }) {
    const label = loading
        ? (loadingText || (buttonText ? `${buttonText}…` : 'Saving…'))
        : (buttonText || 'Save');
    return (
        <button
            type="submit"
            className={classes.btn}
            onClick={onClick}
            disabled={loading}
        >
            <div className={classes.btnDiv}>
                <span>{label}</span>
            </div>
        </button>
    );
}
