package com.parakh.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.parakh.mobile.data.Inspection

@Composable
fun ParakhApp(viewModel: ParakhViewModel = viewModel()) {
    var isLoggedIn by remember { mutableStateOf(false) }
    var hasCheckedSession by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.restoreSession { success ->
            isLoggedIn = success
            hasCheckedSession = true
            if (success) viewModel.loadInspections()
        }
    }

    if (!hasCheckedSession) {
        LoadingState()
        return
    }

    if (!isLoggedIn) {
        LoginScreen(
            isLoading = viewModel.isLoading.value,
            errorMessage = viewModel.errorMessage.value,
            onLogin = { email, password ->
                viewModel.login(email, password) { success ->
                    if (success) {
                        isLoggedIn = true
                        viewModel.loadInspections()
                    }
                }
            }
        )
        return
    }

    DashboardScreen(
        userName = viewModel.currentUser.value?.name ?: "Inspector",
        inspections = viewModel.inspections.value,
        isLoading = viewModel.isLoading.value,
        errorMessage = viewModel.errorMessage.value,
        onRefresh = { viewModel.loadInspections() },
        onLogout = {
            viewModel.logout {
                isLoggedIn = false
            }
        }
    )
}

@Composable
private fun LoginScreen(
    isLoading: Boolean,
    errorMessage: String?,
    onLogin: (String, String) -> Unit
) {
    var email by remember { mutableStateOf("admin@parakh.local") }
    var password by remember { mutableStateOf("admin123") }

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "PARAKH",
                style = MaterialTheme.typography.headlineLarge
            )
            Text(
                text = "Legal Metrology inspections",
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.padding(top = 8.dp, bottom = 24.dp)
            )

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
            )

            if (!errorMessage.isNullOrBlank()) {
                Text(
                    text = errorMessage,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(top = 12.dp)
                )
            }

            Button(
                onClick = { onLogin(email, password) },
                enabled = !isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(strokeWidth = 2.dp)
                    Text(" Signing in...", modifier = Modifier.padding(start = 8.dp))
                } else {
                    Text("Sign in")
                }
            }
        }
    }
}

@Composable
private fun DashboardScreen(
    userName: String,
    inspections: List<Inspection>,
    isLoading: Boolean,
    errorMessage: String?,
    onRefresh: () -> Unit,
    onLogout: () -> Unit
) {
    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Welcome",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = userName,
                        style = MaterialTheme.typography.headlineSmall
                    )
                }
                Button(onClick = onLogout) {
                    Text("Log out")
                }
            }

            Text(
                text = "Inspection dashboard",
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.padding(top = 20.dp, bottom = 12.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard(
                    label = "Inspections",
                    value = inspections.size.toString(),
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    label = "Average score",
                    value = if (inspections.isEmpty()) "0" else (inspections.map { it.score }.average().toInt()).toString(),
                    modifier = Modifier.weight(1f)
                )
            }

            Button(
                onClick = onRefresh,
                enabled = !isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp, bottom = 8.dp)
            ) {
                Text("Refresh")
            }

            if (!errorMessage.isNullOrBlank()) {
                Text(
                    text = errorMessage,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }

            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.padding(top = 8.dp))
            }

            Text(
                text = "Recent inspections",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(top = 18.dp, bottom = 8.dp)
            )

            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (inspections.isEmpty()) {
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Text(
                                text = "No inspections yet. Create one from the web workflow or refresh after new entries are saved.",
                                modifier = Modifier.padding(16.dp)
                            )
                        }
                    }
                } else {
                    items(inspections) { inspection ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = inspection.product.name.ifBlank { "Unnamed product" },
                                    style = MaterialTheme.typography.titleMedium
                                )
                                Text(
                                    text = "Score: ${inspection.score}",
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                                Text(
                                    text = "Brand: ${inspection.product.brand.ifBlank { "N/A" }}",
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                                Text(
                                    text = "Category: ${inspection.product.category.ifBlank { "N/A" }}",
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = value, style = MaterialTheme.typography.headlineSmall)
            Text(text = label, style = MaterialTheme.typography.labelMedium)
        }
    }
}

@Composable
private fun LoadingState() {
    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            CircularProgressIndicator()
            Text("Loading PARAKH...", modifier = Modifier.padding(top = 16.dp))
        }
    }
}
