const { EmbedBuilder, Colors } = require('discord.js');
const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const { QueueErrorCheck } = require("../../functions/music/queueListEmbed");
const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-back',
    permissions: [],
    async run(client, interaction) {
        try {
            const queue = useQueue(interaction.guild.id);
            QueueErrorCheck(interaction, !queue);

            const EmbedToUpdate = interaction.message.embeds[0];
            const { thumbnail, title, footer } = EmbedToUpdate;

            await RefreshEmbed(interaction, 0, `${emojis["music-back"]} Going back...`, null);
            await new Promise(resolve => setTimeout(resolve, 2000));

            queue.setRepeatMode(4);
            
            await queue.history.back().catch(async (e) => {
                const embed = new EmbedBuilder()
                    .setThumbnail(thumbnail.url)
                    .setTitle(title)
                    .setDescription(`${emojis.error} \`${e.message}\``)
                    .setFooter({ text: footer.text })
                    .setColor(Colors.Red);

                await interaction.message.edit({ embeds: [embed] });
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                await RefreshEmbed(interaction, 0, `${emojis.loading} Refreshing...`, null);
            });
        } catch (error) {
            console.error(error);
        }
    }
}