using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Collections.Generic;
using MySqlConnector;

namespace TopnetRegistry
{
    public static class DatabaseManager
    {
        private static readonly string AppDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "TopnetBO"
        );
        private static readonly string ConfigFilePath = Path.Combine(AppDataFolder, "connection.txt");
        private static string _connectionString = "";

        static DatabaseManager()
        {
            if (!Directory.Exists(AppDataFolder))
            {
                Directory.CreateDirectory(AppDataFolder);
            }

            LoadConnectionString();
            InitializeDatabase();
            AutoMigrate();
        }

        private static void LoadConnectionString()
        {
            if (!File.Exists(ConfigFilePath))
            {
                // Default connection string to local MariaDB server (root user, no password)
                _connectionString = "Server=localhost;Database=topnet_registry;User Id=root;Password=;";
                File.WriteAllText(ConfigFilePath, _connectionString);
            }
            else
            {
                _connectionString = File.ReadAllText(ConfigFilePath).Trim();
            }
        }

        private static void InitializeDatabase()
        {
            try
            {
                // 1. First, connect to the server without database to create it if it doesn't exist
                var builder = new MySqlConnectionStringBuilder(_connectionString);
                string targetDb = builder.Database;
                builder.Database = ""; // Connect to server root

                using (var conn = new MySqlConnection(builder.ConnectionString))
                {
                    conn.Open();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = $"CREATE DATABASE IF NOT EXISTS `{targetDb}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;";
                        cmd.ExecuteNonQuery();
                    }
                }

                // 2. Reconnect specifying the target database to build schemas
                using (var conn = new MySqlConnection(_connectionString))
                {
                    conn.Open();

                    using (var transaction = conn.BeginTransaction())
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.Transaction = transaction;

                            // Users Table
                            cmd.CommandText = @"
                                CREATE TABLE IF NOT EXISTS users (
                                    username VARCHAR(50) PRIMARY KEY,
                                    full_name VARCHAR(100) NOT NULL,
                                    password VARCHAR(100) NOT NULL,
                                    role VARCHAR(20) NOT NULL DEFAULT 'READER'
                                );";
                            cmd.ExecuteNonQuery();

                            // Courriers Table
                            cmd.CommandText = @"
                                CREATE TABLE IF NOT EXISTS courriers (
                                    id VARCHAR(50) PRIMARY KEY,
                                    reference VARCHAR(100),
                                    type VARCHAR(20) NOT NULL,
                                    date DATETIME NOT NULL,
                                    sender VARCHAR(100),
                                    sender_contact VARCHAR(100),
                                    sender_address VARCHAR(255),
                                    recipient_dept VARCHAR(100) NOT NULL,
                                    recipient_name VARCHAR(100),
                                    subject VARCHAR(255),
                                    category VARCHAR(100) NOT NULL,
                                    status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
                                    file_name VARCHAR(255),
                                    file_size VARCHAR(50),
                                    file_data LONGTEXT,
                                    depart_reference VARCHAR(100),
                                    depart_file_name VARCHAR(255),
                                    depart_file_data LONGTEXT,
                                    created_by VARCHAR(100),
                                    created_by_username VARCHAR(100)
                                );";
                            cmd.ExecuteNonQuery();

                            // Comments Table
                            cmd.CommandText = @"
                                CREATE TABLE IF NOT EXISTS comments (
                                    id VARCHAR(50) PRIMARY KEY,
                                    courrier_id VARCHAR(50) NOT NULL,
                                    user VARCHAR(100) NOT NULL,
                                    date DATETIME NOT NULL,
                                    text TEXT NOT NULL,
                                    FOREIGN KEY (courrier_id) REFERENCES courriers(id) ON DELETE CASCADE
                                );";
                            cmd.ExecuteNonQuery();

                            // History Table
                            cmd.CommandText = @"
                                CREATE TABLE IF NOT EXISTS history (
                                    id INT AUTO_INCREMENT PRIMARY KEY,
                                    courrier_id VARCHAR(50) NOT NULL,
                                    date DATETIME NOT NULL,
                                    action VARCHAR(255) NOT NULL,
                                    user VARCHAR(100) NOT NULL,
                                    FOREIGN KEY (courrier_id) REFERENCES courriers(id) ON DELETE CASCADE
                                );";
                            cmd.ExecuteNonQuery();

                            // Configuration Table
                            cmd.CommandText = @"
                                CREATE TABLE IF NOT EXISTS config (
                                    `key` VARCHAR(50) PRIMARY KEY,
                                    `value` VARCHAR(255) NOT NULL
                                );";
                            cmd.ExecuteNonQuery();
                        }
                        transaction.Commit();
                    }

                    // 3. Seed default users if empty
                    long userCount = 0;
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT COUNT(*) FROM users;";
                        userCount = Convert.ToInt64(cmd.ExecuteScalar());
                    }

                    if (userCount == 0)
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = @"
                                INSERT INTO users (username, full_name, password, role) VALUES 
                                ('admin', 'Administrateur BO', 'admin', 'ADMIN'),
                                ('agent', 'Agent Bureau d''Ordre', 'agent', 'AGENT');";
                            cmd.ExecuteNonQuery();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Database initialization failed: {ex.Message}");
            }
        }

        public static string ReadStore()
        {
            try
            {
                var usersArray = new JsonArray();
                var docsArray = new JsonArray();
                string theme = "light";

                using (var conn = new MySqlConnection(_connectionString))
                {
                    conn.Open();

                    // Read Config / Theme
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT `value` FROM config WHERE `key` = 'theme';";
                        var val = cmd.ExecuteScalar();
                        if (val != null) theme = val.ToString() ?? "light";
                    }

                    // Read Users
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT username, full_name, password, role FROM users;";
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                var userObj = new JsonObject
                                {
                                    ["_id"] = reader.GetString(0), // Mirror MongoDB ID representation
                                    ["username"] = reader.GetString(0),
                                    ["fullName"] = reader.GetString(1),
                                    ["password"] = reader.GetString(2),
                                    ["role"] = reader.GetString(3)
                                };
                                usersArray.Add(userObj);
                            }
                        }
                    }

                    // Read Comments indexed by courrier ID
                    var commentsMap = new Dictionary<string, JsonArray>();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT id, courrier_id, user, date, text FROM comments;";
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                string courrierId = reader.GetString(1);
                                if (!commentsMap.ContainsKey(courrierId))
                                {
                                    commentsMap[courrierId] = new JsonArray();
                                }

                                var commentObj = new JsonObject
                                {
                                    ["id"] = reader.GetString(0),
                                    ["user"] = reader.GetString(2),
                                    ["date"] = reader.GetDateTime(3).ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                                    ["text"] = reader.GetString(4)
                                };
                                commentsMap[courrierId].Add(commentObj);
                            }
                        }
                    }

                    // Read History indexed by courrier ID
                    var historyMap = new Dictionary<string, JsonArray>();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT courrier_id, date, action, user FROM history;";
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                string courrierId = reader.GetString(0);
                                if (!historyMap.ContainsKey(courrierId))
                                {
                                    historyMap[courrierId] = new JsonArray();
                                }

                                var historyObj = new JsonObject
                                {
                                    ["date"] = reader.GetDateTime(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                                    ["action"] = reader.GetString(2),
                                    ["user"] = reader.GetString(3)
                                };
                                historyMap[courrierId].Add(historyObj);
                            }
                        }
                    }

                    // Read Courriers
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT * FROM courriers ORDER BY date DESC;";
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                string id = reader.GetString(0);
                                var docObj = new JsonObject
                                {
                                    ["_id"] = id,
                                    ["id"] = id,
                                    ["reference"] = reader.IsDBNull(1) ? null : reader.GetString(1),
                                    ["type"] = reader.GetString(2),
                                    ["date"] = reader.GetDateTime(3).ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                                    ["sender"] = reader.IsDBNull(4) ? null : reader.GetString(4),
                                    ["senderContact"] = reader.IsDBNull(5) ? null : reader.GetString(5),
                                    ["senderAddress"] = reader.IsDBNull(6) ? null : reader.GetString(6),
                                    ["recipientDept"] = reader.GetString(7),
                                    ["recipientName"] = reader.IsDBNull(8) ? null : reader.GetString(8),
                                    ["subject"] = reader.IsDBNull(9) ? null : reader.GetString(9),
                                    ["category"] = reader.GetString(10),
                                    ["status"] = reader.GetString(11),
                                    ["fileName"] = reader.IsDBNull(12) ? null : reader.GetString(12),
                                    ["fileSize"] = reader.IsDBNull(13) ? null : reader.GetString(13),
                                    ["fileData"] = reader.IsDBNull(14) ? null : reader.GetString(14),
                                    ["departReference"] = reader.IsDBNull(15) ? null : reader.GetString(15),
                                    ["departFileName"] = reader.IsDBNull(16) ? null : reader.GetString(16),
                                    ["departFileData"] = reader.IsDBNull(17) ? null : reader.GetString(17),
                                    ["createdBy"] = reader.IsDBNull(18) ? null : reader.GetString(18),
                                    ["createdByUsername"] = reader.IsDBNull(19) ? null : reader.GetString(19),
                                    ["comments"] = commentsMap.ContainsKey(id) ? commentsMap[id] : new JsonArray(),
                                    ["history"] = historyMap.ContainsKey(id) ? historyMap[id] : new JsonArray()
                                };
                                docsArray.Add(docObj);
                            }
                        }
                    }
                }

                var root = new JsonObject
                {
                    ["documents"] = docsArray,
                    ["users"] = usersArray,
                    ["theme"] = theme
                };

                return root.ToJsonString();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"ReadStore failed: {ex.Message}");
                // Return seed fallback structure
                return "{\"documents\":[], \"users\":[], \"theme\":\"light\"}";
            }
        }

        public static bool WriteStore(string jsonContent)
        {
            try
            {
                var root = JsonSerializer.Deserialize<JsonElement>(jsonContent);

                using (var conn = new MySqlConnection(_connectionString))
                {
                    conn.Open();

                    using (var transaction = conn.BeginTransaction())
                    {
                        try
                        {
                            // Clear tables inside Transaction to avoid constraint violations
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.Transaction = transaction;
                                cmd.CommandText = "DELETE FROM comments; DELETE FROM history; DELETE FROM courriers; DELETE FROM users;";
                                cmd.ExecuteNonQuery();
                            }

                            // 1. Write Users
                            if (root.TryGetProperty("users", out JsonElement usersProp) && usersProp.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var user in usersProp.EnumerateArray())
                                {
                                    using (var cmd = conn.CreateCommand())
                                    {
                                        cmd.Transaction = transaction;
                                        cmd.CommandText = @"
                                            INSERT INTO users (username, full_name, password, role) 
                                            VALUES (@username, @fullName, @password, @role);";
                                        
                                        cmd.Parameters.AddWithValue("@username", user.GetProperty("username").GetString()?.Trim().ToLower());
                                        cmd.Parameters.AddWithValue("@fullName", user.GetProperty("fullName").GetString());
                                        cmd.Parameters.AddWithValue("@password", user.GetProperty("password").GetString());
                                        cmd.Parameters.AddWithValue("@role", user.GetProperty("role").GetString() ?? "READER");
                                        cmd.ExecuteNonQuery();
                                    }
                                }
                            }

                            // 2. Write Courriers, Comments & History
                            if (root.TryGetProperty("documents", out JsonElement docsProp) && docsProp.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var doc in docsProp.EnumerateArray())
                                {
                                    string docId = doc.GetProperty("id").GetString() ?? Guid.NewGuid().ToString();
                                    DateTime docDate = DateTime.Now;
                                    if (doc.TryGetProperty("date", out JsonElement dateProp) && dateProp.ValueKind == JsonValueKind.String)
                                    {
                                        DateTime.TryParse(dateProp.GetString(), out docDate);
                                    }

                                    using (var cmd = conn.CreateCommand())
                                    {
                                        cmd.Transaction = transaction;
                                        cmd.CommandText = @"
                                            INSERT INTO courriers (
                                                id, reference, type, date, sender, sender_contact, sender_address, 
                                                recipient_dept, recipient_name, subject, category, status, 
                                                file_name, file_size, file_data, depart_reference, 
                                                depart_file_name, depart_file_data, created_by, created_by_username
                                            ) VALUES (
                                                @id, @reference, @type, @date, @sender, @senderContact, @senderAddress,
                                                @recipientDept, @recipientName, @subject, @category, @status,
                                                @fileName, @fileSize, @fileData, @departReference,
                                                @departFileName, @departFileData, @createdBy, @createdByUsername
                                            );";

                                        cmd.Parameters.AddWithValue("@id", docId);
                                        cmd.Parameters.AddWithValue("@reference", GetStringOrNull(doc, "reference"));
                                        cmd.Parameters.AddWithValue("@type", doc.GetProperty("type").GetString());
                                        cmd.Parameters.AddWithValue("@date", docDate);
                                        cmd.Parameters.AddWithValue("@sender", GetStringOrNull(doc, "sender"));
                                        cmd.Parameters.AddWithValue("@senderContact", GetStringOrNull(doc, "senderContact"));
                                        cmd.Parameters.AddWithValue("@senderAddress", GetStringOrNull(doc, "senderAddress"));
                                        cmd.Parameters.AddWithValue("@recipientDept", doc.GetProperty("recipientDept").GetString());
                                        cmd.Parameters.AddWithValue("@recipientName", GetStringOrNull(doc, "recipientName"));
                                        cmd.Parameters.AddWithValue("@subject", GetStringOrNull(doc, "subject"));
                                        cmd.Parameters.AddWithValue("@category", doc.GetProperty("category").GetString());
                                        cmd.Parameters.AddWithValue("@status", doc.GetProperty("status").GetString() ?? "RECEIVED");
                                        cmd.Parameters.AddWithValue("@fileName", GetStringOrNull(doc, "fileName"));
                                        cmd.Parameters.AddWithValue("@fileSize", GetStringOrNull(doc, "fileSize"));
                                        cmd.Parameters.AddWithValue("@fileData", GetStringOrNull(doc, "fileData"));
                                        cmd.Parameters.AddWithValue("@departReference", GetStringOrNull(doc, "departReference"));
                                        cmd.Parameters.AddWithValue("@departFileName", GetStringOrNull(doc, "departFileName"));
                                        cmd.Parameters.AddWithValue("@departFileData", GetStringOrNull(doc, "departFileData"));
                                        cmd.Parameters.AddWithValue("@createdBy", GetStringOrNull(doc, "createdBy"));
                                        cmd.Parameters.AddWithValue("@createdByUsername", GetStringOrNull(doc, "createdByUsername"));
                                        
                                        cmd.ExecuteNonQuery();
                                    }

                                    // Insert Comments
                                    if (doc.TryGetProperty("comments", out JsonElement commentsProp) && commentsProp.ValueKind == JsonValueKind.Array)
                                    {
                                        foreach (var comment in commentsProp.EnumerateArray())
                                        {
                                            string commentId = comment.GetProperty("id").GetString() ?? Guid.NewGuid().ToString();
                                            DateTime commentDate = DateTime.Now;
                                            if (comment.TryGetProperty("date", out JsonElement cDateProp) && cDateProp.ValueKind == JsonValueKind.String)
                                            {
                                                DateTime.TryParse(cDateProp.GetString(), out commentDate);
                                            }

                                            using (var cmd = conn.CreateCommand())
                                            {
                                                cmd.Transaction = transaction;
                                                cmd.CommandText = @"
                                                    INSERT INTO comments (id, courrier_id, user, date, text) 
                                                    VALUES (@id, @courrierId, @user, @date, @text);";

                                                cmd.Parameters.AddWithValue("@id", commentId);
                                                cmd.Parameters.AddWithValue("@courrierId", docId);
                                                cmd.Parameters.AddWithValue("@user", comment.GetProperty("user").GetString());
                                                cmd.Parameters.AddWithValue("@date", commentDate);
                                                cmd.Parameters.AddWithValue("@text", comment.GetProperty("text").GetString());
                                                cmd.ExecuteNonQuery();
                                            }
                                        }
                                    }

                                    // Insert History
                                    if (doc.TryGetProperty("history", out JsonElement historyProp) && historyProp.ValueKind == JsonValueKind.Array)
                                    {
                                        foreach (var hist in historyProp.EnumerateArray())
                                        {
                                            DateTime histDate = DateTime.Now;
                                            if (hist.TryGetProperty("date", out JsonElement hDateProp) && hDateProp.ValueKind == JsonValueKind.String)
                                            {
                                                DateTime.TryParse(hDateProp.GetString(), out histDate);
                                            }

                                            using (var cmd = conn.CreateCommand())
                                            {
                                                cmd.Transaction = transaction;
                                                cmd.CommandText = @"
                                                    INSERT INTO history (courrier_id, date, action, user) 
                                                    VALUES (@courrierId, @date, @action, @user);";

                                                cmd.Parameters.AddWithValue("@courrierId", docId);
                                                cmd.Parameters.AddWithValue("@date", histDate);
                                                cmd.Parameters.AddWithValue("@action", hist.GetProperty("action").GetString());
                                                cmd.Parameters.AddWithValue("@user", hist.GetProperty("user").GetString());
                                                cmd.ExecuteNonQuery();
                                            }
                                        }
                                    }
                                }
                            }

                            // 3. Write Theme Config
                            if (root.TryGetProperty("theme", out JsonElement themeProp) && themeProp.ValueKind == JsonValueKind.String)
                            {
                                using (var cmd = conn.CreateCommand())
                                {
                                    cmd.Transaction = transaction;
                                    cmd.CommandText = "INSERT INTO config (`key`, `value`) VALUES ('theme', @theme) ON DUPLICATE KEY UPDATE `value` = @theme;";
                                    cmd.Parameters.AddWithValue("@theme", themeProp.GetString() ?? "light");
                                    cmd.ExecuteNonQuery();
                                }
                            }

                            transaction.Commit();
                            return true;
                        }
                        catch (Exception ex)
                        {
                            transaction.Rollback();
                            System.Diagnostics.Debug.WriteLine($"Transaction failed, rolled back: {ex.Message}");
                            throw;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"WriteStore failed: {ex.Message}");
                return false;
            }
        }

        private static string? GetStringOrNull(JsonElement element, string propName)
        {
            if (element.TryGetProperty(propName, out JsonElement sub) && sub.ValueKind == JsonValueKind.String)
            {
                return sub.GetString();
            }
            return null;
        }

        private static void AutoMigrate()
        {
            try
            {
                string dbJsonPath = Path.Combine(AppDataFolder, "db.json");
                if (File.Exists(dbJsonPath))
                {
                    long courrierCount = 0;
                    using (var conn = new MySqlConnection(_connectionString))
                    {
                        conn.Open();
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = "SELECT COUNT(*) FROM courriers;";
                            courrierCount = Convert.ToInt64(cmd.ExecuteScalar());
                        }
                    }

                    if (courrierCount == 0)
                    {
                        string jsonContent = File.ReadAllText(dbJsonPath);
                        bool success = WriteStore(jsonContent);
                        if (success)
                        {
                            string migratedPath = Path.Combine(AppDataFolder, "db.json.migrated");
                            if (File.Exists(migratedPath)) File.Delete(migratedPath);
                            File.Move(dbJsonPath, migratedPath);
                            System.Diagnostics.Debug.WriteLine("Database auto-migrated from db.json successfully!");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Auto-migration check failed: {ex.Message}");
            }
        }
    }
}
