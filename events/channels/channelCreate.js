const { UnNormalizer } = require("../../functions/all/Normalize");

module.exports = {
  name: "channelCreate",
  once: false,
  async execute(client, channel) {
    // //if (channel.type !== "GUILD_TEXT") return; // Assurez-vous que le channel est de type texte
    // const originalName = channel.name;
    // let newName = "";
    // // Boucle sur chaque lettre du nom du salon
    // for (let i = 0; i < originalName.length; i++) {
    //   try {
    //     // Appliquer la transformation pour chaque lettre
    //     newName += await UnNormalizer.useChannelSpecialCharacters(
    //       originalName[i]
    //     );
    //     console.log(newName);
    //   } catch (error) {
    //     console.error(
    //       `Erreur lors de la transformation de la lettre '${originalName[i]}':`,
    //       error
    //     );
    //   }
    // }
    // // Vérifiez si le nouveau nom est valide
    // if (!newName || newName.length > 100) {
    //   console.error("Le nouveau nom du salon est invalide ou trop long.");
    //   return;
    // }
    // try {
    //   // Changer le nom du salon
    //   await channel.setName(newName);
    //   console.log(`Le nom du salon a été changé en : ${newName}`);
    // } catch (error) {
    //   console.error("Erreur lors du changement de nom du salon :", error);
    // }
  },
};
