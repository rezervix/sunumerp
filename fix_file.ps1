param($path)
$content = [System.IO.File]::ReadAllText($path)
[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "File $path converted to UTF-8 (No BOM)"
