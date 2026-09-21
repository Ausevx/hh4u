const fs = require('fs');
const file = 'backend/src/services/chatbotService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '// Convert userId to ObjectId if valid string\n    let parsedUserId: mongoose.Types.ObjectId | undefined = undefined;\n    if (input.userId && mongoose.Types.ObjectId.isValid(input.userId.toString())) {\n      parsedUserId = new mongoose.Types.ObjectId(input.userId.toString());\n    }',
  ''
);

code = code.replace(
  'export async function resolveChatbotQuery(',
  `export async function resolveChatbotQuery(`
);

code = code.replace(
  '  let originalQueryText = \'\';',
  `  let parsedUserId: mongoose.Types.ObjectId | undefined = undefined;
  if (input.userId && mongoose.Types.ObjectId.isValid(input.userId.toString())) {
    parsedUserId = new mongoose.Types.ObjectId(input.userId.toString());
  }
  let originalQueryText = '';`
);

fs.writeFileSync(file, code);
