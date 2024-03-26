const { Client, Collection } = require("discord.js");
const { Player } = require("discord-player");
const dotenv = require("dotenv");
dotenv.config();
const Logger = require("./utils/Logger");

const client = new Client({ intents: 3276799 });
const player = new Player(client);

const mysql = require("mysql");

let db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

client.db = db;

client.player = player;
player.extractors.loadDefault();

["buttons", "commands", "modals", "selectMenus"].forEach(
  (x) => (client[x] = new Collection())
);
[
  "CommandHandler",
  "EventHandler",
  "ButtonHandler",
  "SelectMenuHandler",
].forEach((handler) => require(`./utils/handlers/${handler}`)(client));

process.on("exit", (code) => {
  Logger.clientError(`Le processus s\'est arrêté avec le code: ${code} !`);
});

process.on("uncaughtExeption", (err, origin) => {
  Logger.error(`UNCAUGHT_EXECEPTION: ${err}`);
  console.log(origin);
});

process.on("unhandledRejection", (reason, promise) => {
  Logger.warn(`UNHANDLED_REJECTION: ${reason}`);
  console.log(promise);
});

process.on("warning", (...args) => Logger.warn(...args));

client.db.connect(function () {
  Logger.client("-> Bot was now connected to DB !");
}); //.catch(err => Logger.error(err))

client.login(process.env.TOKEN);
