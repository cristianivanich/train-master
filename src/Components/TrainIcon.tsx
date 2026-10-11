import { useContext, useLayoutEffect, useRef } from "react";
import { Train, TrainColor } from "../Game/Game";
import { CELL, getTrainPose, unwrapHeading } from "../Utils/trainPath";
import GameContext from "./GameContext";
import styles from "./TrainIcon.module.scss";

/** Soft, hand-painted palette shared by trains, sources, targets and paint pots */
const PALETTE: Record<TrainColor, string> = {
    Red: "#e4605a",
    Orange: "#f2a24c",
    Yellow: "#f4d664",
    Green: "#7fc06f",
    Blue: "#5c8fd6",
    Purple: "#a07fcf",
    Brown: "#9b6d4c",
};

export function getIconColor(trainColor: TrainColor) {
    return PALETTE[trainColor] ?? trainColor;
}

/** Mix a hex colour towards white, used for the steam so it is a washed-out version of the train */
function tint(hex: string, amount: number) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (c: number) => Math.round(c + (255 - c) * amount);
    const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
    return `rgb(${r}, ${g}, ${b})`;
}

const PUFFS = 4;
const PUFF_PERIOD_MS = 1600;

/** A tiny steam locomotive seen from above, drawn facing +x so it can simply be rotated to its heading */
function Locomotive({ color, bodyRef }: { color: string; bodyRef: React.Ref<SVGGElement> }) {
    return (
        <g ref={bodyRef}>
            {/* coupling + cowcatcher */}
            <rect x={-20} y={-1.4} width={5} height={2.8} rx={1} fill="#5a4a3e" />
            <path d="M15 -6 L22 0 L15 6 Z" fill="#6b5a4c" stroke="#4a3b30" strokeWidth={0.8} strokeLinejoin="round" />

            {/* wheels peeking out from under the boiler */}
            {[-11, -3, 5, 12].map(x => (
                <g key={x}>
                    <rect x={x - 2.6} y={-9.6} width={5.2} height={3} rx={1.2} fill="#3f3a36" />
                    <rect x={x - 2.6} y={6.6} width={5.2} height={3} rx={1.2} fill="#3f3a36" />
                </g>
            ))}

            {/* boiler */}
            <rect className={styles.paint} x={-5} y={-7} width={21} height={14} rx={7} fill={color} stroke="#4a3b30" strokeWidth={1} />
            <rect x={-1} y={-5.4} width={14} height={2.2} rx={1.1} fill="#fff" opacity={0.3} />
            <path d="M3 -7 V7 M9 -7 V7" stroke="#b8893f" strokeWidth={1.1} opacity={0.9} />

            {/* smokebox front */}
            <circle cx={15.5} cy={0} r={4.2} fill="#4d4640" stroke="#33302c" strokeWidth={0.6} />
            <circle cx={15.5} cy={0} r={1.4} fill="#e8d9a8" />

            {/* steam dome and chimney */}
            <circle cx={5} cy={0} r={3} fill="#d9a441" stroke="#8c6522" strokeWidth={0.7} />
            <circle cx={5} cy={-0.8} r={1} fill="#fff" opacity={0.5} />
            <circle cx={11} cy={0} r={3.3} fill="#3f3a36" stroke="#2a2724" strokeWidth={0.6} />
            <circle cx={11} cy={0} r={1.8} fill="#171512" />

            {/* cab */}
            <rect x={-17} y={-8.4} width={13} height={16.8} rx={2.6} fill="#c06f50" stroke="#6d3a29" strokeWidth={0.9} />
            <path d="M-10.5 -8 V8" stroke="#8f4a33" strokeWidth={1} />
            <rect x={-15.5} y={-6.6} width={3} height={13.2} rx={1.2} fill="#fff" opacity={0.18} />
        </g>
    );
}

export default function TrainIcon({ train }: { train: Train }) {
    const game = useContext(GameContext);
    const gameRef = useRef(game);
    const trainRef = useRef(train);
    gameRef.current = game;
    trainRef.current = train;

    const groupRef = useRef<SVGGElement>(null);
    const bodyRef = useRef<SVGGElement>(null);
    const shadowRef = useRef<SVGGElement>(null);
    const puffRefs = useRef<Array<SVGCircleElement | null>>([]);
    const lastHeading = useRef<number>();

    const paint = getIconColor(train.color);

    //useLayoutEffect so the very first frame of a new block is already positioned (no one-frame flash at 0,0)
    useLayoutEffect(() => {
        let raf = 0;
        const born = performance.now();

        const frame = (time: number) => {
            const t = trainRef.current;
            const g = gameRef.current;
            const cell = g.getCellAtCoordinate(t.position);
            const startsAtCentre = cell?.type === "Source" || cell?.type === "Splitter";

            const pose = getTrainPose(t, g.getProgress(), startsAtCentre);

            //Keep the heading continuous so the sprite never spins the long way round
            const heading = unwrapHeading(lastHeading.current, pose.heading);
            lastHeading.current = heading;

            const x = t.position.col * CELL + pose.x;
            const y = t.position.row * CELL + pose.y;
            groupRef.current?.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
            bodyRef.current?.setAttribute("transform", `rotate(${heading.toFixed(2)})`);
            shadowRef.current?.setAttribute("transform", `translate(1.6 2.4) rotate(${heading.toFixed(2)})`);

            //Steam drifting out behind the chimney
            const clock = (time - born) / PUFF_PERIOD_MS;
            puffRefs.current.forEach((puff, i) => {
                if (!puff) return;
                const age = (clock + i / PUFFS) % 1;
                const px = 11 - 8 - age * 20;
                const py = Math.sin((clock + i) * 5) * 2.2 * age;
                puff.setAttribute("cx", px.toFixed(2));
                puff.setAttribute("cy", py.toFixed(2));
                puff.setAttribute("r", (2.2 + age * 5).toFixed(2));
                puff.setAttribute("opacity", (0.75 * (1 - age) * Math.min(1, age * 6)).toFixed(3));
            });

            raf = requestAnimationFrame(frame);
        };

        //Runs once synchronously (before paint) and then keeps itself scheduled
        frame(performance.now());
        return () => cancelAnimationFrame(raf);
    }, []);

    //Position is applied imperatively; a block change just updates trainRef and the next frame picks it up
    const steam = tint(paint, 0.62);

    return (
        <g ref={groupRef} className={styles.train} data-path={`${train.entrance}-${train.towards}`}>
            <g ref={shadowRef} opacity={0.22}>
                <rect x={-20} y={-9} width={42} height={18} rx={8} fill="#1d2b22" />
            </g>

            <g className={styles.steam} style={{ fill: steam }}>
                {Array.from({ length: PUFFS }, (_, i) => (
                    <circle key={i} ref={el => { puffRefs.current[i] = el; }} r={2} opacity={0} />
                ))}
            </g>

            <Locomotive color={paint} bodyRef={bodyRef} />
        </g>
    );
}
