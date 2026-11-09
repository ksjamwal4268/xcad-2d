using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

static class XCad2dApp {
    [STAThread]
    static void Main() {
        try {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string htmlPath = Path.Combine(baseDir, "index.html");

            if (!File.Exists(htmlPath)) {
                string subPath = Path.Combine(baseDir, "XCAD_2D_Portable", "index.html");
                if (File.Exists(subPath)) {
                    htmlPath = subPath;
                }
            }

            if (!File.Exists(htmlPath)) {
                string parentPath = Path.Combine(Directory.GetParent(baseDir).FullName, "index.html");
                if (File.Exists(parentPath)) {
                    htmlPath = parentPath;
                }
            }

            if (!File.Exists(htmlPath)) {
                MessageBox.Show(
                    "Could not find index.html for XCAD 2D.\nPlease ensure index.html is located in the application directory.",
                    "XCAD 2D 2026 - Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            string fileUrl = new Uri(htmlPath).AbsoluteUri;

            // 1. Try Microsoft Edge in App Mode (Frameless Native Window)
            string edgeProgX86 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe");
            string edgeProg = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe");

            string browserExe = null;

            if (File.Exists(edgeProgX86)) {
                browserExe = edgeProgX86;
            } else if (File.Exists(edgeProg)) {
                browserExe = edgeProg;
            } else {
                // Check Chrome
                string chromeProg = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe");
                string chromeProgX86 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe");
                if (File.Exists(chromeProg)) {
                    browserExe = chromeProg;
                } else if (File.Exists(chromeProgX86)) {
                    browserExe = chromeProgX86;
                }
            }

            if (!string.IsNullOrEmpty(browserExe)) {
                ProcessStartInfo psi = new ProcessStartInfo {
                    FileName = browserExe,
                    Arguments = string.Format("--app=\"{0}\" --window-size=1600,1000", fileUrl),
                    UseShellExecute = false
                };
                Process.Start(psi);
                return;
            }

            // Fallback: Launch in default system browser
            ProcessStartInfo fallback = new ProcessStartInfo {
                FileName = htmlPath,
                UseShellExecute = true
            };
            Process.Start(fallback);
        } catch (Exception ex) {
            MessageBox.Show("Failed to launch XCAD 2D: " + ex.Message, "XCAD 2D Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
