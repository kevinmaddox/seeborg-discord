# New Features

0. [Individual server dictionaries](#indv-dicts)
1. [Emoji reactions](#emoji-reacts)
2. [Custom statuses](#custom-status)

---

<a name="indv-dicts"></a>

### Individual server dictionaries

In the original version of this software, only one, global dictionary was used, regardless of how many servers the bot was a part of. Now, a separate JSON dictionary will be created for each server joined. You may specify the directory these dictionaries are stored in via the configuration parameter `databasePath`.

<a name="emoji-reacts"></a>

### Emoji reactions

The bot can now randomly react to messages via the custom emoji belonging to the server the message was sent in. The configuration parameter to enable this behavior is `reacting` and the percentage rate at which the bot should react to messages is `reactRate`.

Additionally, you can provide a list of server IDs via `globalEmoji`. When reacting, the bot will have a chance to pull an emoji from the servers in this list on any of its connected servers. These should be servers the bot is connected to.

<a name="custom-status"></a>

### Custom statuses

You can use the configuration options `activityType` and `activity` to set the bot's current status. Please see <a href="https://discord.js.org/#/docs/main/stable/typedef/ActivityType">the official API documentation</a> for a list of Activity Types.

# Planned Features

0. [Administrative commands](#admin-commands)
1. [Triggers](#triggers)

---

<a name="admin-commands"></a>

### Administrative commands

Commands to approved users to control the bot through Discord messages, like setting the reply rate. Commands are already in place, I just want to add some useful default commands.

<a name="triggers"></a>

### Triggers

Way for the bot to respond to specific messages in specific ways.