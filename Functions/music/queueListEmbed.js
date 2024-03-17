const { EmbedBuilder, Colors, StringSelectMenuBuilder, ActionRowBuilder, ButtonStyle, StringSelectMenuOptionBuilder } = require("discord.js");
const { useQueue } = require("discord-player");
const { DTBM } = require("../all/DTBM");
const { createButton } = require("../all/Buttons");
const { createEmbed } = require('../all/Embeds');
const emojis = require("../../utils/emojis.json");

async function InitializeQueueListEmbed(interaction, increment) {
    const queue = useQueue(interaction.guild.id);

    if (!queue) return false;

    try {
        let currentPage = 0;
        let fetchedMessage = null;

        if (interaction.message) {
            try {
                fetchedMessage = await interaction.channel.messages.fetch(interaction.message.id);
                const embedFooter = fetchedMessage.embeds[0].footer;
                const match = embedFooter.text.match(/Page (\d+)/);

                if (match) currentPage = parseInt(match[1]) + increment;
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
            const Title = m.title.replace(m.author + " - ", "").replace(m.author, "").replace(" - ", "").replace("/", "").slice(0, 30);

            const Author = m.author.slice(0, 25);

            return `**${emojis["music-note"]} | \`#${i + 1}\`  ${Title}**\n*➔ by ${Author}*
                    > Added by ${m.requestedBy} - *[link](${m.url})* | ${m.duration}`;
        });

        const embed = new EmbedBuilder()
            .setThumbnail(currentTrack.thumbnail || "")
            .setTitle(`${emojis.music} | ${currentTrack.title} is playing on <#${queue.channel.id}>`)
            .setDescription(`${queue.node.createProgressBar()}\n\n${queue.tracks.size <= 0 ? "No more track" : tracks.join('\n')}\n${queue.tracks.size > pageEnd ? `...${queue.tracks.size - pageEnd} more track${queue.tracks.size - pageEnd > 1 ? "s" : ""}` : ''}`)
            .setFooter({ text: `Page ${currentPage} of ${totalPages === -1 ? "0" : totalPages}` })
            .setColor(Colors.Purple);

        try {
            await (fetchedMessage !== null ? interaction.message.edit({ embeds: [embed], components: await BuildRowComponents(queue, currentPage, totalPages) }) : interaction.editReply({ embeds: [embed], components: await BuildRowComponents(queue, currentPage, totalPages) }));
        } catch (error) {
            console.error('Erreur lors de la rafraîchissement du message :', error);
        }
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la file d\'attente :', error);
    }
}

async function BuildRowComponents(queue, currentPage, totalPages) {
    const tracksTForSLM = 25;
    const optionsList = queue.tracks.data.slice(0, tracksTForSLM).map((m, i) => new StringSelectMenuOptionBuilder().setLabel(`${i + 1}. ${m.title.slice(0, 50)} `).setValue(`${i + 1} `));
    const OnlyOneTrack = new StringSelectMenuOptionBuilder().setLabel(`ttt`).setValue(`ehgqehhqethqetheh`);
    const options = queue.tracks.size <= 0 ? OnlyOneTrack : optionsList;

    const actionRow = await createButton.create([
        ['queuelistembed-refresh', 'Refresh', null, ButtonStyle.Success, false, null],
        ['queuelistembed-firstpage', 'First Page', null, ButtonStyle.Primary, currentPage === 0 || currentPage < 0, null],
        ['queuelistembed-previouspage', 'Previous Page', null, ButtonStyle.Primary, currentPage === 0 || currentPage < 0, null],
        ['queuelistembed-nextpage', 'Next Page', null, ButtonStyle.Primary, currentPage === totalPages || currentPage > totalPages, null],
        ['queuelistembed-lastpage', 'Last Page', null, ButtonStyle.Primary, currentPage === totalPages || currentPage > totalPages, null]
    ]);

    const musicRow = await createButton.create([
        ['queuelistembed-back', "Back", emojis['music-back'], ButtonStyle.Secondary, !queue.node.isPlaying(), null],
        ['queuelistembed-pauseresume', queue.node.isPlaying() ? "Play" : "Pause", queue.node.isPlaying() ? emojis['music-pause'] : emojis['music-resume'], queue.node.isPlaying() ? ButtonStyle.Success : ButtonStyle.Danger, false, null],
        ['queuelistembed-skip', "Skip", emojis['music-skip'], ButtonStyle.Secondary, queue.node.isPlaying() && queue.tracks.size > 0 ? false : true, null]
    ]);

    const musicRow2 = await createButton.create([
        ['queuelistembed-loop', "Loop", emojis['music-loopTrack'], ButtonStyle.Secondary, false, null],
        ['queuelistembed-delete', "Stop", emojis['music-stop'], ButtonStyle.Danger, false, null],
        ['queuelistembed-shuffle', "Shuffle", emojis["music-shuffle"], ButtonStyle.Secondary, false, null]
    ]);

    const quickAction = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setPlaceholder("Quick action for a sound").setCustomId("quikactionselectmenu").addOptions(options || []).setMinValues(1).setMaxValues(1).setDisabled(queue.tracks.size <= 0 ? true : false)
    );

    return [actionRow, musicRow, musicRow2, quickAction];
}


async function QueueErrorCheck(interaction, string) {
    if (string) {
        const embed = await createEmbed.embed(`${emojis.error} No music playing`, Colors.Red)

        interaction.reply({ embeds: [embed], components: [DTBM.createButton()] }).catch(() => interaction.editReply({ embeds: [embed], components: [DTBM.createButton()] }));

        return false;
    } else {
        return true;
    }
}

module.exports = { InitializeQueueListEmbed, QueueErrorCheck };
