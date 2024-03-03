const Logger = require('../../utils/Logger');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    Logger.client('-> The bot is ready');

    const devGuild = await client.guilds.cache.get('1201436290059604079');
    devGuild.commands.set(client.commands.map(command => command));
  }
}