const Logger = require("../../utils/Logger");
const { liveManager } = require("../../functions/fs/LiveManager.js");
const { partyManager } = require("../../functions/fs/PartyManager.js");
const axios = require("axios");

const emojis = require("../../utils/emojis.json");
const IDS = require("../../utils/ids.json");
const { ActivityType } = require("discord.js");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    await axios
      .get("https://api.ipify.org?format=json")
      .then((response) => {
        Logger.client(
          `-> L'adresse IP publique du serveur est : ${response.data.ip}`
        );
      })
      .catch((error) => {
        Logger.clientError(
          `-> Erreur lors de la récupération de l'adresse IP: ${error}`
        );
      });
    Logger.client("-> " + process.env.VERSION);
    Logger.client("-> Le bot est prêt");

    const devGuild = await client.guilds.cache.get("1201436290059604079");
    devGuild.commands.set(client.commands.map((command) => command));

    setInterval(async () => {
      // Récupération du statut du live
      const isOnLive = await liveManager.getStatus();
      const party = await partyManager.getStatus();

      // Récupération du canal par son ID
      const channel = client.channels.cache.get(`${IDS.CHANNELS.LIVESTATE}`);

      if (channel) {
        const channelName =
          isOnLive != false
            ? `${emojis.onLive} 𝑂𝑛 𝑙𝑖𝑣𝑒`
            : `${emojis.offLive} 𝑂𝑓𝑓 𝑙𝑖𝑣𝑒`;
        const statusOnParty =
          isOnLive != false ? `${emojis.onLive} 𝑃𝑎𝑟𝑡𝑦 𝑖𝑛 𝑝𝑟𝑜𝑔𝑟𝑒𝑠𝑠...` : ``;
        const statusOnLive =
          party != false && isOnLive != true
            ? `${emojis.away} 𝐴 𝑝𝑎𝑟𝑡𝑦 ℎ𝑎𝑠 𝑏𝑒𝑒𝑛 𝑐𝑟𝑒𝑎𝑡𝑒𝑑`
            : ``;

        if (channelName != channel.name) {
          // Modification du nom du canal en fonction du statut du live
          channel
            .setName(channelName)
            //.then(updatedChannel => console.log(`Nom du canal mis à jour: ${updatedChannel.name}`))
            .catch(console.error);
        }

        client.user.setPresence({
          activities: [
            {
              name:
                statusOnParty || statusOnLive
                  ? statusOnParty + statusOnLive
                  : process.env.VERSION,
              type: ActivityType.Custom,
            },
          ],
          status: "online", // Vous pouvez utiliser 'online', 'idle', 'dnd' ou 'invisible'
        });
      } else {
        console.error("Canal introuvable.");
      }
    }, 5000); // 5000 millisecondes = 5 secondes
  },
};
