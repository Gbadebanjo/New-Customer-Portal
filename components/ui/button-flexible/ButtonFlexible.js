// ButtonFlexible.js

import Link from "next/link";
import classes from './buttonFlexible.module.css'

function ButtonFlexible(props) {
    const { link, width, height, onClick, ref, children } = props;

    const buttonStyles = {
        width: `${width}px`,
        height: `${height}px`,
    }

    return (
        <Link href={link} passHref>
            <div className={classes.btn} style={buttonStyles} onClick={onClick} ref={ref}>
                {children}
            </div>
        </Link>
    );
}

export default ButtonFlexible;
