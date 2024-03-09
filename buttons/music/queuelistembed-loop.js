const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors, CommandInteraction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, InteractionType } = require('discord.js');
const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const { InitializeQueueListEmbed, QueueErrorCheck } = require("../../functions/music/queueListEmbed");

/**
     * 
     * @param {*} client 
     * @param {CommandInteraction} interaction
     */

module.exports = {
    name: 'queuelistembed-loop',
    async run(client, interaction) {

        try {

            const queue = useQueue(interaction.guild.id);

            QueueErrorCheck(interaction, !queue);

            const loop1 = new StringSelectMenuOptionBuilder()
                .setLabel(`Loop only the current track`)
                .setValue(`loopselectmenu-loop-1`)
                .setEmoji(emojis['music-loopTrack'])
            const loop2 = new StringSelectMenuOptionBuilder()
                .setLabel(`Loop the current queue`)
                .setValue(`loopselectmenu-loop-2`)
                .setEmoji(emojis['music-loopQueue'])
            const loop3 = new StringSelectMenuOptionBuilder()
                .setLabel("INFINITE QUEUE")
                .setDescription(`Loop the queue, sounds from the same theme are automatically added to your queue.`)
                .setValue(`loopselectmenu-loop-3`)
                .setEmoji(emojis['music-loopInfinitQueue'])
            const loop4 = new StringSelectMenuOptionBuilder()
                .setLabel(`Stop the loop mode`)
                .setValue(`loopselectmenu-loop-4`)
                .setEmoji(emojis.error)

            const loopSL = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setPlaceholder("Loop mode selection")
                        .setCustomId("loopselectmenu-loop")
                        .addOptions(loop1)
                        .addOptions(loop2)
                        .addOptions(loop3)
                        .addOptions(loop4)
                        .setMinValues(1)
                        .setMaxValues(1)

                );

            const embed = new EmbedBuilder()
                .setDescription("**What loop mode want you ?**")
                .setFooter({ text: "You have 30sec for respond" })
                .setColor(Colors.Orange);

            const message = await interaction.reply({
                embeds: [embed],
                components: [loopSL],
                ephemeral: true
            });

            const filter = i => i.type === InteractionType.MessageComponent;

            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30 * 1000 });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: `isn't for you !`, ephemeral: true });
                i.deferUpdate();

                if (i.customId === 'loopselectmenu-loop') {

                    if (
                        i.values[0] === "loopselectmenu-loop-1" ||
                        i.values[0] === "loopselectmenu-loop-2" ||
                        i.values[0] === "loopselectmenu-loop-3" ||
                        i.values[0] === "loopselectmenu-loop-4"
                    ) {

                        await collector.stop();

                        function getTheDataOfLoop(value) {
                            switch (value) {
                                case "loopselectmenu-loop-1":

                                    queue.setRepeatMode(1);

                                    return `${emojis['music-loopTrack']} **The current track is now on loop !**`;
                                case "loopselectmenu-loop-2":

                                    queue.setRepeatMode(2);

                                    return `${emojis['music-loopQueue']} **The current queue is now on loop !**`;
                                case "loopselectmenu-loop-3":

                                    queue.setRepeatMode(3);

                                    return `${emojis['music-loopInfinitQueue']} **The queue is now on __infinit__ !**`;
                                case "loopselectmenu-loop-4":

                                    queue.setRepeatMode(4);

                                    return `${emojis.success} **Loop are been disabled !**`;
                            }
                        }

                        const EmbedToUpdate = interaction.message.embeds[0]
                        const embedThumbnail = EmbedToUpdate.thumbnail.url;
                        const embedTitle = EmbedToUpdate.title;
                        const embedFooter = EmbedToUpdate.footer.text;

                        const embed = new EmbedBuilder()
                            .setThumbnail(embedThumbnail)
                            .setTitle(embedTitle)
                            .setDescription(getTheDataOfLoop(i.values[0]))
                            .setFooter({ text: embedFooter })
                            .setColor(Colors.DarkBlue);

                        await interaction.message.edit({ embeds: [embed] });

                        await new Promise(resolve => setTimeout(resolve, 3000)).catch(O_o => { console.log(O_o) });

                        InitializeQueueListEmbed(interaction, 0);

                    }

                }

            });

            collector.on('end', async () => {

                await message.delete().catch(O_o => { console.log(O_o) });

            });

        } catch (error) {
            console.error(error)
        }

    }
}