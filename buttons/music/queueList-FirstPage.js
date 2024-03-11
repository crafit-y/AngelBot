const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-firstpage',
    permissions: [],
    async run(client, interaction) {
        try {

            RefreshEmbed(interaction, 0, "Refreshing...", "Page 0 of 0");

        } catch (error) {
            console.error(error);
        }
    }
}
