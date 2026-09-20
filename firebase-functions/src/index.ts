import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';

admin.initializeApp();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const diagnoseSymptoms = functions.https.onRequest(async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).send('Unauthorized');
            return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        await admin.auth().verifyIdToken(idToken);

        const symptoms = req.body.symptoms;
        if (!symptoms) {
            res.status(400).send('Symptoms are required');
            return;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `The user has the following symptoms: ${symptoms}. Suggest a homeopathic remedy.`
        });

        res.status(200).json({ recommendation: response.text });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
