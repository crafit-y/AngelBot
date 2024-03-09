const emojis = require("../../utils/emojis.json");
const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-lastpage',
    async run(client, interaction) {

        try {

            const EmbedToUpdate = interaction.message.embeds[0]
            const embedFooter = EmbedToUpdate.footer.text;

            const matchEmoji = embedFooter.match(/\| State (\S+)/);


            let newEmbedFooter;
            const searchStr = " of ";

            const lastPage = embedFooter.indexOf(searchStr);
            if (lastPage !== -1 && matchEmoji) {
                const num = embedFooter.substring(lastPage + searchStr.length);
                newEmbedFooter = `Page ${num} of ${num} | ${matchEmoji[1]}`;
            }

            RefreshEmbed(interaction, 0, `${emojis.loading} Refreshing...`, newEmbedFooter);

        } catch (error) {
            console.error(error)
        }

    }
}