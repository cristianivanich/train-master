import { useContext, useMemo } from "react";
import { SourceGameCell } from "../../Game/Game";
import { GameStateContext } from "../GameContext";
import IconGrid, { IconProps } from "./IconGrid";
import IconSvg from "./IconSvg";
import { StraightTrackSvg } from "./TrackCell";
import { getIconColor } from "../TrainIcon";

function getRemainingTrains<T>(current: ReadonlyArray<T>, original: ReadonlyArray<T>): Array<T | null> {
    //Trains are consumed from the start, but we don't want them to shift around
    const offset = original.length - current.length;
    return [...Array(offset), ...current];
}

export function PlusIcon({ x, y, diameter, color }: IconProps) {
    if (!color)
        return null;

    const sizeDiff = diameter * .25;

    return (
        <>
            <rect
                x={sizeDiff + x}
                y={y}
                width={diameter - sizeDiff * 2}
                height={diameter}
                fill={getIconColor(color)}
                stroke="#4a3b30"
                strokeWidth={0.8}
            />
            <rect
                x={x}
                y={sizeDiff + y}
                width={diameter}
                height={diameter - sizeDiff * 2}
                fill={getIconColor(color)}
                stroke="#4a3b30"
                strokeWidth={0.8}
            />
        </>
    );
}

const ROTATION = { right: 0, bottom: 90, left: 180, top: 270 } as const;

/**
 * The train shed ("galpón"). Drawn facing right, then rotated so its open door faces `direction`.
 * The shed fills the half of the cell behind the door, so trains roll out of the doorway (the engine
 * starts source trains at the cell centre) and onto the little length of track in front of it.
 */
function ShedSvg() {
    return (
        <g>
            {/* ground shadow */}
            <rect x={7} y={18} width={46} height={62} rx={5} fill="#1d2b22" opacity={0.25} />

            {/* walls */}
            <rect x={5} y={14} width={45} height={62} rx={4} fill="#e9d6a9" stroke="#7a5a37" strokeWidth={1.4} />

            {/* roof: two corrugated slopes meeting at a ridge that runs towards the door */}
            <rect x={5} y={14} width={45} height={31} rx={4} fill="#c9694b" stroke="#7a3b2a" strokeWidth={1.4} />
            <rect x={5} y={45} width={45} height={31} rx={4} fill="#b05a40" stroke="#7a3b2a" strokeWidth={1.4} />
            {Array.from({ length: 9 }, (_, i) => 9 + i * 4.7).map(x => (
                <path key={x} d={`M${x} 17 V73`} stroke="#000" strokeOpacity={0.13} strokeWidth={1} />
            ))}
            <path d="M6 45 H49" stroke="#6e3524" strokeWidth={2.2} strokeLinecap="round" />
            <path d="M6 43.6 H49" stroke="#f0b99f" strokeWidth={0.8} strokeOpacity={0.7} />

            {/* the big sliding door, facing the track */}
            <path d="M45 28 H52 V62 H45 Z" fill="#2c2420" stroke="#5a3d25" strokeWidth={1.4} />
            <path d="M52 28 V62" stroke="#d9b36b" strokeWidth={2} />
            <path d="M47 33 V57" stroke="#fff" strokeOpacity={0.12} strokeWidth={1} />
        </g>
    );
}

export default function SourceCell({ cell }: { cell: Readonly<SourceGameCell> }) {
    const { direction } = cell;
    const gameState = useContext(GameStateContext);
    const sourceState = gameState.sourceState.get(cell) ?? cell.trains;

    //Don't shift icons around
    const remainingIcons = useMemo(() => getRemainingTrains(sourceState, cell.trains), [sourceState, cell.trains]);

    const angle = ROTATION[direction];
    //Centre of the roof, rotated about the cell centre
    const rad = (angle * Math.PI) / 180;
    const cx = 45 + -17.5 * Math.cos(rad);
    const cy = 45 + -17.5 * Math.sin(rad);

    //The track stub in front of the door; the shed is painted over its inner half
    const track = (direction === "left" || direction === "right")
        ? <StraightTrackSvg direction="horizontal" />
        : <StraightTrackSvg direction="vertical" />;

    return (
        <IconSvg>
            {track}
            <g transform={`rotate(${angle} 45 45)`}>
                <ShedSvg />
            </g>

            {/* remaining trains, shown as painted markers on a small plaque on the roof */}
            <g transform={`translate(${cx.toFixed(2)} ${cy.toFixed(2)})`}>
                <rect x={-17} y={-17} width={34} height={34} rx={6} fill="#f6ead0" stroke="#7a5a37" strokeWidth={1} opacity={0.92} />
                <g transform="scale(0.5) translate(-45 -45)">
                    <IconGrid icons={remainingIcons} Icon={PlusIcon} />
                </g>
            </g>
        </IconSvg>
    )
}
