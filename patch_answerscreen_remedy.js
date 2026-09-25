const fs = require('fs');
const file = 'app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt';
let code = fs.readFileSync(file, 'utf8');

// Update ChatbotAnswerContent call inside the main screen
code = code.replace(
  `ChatbotAnswerContent(
                    headerMessage = state.answerText,
                    answerText = state.answerText,
                    dosage = state.dosage,`,
  `ChatbotAnswerContent(
                    headerMessage = state.answerText,
                    answerText = state.answerText,
                    remedyName = state.remedyName,
                    dosage = state.dosage,`
);

// Update overloaded function
code = code.replace(
  `fun ChatbotAnswerScreen(
    answerText: String,
    dosage: String? = null,`,
  `fun ChatbotAnswerScreen(
    answerText: String,
    remedyName: String? = null,
    dosage: String? = null,`
);

code = code.replace(
  `ChatbotAnswerContent(
            headerMessage = null,
            answerText = answerText,
            dosage = dosage,`,
  `ChatbotAnswerContent(
            headerMessage = null,
            answerText = answerText,
            remedyName = remedyName,
            dosage = dosage,`
);

// Update ChatbotAnswerContent signature
code = code.replace(
  `fun ChatbotAnswerContent(
    headerMessage: String? = null,
    answerText: String,
    dosage: String?,`,
  `fun ChatbotAnswerContent(
    headerMessage: String? = null,
    answerText: String,
    remedyName: String? = null,
    dosage: String?,`
);

// Finally, update RxCard invocation
code = code.replace(
  `RxCard(
                remedyName = answerText,
                dosage = dosage ?: "As advised by your homeopathic physician",`,
  `RxCard(
                remedyName = remedyName ?: "Personalized Remedy",
                dosage = dosage ?: "As advised by your homeopathic physician",`
);

fs.writeFileSync(file, code);
