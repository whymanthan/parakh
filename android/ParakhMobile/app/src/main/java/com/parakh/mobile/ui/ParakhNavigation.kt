package com.parakh.mobile.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun ParakhNavigationApp(viewModel: ParakhViewModel = viewModel()) {
    var isLoggedIn by remember { mutableStateOf(false) }
    var hasCheckedSession by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.restoreSession { result ->
            isLoggedIn = result
            hasCheckedSession = true
        }
    }

    if (!hasCheckedSession) {
        LoadingScreen()
        return
    }

    if (!isLoggedIn) {
        LoginScreen(
            onLogin = { email, password ->
                viewModel.login(email, password) { success ->
                    if (success) isLoggedIn = true
                }
            }
        )
        return
    }

    Scaffold(
        bottomBar = {
            BottomNavigationBar()
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            Text(
                text = "PARAKH",
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                text = "Native mobile inspection workflow",
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.padding(top = 8.dp)
            )
            Button(
                onClick = { },
                modifier = Modifier.padding(top = 20.dp)
            ) {
                Text("New Inspection")
            }
            Button(
                onClick = { viewModel.logout { isLoggedIn = false } },
                modifier = Modifier.padding(top = 12.dp)
            ) {
                Text("Log out")
            }
        }
    }
}

@Composable
private fun LoginScreen(onLogin: (String, String) -> Unit) {
    var email by remember { mutableStateOf("admin@parakh.local") }
    var password by remember { mutableStateOf("admin123") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        Text(
            text = "Welcome back",
            style = MaterialTheme.typography.headlineMedium
        )
        Text(
            text = "Sign in to continue with inspections and compliance reviews.",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp)
        )

        androidx.compose.material3.OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            modifier = Modifier.padding(bottom = 12.dp)
        )
        androidx.compose.material3.OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            modifier = Modifier.padding(bottom = 16.dp)
        )

        Button(
            onClick = { onLogin(email, password) },
            modifier = Modifier.fillMaxSize().padding(top = 8.dp)
        ) {
            Text("Sign in")
        }
    }
}

@Composable
private fun LoadingScreen() {
    Column(
        modifier = Modifier.fillMaxSize(),
    ) {
        Text(text = "Loading…")
    }
}

@Composable
private fun BottomNavigationBar() {
    androidx.compose.foundation.layout.Row(
        modifier = Modifier.fillMaxSize()
    ) {
        Button(
            onClick = { },
            modifier = Modifier.weight(1f)
        ) {
            Icon(Icons.Default.Home, contentDescription = null)
            Text("Overview")
        }
        Button(
            onClick = { },
            modifier = Modifier.weight(1f)
        ) {
            Icon(Icons.Default.Add, contentDescription = null)
            Text("Scan")
        }
        Button(
            onClick = { },
            modifier = Modifier.weight(1f)
        ) {
            Icon(Icons.Default.Search, contentDescription = null)
            Text("Rules")
        }
    }
}
