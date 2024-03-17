const { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction } = require('discord.js');

/**
     * 
     * @param {*} client 
     * @param {CommandInteraction} interaction 
     */

module.exports = {
    name: 'deletethebotmessage',
    permissions: [],
    async run(client, interaction) {

        try {

            return await interaction.message.delete();

        } catch (error) {
            console.error(error)
        }

    }
}