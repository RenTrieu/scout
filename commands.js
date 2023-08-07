import 'dotenv/config';
import { 
  capitalize, 
  InstallGlobalCommands, 
  unixCommandSync
} from './utils.js';

// Get the game choices from game.js
// function createCommandChoices() {
//   const choices = getRPSChoices();
//   const commandChoices = [];
//
//   for (let choice of choices) {
//     commandChoices.push({
//       name: capitalize(choice),
//       value: choice.toLowerCase(),
//     });
//   }
//
//   return commandChoices;
// }

// Get available spiders
async function getAvailableSpiders() {
  const spiderQuery = unixCommandSync('ls spiders/');
  const activeSpiders = spiderQuery.toString('utf8')
                                    .trim()
                                    .split('\n');
  const spiderChoices = activeSpiders.map((spider) => {
    return { name: spider.slice(0, -4), value: spider }
  });
  return spiderChoices;
}

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

// // Command containing options
// const CHALLENGE_COMMAND = {
//   name: 'challenge',
//   description: 'Challenge to a match of rock paper scissors',
//   options: [
//     {
//       type: 3,
//       name: 'object',
//       description: 'Pick your object',
//       required: true,
//       choices: createCommandChoices(),
//     },
//   ],
//   type: 1,
// };

const ALL_COMMANDS = [
  TEST_COMMAND, 
  CALL_COMMAND, 
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
