const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const msgsError = [
    "Aïe...",
    "Oups...",
    "Oh, une erreur...",
]

class commandError {

    async send(client, guild, interaction, error) {

        const msgMath = Math.floor(Math.random() * msgsError.length);
        const msg = msgsError[msgMath];


        const btn = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Support server')
                    .setStyle(ButtonStyle.Link)
                    .setURL('http://google.com')
            )

        const embed = new EmbedBuilder()
            .setAuthor({ name: msg, iconURL: client.user.avatarURL() })
            .setDescription(`Une erreur est survenue !\nVous ne devriez jamais recevoir ce message...\n\`\`\`java\nError code:\n${error}\`\`\`\nVous pouvez nous le signaler en appuiyant sur le boutton en bas là ↓`)
            .setColor('Red')

        return await interaction.channel.send({ embeds: [embed], components: [btn] })


    }

}

module.exports = { commandError: commandError }