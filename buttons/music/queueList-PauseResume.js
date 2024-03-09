const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const { QueueErrorCheck } = require("../../functions/music/queueListEmbed");
const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-pauseresume',
    async run(client, interaction) {

        try {

            const queue = useQueue(interaction.guild.id);

            QueueErrorCheck(interaction, !queue);

            async function getQueueIfIsInPlaying() {
                if (queue && !queue.node.isPlaying()) {
                    queue.node.resume();
                    return `${emojis.loading} Music has been resumed`;
                } else {
                    queue.node.pause();
                    return `${emojis.loading} Music has been paused`;
                }
            }

            RefreshEmbed(interaction, 0, (await getQueueIfIsInPlaying()).toString(), null);

        } catch (error) {
            console.error(error)
        }

    }
}