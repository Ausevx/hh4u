const fs = require('fs');
const http = require('http');

http.get('http://localhost:5000/api/sync/knowledge-base', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const response = JSON.parse(data);
        if (response.success && response.items) {
            const entities = response.items.map(item => ({
                id: item.id,
                questionText: item.questionText,
                answerText: item.answerText,
                reasonText: item.reasonText,
                remedyText: item.remedyText,
                homeRemedyText: item.homeRemedyText,
                dosageInstructions: item.dosageInstructions,
                safetyDisclaimerText: item.safetyDisclaimerText,
                videoUrl: item.videoUrl,
                diagnosticQ1: item.diagnosticQ1,
                diagnosticQ2: item.diagnosticQ2,
                diagnosticQ3: item.diagnosticQ3,
                tags: item.tags ? item.tags.join(',') : null,
                updatedAt: item.updatedAt || Date.now(),
                consultationJson: JSON.stringify({
                    questions: item.diagnosticQuestions || [],
                    branches: item.answerBranches || []
                })
            }));
            fs.writeFileSync('../app/src/main/assets/knowledge_base.json', JSON.stringify(entities, null, 2));
            console.log(`Successfully wrote ${entities.length} items to knowledge_base.json`);
        } else {
            console.error('Failed to fetch or parse items', response);
        }
    });
}).on('error', (err) => {
    console.error('Error fetching:', err.message);
});
