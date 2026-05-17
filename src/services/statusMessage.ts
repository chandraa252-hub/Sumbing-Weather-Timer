import { type Scope } from "@sentry/node";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message, TextChannel } from "discord.js";
import { SLASH_COMMAND } from "../constants";
import { client } from "../discord";
import { configRepo } from "../persistence";
import { timerRepo } from "../persistence";
import type { Config, Timer } from "../types";
import { EMOJI_SKIP } from "../util/emojis";
import isSameAthlete from "../util/isSameAthlete";
import logger from "./logger";
import { getNextAthleteIndex } from "./timer";

const DEFAULT_FOOTER = `Use \`/${SLASH_COMMAND["name"]} stop\` to stop the timer.`;

export const BUTTON_SKIP = "timer_skip";
export const BUTTON_STOP = "timer_stop";

function createTimerButtons(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(BUTTON_SKIP)
            .setLabel(`${EMOJI_SKIP} Next rider`)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(BUTTON_STOP)
            .setLabel(`⏹️ Stop timer`)
            .setStyle(ButtonStyle.Danger),
    );
}

export function createStatusMessage(config: Config, timer: Timer): EmbedBuilder {
    const currentAthlete = config.athletes[timer.currentAthleteIndex];

    let embedBuilder: EmbedBuilder;
    if (timer.started) {
        const nextAthlete = config.athletes[getNextAthleteIndex(config, timer)];

        embedBuilder = new EmbedBuilder()
            .setTitle(`${currentAthlete.name} (change <t:${timer.nextChangeTime}:R>)`)
            .addFields([{ name: "Next weather", value: `${nextAthlete.name} (${nextAthlete.time}s)` }])
            .setFooter({ text: DEFAULT_FOOTER });
    } else {
        embedBuilder = new EmbedBuilder()
            .setTitle(`Waiting for the start <t:${timer.nextChangeTime}:R>`)
            .addFields([{ name: "First weather", value: `${currentAthlete.name} (${currentAthlete.time}s)` }])
            .setFooter({ text: DEFAULT_FOOTER });
    }

    embedBuilder.addFields([
        {
            name: "Toasted weathers",
            value:
                timer.disabledAthletes.length === 0
                    ? "*Everybody's still fresh*"
                    : timer.disabledAthletes
                          .filter((disabledAthlete) =>
                              config.athletes.find((athlete) => isSameAthlete(disabledAthlete, athlete))
                          )
                          .map((a) => `• ${a.name}`)
                          .join("\n"),
        },
    ]);

    return embedBuilder;
}

export async function sendStatusMessage(channel: TextChannel, _scope: Scope) {
    const guildId = channel.guild.id;
    const [config, timer] = await Promise.all([configRepo.get(guildId), timerRepo.get(guildId)]);
    if (timer === undefined) {
        return;
    }

    let message: Message;
    try {
        message = await channel.send({
            embeds: [createStatusMessage(config, timer)],
            components: [createTimerButtons()],
        });

        await timerRepo.update(guildId, (t) => ({
            ...t,
            status: {
                channelId: channel.id,
                messageId: message.id,
            },
        }));
    } catch (e) {
        logger.warn(guildId, "Could not send status message");
    }
}

export async function updateStatusMessage(guildId: string, _scope?: Scope) {
    const [config, timer] = await Promise.all([configRepo.get(guildId), timerRepo.get(guildId)]);
    if (timer?.status === undefined) {
        return;
    }

    try {
        const channel = (await client.channels.fetch(timer.status.channelId)) as TextChannel;
        const message = await channel.messages.fetch(timer.status.messageId);
        await message.edit({
            embeds: [createStatusMessage(config, timer)],
            components: [createTimerButtons()],
        });
    } catch (e) {
        logger.warn(guildId, "Could not update status message");

        await timerRepo.update(timer.guildId, (t) => ({
            ...t,
            status: undefined,
        }));
    }
}

export async function deleteStatusMessage(guildId: string, _scope: Scope) {
    const timer = await timerRepo.get(guildId);
    if (timer?.status === undefined) {
        return;
    }

    try {
        const channel = (await client.channels.fetch(timer.status.channelId)) as TextChannel;
        const message = await channel.messages.fetch(timer.status.messageId);
        await message.delete();
    } catch (e) {
        logger.warn(guildId, "Could not delete status message");
    }
}
