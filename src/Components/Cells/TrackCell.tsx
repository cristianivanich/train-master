import { TrackDirection, TrackGameCell } from "../../Game/Game";
import IconSvg from "./IconSvg";

/** Studio-Ghibli-ish track palette: warm weathered wood, rustic iron and a mossy gravel bed */
const WOOD = ["#b98a55", "#c49a64", "#ad7f4d"];
const WOOD_EDGE = "#7d5632";
const RAIL = "#8b857a";
const RAIL_SHINE = "#ddd6c4";
const BED = "rgba(112, 86, 58, 0.34)";

const GAUGE_IN = 30;
const GAUGE_OUT = 60;
const TIE_LEN = 36;
const TIE_THICK = 4.6;

type TrackProps = {
    /** Draw the track faded, as the lower layer of an intersection */
    dim?: boolean;
};

function Dim({ dim, children }: { dim?: boolean, children: React.ReactNode }) {
    return dim ? <g opacity={0.5} style={{ filter: "saturate(0.55)" }}>{children}</g> : <>{children}</>;
}

function Pebbles({ seed }: { seed: number }) {
    //A few deterministic pebbles so the gravel bed feels hand-placed rather than printed
    const dots = [[7, 9], [18, 31], [9, 47], [20, 63], [6, 80], [70, 14], [81, 36], [72, 52], [83, 70], [68, 86]];
    return (
        <g fill="#cdbf9f" opacity={0.55}>
            {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={0.9 + ((i + seed) % 3) * 0.35} />)}
        </g>
    );
}

export function StraightTrackSvg({ direction, dim }: { direction: "horizontal" | "vertical" } & TrackProps) {
    const ties = Array.from({ length: 10 }, (_, i) => i * 10);
    return (
        <Dim dim={dim}>
            <g transform={direction === "horizontal" ? "translate(0 90) rotate(-90)" : undefined}>
                <rect x={GAUGE_IN - 5} y={0} width={GAUGE_OUT - GAUGE_IN + 10} height={90} fill={BED} />
                {ties.map((y, i) => (
                    <rect key={y} x={45 - TIE_LEN / 2} y={y - TIE_THICK / 2} width={TIE_LEN} height={TIE_THICK} rx={1.3}
                        fill={WOOD[i % WOOD.length]} stroke={WOOD_EDGE} strokeWidth={0.7} />
                ))}
                {[GAUGE_IN, GAUGE_OUT].map(x => (
                    <g key={x}>
                        <line x1={x + 0.9} y1={0} x2={x + 0.9} y2={90} stroke="#2a2a22" strokeOpacity={0.28} strokeWidth={3.6} />
                        <line x1={x} y1={0} x2={x} y2={90} stroke={RAIL} strokeWidth={3.2} />
                        <line x1={x - 0.5} y1={0} x2={x - 0.5} y2={90} stroke={RAIL_SHINE} strokeWidth={1} />
                    </g>
                ))}
            </g>
        </Dim>
    );
}

const CORNERS: Record<"top-left" | "top-right" | "bottom-left" | "bottom-right", { cx: number, cy: number, from: number }> = {
    //Pivot of the quarter circle and the first angle (SVG degrees, y down) that points into the cell
    "top-left": { cx: 0, cy: 0, from: 0 },
    "top-right": { cx: 90, cy: 0, from: 90 },
    "bottom-right": { cx: 90, cy: 90, from: 180 },
    "bottom-left": { cx: 0, cy: 90, from: 270 },
};

export function CornerTrackSvg({ direction, dim }: { direction: "top-left" | "top-right" | "bottom-left" | "bottom-right" } & TrackProps) {
    const { cx, cy, from } = CORNERS[direction];
    const segments = 7;
    const mid = (GAUGE_IN + GAUGE_OUT) / 2;

    return (
        <Dim dim={dim}>
            <circle cx={cx} cy={cy} r={mid} fill="none" stroke={BED} strokeWidth={GAUGE_OUT - GAUGE_IN + 10} />
            {Array.from({ length: segments + 1 }, (_, i) => (
                <rect key={i}
                    transform={`translate(${cx} ${cy}) rotate(${from + (90 / segments) * i})`}
                    x={mid - TIE_LEN / 2} y={-TIE_THICK / 2} width={TIE_LEN} height={TIE_THICK} rx={1.3}
                    fill={WOOD[i % WOOD.length]} stroke={WOOD_EDGE} strokeWidth={0.7} />
            ))}
            {[GAUGE_IN, GAUGE_OUT].map(r => (
                <g key={r}>
                    <circle cx={cx + 0.9} cy={cy + 0.9} r={r} fill="none" stroke="#2a2a22" strokeOpacity={0.28} strokeWidth={3.6} />
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke={RAIL} strokeWidth={3.2} />
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke={RAIL_SHINE} strokeWidth={1} />
                </g>
            ))}
        </Dim>
    );
}

export function TrackSvg({ direction, dim }: { direction: TrackDirection } & TrackProps) {
    switch (direction) {
        case "horizontal":
        case "vertical":
            return <StraightTrackSvg direction={direction} dim={dim} />;
        case "top-right":
        case "bottom-right":
        case "bottom-left":
        case "top-left":
            return <CornerTrackSvg direction={direction} dim={dim} />;
    }
    return null;
}

export default function TrackCell({ cell }: { cell: Readonly<TrackGameCell> }) {
    return (
        <IconSvg>
            <Pebbles seed={cell.direction.length} />
            <TrackSvg direction={cell.direction} />
        </IconSvg>
    );
}
