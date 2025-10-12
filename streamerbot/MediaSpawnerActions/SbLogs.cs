using System;
using System.IO;
using System.Linq;
using System.Diagnostics;

public class SbLogs // public class CPHInline
{
    public bool Execute()
    {
        string appFolder = AppDomain.CurrentDomain.BaseDirectory;
        string logFolder = Path.Combine(appFolder, "logs");

        DirectoryInfo logFolderInfo = new DirectoryInfo(logFolder);
        FileInfo[] logFolderFiles = logFolderInfo.GetFiles();

        FileInfo latestFile = logFolderFiles.OrderByDescending(file => file.LastWriteTime).FirstOrDefault();

        string filePath = latestFile.FullName;

        string psCommand = $@"
Get-Content ""{filePath}"" -Tail 10 -Wait | ForEach-Object {{
    if ($_ -match '\[.* ERR\]') {{ Write-Host $_ -ForegroundColor Red }}
    elseif ($_ -match '\[.* WRN\]') {{ Write-Host $_ -ForegroundColor Yellow }}
    elseif ($_ -match '\[.* INF\]') {{ Write-Host $_ -ForegroundColor Green }}
    elseif ($_ -match '\[.* DBG\]') {{ Write-Host $_ -ForegroundColor Cyan }}
    elseif ($_ -match '\[.* VRB\]') {{ Write-Host $_ -ForegroundColor Gray }}
    else {{ Write-Host $_ }}
}}
Read-Host -Prompt ""Press Enter to exit""
";

        ProcessStartInfo psi = new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = $"-NoExit -Command \"{psCommand}\"",
            UseShellExecute = false
        };

        Process.Start(psi);

        return true;
    }
}
