module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {

    if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return interaction.reply('Cette commande n\'existe pas !')

      if (command.OwnerOnly && interaction.member.id != "391233346996535306") return interaction.reply({ content: `Vous n'avez pas la permission d'executer cette commande !`, ephemeral: true })

      if (!interaction.member.permissions.has([command.permissions])) return interaction.reply({ content: `Vous n'avez pas la permission d'executer cette commande !`, ephemeral: true })

      command.run(client, interaction);
    }

  }
}