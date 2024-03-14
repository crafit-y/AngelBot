const { EmbedBuilder, Colors, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, InteractionType } = require('discord.js');
const emojis = require("../../utils/emojis.json");
const { useQueue } = require("discord-player");
const { QueueErrorCheck, InitializeQueueListEmbed } = require("../../functions/music/queueListEmbed");
const { RefreshEmbed } = require("../../functions/music/RefreshTheEmbed");

module.exports = {
    name: 'queuelistembed-loop',
    permissions: [],
    async run(client, interaction) {
        try {
            const queue = useQueue(interaction.guild.id);
            QueueErrorCheck(interaction, !queue);

            const loopOptions = [
                { label: "Loop only the current track", value: 1, emoji: emojis['music-loopTrack'] },
                { label: "Loop the current queue", value: 2, emoji: emojis['music-loopQueue'] },
                { label: "INFINITE QUEUE", value: 3, emoji: emojis['music-loopInfinitQueue'] },
                { label: "Stop the loop mode", value: 4, emoji: emojis.error }
            ];

            const options = loopOptions.map(option => new StringSelectMenuOptionBuilder()
                .setLabel(option.label)
                .setValue(`loopselectmenu-loop-${option.value}`)
                .setEmoji(option.emoji)
            );

            const loopSL = new StringSelectMenuBuilder()
                .setPlaceholder("Loop mode selection")
                .setCustomId("loopselectmenu-loop")
                .addOptions(...options)
                .setMinValues(1)
                .setMaxValues(1);

            const embed = new EmbedBuilder()
                .setDescription("**What loop mode do you want?**")
                .setFooter({ text: "You have 30 seconds to respond" })
                .setColor(Colors.Orange);

            const message = await interaction.reply({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(loopSL)],
                ephemeral: true
            });

            const filter = i => i.type === InteractionType.MessageComponent;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30 * 1000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: `This isn't for you!`, ephemeral: true });
                i.deferUpdate();

                if (i.customId === 'loopselectmenu-loop') {
                    const SUPRA_ID = i.values[0];
                    const loopMode = SUPRA_ID.substring(20);
                    const value = parseInt(loopMode);
                    
                    queue.setRepeatMode(value);
                    message.delete();

                    const messageContent = getLoopMessageContent(value);
                    const updatedEmbed = createUpdatedEmbed(interaction.message.embeds[0], messageContent);

                    await interaction.message.edit({ embeds: [updatedEmbed] });
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    InitializeQueueListEmbed(interaction, 0);
                }
            });

            collector.on('end', async () => {
                await message.delete();
            });

        } catch (error) {
            console.error(error);
            RefreshEmbed(interaction, 0, `${emojis.error} ${error.message}`, null);
        }
    }
}

function getLoopMessageContent(value) {
    switch (parseInt(value)) {
        case 1:
            return `${emojis['music-loopTrack']} **The current track is now on loop!**`;
        case 2:
            return `${emojis['music-loopQueue']} **The current queue is now on loop!**`;
        case 3:
            return `${emojis['music-loopInfinitQueue']} **The queue is now on __infinite__ loop!**`;
        case 4:
            return `${emojis.success} **Loop mode has been disabled!**`;
        default:
            return '';
    }
}

function createUpdatedEmbed(embed, messageContent) {
    const updatedEmbed = new EmbedBuilder()
        .setThumbnail(embed.thumbnail.url)
        .setTitle(embed.title);

    if (messageContent) { // Vérifie si messageContent n'est pas vide
        updatedEmbed.setDescription(messageContent);
    }

    updatedEmbed.setFooter(embed.footer)
        .setColor(Colors.Purple);
    return updatedEmbed;
}

