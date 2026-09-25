package com.healinghands4u.presentation.diseaselist

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.healinghands4u.data.local.DiseaseEntity
import com.healinghands4u.presentation.common.DoctorContactFooter
import com.healinghands4u.presentation.common.TestTags
import com.healinghands4u.presentation.components.BrandRow
import com.healinghands4u.presentation.components.TagChip
import com.healinghands4u.presentation.theme.AppIcons
import com.healinghands4u.presentation.theme.SoraFontFamily
import com.healinghands4u.presentation.theme.trustedTealColors

import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.platform.LocalContext
import com.healinghands4u.presentation.common.isHiltAvailable

private object DefaultDiseaseDao : com.healinghands4u.data.local.DiseaseDao {
    override suspend fun getAllDiseases(): List<DiseaseEntity> =
        com.healinghands4u.data.mock.MockHomeopathyData.diseases.map {
            DiseaseEntity(
                id = it.id,
                name = it.name,
                category = it.category,
                primaryRemedies = it.primaryRemedies,
                symptoms = it.symptoms,
                dosageGuideline = it.dosageGuideline,
                videoUrl = it.videoUrl
            )
        }
    override suspend fun insertAll(diseases: List<DiseaseEntity>) {}
    override suspend fun clearAll() {}
    override suspend fun searchByKeyword(keyword: String): List<DiseaseEntity> = emptyList()
}

private object DefaultSyncService : com.healinghands4u.data.remote.SyncService {
    override suspend fun getDiseases(): List<DiseaseEntity> = emptyList()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiseaseListScreen(
    modifier: Modifier = Modifier,
    onBackClick: () -> Unit = {},
    onDiseaseClick: (String) -> Unit = {},
    viewModel: DiseaseListViewModel? = null
) {
    val context = LocalContext.current
    val hasHilt = remember(context) { isHiltAvailable(context) }
    val actualViewModel: DiseaseListViewModel = viewModel ?: if (hasHilt) {
        hiltViewModel<DiseaseListViewModel>()
    } else {
        val defaultRepo = remember { com.healinghands4u.data.repository.KnowledgeRepository(DefaultDiseaseDao, DefaultSyncService) }
        remember { DiseaseListViewModel(defaultRepo) }
    }

    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("All") }

    val diseases by actualViewModel.diseases.collectAsState()
    val categories = actualViewModel.categories

    val filteredDiseases = remember(searchQuery, selectedCategory, diseases) {
        diseases.filter { item ->
            val matchesCategory = (selectedCategory == "All" || item.category.equals(selectedCategory, ignoreCase = true))
            val matchesQuery = searchQuery.isBlank() ||
                    item.name.contains(searchQuery, ignoreCase = true) ||
                    item.primaryRemedies.contains(searchQuery, ignoreCase = true) ||
                    item.symptoms.contains(searchQuery, ignoreCase = true)
            matchesCategory && matchesQuery
        }
    }

    val verticalScroll = rememberScrollState()
    val chipsScroll = rememberScrollState()
    val tokens = MaterialTheme.trustedTealColors

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = tokens.bg,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Disease Directory & Guide",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontFamily = SoraFontFamily,
                            fontWeight = FontWeight.Bold
                        ),
                        color = tokens.ink,
                        modifier = Modifier.testTag(TestTags.DISEASE_LIST_TITLE)
                    )
                },
                navigationIcon = {
                    IconButton(
                        onClick = onBackClick,
                        modifier = Modifier.testTag(TestTags.DISEASE_LIST_BACK_BUTTON)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = tokens.ink
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = tokens.surface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(verticalScroll)
                .padding(16.dp),
            verticalArrangement = Arrangement.Top
        ) {
            // Brand Wordmark & Mission Header
            BrandRow(
                title = "Natural Remedy Directory",
                subtitle = "Cure Your Disease Forever without side effects for Allopathy medicines"
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(TestTags.DISEASE_SEARCH_INPUT),
                placeholder = { Text("Search by condition, remedy, or symptom...", color = tokens.inkDim) },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = tokens.accent
                    )
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(
                                imageVector = Icons.Default.Clear,
                                contentDescription = "Clear search",
                                tint = tokens.inkDim
                            )
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = tokens.accent,
                    unfocusedBorderColor = tokens.line,
                    focusedTextColor = tokens.ink,
                    unfocusedTextColor = tokens.ink
                )
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Category Filter Chips with TagChip and alternating tint styles
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(TestTags.DISEASE_CATEGORY_CHIPS)
                    .horizontalScroll(chipsScroll),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                categories.forEachIndexed { index, category ->
                    val isSelected = selectedCategory.equals(category, ignoreCase = true)
                    val isAccentTint = isSelected || (index % 2 == 1)
                    TagChip(
                        text = category,
                        isAccentTint = isAccentTint,
                        selected = isSelected,
                        onClick = { selectedCategory = category }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Disease Remedy Cards List
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(TestTags.DISEASE_LIST_ITEMS),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                if (filteredDiseases.isEmpty()) {
                    Text(
                        text = "No matching conditions found. Consult our AI Doctor or Dr. Anjali Jariwala directly.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = tokens.inkDim,
                        modifier = Modifier.padding(vertical = 16.dp)
                    )
                } else {
                    filteredDiseases.forEach { disease ->
                        DiseaseCard(
                            disease = disease,
                            onClick = { onDiseaseClick("I want to know about ${disease.name}") }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Embedded Doctor Contact Footer
            DoctorContactFooter()

            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}

@Composable
private fun DiseaseCard(disease: DiseaseEntity, onClick: () -> Unit) {
    val tokens = MaterialTheme.trustedTealColors

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, tokens.line),
        colors = CardDefaults.cardColors(
            containerColor = tokens.surface
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = tokens.surfaceTint,
                    modifier = Modifier.size(38.dp)
                ) {
                    Icon(
                        imageVector = AppIcons.Leaf,
                        contentDescription = null,
                        tint = tokens.accent,
                        modifier = Modifier
                            .padding(9.dp)
                            .size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = disease.name,
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontFamily = SoraFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        ),
                        color = tokens.ink
                    )
                    // Explicitly prefixed to avoid ambiguity with category filter chips in semantics tree
                    Text(
                        text = "Category: ${disease.category}",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Medium),
                        color = tokens.accent
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = "Key Remedies:",
                style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                color = tokens.ink
            )
            Text(
                text = disease.primaryRemedies,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                color = tokens.accent
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "Key Symptoms: ${disease.symptoms}",
                style = MaterialTheme.typography.bodySmall,
                color = tokens.inkDim
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = "Guideline: ${disease.dosageGuideline}",
                style = MaterialTheme.typography.bodySmall.copy(fontStyle = androidx.compose.ui.text.font.FontStyle.Italic),
                color = tokens.inkDim.copy(alpha = 0.8f)
            )
        }
    }
}
