const Logger = require('../../utils/Logger');
const { liveManager } = require('../../Functions/Fs/LiveManager.js');

const EMOJIS = require('../../utils/emojis.json');
const IDS = require('../../utils/ids.json');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    Logger.client('-> Le bot est prêt');

    const devGuild = await client.guilds.cache.get('1201436290059604079');
    devGuild.commands.set(client.commands.map(command => command));

    setInterval(async () => {
      // Récupération du statut du live
      const isOnLive = await liveManager.getStatus();

      // Récupération du canal par son ID
      const channel = client.channels.cache.get(`${IDS.CHANNELS.LIVESTATE}`);

      if (channel) {

        const channelName = isOnLive != false ? `${EMOJIS.onLive} 𝑂𝑛 𝑙𝑖𝑣𝑒` : `${EMOJIS.offLive} 𝑂𝑓𝑓 𝑙𝑖𝑣𝑒`;

        if (channelName != channel.name) {

          // Modification du nom du canal en fonction du statut du live
          channel.setName(channelName)
            .then(updatedChannel => console.log(`Nom du canal mis à jour: ${updatedChannel.name}`))
            .catch(console.error);

        }

      } else {
        console.error('Canal introuvable.');
      }

    }, 30000); // 5000 millisecondes = 5 secondes
  }
};
