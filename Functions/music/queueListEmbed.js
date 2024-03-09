const { EmbedBuilder, Colors, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const { DTBM } = require("../../functions/All/deleteTheBotMessage");

async function InitializeQueueListEmbed(interaction, increment) {
    const queue = useQueue(interaction.guild.id)

    if (!queue) return false;

    try {
        let currentPage = 0;
        let fetchedMessage = null;
        let state = "normal";

        if (interaction.message) {
            try {
                fetchedMessage = await interaction.channel.messages.fetch(interaction.message.id);

                const embedFooter = fetchedMessage.embeds[0].footer;
                const match = embedFooter.text.match(/Page (\d+)/);
                const matchEmoji = embedFooter.text.match(/\| State (\S+)/);

                if (match) currentPage = parseInt(match[1]) + increment;

                if (matchEmoji) {
                    switch (matchEmoji[1]) {
                        case emojis['music-loopTrack']:
                            state = "loopTrack";
                            break;
                        case emojis['music-loopQueue']:
                            state = "loopQueue";
                            break;
                        case emojis['music-loopInfinitQueue']:
                            state = "loopInfinitQueue";
                            break;
                        case emojis['music-resume']:
                            state = "normal";
                            break;
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la récupération de la description de l\'embed:', error);
            }
        }

        const currentTrack = queue.currentTrack;
        const tracksPerPage = 10;
        const totalPages = Math.max(0, Math.ceil(queue.tracks.data.length / tracksPerPage) - 1);
        const pageStart = tracksPerPage * currentPage;
        const pageEnd = pageStart + tracksPerPage;

        const tracks = queue.tracks.data.slice(pageStart, pageEnd).map((m, i) => {
            const Title = m.title.replace(m.author + " - ", "")
                .replace(m.author, "")
                .replace(" - ", " ")
                .replace(" (Official Music Video)", "")
                .replace(" (Official Music)", "")
                .replace(" (Official Video)", "")
                .slice(0, 30);

            const Author = m.author.slice(0, 25);

            return `\`${i + 1}.\` **${Title} - ${Author}**
                    > Added by ${m.requestedBy} - *[link](${m.url})* | ${m.duration}`;
        });

        const embed = new EmbedBuilder()
            .setThumbnail(currentTrack.thumbnail || "")
            .setTitle(`${emojis.music} | ${currentTrack.title} is playing on <#${queue.channel.id}>`)
            .setDescription(`${queue.node.createProgressBar()}\n\n${queue.tracks.size <= 0 ? "No more track" : tracks.join('\n')}\n${queue.tracks.size > pageEnd ? `...${queue.tracks.size - pageEnd} more track(s)` : ''}`)
            .setFooter({ text: `Page ${currentPage} of ${totalPages === -1 ? "0" : totalPages}` })
            .setColor(Colors.DarkBlue);

        try {
            if (fetchedMessage !== null) {
                await interaction.message.edit({
                    embeds: [embed],
                    components: BuildRowComponents(queue, currentPage, totalPages)
                });
            } else {
                await interaction.reply({
                    embeds: [embed],
                    components: BuildRowComponents(queue, currentPage, totalPages)
                });
            }
        } catch (error) {
            console.error('Erreur lors de la rafraîchissement du message :', error);
        }

    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la file d\'attente :', error);
    }
}

function BuildRowComponents(queue, currentPage, totalPages) {
    const tracksTForSLM = 25;
    const optionsList = [];

    const OnlyOneTrack = new StringSelectMenuOptionBuilder()
        .setLabel(`ttt`)
        .setValue(`ehgqehhqethqetheh`);

    queue.tracks.data.slice(0, tracksTForSLM).forEach((m, i) => {
        const sl = new StringSelectMenuOptionBuilder()
            .setLabel(`${i + 1}. ${m.title.slice(0, 50)} `)
            .setValue(`${i + 1} `);
        optionsList.push(sl);
    });

    const options = queue.tracks.size <= 0 ? OnlyOneTrack : optionsList;

    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('queuelistembed-refresh')
                .setLabel('Refresh')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('queuelistembed-firstpage')
                .setLabel('First Page')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 0 || currentPage < 0),
            new ButtonBuilder()
                .setCustomId('queuelistembed-previouspage')
                .setLabel('Previous Page')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 0 || currentPage < 0),
            new ButtonBuilder()
                .setCustomId('queuelistembed-nextpage')
                .setLabel('Next Page')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === totalPages || currentPage > totalPages),
            new ButtonBuilder()
                .setCustomId('queuelistembed-lastpage')
                .setLabel('Last Page')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === totalPages || currentPage > totalPages)
        );

    const MusicRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('queuelistembed-back')
                .setEmoji(emojis['music-back'])
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(queue.node.isPlaying() ? false : true),
            new ButtonBuilder()
                .setCustomId('queuelistembed-pauseresume')
                .setEmoji(queue.node.isPlaying() ? emojis['music-pause'] : emojis['music-resume'])
                .setStyle(queue.node.isPlaying() ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('queuelistembed-skip')
                .setEmoji(emojis['music-skip'])
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(queue.node.isPlaying() && queue.tracks.size > 0 ? false : true),
        );
    const MusicRow2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('queuelistembed-loop')
                .setEmoji(emojis['music-loopTrack'])
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('queuelistembed-delete')
                .setEmoji(emojis['music-stop'])
                .setStyle(ButtonStyle.Danger)
                .setDisabled(false),
        );

    const QuickAction = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setPlaceholder("Quick action for a sound")
                .setCustomId("quikactionselectmenu")
                .addOptions(options)
                .setMinValues(1)
                .setMaxValues(1)
                .setDisabled(queue.tracks.size <= 0 ? true : false)
        );

    return [ MusicRow, MusicRow2, actionRow, QuickAction ];
}

function QueueErrorCheck(interaction, string) {
    if (string) {
        const embed = new EmbedBuilder()
            .setDescription(`${emojis.error} No music playing`)
            .setColor(Colors.Red);

        interaction.reply({
            embeds: [embed],
            components: [DTBM.createButton()]
        }).catch(() => {
            interaction.editReply({
                embeds: [embed],
                components: [DTBM.createButton()]
            })
        });

        return false;
    } else {
        return true;
    }
}

module.exports = { InitializeQueueListEmbed, QueueErrorCheck };
