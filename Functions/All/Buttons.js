const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const createButton = {
  async create(buttonDataArray) {
    const actionRow = new ActionRowBuilder();
    buttonDataArray.forEach(([customId, label, emoji, buttonStyle, isDisabled, url]) => {
      const button = new ButtonBuilder()
        .setCustomId(customId)
        .setStyle(buttonStyle)
        .setDisabled(isDisabled);

      if (label !== null) {
        button.setLabel(label);
      }

      if (emoji !== null) {
        button.setEmoji(emoji);
      }

      // Check if url is not null and is a string before setting
      if (url !== null && typeof url === 'string') {
        button.setURL(url);
      }

      actionRow.addComponents(button);
    });
    return actionRow;
  },
}

module.exports = { createButton };
