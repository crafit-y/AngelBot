const { Client, Collection } = require("discord.js");
const { Player } = require("discord-player");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const Logger = require("./utils/Logger");
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;


// Création d'une instance client avec les intents nécessaires
const client = new Client({ intents: 3276799 });
const player = new Player(client);

// Ajout du player au client
client.player = player;
player.extractors.loadDefault();

// Initialisation des collections pour divers éléments
["buttons", "commands", "modals", "selectMenus"].forEach(
  (x) => (client[x] = new Collection())
);

// Chargement dynamique des gestionnaires
[
  "CommandHandler",
  "EventHandler",
  "ButtonHandler",
  "SelectMenuHandler",
].forEach((handler) => require(`./utils/handlers/${handler}`)(client));

// Gestion des processus de fin
process.on("exit", (code) => {
  Logger.clientError(`Le processus s'est arrêté avec le code: ${code} !`);
});

// Correction de l'événement 'uncaughtException'
process.on("uncaughtException", (err, origin) => {
  Logger.error(`UNCAUGHT_EXCEPTION: ${err.message}`);
  console.log(`Stack: ${err.stack}`);
  console.log(`Origin: ${origin}`);
});

// Gestion des rejets de promesse non gérés
process.on("unhandledRejection", (reason, promise) => {
  Logger.warn(`UNHANDLED_REJECTION: ${reason.message}`);
  console.log(`Promise: ${promise}`);
});

// Gestion des avertissements
process.on("warning", (warning) => Logger.warn(`WARNING: ${warning.message}`));

// Fonction asynchrone pour connecter à MongoDB et démarrer le client Discord
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    Logger.client("-> Connected to MongoDB");
  } catch (error) {
    Logger.clientError(`-> MongoDB connection error: ${error.message}`);
  }

  try {
    Logger.client("-> Attempting to connect to Discord...");
    await client.login(process.env.TOKEN);
  } catch (error) {
    Logger.clientError(`-> Discord login error: ${error.message}`);
  }
})();
