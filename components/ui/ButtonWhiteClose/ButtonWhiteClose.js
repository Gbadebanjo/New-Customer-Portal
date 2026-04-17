import ButtonWhite from "@/components/ui/button-white/Button";
import classes from "./btnWhiteClose.module.css";

export function ButtonWhiteClose(props) {
    return (
        <ButtonWhite
            className={props.className || "btn btn-active btn-ghost"}
            link={props.link || "#"}
            width={props.width || 80}
            height={props.height || 50}
            onClick={props.onClick}
            style={props.buttonStyle}
            disabled={props.disabled}
        >
            <div className={classes.btnDiv} style={props.style}>
                {props.children || "Cancel"}
            </div>
        </ButtonWhite>
    );
}