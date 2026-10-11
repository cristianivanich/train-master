/**
 * Ambient + sound-effect engine built directly on the Web Audio API.
 *
 * - Browsers (and Android WebViews) only allow audio after a user gesture, so the AudioContext is
 *   created lazily by `unlockAudio()` the first time the player touches the screen.
 * - Everything is deliberately quiet: the bird ambience is a background bed and every effect is
 *   mixed well below it so nothing startles the player.
 * - Files live in /public/sounds and were synthesised by tools/generate_sounds.py.
 */
export type SoundName = "depart" | "arrive" | "fail" | "success";

const FILES: Record<SoundName | "ambient", string> = {
    ambient: "ambient-birds.wav",
    depart: "depart-chuff.wav",
    arrive: "arrive-steam.wav",
    fail: "fail-alarm.wav",
    success: "success-bell.wav",
};

/** Per-sound gain (0..1) after the master volume; tuned so everything sits softly in the mix */
const VOLUME: Record<SoundName | "ambient", number> = {
    ambient: 0.16,
    depart: 0.32,
    arrive: 0.24,
    fail: 0.14,
    success: 0.26,
};

const MUTE_KEY = "audio-muted";

let context: AudioContext | undefined;
let master: GainNode | undefined;
let ambientSource: AudioBufferSourceNode | undefined;
const buffers = new Map<string, Promise<AudioBuffer | undefined>>();
const listeners = new Set<() => void>();

let muted = readMuted();

function readMuted(): boolean {
    try {
        return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
        return false;
    }
}

function url(file: string) {
    return `${process.env.PUBLIC_URL ?? ""}/sounds/${file}`;
}

function load(name: SoundName | "ambient"): Promise<AudioBuffer | undefined> {
    const existing = buffers.get(name);
    if (existing) {
        return existing;
    }

    const promise = (async () => {
        if (!context) {
            return undefined;
        }
        try {
            const response = await fetch(url(FILES[name]));
            const data = await response.arrayBuffer();
            return await context.decodeAudioData(data);
        } catch {
            //Missing or undecodable file: the game simply stays quiet
            return undefined;
        }
    })();

    buffers.set(name, promise);
    return promise;
}

async function startAmbient() {
    if (!context || !master || ambientSource) {
        return;
    }

    const buffer = await load("ambient");
    if (!buffer || !context || !master || ambientSource) {
        return;
    }

    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    //Slow fade-in so the forest eases in rather than switching on
    gain.gain.linearRampToValueAtTime(VOLUME.ambient, context.currentTime + 4);
    gain.connect(master);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start();

    ambientSource = source;
}

/** Call from a user gesture. Safe to call repeatedly. */
export function unlockAudio(): void {
    if (typeof window === "undefined") {
        return;
    }

    if (!context) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) {
            return;
        }
        context = new Ctor();
        master = context.createGain();
        master.gain.value = muted ? 0 : 1;
        master.connect(context.destination);

        //Pre-load the effects so they fire instantly the first time
        (Object.keys(FILES) as Array<SoundName | "ambient">).forEach(load);
    }

    if (context.state === "suspended") {
        context.resume().catch(() => undefined);
    }

    startAmbient();
}

export function playSound(name: SoundName): void {
    if (!context || !master || muted || context.state !== "running") {
        return;
    }

    const ctx = context;
    const out = master;
    load(name).then(buffer => {
        if (!buffer) {
            return;
        }
        const gain = ctx.createGain();
        gain.gain.value = VOLUME[name];
        gain.connect(out);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);
        source.start();
    });
}

/** Pause everything when the app goes to the background (important on Android) */
export function setAudioSuspended(suspended: boolean): void {
    if (!context) {
        return;
    }
    if (suspended) {
        context.suspend().catch(() => undefined);
    } else if (!muted) {
        context.resume().catch(() => undefined);
    }
}

export function isMuted(): boolean {
    return muted;
}

export function setMuted(value: boolean): void {
    muted = value;
    try {
        localStorage.setItem(MUTE_KEY, value ? "1" : "0");
    } catch {
        //ignore
    }

    if (master && context) {
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.linearRampToValueAtTime(value ? 0 : 1, context.currentTime + 0.25);
    }
    listeners.forEach(l => l());
}

export function subscribeMuted(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
