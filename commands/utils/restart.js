const Logger = require('../../utils/Logger');

module.exports = {
  name: 'restart',
  description: 'Restart the application (OWNER ONLY)',
  permissions: [],
  OwnerOnly: true,
  options: [],
  async run(client, interaction) {

    Logger.client('Restarting...')
    interaction.deferReply();
    await interaction.client.destroy();
    restart(interaction);

  }
};

function restart(interaction) {
  setTimeout(() => {

    interaction.client.login(process.env.TOKEN);
    Logger.client('Restarted !')
    interaction.editReply({ content: "Restarted !" });

  }, 5000);
}
