class PartyEmojiManager {
  constructor() {
    this.emojiCounter = 0; // Compteur pour attribuer les indices d'émojis
    this.partyIdToEmojiIndex = new Map();
    this.emojisList = [
      "<:party_1:1227405052054868041>",
      "<:party_2:1227405093964611584>",
      "<:party_3:1227405095319113748>",
      "<:party_4:1227405096720138312>",
      "<:party_5:1227405097902805186>",
      "<:party_6:1227405072758083594>",
      "<:party_7:1228076815881601074>",
      "<:party_8:1227405054831628321>",
      "<:party_9:1227405092806721627>",
      "<:party_10:1227405074096062555>",
      "<:party_11:1227405075333513236>",
      "<:party_12:1227405069641715712>",
      "<:party_13:1227405071185084466>",
    ];
  }

  getEmojiForPartyId(partyId) {
    // Si l'ID de la partie est déjà dans la map, retournez l'émoji correspondant
    if (this.partyIdToEmojiIndex.has(partyId)) {
      return this.emojisList[this.partyIdToEmojiIndex.get(partyId)];
    } else {
      // Si c'est un nouvel ID de partie, utilisez l'emoji actuel du compteur et mettez à jour la map
      const emoji = this.emojisList[this.emojiCounter];
      this.partyIdToEmojiIndex.set(partyId, this.emojiCounter);
      this.emojiCounter = (this.emojiCounter + 1) % this.emojisList.length; // Incrémenter et boucler le compteur
      return emoji;
    }
  }
}

module.exports = PartyEmojiManager;
