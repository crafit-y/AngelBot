const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const { QueueErrorCheck } = require("../../functions/music/queueListEmbed");
const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-skip',
    permissions: [],
    async run(client, interaction) {
        try {
            const queue = useQueue(interaction.guild.id);
            QueueErrorCheck(interaction, !queue);

            await interaction.deferUpdate().catch(() => { });
            queue.setRepeatMode(4);
            queue.node.skip();

            RefreshEmbed(interaction, 0, `${emojis["music-skip"]} Skipping...`, null);
        } catch (error) {
            console.error(error);
            RefreshEmbed(interaction, 0, `${emojis.error} ${error.message}`, null);
        }
    }
}
