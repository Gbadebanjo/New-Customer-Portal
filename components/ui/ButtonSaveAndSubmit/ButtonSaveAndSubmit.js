import classes from "./ButtonSave.module.css";
import CheckIcon from "@/components/ui/icons/CheckIcon";
import { FaCheck } from "react-icons/fa";

export function ButtonSaveSubmit(props) {
    return <button
        type={props.type || "button"}
        className={classes.btn}
        onClick={props.onClick}
        disabled={props.disabled}
        style={props.disabled ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
    >
        <div className={classes.btnDiv}>
                <FaCheck />
                {props.buttonText ? props.buttonText : "Save"}
        </div>
    </button>;
}