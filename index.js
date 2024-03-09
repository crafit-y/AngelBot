const { Client, Collection } = require('discord.js');
const { Player } = require('discord-player');
const dotenv = require('dotenv'); dotenv.config();
const Logger = require('./utils/Logger');

const client = new Client({ intents: 3276799 });
const player = new Player(client);

client.player = player;
player.extractors.loadDefault();

['buttons', 'commands', 'modals', 'selectMenus'].forEach(x => client[x] = new Collection());
['CommandHandler', 'EventHandler', 'ButtonHandler', 'SelectMenuHandler'].forEach(handler => require(`./utils/handlers/${handler}`)(client));

process.on('exit', code => { Logger.clientError(`Le processus s\'est arrêté avec le code: ${code} !`) });

process.on('uncaughtExeption', (err, origin) => {
  Logger.error(`UNCAUGHT_EXECEPTION: ${err}`);
  console.log(origin)
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.warn(`UNHANDLED_REJECTION: ${reason}`);
  console.log(promise)
});

process.on('warning', (...args) => Logger.warn(...args));


client.login(process.env.TOKEN);