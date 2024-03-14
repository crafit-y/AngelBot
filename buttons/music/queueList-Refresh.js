const emojis = require("../../utils/emojis.json");
const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-refresh',
    permissions: [],
    async run(client, interaction) {

        try {
            RefreshEmbed(interaction, 0, `${emojis.loading} Refreshing...`, null);
        } catch (error) {
            RefreshEmbed(interaction, 0, `${emojis.error} ${error.message}`, null);
        }

    }
}