package com.healinghands4u.presentation.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Home : Screen("home")
    object Planner : Screen("planner")
    object DiseaseList : Screen("disease_list")
    object ChatbotQuery : Screen("chatbot_query")
    object Consultation : Screen("consultation")
    object ChatbotAnswer : Screen("chatbot_answer")
}
