import { useEffect, useState } from "react";
import { AdRequest, REWARDED_SECONDS, subscribeAdHost } from "../Game/AdService";
import Button from "./Button";
import styles from "./AdHost.module.scss";

function AdPlayer({ request, onDone }: { request: AdRequest, onDone: () => void }) {
    const total = REWARDED_SECONDS[request.kind];
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const started = Date.now();
        const timer = setInterval(() => {
            const seconds = (Date.now() - started) / 1000;
            setElapsed(Math.min(seconds, total));
            if (seconds >= total) {
                clearInterval(timer);
            }
        }, 100);
        return () => clearInterval(timer);
    }, [total]);

    const finished = elapsed >= total;
    const finish = (rewarded: boolean) => {
        request.resolve(rewarded);
        onDone();
    };

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true">
            <div className={styles.panel}>
                <div className={styles.label}>Anuncio de video{request.kind === "long" ? " largo" : ""}</div>

                <div className={styles.screen}>
                    <div className={styles.sun} />
                    <div className={styles.hillA} />
                    <div className={styles.hillB} />
                    <div className={styles.note}>
                        Aquí se reproduce el video de AdMob.<br />
                        (Vista simulada)
                    </div>
                </div>

                <div className={styles.bar}><div className={styles.fill} style={{ width: `${(elapsed / total) * 100}%` }} /></div>

                <p className={styles.text}>
                    {finished
                        ? <>¡Listo! Ya podés desbloquear <b>{request.title}</b>.</>
                        : <>Mirá el video completo para desbloquear <b>{request.title}</b>. Faltan {Math.ceil(total - elapsed)} s.</>}
                </p>

                <div className={styles.actions}>
                    <Button onClick={() => finish(false)}>{finished ? "Salir" : "Cerrar sin premio"}</Button>
                    <Button buttonColor="green" disabled={!finished} onClick={() => finish(true)}>Desbloquear</Button>
                </div>
            </div>
        </div>
    );
}

/** Mount once near the root; it renders whichever rewarded ad the game asks for */
export default function AdHost() {
    const [request, setRequest] = useState<AdRequest | null>(null);

    useEffect(() => subscribeAdHost(setRequest), []);

    if (!request) {
        return null;
    }

    return <AdPlayer key={request.title + request.kind} request={request} onDone={() => setRequest(null)} />;
}
