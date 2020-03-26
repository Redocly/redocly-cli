import * as readline from 'readline';

export async function promptUser(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${query}:\n`, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export default promptUser;
