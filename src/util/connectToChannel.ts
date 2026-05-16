import { entersState, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { VoiceChannel } from "discord.js";
import { environment } from "../environment";
import logger from "../services/logger";

export async function connectToChannel(channel: VoiceChannel): Promise<VoiceConnection | undefined> {
    if (!channel.joinable) {
        return undefined;
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        group: environment.botId,
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Signalling, 10_000);
        logger.info(channel.guildId, `Joined VC:${channel.id}`);
        return connection;
    } catch (sigError) {
        logger.info(channel.guildId, `Signalling failed, trying Connecting state...`);
        try {
            await entersState(connection, VoiceConnectionStatus.Connecting, 10_000);
            logger.info(channel.guildId, `Joined VC (connecting):${channel.id}`);
            return connection;
        } catch (connError) {
            logger.info(channel.guildId, `Voice connection failed, returning connection anyway`);
            return connection;
        }
    }
}
