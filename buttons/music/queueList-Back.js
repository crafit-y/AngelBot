const { EmbedBuilder, Colors } = require('discord.js');
const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const { QueueErrorCheck } = require("../../functions/music/queueListEmbed");
const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-back',
    async run(client, interaction) {

        try {

            const queue = useQueue(interaction.guild.id);

            QueueErrorCheck(interaction, !queue);

            const EmbedToUpdate = interaction.message.embeds[0]
            const embedThumbnail = EmbedToUpdate.thumbnail.url;
            const embedTitle = EmbedToUpdate.title;
            const embedFooter = EmbedToUpdate.footer.text;

            RefreshEmbed(interaction, 0, `${emojis["music-back"]} Going back...`, null);
            
            await new Promise(resolve => setTimeout(resolve, 1100)).catch(O_o => { console.log(O_o) });

            queue.setRepeatMode(4);
            queue.history.back().catch(async (e) => {

                const embed = new EmbedBuilder()
                    .setThumbnail(embedThumbnail)
                    .setTitle(embedTitle)
                    .setDescription(`${emojis.error} ${e}`)
                    .setFooter({ text: embedFooter })
                    .setColor(Colors.Red);

                await interaction.message.edit({ embeds: [embed] });

                await new Promise(resolve => setTimeout(resolve, 2000)).catch(O_o => { console.log(O_o) });

                RefreshEmbed(interaction, 0, `${emojis.loading} Refreshing...`, null);
            });

        } catch (error) {
            console.error(error)
        }

    }
}