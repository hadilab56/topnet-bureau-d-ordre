using System;
using System.IO;
using System.Text.Json;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace TopnetRegistry
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            InitializeWebView();
        }

        private async void InitializeWebView()
        {
            try
            {
                string userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "TopnetBO",
                    "webview-cache"
                );

                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                await webView.EnsureCoreWebView2Async(env);

                string buildFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "dist");
                
                webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "topnetbo.local",
                    buildFolder,
                    CoreWebView2HostResourceAccessKind.Allow
                );

                webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;

#if DEBUG
                if (Directory.Exists(buildFolder))
                {
                    webView.CoreWebView2.Navigate("https://topnetbo.local/index.html");
                }
                else
                {
                    webView.CoreWebView2.Navigate("http://localhost:5173");
                }
#else
                webView.CoreWebView2.Navigate("https://topnetbo.local/index.html");
#endif
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur d'initialisation de l'interface: {ex.Message}", "Erreur critique", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string jsonString = e.WebMessageAsJson;
                var msg = JsonSerializer.Deserialize<JsonElement>(jsonString);

                if (msg.TryGetProperty("id", out JsonElement idProp) &&
                    msg.TryGetProperty("action", out JsonElement actionProp))
                {
                    int id = idProp.GetInt32();
                    string action = actionProp.GetString() ?? "";

                    if (action == "store-read")
                    {
                        string storeJson = DatabaseManager.ReadStore();
                        SendResponse(id, storeJson, null);
                    }
                    else if (action == "store-write")
                    {
                        if (msg.TryGetProperty("data", out JsonElement dataProp))
                        {
                            string dataJson = dataProp.GetRawText();
                            bool success = DatabaseManager.WriteStore(dataJson);
                            SendResponse(id, success ? "true" : "false", null);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error processing web message: {ex.Message}");
            }
        }

        private void SendResponse(int id, string dataJson, string? error)
        {
            string errorJson = error != null ? $"\"{JsonEncodedText.Encode(error)}\"" : "null";
            string responseJson = $"{{\"id\": {id}, \"data\": {dataJson}, \"error\": {errorJson}}}";
            webView.CoreWebView2.PostWebMessageAsJson(responseJson);
        }
    }
}
