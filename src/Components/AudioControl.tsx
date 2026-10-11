import { useEffect, useState } from "react";
import { isMuted, setAudioSuspended, setMuted, subscribeMuted, unlockAudio } from "../Game/Audio";
import styles from "./AudioControl.module.scss";

/**
 * Unlocks audio on the first touch, pauses it when the app is hidden, and shows a small
 * sound on/off button in the corner.
 */
export default function AudioControl() {
    const [muted, setMutedState] = useState(isMuted);

    useEffect(() => subscribeMuted(() => setMutedState(isMuted())), []);

    useEffect(() => {
        const unlock = () => unlockAudio();
        window.addEventListener("pointerdown", unlock);
        window.addEventListener("keydown", unlock);

        const onVisibility = () => setAudioSuspended(document.hidden);
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("keydown", unlock);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    return (
        <button
            className={styles.button}
            aria-label={muted ? "Activar sonido" : "Silenciar"}
            title={muted ? "Activar sonido" : "Silenciar"}
            onClick={() => {
                unlockAudio();
                setMuted(!muted);
            }}>
            {muted ? "\u{1F507}" : "\u{1F50A}"}
        </button>
    );
}
