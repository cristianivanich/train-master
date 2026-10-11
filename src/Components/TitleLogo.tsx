import styles from "./TitleLogo.module.scss";

/** "Train Master Puzzle" title card: storybook lettering, a drifting cloud, steam and a stretch of rail */
export default function TitleLogo() {
    return (
        <div className={styles.logo}>
            <svg className={styles.steam} viewBox="0 0 120 40" aria-hidden="true">
                <circle cx="14" cy="30" r="5" />
                <circle cx="30" cy="22" r="7" />
                <circle cx="52" cy="14" r="9" />
                <circle cx="80" cy="12" r="7" />
                <circle cx="102" cy="8" r="5" />
            </svg>

            <div className={styles.title}>
                <span>Train</span>
                <span>Master</span>
            </div>

            <div className={styles.ribbon}>
                <span>Puzzle</span>
            </div>

            <svg className={styles.rail} viewBox="0 0 300 18" aria-hidden="true">
                {Array.from({ length: 21 }, (_, i) => (
                    <rect key={i} x={i * 15 - 2} y={3} width={5} height={12} rx={1.5} fill="#b98a55" stroke="#7d5632" strokeWidth={0.8} />
                ))}
                <rect x={0} y={5} width={300} height={2.6} fill="#8b857a" />
                <rect x={0} y={11} width={300} height={2.6} fill="#8b857a" />
                <rect x={0} y={5} width={300} height={0.9} fill="#ddd6c4" />
                <rect x={0} y={11} width={300} height={0.9} fill="#ddd6c4" />
            </svg>
        </div>
    );
}
