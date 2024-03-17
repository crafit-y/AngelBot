const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors } = require('discord.js');

const msgsError = [
    "Aïe...",
    "Oups...",
    "Oh, une erreur...",
    "Oh non...",
    "Zut alors...",
    "Désolé, une erreur est survenue...",
    "Oops, quelque chose s'est mal passé...",
    "Euh oh...",
    "Hou la la...",
    "Mince alors...",
    "Euh oh, une erreur...",
    "Ah zut...",
    "Désolé, ça n'a pas fonctionné...",
    "Oopsie...",
]

const commandError = {

    async send(client, interaction, error) {

        const msgMath = Math.floor(Math.random() * msgsError.length);
        const msg = msgsError[msgMath];

        const btn = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Support server')
                    .setStyle(ButtonStyle.Link)
                    .setURL('http://google.com')
                    .setDisabled(true)
            )

        const embed = new EmbedBuilder()
            .setAuthor({ name: msg, iconURL: client.user.avatarURL() })
            .setDescription(`Une erreur est survenue !\nVous ne devriez jamais recevoir ce message...\n\`\`\`java\nError code:\n${error}\`\`\`\n*Vous pouvez nous le signaler en appuiyant sur le boutton en bas là ↓*`)
            .setColor(Colors.Red)

        return await interaction.channel.send({ embeds: [embed], components: [btn] }).catch(() => { });

    }

}

module.exports = { commandError }