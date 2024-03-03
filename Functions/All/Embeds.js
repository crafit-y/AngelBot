const { EmbedBuilder, Colors } = require('discord.js');

const createEmbed = {

  async embed(description, color) {
    const embed = new EmbedBuilder()
      .setDescription(description)
      .setColor(color || Colors.Green);
    return embed;
  },

  async log(member, description, color) {
    const embed = new EmbedBuilder()
      .setDescription(description)
      .setColor(color || Colors.Grey)
      .setFooter({ text: `Action by ${member.user.tag}`, iconURL: member.user.displayAvatarURL()})
      .setTimestamp();
    return embed;
  }
}

module.exports = { createEmbed };
