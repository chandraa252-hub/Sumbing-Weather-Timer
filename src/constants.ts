import { environment } from "./environment";

export const DEFAULT_ATHLETE_NAMES = ["Amelia", "Bowie", "Coco", "Dan", "Emma", "Finn", "Grace", "Henry", "Irene", "Jack"];

export const DEFAULT_START_DELAY = 0;
export const DEFAULT_TIME_PER_ATHLETE = 30;

export const EMPTY_VC_TIMEOUT = 60 * 60; // 60 minutes

// Slash Commands
export const SLASH_COMMAND = {
    name: `timer${environment.mainBot ? "" : environment.botId}`,
    commands: {
        start: "start",
        stop: "stop",
        help: "help",
        athlete: {
            name: "weather",
            athlete: "weather",
            time: "time",
        },
        language: {
            name: "language",
            language: "language",
        },
        delay: {
            name: "delay",
            delay: "delay",
        },
        athletes: {
            name: "weathers",
            athletesCount: 8,
            athletesPrefix: "weather",
            timePrefix: "time",
        },
        toast: {
            name: "toast",
            athlete: "weather",
        },
        fresh: {
            name: "fresh",
            athlete: "weather",
        },
        skip: {
            name: "skip",
        },
        plus: {
            name: "plus",
            time: "time",
        },
        reset: {
            name: "reset",
        },
    },
};
