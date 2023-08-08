import 'dotenv/config';
import { 
  InstallGlobalCommands, 
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

const ALL_COMMANDS = [
  TEST_COMMAND, 
  CALL_COMMAND, 
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
