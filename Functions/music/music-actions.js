const { useQueue } = require("discord-player");
const { Colors } = require('discord.js');
const { QueueErrorCheck } = require("./queueListEmbed");
const { createEmbed } = require('../all/Embeds');
const emojis = require("../../utils/emojis.json");

class QueueAction {
    constructor(interaction) {
        this.queue = useQueue(interaction.guild.id);
        this.message = interaction.message;
    }

    async loop(loopMode) {
        QueueErrorCheck(!this.queue || !this.queue.node.isPlaying());

        this.queue.setRepeatMode(loopMode);

        interaction.reply({ embeds: [await createEmbed.embed(`${emojis["music-loopTrack"]} **The sound** \`${this.queue.currentTrack.title}\` **is in loop mode**`, Colors.Purple)], ephemeral: true });
    }
}

module.exports = { QueueAction };
