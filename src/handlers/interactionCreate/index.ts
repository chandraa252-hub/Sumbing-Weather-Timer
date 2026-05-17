import { Interaction } from "discord.js";
import { SLASH_COMMAND } from "../../constants";
import logger from "../../services/logger";
import { HandlerProps } from "../../services/sentry";
import { BUTTON_PLUS10, BUTTON_SKIP, BUTTON_TOAST, updateStatusMessage } from "../../services/statusMessage";
import { addTimeToCurrentAthlete, setAthleteAsFresh, setAthleteAsToast, skipCurrentAthlete } from "../../services/timer";
import { configRepo } from "../../persistence";
import { timerRepo } from "../../persistence";
import { reset } from "./reset";
import { athlete } from "./athlete";
import { athletes } from "./athletes";
import { delay } from "./delay";
import { fresh } from "./fresh";
import { help } from "./help";
import { language } from "./language";
import { plus } from "./plus";
import { skip } from "./skip";
import { start } from "./start";
import { stop } from "./stop";
import { toast } from "./toast";

const commandsMap = {
    [SLASH_COMMAND.commands.help]: help,
    [SLASH_COMMAND.commands.start]: start,
    [SLASH_COMMAND.commands.stop]: stop,
    [SLASH_COMMAND.commands.language.name]: language,
    [SLASH_COMMAND.commands.delay.name]: delay,
    [SLASH_COMMAND.commands.athlete.name]: athlete,
    [SLASH_COMMAND.commands.athletes.name]: athletes,
    [SLASH_COMMAND.commands.toast.name]: toast,
    [SLASH_COMMAND.commands.fresh.name]: fresh,
    [SLASH_COMMAND.commands.plus.name]: plus,
    [SLASH_COMMAND.commands.skip.name]: skip,
    [SLASH_COMMAND.commands.reset.name]: reset,
};

export async function handleInteractionCreate({ args: [interaction], scope }: HandlerProps<[Interaction]>) {
    if (interaction.isButton() && interaction.inGuild()) {
        await interaction.deferUpdate();
        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        logger.info(guildId, `Button: ${interaction.customId} by ${userId}`);

        const timer = await timerRepo.get(guildId);
        if (!timer) return;

        if (
            timer.status?.channelId !== interaction.channelId ||
            timer.status?.messageId !== interaction.message.id
        ) {
            return;
        }

        switch (interaction.customId) {
            case BUTTON_SKIP:
                await skipCurrentAthlete(guildId);
                await updateStatusMessage(guildId, scope);
                break;

            case BUTTON_PLUS10:
                await addTimeToCurrentAthlete(guildId, 10);
                await updateStatusMessage(guildId, scope);
                break;

            case BUTTON_TOAST: {
                const config = await configRepo.get(guildId);
                const athlete = config.athletes.find((a) => a.userId === userId);
                if (!athlete) return;

                const isAlreadyToasted = timer.disabledAthletes.some((a) => a.userId === userId);
                if (isAlreadyToasted) {
                    await setAthleteAsFresh(guildId, athlete);
                } else {
                    await setAthleteAsToast(guildId, athlete);
                }
                await updateStatusMessage(guildId, scope);
                break;
            }
        }
        return;
    }

    if (!interaction.isChatInputCommand() || !interaction.inGuild()) {
        return;
    }
    const guildId = interaction.guildId;

    const commandName = interaction.options.getSubcommand();
    logger.info(guildId, `Slash Command: ${commandName}`);

    await interaction.deferReply();

    const command = commandsMap[commandName];
    if (command) {
        await command(interaction, scope);
    } else {
        await interaction.editReply("Unsupported command");
    }
}
