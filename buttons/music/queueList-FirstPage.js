const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");
const emojis = require("../../utils/emojis.json");

module.exports = {
    name: 'queuelistembed-firstpage',
    permissions: [],
    async run(client, interaction) {
        try {

            RefreshEmbed(interaction, 0, `${emojis.loading} Refreshing...`, "Page 0 of 0");

        } catch (error) {
            console.error(error);
            RefreshEmbed(interaction, 0, `${emojis.error} ${error.message}`, null);
        }
    }
}
