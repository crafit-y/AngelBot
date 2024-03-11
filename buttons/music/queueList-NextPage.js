const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-nextpage',
    permissions: [],
    async run(client, interaction) {
        try {

            RefreshEmbed(interaction, +1, "Refreshing...", null);

        } catch (error) {
            console.error(error);
        }
    }
}
