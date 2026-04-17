import classes from "./ButtonDefault.module.css";
import ButtonLoader from "../Loader/buttonLoader";

export function ButtonDefault({onClick, loading=false, buttonText}) {
    return <button
        type="submit"
        className={classes.btn}
        onClick={onClick}
        disabled={loading}
    >
        <div className={ classes.btnDiv}>
            {loading ?
            <span className={classes.btnLoading}>
                {buttonText} <ButtonLoader /> 
            </span>
             : 
            <span>
                    {buttonText ? buttonText : "Save"}
            </span>
            }
        </div>
    </button>;
}