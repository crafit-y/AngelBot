const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const { QueueErrorCheck } = require("../../functions/music/queueListEmbed");
const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-pauseresume',
    permissions: [],
    async run(client, interaction) {
        try {
            const queue = useQueue(interaction.guild.id);
            QueueErrorCheck(interaction, !queue);

            let message;
            if (queue.node.isPlaying()) {
                queue.node.pause();
                message = `${emojis.loading} Music has been paused`;
            } else {
                queue.node.resume();
                message = `${emojis.loading} Music has been resumed`;
            }

            RefreshEmbed(interaction, 0, message, null);
        } catch (error) {
            console.error(error);
        }
    }
}
