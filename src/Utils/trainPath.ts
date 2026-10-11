import type { Train, TrainDirection } from "../Game/Game";

/** Size of one cell in SVG user units (matches the 90x90 viewBox used by every cell icon) */
export const CELL = 90;

export type TrainPose = {
    /** Absolute-in-cell position, in SVG user units */
    x: number;
    y: number;
    /** Heading in degrees, SVG convention (0 = right, 90 = down) */
    heading: number;
};

type Pt = readonly [number, number];

const EDGE_MID: Record<TrainDirection, Pt> = {
    top: [CELL / 2, 0],
    right: [CELL, CELL / 2],
    bottom: [CELL / 2, CELL],
    left: [0, CELL / 2],
};

const isVertical = (d: TrainDirection) => d === "top" || d === "bottom";

const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Shortest signed difference between two angles in radians, in (-PI, PI] */
function angleDelta(from: number, to: number) {
    let d = to - from;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d <= -Math.PI) d += 2 * Math.PI;
    return d;
}

/**
 * Where a train is, relative to the top-left of its cell, `t` (0..1) of the way through the block.
 *
 * Straight blocks move edge-midpoint to edge-midpoint. Corner blocks follow a quarter circle of
 * radius CELL/2 around the shared corner (exactly the radius the rails are drawn with). Trains that
 * are born in a Source or Splitter start from the cell centre instead of the opposite edge.
 */
export function getTrainPose(train: Pick<Train, "entrance" | "towards">, t: number, startsAtCentre: boolean): TrainPose {
    const { entrance } = train;
    const towards = train.towards ?? entrance;
    const progress = t < 0 ? 0 : t > 1 ? 1 : t;

    const exit = EDGE_MID[towards];
    const centre: Pt = [CELL / 2, CELL / 2];

    if (startsAtCentre || entrance === towards) {
        const start = startsAtCentre ? centre : EDGE_MID[entrance];
        return {
            x: start[0] + (exit[0] - start[0]) * progress,
            y: start[1] + (exit[1] - start[1]) * progress,
            heading: toDeg(Math.atan2(exit[1] - start[1], exit[0] - start[0])),
        };
    }

    const entry = EDGE_MID[entrance];

    if (isVertical(entrance) === isVertical(towards)) {
        //Straight through
        return {
            x: entry[0] + (exit[0] - entry[0]) * progress,
            y: entry[1] + (exit[1] - entry[1]) * progress,
            heading: toDeg(Math.atan2(exit[1] - entry[1], exit[0] - entry[0])),
        };
    }

    //Corner: pivot is the cell corner shared by the entrance and exit edges
    const sideEdge = isVertical(entrance) ? exit : entry;
    const capEdge = isVertical(entrance) ? entry : exit;
    const pivot: Pt = [sideEdge[0], capEdge[1]];

    const a0 = Math.atan2(entry[1] - pivot[1], entry[0] - pivot[0]);
    const a1 = Math.atan2(exit[1] - pivot[1], exit[0] - pivot[0]);
    const delta = angleDelta(a0, a1);
    const a = a0 + delta * progress;

    return {
        x: pivot[0] + (CELL / 2) * Math.cos(a),
        y: pivot[1] + (CELL / 2) * Math.sin(a),
        heading: toDeg(a + Math.sign(delta) * (Math.PI / 2)),
    };
}

/**
 * Turn the heading into a continuous angle: when a train moves into the next block its heading is
 * re-derived from scratch, so pick the 360° multiple closest to the previous heading to avoid the
 * sprite spinning the long way round.
 */
export function unwrapHeading(previous: number | undefined, next: number): number {
    if (previous === undefined) return next;
    let h = next;
    while (h - previous > 180) h -= 360;
    while (h - previous < -180) h += 360;
    return h;
}
