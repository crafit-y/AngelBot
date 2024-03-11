const emojis = require("../../utils/emojis.json");
const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-previouspage',
    permissions: [],
    async run(client, interaction) {

        RefreshEmbed(interaction, -1, `${emojis.loading} Refreshing...`, null);

    }
}