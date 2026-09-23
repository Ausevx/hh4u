const fs = require('fs');
const file = 'app/src/main/java/com/healinghands4u/presentation/chatbot/answer/ChatbotAnswerScreen.kt';
let code = fs.readFileSync(file, 'utf8');

const additionalImports = `
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Row
`;

code = code.replace('import androidx.compose.ui.unit.dp', 'import androidx.compose.ui.unit.dp' + additionalImports);

const originalScaffold = `Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = tokens.bg,
        topBar = {
            ChatHeader(
                title = "Your Healing Plan",
                subtitle = "Dr. Anjali Jariwala (DHMS)",
                onBackClick = onBackClick
            )
        }
    ) { paddingValues ->`;

const newScaffold = `Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = tokens.bg,
        topBar = {
            ChatHeader(
                title = "Your Healing Plan",
                subtitle = "Dr. Anjali Jariwala (DHMS)",
                onBackClick = onBackClick
            )
        },
        bottomBar = {
            var inputText by remember { mutableStateOf("") }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = inputText,
                    onValueChange = { inputText = it },
                    placeholder = { Text("Ask a follow up question...", color = tokens.inkDim) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
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

code = code.replace(originalScaffold, newScaffold);

fs.writeFileSync(file, code);
