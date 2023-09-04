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
      type: 3,
      name: 'spider',
      description: 'Choose the webscraper to schedule',
      required: true,
      choices: getAvailableSpiders(),
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
    }
  ],
  type: 1,
}

// Admin command that removes any scheduled spider
const ADMIN_REMOVE_COMMAND = {
  name: 'admin_remove',
  description: ' Removes any scheduled spider',
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

const GUILD_COMMANDS = [
  ADMIN_LIST_COMMAND,
  ADMIN_REMOVE_COMMAND,
];
InstallGuildCommands(
  process.env.APP_ID, 
  process.env.ADMIN_GUILD_ID, 
  GUILD_COMMANDS
);
