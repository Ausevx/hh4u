package com.healinghands4u.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.NavType
import com.healinghands4u.presentation.auth.LoginScreen
import com.healinghands4u.presentation.assistant.WellnessAssistantScreen
import com.healinghands4u.presentation.chatbot.answer.ChatbotAnswerScreen
import com.healinghands4u.presentation.chatbot.consultation.ConsultationScreen
import com.healinghands4u.presentation.clinic.ClinicPlaceholderScreen
import com.healinghands4u.presentation.diseaselist.DiseaseListScreen
import com.healinghands4u.presentation.home.HomeScreen
import com.healinghands4u.presentation.planner.PlannerScreen

@Composable
fun AppNavHost(
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
    startDestination: String = Screen.ChatbotQuery.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.ChatbotQuery.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onGuestClick = {
                    navController.navigate(Screen.ChatbotQuery.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Home.route) {
            HomeScreen(
                onConsultationClick = {
                    navController.navigate(Screen.ChatbotQuery.route)
                },
                onPlannerClick = {
                    navController.navigate(Screen.Planner.route)
                },
                onDiseaseListClick = {
                    navController.navigate(Screen.DiseaseList.route)
                }
            )
        }

        composable(Screen.Planner.route) {
            PlannerScreen(
                onBackClick = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.DiseaseList.route) {
            DiseaseListScreen(
                onBackClick = {
                    navController.popBackStack()
                },
                onDiseaseClick = { query ->
                    val encoded = java.net.URLEncoder.encode(query, "UTF-8")
                    navController.navigate("${Screen.ChatbotQuery.route}?initialQuery=$encoded")
                }
            )
        }

        composable(
            route = "${Screen.ChatbotQuery.route}?initialQuery={initialQuery}",
            arguments = listOf(navArgument("initialQuery") {
                defaultValue = ""
                type = NavType.StringType
            })
        ) { backStackEntry ->
            val initialQuery = backStackEntry.arguments?.getString("initialQuery") ?: ""
            WellnessAssistantScreen(
                initialQuery = initialQuery,
                onNavigateToClinic = {
                    navController.navigate(Screen.ClinicPlaceholder.route)
                },
                onNavigateToHistory = {
                    // Placeholder for now
                },
                onNavigateToProfile = {
                    navController.navigate(Screen.Login.route)
                },
                onSendQuery = { query, isConsultation ->
                    val encoded = java.net.URLEncoder.encode(query, "UTF-8")
                    if (isConsultation) {
                        navController.navigate(Screen.Consultation.route)
                    } else {
                        navController.navigate("${Screen.ChatbotAnswer.route}?query=$encoded")
                    }
                }
            )
        }
        
        composable(Screen.ClinicPlaceholder.route) {
            ClinicPlaceholderScreen()
        }

        composable(Screen.Consultation.route) {
            ConsultationScreen(
                questionText = "Are you experiencing a burning sensation?",
                onBackClick = {
                    navController.popBackStack()
                },
                onAnswerSelected = { _ ->
                    navController.navigate("${Screen.ChatbotAnswer.route}?query=burning%20sensation") {
                        popUpTo(Screen.ChatbotQuery.route) { inclusive = false }
                    }
                }
            )
        }

        composable(
            route = "${Screen.ChatbotAnswer.route}?query={query}",
            arguments = listOf(navArgument("query") {
                defaultValue = ""
                type = NavType.StringType
            })
        ) { backStackEntry ->
            val query = backStackEntry.arguments?.getString("query") ?: ""
            val decodedQuery = try {
                java.net.URLDecoder.decode(query, "UTF-8")
            } catch (e: Exception) {
                query
            }
            ChatbotAnswerScreen(
                query = decodedQuery,
                onBackClick = {
                    navController.popBackStack()
                }
            )
        }
    }
}
