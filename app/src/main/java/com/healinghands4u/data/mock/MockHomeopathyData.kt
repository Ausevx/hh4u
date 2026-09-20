package com.healinghands4u.data.mock

import androidx.compose.ui.graphics.vector.ImageVector
import com.healinghands4u.presentation.theme.AppIcons

data class DiseaseItem(
    val id: String,
    val name: String,
    val category: String,
    val primaryRemedies: String,
    val symptoms: String,
    val dosageGuideline: String,
    val videoUrl: String? = null
)

data class DiagnosticQuestion(
    val id: String,
    val questionText: String
)

data class ResolvedRemedy(
    val remedyName: String,
    val dosage: String,
    val homeRemedy: String?,
    val safetyDisclaimer: String = "If disease does not cure within 2 days then consult doctor right now",
    val videoUrl: String? = null
)

data class ConsultationData(
    val conditionId: String,
    val conditionName: String,
    val diagnosticQuestions: List<DiagnosticQuestion>,
    val branches: Map<String, ResolvedRemedy>
)

data class PlannerStepItem(
    val stepNumber: Int,
    val timeSlot: String,
    val remedyName: String,
    val dosage: String,
    val instructions: String,
    val isCompleted: Boolean = false
)

data class DailyTipItem(
    val category: String,
    val body: String,
    val detailUrl: String? = null
)

data class QuickReplyItem(
    val label: String,
    val query: String,
    val icon: ImageVector
)

object MockHomeopathyData {

    // 1. Disease Directory Items
    val diseases = listOf(
        DiseaseItem(
            id = "d1",
            name = "Allergic Rhinitis (Hay Fever)",
            category = "Respiratory",
            primaryRemedies = "Allium Cepa 30C, Arsenicum Album 30C, Sabadilla 30C",
            symptoms = "Sneezing, watery eyes, clear runny nose, tickling in throat",
            dosageGuideline = "4 pills 3 times daily during acute attacks",
            videoUrl = "https://example.com/videos/rhinitis"
        ),
        DiseaseItem(
            id = "d2",
            name = "Acid Reflux & GERD",
            category = "Digestive",
            primaryRemedies = "SBL Nixocid, Robinia 30C, Nux Vomica 30C",
            symptoms = "Heartburn, sour belching, epigastric burning after meals",
            dosageGuideline = "4 pills 20 minutes before meals or after heavy food",
            videoUrl = "https://example.com/videos/acid-reflux"
        ),
        DiseaseItem(
            id = "d3",
            name = "Migraine & Tension Headache",
            category = "Stress & Sleep",
            primaryRemedies = "Belladonna 200C, Glonoinum 30C, Spigelia 30C",
            symptoms = "Throbbing one-sided pain, light sensitivity, nausea",
            dosageGuideline = "3 pellets twice daily for acute episodes",
            videoUrl = "https://example.com/videos/migraine-relief"
        ),
        DiseaseItem(
            id = "d4",
            name = "Eczema & Atopic Dermatitis",
            category = "Skin",
            primaryRemedies = "Graphites 30C, Sulphur 30C, Mezereum 30C",
            symptoms = "Dry cracked patches, intense itching worse at night, scaling",
            dosageGuideline = "4 pills once daily in morning on an empty stomach",
            videoUrl = "https://example.com/videos/eczema"
        ),
        DiseaseItem(
            id = "d5",
            name = "Insomnia & Restlessness",
            category = "Stress & Sleep",
            primaryRemedies = "Passiflora Incarnata Q, Coffea Cruda 30C, Kali Phos 6X",
            symptoms = "Racing mind, difficulty falling asleep, midnight awakenings",
            dosageGuideline = "10 drops Passiflora Q in 1/4 cup warm water at bedtime",
            videoUrl = "https://example.com/videos/insomnia"
        ),
        DiseaseItem(
            id = "d6",
            name = "Joint Pain & Osteoarthritis",
            category = "Joints",
            primaryRemedies = "Rhus Tox 30C, Bryonia Alba 30C, Arnica 200C",
            symptoms = "Stiffness on first movement, aching during weather changes",
            dosageGuideline = "4 pills morning and evening with warm water",
            videoUrl = "https://example.com/videos/joint-pain"
        ),
        DiseaseItem(
            id = "d7",
            name = "PCOD & Hormonal Irregularity",
            category = "Women's Health",
            primaryRemedies = "Pulsatilla 30C, Sepia 200C, Thuja Occidentalis 30C",
            symptoms = "Delayed cycles, hormonal breakouts, mood fluctuations",
            dosageGuideline = "4 pills weekly once or as advised by physician",
            videoUrl = "https://example.com/videos/pcod"
        )
    )

    val categories = listOf("All", "Respiratory", "Digestive", "Skin", "Joints", "Stress & Sleep", "Women's Health")

    // 2. Consultation Diagnostic Questions & Branches
    val acidityConsultation = ConsultationData(
        conditionId = "acidity",
        conditionName = "Acidity & GERD",
        diagnosticQuestions = listOf(
            DiagnosticQuestion("q1", "Did you eat outside food recently?"),
            DiagnosticQuestion("q2", "Do you have stress currently?"),
            DiagnosticQuestion("q3", "Is this acidity from long time?")
        ),
        branches = mapOf(
            "yes_yes_yes" to ResolvedRemedy(
                remedyName = "SBL Nixocid & Nux Vomica 200C",
                dosage = "Take 2 pills of Nixocid twice daily and Nux Vomica at bedtime",
                homeRemedy = "Also take Jeera and Dhania soaked water 2 times a day. Avoid spicy/fried food.",
                safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now",
                videoUrl = "https://example.com/videos/acidity-chronic"
            ),
            "yes_no_no" to ResolvedRemedy(
                remedyName = "Robinia 30C & Carbo Veg 30C",
                dosage = "Take 4 pills 20 minutes before meals for 3 days",
                homeRemedy = "Cold milk in small sips and soaked fennel seed water.",
                safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now",
                videoUrl = "https://example.com/videos/acidity-acute"
            ),
            "default" to ResolvedRemedy(
                remedyName = "SBL Nixocid 2 pills a day",
                dosage = "2 pills twice daily after meals",
                homeRemedy = "Also take Jeera and Dhania soaked water 2 times a day",
                safetyDisclaimer = "If disease does not cure within 2 days then consult doctor right now",
                videoUrl = "https://example.com/videos/acidity-guide"
            )
        )
    )

    // 3. Planner Schedule & Lifestyle Data
    val defaultPlannerSteps = listOf(
        PlannerStepItem(
            stepNumber = 1,
            timeSlot = "Morning (Before Breakfast)",
            remedyName = "Arnica Montana 30C",
            dosage = "4 pills, dissolve under tongue",
            instructions = "Take on clean palate, 30 mins before breakfast",
            isCompleted = true
        ),
        PlannerStepItem(
            stepNumber = 2,
            timeSlot = "Afternoon (Post Lunch)",
            remedyName = "Nux Vomica 200C",
            dosage = "4 pills",
            instructions = "Take 30 mins after meal with sips of water",
            isCompleted = false
        ),
        PlannerStepItem(
            stepNumber = 3,
            timeSlot = "Night (Bedtime)",
            remedyName = "Passiflora Incarnata Mother Tincture (Q)",
            dosage = "10 drops in 1/4 cup warm water",
            instructions = "Take right before sleeping for restorative rest",
            isCompleted = false
        )
    )

    // 4. Daily Holistic Tips
    val dailyTip = DailyTipItem(
        category = "Morning Holistic Routine",
        body = "Morning Digestion: Drink warm water with lemon & raw honey to stimulate digestive enzymes and balance gastric pH naturally."
    )

    // 5. Quick Replies for Chatbot
    val quickReplies = listOf(
        QuickReplyItem("Acidity & Heartburn", "I am suffering acidity and heartburn", AppIcons.Pills),
        QuickReplyItem("Throbbing Headache", "I have severe throbbing headache and migraine", AppIcons.Pulse),
        QuickReplyItem("Sneezing & Allergy", "I am having continuous sneezing and allergic cold", AppIcons.Leaf),
        QuickReplyItem("Sleep Restlessness", "I cannot sleep well and feel restless at night", AppIcons.Calendar)
    )
}
