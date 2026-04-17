import Link from "next/link";
import classes from './buttonBlue.module.css'

function ButtonBlue(props) {
    const {link, width, height, children, onClick} = props;

    const buttonStyles = {
        width: `${width}px`,
        height: `${height}px`,
    }

    return <Link
        href={link}
        passHref
    >
        <div
            className={classes.btn}
            style={buttonStyles}
            onClick={onClick}
        >
            {children}
        </div>
    </Link>;
}

export default ButtonBlue