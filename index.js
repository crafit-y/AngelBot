const { Client, Collection } = require('discord.js');
const dotenv = require('dotenv'); dotenv.config();
const client = new Client({ intents: 3243773 });
const Logger = require('./utils/Logger');

client.commands = new Collection();

['CommandUtil', 'EventUtil'].forEach(handler => { require(`./utils/handlers/${handler}`)(client) });

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