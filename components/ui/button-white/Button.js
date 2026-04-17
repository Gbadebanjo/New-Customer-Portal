import Link from "next/link";
import classes from './button.module.css'

function ButtonWhite(props) {
    const {link, children, onClick} = props;

    return <Link
        href={link}
        passHref
    >
        <div
            className={classes.btn}
            onClick={onClick}
        >
            <div className={classes.btnText}>{children}</div>
        </div>
    </Link>;
}

export default ButtonWhite