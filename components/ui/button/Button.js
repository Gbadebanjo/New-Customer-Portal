import Link from "next/link";
import classes from './button.module.css';

function Button(props) {
    const { link, children, onClick, ...rest } = props;

    if (link) {
        return (
            <Link href={link} passHref>
                <div className={classes.btn} onClick={onClick}>
                    {children}
                </div>
            </Link>
        );
    }

    return (
        <button className={classes.btn} onClick={onClick} {...rest}>
            {children}
        </button>
    );
}

export default Button;
