const emojis = require("../../utils/emojis.json");
const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-firstpage',
    async run(client, interaction) {

        try {

            const EmbedToUpdate = interaction.message.embeds[0]
            const embedFooter = EmbedToUpdate.footer.text;

            const matchEmoji = embedFooter.match(/\| State (\S+)/);

            RefreshEmbed(interaction, 0, `${emojis.loading} Refreshing...`, matchEmoji ? `Page 0 of 0 | State ` + matchEmoji[1] : `Page 0 of 0 |`);

        } catch (error) {
            console.error(error)
        }

    }
}