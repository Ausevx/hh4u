const fs = require('fs');
const file = 'app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt';
let code = fs.readFileSync(file, 'utf8');

const imports = `import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Row
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
`;

if (!code.includes('import androidx.compose.foundation.background')) {
  code = code.replace('import androidx.compose.runtime.getValue', imports + 'import androidx.compose.runtime.getValue');
}

const bottomBarCode = `
        },
        bottomBar = {
            var inputText by remember { mutableStateOf("") }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                androidx.compose.material3.OutlinedTextField(
                    value = inputText,
                    onValueChange = { inputText = it },
                    placeholder = { Text("Ask a follow up question...", color = tokens.inkDim) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = tokens.accent,
                        unfocusedBorderColor = tokens.line,
                        focusedTextColor = tokens.ink,
                        unfocusedTextColor = tokens.ink
                    ),
                    maxLines = 3
                )
                
                Spacer(modifier = Modifier.width(8.dp))
                
                IconButton(
                    onClick = { 
                        if (inputText.isNotBlank()) {
                            viewModel.querySymptoms(inputText)
                            inputText = ""
                        }
                    },
                    enabled = inputText.isNotBlank(),
                    modifier = Modifier
                        .background(
                            if (inputText.isNotBlank()) tokens.accent else tokens.line,
                            RoundedCornerShape(12.dp)
                        )
                        .size(50.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "Send",
                        tint = if (inputText.isNotBlank()) tokens.accentInk else tokens.inkDim
                    )
                }
            }
        }
    ) { paddingValues ->`;

code = code.replace(`
        }
    ) { paddingValues ->`, bottomBarCode);

fs.writeFileSync(file, code);
