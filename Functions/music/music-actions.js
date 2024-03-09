const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors, CommandInteraction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { useQueue, useHistory } = require("discord-player");
const emojis = require("../../utils/emojis.json");
const { QueueListEmbed, QueueErrorCheck } = require("./queueListEmbed");

function QueueAction(interaction) {

    const queue = useQueue(interaction.guild.id);
    const message = interaction.message

    QueueErrorCheck(!queue || !queue.node.isPlaying());



    this.loop = function (loopMode) {

        queue.setRepeatMode(loopMode);

        const embedLoop = new EmbedBuilder()
            .setDescription(`${emojis["music-loopTrack"]} **The sound** \`${queue.currentTrack.title}\` **is in loop mode**`)
            .setColor(Colors.DarkBlue);

        interaction.reply({ embeds: [embedLoop], ephemeral: true });
    };
}


module.exports = { QueueAction: QueueAction };
