const { ActionRowBuilder, CommandInteraction, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Colors, InteractionType } = require('discord.js');
const { useQueue } = require("discord-player");
const emojis = require('../../utils/emojis.json');
const { InitializeQueueListEmbed, QueueErrorCheck } = require("../../functions/music/queueListEmbed");

module.exports = {
    name: 'quikactionselectmenu',
    async run(client, interaction) {
        try {
            const queue = useQueue(interaction.guild.id);
            QueueErrorCheck(interaction, !queue);

            const i = interaction;
            const trackNum = i.values[0];
            const track = queue.tracks.data[trackNum - 1];

            const Title = `**What do you want to do with the sound** \`${track.title.slice(0, 50)}\` **?**`;

            const action1 = new StringSelectMenuOptionBuilder()
                .setLabel(`Skip to the sound`)
                .setValue(`quikactionselectmenu-action-skipto`)
                .setEmoji(emojis['music-skip']);
            const action2 = new StringSelectMenuOptionBuilder()
                .setLabel(`Don't play this sound`)
                .setValue(`quikactionselectmenu-action-noplay`)
                .setEmoji(emojis.trash);

            const actionSL = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setPlaceholder("Quick action for a sound")
                        .setCustomId("quikactionselectmenu-action")
                        .addOptions(action1, action2)
                        .setMinValues(1)
                        .setMaxValues(1)
                );

            const embed = new EmbedBuilder()
                .setDescription(Title)
                .setFooter({ text: "You have 30 seconds to respond" })
                .setColor(Colors.Orange);

            const message = await interaction.reply({
                embeds: [embed],
                components: [actionSL],
                ephemeral: true
            })//.catch(() => {});

            const filter = i => i.type === InteractionType.MessageComponent;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30 * 1000 });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: `This isn't for you!`, ephemeral: true });
                i.deferUpdate();

                if (i.customId === 'quikactionselectmenu-action') {
                    await collector.stop();

                    const trackResolvable = queue.tracks.at(trackNum - 1);

                    if (!trackResolvable) {
                        const errorEmbed = new EmbedBuilder()
                            .setColor(Colors.Red)
                            .setDescription(`${emojis.error} The track doesn't exist`);

                        return message.editReply({ embeds: [errorEmbed], ephemeral: true });
                    }

                    const name = trackResolvable.title;
                    let actionDescription = '';

                    switch (i.values[0]) {
                        case "quikactionselectmenu-action-skipto":
                            queue.setRepeatMode(4);
                            queue.node.skipTo(trackResolvable);
                            actionDescription = `${emojis.loading} The queue skipped to the sound... >>> \`${name}\``;
                            break;
                        case "quikactionselectmenu-action-noplay":
                            queue.node.remove(trackResolvable);
                            actionDescription = `${emojis.loading} The sound won't be played... >>> \`${name}\``;
                            break;
                    }

                    const EmbedToUpdate = interaction.message.embeds[0];
                    const embed = new EmbedBuilder()
                        .setThumbnail(EmbedToUpdate.thumbnail.url)
                        .setTitle(EmbedToUpdate.title)
                        .setDescription(actionDescription)
                        .setFooter({ text: EmbedToUpdate.footer.text })
                        .setColor(Colors.DarkBlue);

                    await interaction.message.edit({ embeds: [embed] });
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    InitializeQueueListEmbed(interaction, 0);
                }
            });

            collector.on('end', async () => {
                await message.delete().catch(() => { });
            });
        } catch (error) {
            console.error(error);
        }
    }
};
