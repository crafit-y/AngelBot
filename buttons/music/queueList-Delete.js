const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const { QueueErrorCheck } = require("../../functions/music/queueListEmbed");
const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-delete',
    permissions: [],
    async run(client, interaction) {
        try {
            const queue = useQueue(interaction.guild.id);
            QueueErrorCheck(interaction, !queue);

            RefreshEmbed(interaction, 0, `${emojis['music-stop']} Stopping...`, null);
            if (queue) return queue.delete();
        } catch (error) {
            console.error(error);
        }
    }
}
