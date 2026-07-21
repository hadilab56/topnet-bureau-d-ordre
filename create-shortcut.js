import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cwd = __dirname;
const target = path.join(cwd, 'node_modules', 'electron', 'dist', 'electron.exe');
const args = '.';
const shortcutPath = path.join(process.env.USERPROFILE, 'Desktop', 'Topnet B.O. Central.lnk');

const iconPath = path.join(cwd, 'public', 'app-icon.ico');

// Native powershell command to create a Windows shortcut (.lnk) file
const psScript = `
$WshShell = New-Object -ComObject WScript.Shell;
$Shortcut = $WshShell.CreateShortcut('${shortcutPath.replace(/'/g, "''")}');
$Shortcut.TargetPath = '${target.replace(/'/g, "''")}';
$Shortcut.Arguments = '${args}';
$Shortcut.WorkingDirectory = '${cwd.replace(/'/g, "''")}';
$Shortcut.Description = 'Topnet Bureau d''Ordre';
$Shortcut.IconLocation = '${iconPath.replace(/'/g, "''")}';
$Shortcut.Save();
`;

exec(`powershell -Command "${psScript.replace(/\r?\n/g, ' ')}"`, (err) => {
  if (err) {
    console.error('Échec de la création du raccourci:', err);
  } else {
    console.log('Raccourci créé avec succès sur votre Bureau: "Topnet B.O. Central"');
  }
});
