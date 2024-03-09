const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const emojis = require("../../utils/emojis.json");

class DTBM {

    static createButton() {
        const trashButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("deletethebotmessage")
                    .setEmoji(`${emojis.trash}`)
                    .setStyle(ButtonStyle.Danger))
        return trashButton;
    }

    static createButtonToAdd() {
        return new ButtonBuilder()
            .setCustomId("deletethebotmessage")
            .setEmoji(`${emojis.trash}`)
            .setStyle(ButtonStyle.Danger)
    }

}

module.exports = { DTBM: DTBM };