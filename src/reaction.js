"use strict";
const assert = require("assert");
const _ = require("underscore");

const logger = require("./logging").getLogger(module);
const confmod = require("./confmod");
const stringUtil = require("./stringutil");

/**
 * This class is responsible for the flow of reactions.
 *
 * @class Reaction
 */
class Reaction {
  /**
   * Creates an instance of Reaction.
   *
   * @param {*} bot The bot
   *
   * @prop {*} bot
   *
   * @memberof Reaction
   */
  constructor(bot) {
    this.bot = bot;
  }

  /**
   * If the bot should react to the message, then the specified message will be reacted to.
   * Otherwise, nothing will be done.
   *
   * @param {*} message the message
   * @returns {boolean} True if the message was replied to
   * @memberof Reaction
   */
  apply(message) {
    if (this.shouldReact(message)) {
      this.react(message);
      return true;
    }
    return false;
  }

  /**
   * Return true if the bot should react to the message.
   *
   * @param {*} message The message
   * @returns {boolean}
   * @memberof SeeBorg4
   */
  shouldReact(message) {
    if (this.bot.isIgnored(message.author, message.channel)) {
      logger.debug("false: User is ignored");
      return false;
    }

    // Bot should not react if reacting is set to false
    if (!confmod.behavior(this.bot.config, message.channel.id, "reacting")) {
      logger.debug("false: reacting=false in " + message.channel.name);
      return false;
    }

    // Bot should not react if they don't have permission
    if (message.guild !== null && message.guild !== undefined) {
      if (!message.channel.permissionsFor(message.guild.me).has("ADD_REACTIONS")) {
        logger.debug("false: No permission to send messages in " + message.channel.name);
        return false;
      }
    }

    // Utility function
    function chancePredicate(chancePercentage, predicate) {
      const randInt = Math.random() * 99; // Generate a random number between 0 and 99
      logger.debug(`ChancePercentage: ${chancePercentage}, Rolled: ${randInt}`);
      if (chancePercentage > 0 && predicate()) {
        if (chancePercentage > randInt || chancePercentage === 100) {
          return true;
        }
      }
      return false;
    }

    // React rate
    const reactRate = confmod.behavior(this.bot.config, message.channel.id, "reactRate");
    assert(reactRate);
    logger.debug("Rolling for ReactRate");
    if (chancePredicate(reactRate, () => true)) {
      logger.debug("Reacting because of ReactRate in channel " + message.channel.name);
      return true
    }

    logger.debug("Reaction fail");
    return false;
  }

  /**
   * Sends an answer to the channel the message was sent in.
   *
   * @param {*} message The message
   * @returns {void}
   * @memberof Reaction
   */
  react(message) {
    const serverIds = (this.bot.config.globalEmoji) ? [message.guild.id].concat(this.bot.config.globalEmoji) : [message.guild.id];
    const emojiList = [];
    _.uniq(serverIds).forEach(id => {
        this.bot.client.guilds.get(id).emojis.forEach(emoji => {
        if (emoji.available)
          emojiList.push(emoji.id);
      });
    });
    
    if (emojiList.length === 0)
      return;
    
    const n = Math.floor(Math.random()*emojiList.length);
    const emoji = emojiList[n];
    logger.debug('Reacting with emoji: ' + emoji);
    message.react(emoji).catch((err) => {
      logger.error(err);
    });
  }
}

module.exports = {
  Reaction: Reaction
};