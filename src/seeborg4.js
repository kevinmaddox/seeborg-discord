"use strict";
const assert = require("assert");

const fs = require("fs");
const writeFileAtomicSync = require("write-file-atomic").sync;

const confmod = require("./confmod");
const logger = require("./logging").getLogger(module);
const {
  PluginManager
} = require("./pluginman");
const {
  CommandHandler
} = require("./cmdhnd");
const {
  VoiceHandler
} = require("./voicehnd");
const {
  Learner
} = require("./learn");
const {
  Answerer
} = require("./answerer");
const {
  Reaction
} = require("./reaction");
const {
  Database
} = require("./database");

const instances = new Set();

/**
 * Destroys all SeeBorg4 instances.
 *
 * @returns {void}
 */
function cleanup() {
  for (let instance of instances) {
    instance.destroy();
  }
  assert(instances.size === 0);
}

class SeeBorg4 {
  /**
   * Creates an instance of SeeBorg4.
   *
   * @param {*} client The chat client to use
   * @param {*} config The configuration file to use
   * @memberof SeeBorg4
   *
   * @prop {*} client
   * @prop {*} config
   *
   * @prop {PluginManager} pluginManager
   * @prop {CommandHandler} commandHandler
   * @prop {VoiceHandler} voiceHandler
   * @prop {Learner} learner
   * @prop {Answerer} answerer
   * @prop {Reaction} reaction
   *
   * @prop {?Number} autoSaveJobId ID of the JavaScript timer running the autosave job
   */
  constructor(client, config) {
    instances.add(this);
    this.client = client;
    this.config = config;

    this.pluginManager = new PluginManager(this);
    this.commandHandler = new CommandHandler(this);
    this.voiceHandler = new VoiceHandler(this);
    this.learner = new Learner(this);
    this.answerer = new Answerer(this);
    this.reaction = new Reaction(this);

    this.autoSaveJobId = null;
  }

  start() {
    logger.info("SeeBorg4 is starting!");
    logger.info("Loading plugins.");
    this.pluginManager.loadPlugins();
    logger.info(`Loaded ${this.pluginManager.loadedPlugins.length} plugins.`);

    logger.info("Registering listeners.");
    this.registerListeners();

    logger.info("Starting auto save job.");
    this.startAutoSaveJob();

    logger.info("Logging in!");
    this.client.login(this.config.token)
      .catch(err => {
        logger.error("Failed to log in to Discord. " + err);
      });
  }

  /**
   * Destroys this instance and makes it unusable.
   * @returns {void}
   */
  destroy() {
    logger.info("Destroy: Shutting off plugins.");
    this.pluginManager.destroy();

    logger.info("Destroy: Shutting down the client.");
    this.client.destroy();

    logger.info("Destroy: Stopping auto save job.");
    clearInterval(this.autoSaveJobId);

    logger.info("Destroy: Saving dictionaries before quitting.");
    for (const guildId in this.database) {
      this.database[guildId].save();
    }

    logger.info("Destroy: Removing bot from list of instances.");
    assert(instances.delete(this));

    logger.info("Destroy: Done.");
  }

  registerListeners() {
    this.client.on("ready", this.onReady.bind(this));
    this.client.on("message", this.onMessage.bind(this));
    this.client.on("guildCreate", this.onGuildCreate.bind(this));
  }

  startAutoSaveJob() {
    this.autoSaveJobId = setInterval(() => {
      logger.info("Saving dictionaries...");
      for (const guildId in this.database) {
        this.database[guildId].save();
      }
      logger.info("Saved!");
    }, this.config.autoSavePeriod * 1000);
  }

  onReady() {
    logger.info("Connected to Discord!");
    
    // Load databases.
    this.database = {};
    logger.info('Connected servers:');
    logger.info('--------------------------------');
    this.client.guilds.forEach(guild => {
      logger.info(guild.name).info(guild.id).info('------------------');
      this.loadDatabase(guild);
    });
    logger.info('--------------------------------');
    
    // Set activity message
    if (this.config.activity && this.config.activityType) {
        logger.info('Attempting to set status message');
        this.client.user.setActivity(this.config.activity, { type: this.config.activityType })
          .then(presence => logger.info('Status message set!'))
          .catch(console.error);
    }
  }

  onMessage(message) {
    logger.info(`Message in #${message.channel.name} (${message.channel.id}): ${message.author.username} (${message.author.id}) >>> ${message.content}`);

    const handled = this.commandHandler.handle(message);
    if (handled) {
      logger.debug("Message handled by command handler.");
      return;
    }
    this.answerer.apply(message);
    this.learner.apply(message);
    this.reaction.apply(message);
  }
  
  // This is actually the listener for joining a guild in this bot's case.
  onGuildCreate(guild) {
    logger.info(`Joined guild: ${guild.name} (${guild.id})`);
    logger.info('Creating new dictionary for guild.');
    this.loadDatabase(guild);
  }
  
  loadDatabase(guild) {
        // Load and initialize database for guild.
      this.database[guild.id] = new Database(this.config.databasePath + '/' + guild.id + '.json');
      this.database[guild.id].init();
      
      // Store separate txt file for info on which server this is, since a raw ID is not very descriptive
      const infoFilePath = this.config.databasePath + '/' + guild.id + '.txt';
      if (!fs.existsSync(infoFilePath))
        writeFileAtomicSync(infoFilePath, `${guild.name}\r\n${guild.id}`);
  }
  

  /**
   * Returns true if the user is ignored in the given channel.
   *
   * @param {*} user The user
   * @param {*} channel The channel
   * @returns {boolean}
   * @memberof SeeBorg4
   */
  isIgnored(user, channel) {
    // Ignore own messages
    if (user.id === this.client.user.id) {
      return true;
    }

    // Ignore users in the ignore list
    if (confmod.isIgnored(this.config, user.id, channel.id)) {
      return true;
    }

    return false;
  }
}

module.exports = {
  instances: instances,
  cleanup: cleanup,
  SeeBorg4: SeeBorg4
};