/**
 * Rewarded-ad facade. The game only ever talks to `showRewardedAd`; what actually plays the ad is
 * whatever is listening via `subscribeAdHost`. On the web that is the simulated player in <AdHost />.
 * When the app is wrapped with Capacitor, the same function can be pointed at the native AdMob
 * plugin without touching any game screen.
 */
export type RewardedKind = "short" | "long";

/** Seconds the (simulated) video has to be watched before the reward is granted */
export const REWARDED_SECONDS: Record<RewardedKind, number> = {
    short: 15,
    long: 30,
};

export type AdRequest = {
    kind: RewardedKind;
    /** What the player is unlocking, shown in the ad screen */
    title: string;
    resolve: (rewarded: boolean) => void;
};

type AdHostListener = (request: AdRequest) => void;

let listener: AdHostListener | undefined;

export function subscribeAdHost(next: AdHostListener): () => void {
    listener = next;
    return () => {
        if (listener === next) {
            listener = undefined;
        }
    };
}

/** Resolves true only if the ad was watched to the end */
export function showRewardedAd(kind: RewardedKind, title: string): Promise<boolean> {
    return new Promise(resolve => {
        if (!listener) {
            resolve(false);
            return;
        }
        listener({ kind, title, resolve });
    });
}
