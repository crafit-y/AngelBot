const { commandError } = require("../../functions/errors/commandError");


module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {

    try {

      if (interaction.isCommand()) {

        const command = client.commands.get(interaction.commandName);
        if (!command) return interaction.reply('Cette commande n\'existe pas !')

        if (command.OwnerOnly && interaction.member.id != "391233346996535306") return interaction.reply({ content: `Vous n'avez pas la permission d'executer cette commande !`, ephemeral: true })

        if (!interaction.member.permissions.has([command.permissions])) return interaction.reply({ content: `Vous n'avez pas la permission d'executer cette commande !`, ephemeral: true })

        command.run(client, interaction);

        // BUTTONS -----------------------------------
      } else if (interaction.isButton() && client.buttons.get(interaction.customId)) {

        const button = client.buttons.get(interaction.customId);

        if (!button) return interaction.reply('This button is not work...');

        if (!interaction.member.permissions.has([button.permissions])) return interaction.reply({ content: `Vous n'avez pas la permission d'executer ce boutton !`, ephemeral: true })

        button.run(client, interaction);

        // MODALS -----------------------------------
      } else if (interaction.isModalSubmit() && client.modals.get(interaction.customId)) {

        const modal = client.modals.get(interaction.customId);

        if (!modal) return interaction.reply("This modal is not work...");

        modal.run(client, interaction);

        // SELECTMENUS -----------------------------------
      }

      else if (interaction.isUserSelectMenu() && client.selectMenus.get(interaction.customId)) {

        const selectMenu = client.selectMenus.get(interaction.customId);

        if (!selectMenu) return interaction.reply("This selectmenu is not work...");

        if (!interaction.member.permissions.has([selectMenu.permissions])) return interaction.reply({ content: `Vous n'avez pas la permission d'executer ce select menu !`, ephemeral: true })

        selectMenu.run(client, interaction);
      } else if (interaction.isStringSelectMenu() && client.selectMenus.get(interaction.customId)) {


        const selectMenu = client.selectMenus.get(interaction.customId);

        if (!selectMenu) return interaction.reply("This selectmenu is not work...");

        if (!interaction.member.permissions.has([selectMenu.permissions])) return interaction.reply({ content: `Vous n'avez pas la permission d'utiliser ce select menu !`, ephemeral: true })

        selectMenu.run(client, interaction);
      }
    } catch (error) {

      commandError.send(client, interaction, error);

    }
  }
}