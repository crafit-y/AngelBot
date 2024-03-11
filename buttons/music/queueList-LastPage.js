const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-lastpage',
    permissions: [],
    async run(client, interaction) {
        try {
            const EmbedToUpdate = interaction.message.embeds[0];
            const embedFooter = EmbedToUpdate.footer.text;

            let newEmbedFooter;
            const searchStr = " of ";
            const lastPageIndex = embedFooter.indexOf(searchStr);

            if (lastPageIndex !== -1) {
                const lastPageNumber = embedFooter.substring(lastPageIndex + searchStr.length);
                newEmbedFooter = `Page ${lastPageNumber} of ${lastPageNumber}`;
            }

            RefreshEmbed(interaction, 0, "Refreshing...", newEmbedFooter);
        } catch (error) {
            console.error(error);
        }
    }
}
