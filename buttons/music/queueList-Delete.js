const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const { QueueErrorCheck } = require("../../functions/music/queueListEmbed");
const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-delete',
    async run(client, interaction) {

        try {

            const queue = useQueue(interaction.guild.id);

            QueueErrorCheck(interaction, !queue);
            queue.delete();

            RefreshEmbed(interaction, 0, `${emojis['music-stop']} Stoping...`, null);


        } catch (error) {
            console.error(error)
        }

    }
}