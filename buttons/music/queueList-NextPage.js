const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");
const emojis = require("../../utils/emojis.json");

module.exports = {
    name: 'queuelistembed-nextpage',
    permissions: [],
    async run(client, interaction) {
        try {

            RefreshEmbed(interaction, +1, `${emojis.loading} Refreshing...`, null);

        } catch (error) {
            console.error(error);
            RefreshEmbed(interaction, 0, `${emojis.error} ${error.message}`, null);
        }
    }
}
