const { createEmbed } = require("../../functions/all/Embeds");

module.exports = {
  name: 'ping',
  description: 'Pong',
  permissions: ['ADMINISTRATOR'],
  run: async (client, interaction) => {
    const tryPong = await interaction.reply({ embeds: [await createEmbed.embed(`Calcule de la latence du bot et de l'API en cours...`)] });

    await interaction.editReply({ embeds: [await createEmbed.embed(`Pong!\nLatence de l'API: \`${client.ws.ping}ms\`\nLatence du BOT: \`${tryPong.createdTimestamp - interaction.createdTimestamp}ms\``)] });
  }
}