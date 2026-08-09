export default function DieselAvoidedIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30" fill="none">
            {/* Fuel-drop silhouette with a diagonal slash — "avoided". */}
            <path
                d="M15 3 C 15 3, 8 11, 8 17 A 7 7 0 0 0 22 17 C 22 11, 15 3, 15 3 Z"
                fill="#f4a742"
            />
            <path
                d="M12.5 15 C 12.5 15, 11 17.5, 11 19 A 2 2 0 0 0 15 19"
                fill="none"
                stroke="#fff"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.85"
            />
            {/* Slash */}
            <line
                x1="4.5" y1="25.5" x2="25.5" y2="4.5"
                stroke="#fff" strokeWidth="2.4" strokeLinecap="round"
            />
            <line
                x1="4.5" y1="25.5" x2="25.5" y2="4.5"
                stroke="#f4a742" strokeWidth="1.1" strokeLinecap="round"
            />
        </svg>
    );
}
