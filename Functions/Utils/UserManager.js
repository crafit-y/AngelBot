users = new Map();

class UserManager {
  constructor() {}

  async changeNickname(member, newNickname) {
    if (member.manageable) {
      try {
        const oldNickname = member.nickname;
        await member.setNickname(newNickname);
        users.set(member.id, oldNickname);
        console.log(`Pseudo changé de ${oldNickname} à ${newNickname}`);
      } catch (error) {
        console.error("Erreur lors du changement de pseudo:", error);
      }
    } else {
      console.log(
        "Pas les permissions pour changer le pseudo de cet utilisateur."
      );
    }
  }

  async resetNicknames() {
    for (let [id, oldNickname] of users) {
      const member = await client.guilds.cache.first().members.fetch(id);
      await member.setNickname(oldNickname);
      console.log(`Pseudo réinitialisé pour ${member.displayName}`);
    }
    users.clear();
  }
}

module.exports = UserManager;
