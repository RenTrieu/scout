import 'dotenv/config';
import { 
  InstallGlobalCommands, 
  InstallGuildCommands,
  unixCommandSync,
  getAvailableSpiders
} from './utils.js';

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
};

// Call test command
const CALL_COMMAND = {
  name: 'call',
  description: 'Calls a webscraper',
  options: [
    {
      type: 3,
      name: 'spider',
      description: 'Choose the webscraper to use',
      required: true,
      choices: getAvailableSpiders(),
    }
  ],
  type: 1,
};

// Remove Spider command
const REMOVE_COMMAND = {
  name: 'remove',
  description: 'Removes a spider',
  options: [
    {
      type: 3,
      name: 'spider-uuid',
      description: 'UUID of the spider to be removed',
      required: true,
    }
  ],
  type: 1,
}

// Schedule Report
const SCHEDULE_COMMAND = {
  name: 'schedule',
  description: 'Schedules a webscraper to run',
  options: [
    {
      name: 'hourly',
      description: 'Repeat hourly',
      type: 1,
      options: [
        {
          type: 3,
          name: 'spider',
          description: 'Choose the webscraper to schedule',
          required: true,
          choices: getAvailableSpiders(),
        },
        {
          name: 'minute',
          description: 'What minute of the hour to run',
          type: 3,
          required: true,
        }
      ]
    },
    {
      name: 'daily',
      description: 'Repeat daily',
      type: 1,
      options: [
        {
          type: 3,
          name: 'spider',
          description: 'Choose the webscraper to schedule',
          required: true,
          choices: getAvailableSpiders(),
        },
        {
          name: 'hour',
          description: 'What hour to run',
          type: 3,
          required: true,
          choices: Array.from(Array(24).keys()).map((num) => {
            return {
              name: num.toString(),
              value: num.toString()
            }
          })
        },
        {
          name: 'minute',
          description: 'What minute of the hour to run',
          type: 3,
          required: true,
        }
      ]
    },
    {
      name: 'weekly',
      description: 'Repeat weekly',
      type: 1,
      options: [
        {
          type: 3,
          name: 'spider',
          description: 'Choose the webscraper to schedule',
          required: true,
          choices: getAvailableSpiders(),
        },
        {
          name: 'day',
          description: 'What day of the week to run',
          type: 3,
          required: true,
          choices: [
            {
              name: 'Sunday',
              value: '0'
            },
            {
              name: 'Monday',
              value: '1'
            },
            {
              name: 'Tuesday',
              value: '2'
            },
            {
              name: 'Wednesday',
              value: '3'
            },
            {
              name: 'Thursday',
              value: '4'
            },
            {
              name: 'Friday',
              value: '5'
            },
            {
              name: 'Saturday',
              value: '6'
            }
          ]
        },
        {
          name: 'hour',
          description: 'What hour to run',
          type: 3,
          required: true,
          choices: Array.from(Array(24).keys()).map((num) => {
            return {
              name: num.toString(),
              value: num.toString()
            }
          })
        },
        {
          name: 'minute',
          description: 'What minute of the hour to run',
          type: 3,
          required: true,
        }
      ]
    },

    {
      name: 'monthly',
      description: 'Repeat monthly',
      type: 1,
      options: [
        {
          type: 3,
          name: 'spider',
          description: 'Choose the webscraper to schedule',
          required: true,
          choices: getAvailableSpiders(),
        },
        {
          name: 'day',
          description: 'What day to run',
          type: 3,
          required: true,
        },
        {
          name: 'hour',
          description: 'What hour to run',
          type: 3,
          required: true,
          choices: Array.from(Array(24).keys()).map((num) => {
            return {
              name: num.toString(),
              value: num.toString()
            }
          })
        },
        {
          name: 'minute',
          description: 'What minute of the hour to run',
          type: 3,
          required: true,
        }
      ]
    },
    {
      name: 'yearly',
      description: 'Repeat yearly',
      type: 1,
      options: [
        {
          type: 3,
          name: 'spider',
          description: 'Choose the webscraper to schedule',
          required: true,
          choices: getAvailableSpiders(),
        },
        {
          name: 'month',
          description: 'What month to run',
          type: 3,
          required: true,
          choices: Array.from(Array(12).keys()).map((num) => {
            return {
              name: num.toString(),
              value: num.toString()
            }
          })
        },
        {
          name: 'day',
          description: 'What day to run',
          type: 3,
          required: true,
        },
        {
          name: 'hour',
          description: 'What hour to run',
          type: 3,
          required: true,
          choices: Array.from(Array(24).keys()).map((num) => {
            return {
              name: num.toString(),
              value: num.toString()
            }
          })
        },
        {
          name: 'minute',
          description: 'What minute of the hour to run',
          type: 3,
          required: true,
        }
      ]
    }
  ],
  type: 1,
};

// List a user's scheduled spiders
const LIST_COMMAND =  {
  name: 'list',
  description: 'Lists your scheduled spiders',
  type: 1,
};

const ALL_COMMANDS = [
  TEST_COMMAND, 
  CALL_COMMAND, 
  SCHEDULE_COMMAND,
  LIST_COMMAND,
  REMOVE_COMMAND,
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);

// Admin command that lists all scheduled spiders
const ADMIN_LIST_COMMAND = {
  name: 'admin_list',
  description: 'Used to display all active scheduled spiders',
  options: [
    {
      type: 3,
      name: 'user-id',
      description: 'Displays scheduled spiders for the given user',
      required: false,
    },
    {
      type: 3,
      name: 'guild-id',
      description: 'Displays scheduled spiders for a given guild',
      required: false,
    },
    {
      type: 3,
      name: 'spider-name',
      description: 'Displays scheduled spiders that match the given spider',
      required: false,
      choices: getAvailableSpiders(),
    }
  ],
  type: 1,
}

// Admin command that removes any scheduled spider
const ADMIN_REMOVE_COMMAND = {
  name: 'admin_remove',
  description: 'Removes any scheduled spider',
  options: [
    {
      type: 3,
      name: 'spider-uuid',
      description: 'UUID of the spider to be removed',
      required: true,
    }
  ],
  type: 1,
}

// Admin command that schedules a spider for a given user, channel, ad guild
const ADMIN_SCHEDULE_COMMAND = {
  name: 'admin_schedule',
  description: 'Schedules a spider',
  options: [
    {
      type: 3,
      name: 'spider-name',
      description: 'Spider to schedule',
      required: true,
      choices: getAvailableSpiders(),
    },
    {
      type: 3,
      name: 'user-id',
      description: 'User to schedule spider for',
      required: true,
    },
    {
      type: 3,
      name: 'channel-id',
      description: 'Channel in which to schedule spider',
      required: true,
    },
    {
      type: 3,
      name: 'guild-id',
      description: 'Guild in which to schedule spider',
      required: true,
    }
  ],
  type: 1,
}

const GUILD_COMMANDS = [
  ADMIN_LIST_COMMAND,
  ADMIN_REMOVE_COMMAND,
  ADMIN_SCHEDULE_COMMAND,
];

InstallGuildCommands(
  process.env.APP_ID, 
  process.env.ADMIN_GUILD_ID, 
  GUILD_COMMANDS
);
