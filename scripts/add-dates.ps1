$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$posts = Get-ChildItem -Recurse src\content\posts -Filter *.md

function Get-DateOnly([string]$value) {
  return (Get-Date $value).ToString('yyyy-MM-dd')
}

function Get-FileDate([System.IO.FileInfo]$file) {
  if ($file.Name -match '^(\d{4})[-_.]?(\d{1,2})[-_.]?(\d{1,2})') {
    return '{0:D4}-{1:D2}-{2:D2}' -f [int]$matches[1], [int]$matches[2], [int]$matches[3]
  }

  $gitDate = git log --diff-filter=A --follow --format=%aI -1 -- "./$($file.FullName)" 2>$null
  if ($gitDate) {
    return Get-DateOnly $gitDate.Trim()
  }

  return (Get-Date).ToString('yyyy-MM-dd')
}

function Write-Utf8NoBom([string]$path, [string]$content) {
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

function Normalize-Frontmatter([string]$text) {
  $fmRegex = '^(\s*---\s*\r?\n)([\s\S]*?)(\r?\n---)'
  if ($text -notmatch $fmRegex) {
    return $text
  }

  $frontmatter = $matches[2]
  $lines = New-Object System.Collections.Generic.List[string]
  $knownKeys = @('layout', 'title', 'category', 'tags', 'keywords', 'description', 'thumbnail', 'cover', 'excerpt', 'sticky', 'date', 'expires')

  foreach ($line in ($frontmatter -split "`r?`n")) {
    $pending = $line.TrimEnd()
    if ([string]::IsNullOrWhiteSpace($pending)) {
      continue
    }

    while ($true) {
      $splitIndex = -1
      foreach ($key in $knownKeys) {
        $needle = "${key}:"
        $idx = $pending.IndexOf($needle, 1)
        if ($idx -gt 0 -and ($splitIndex -lt 0 -or $idx -lt $splitIndex)) {
          $splitIndex = $idx
        }
      }

      if ($splitIndex -lt 0) {
        break
      }

      $lines.Add($pending.Substring(0, $splitIndex).TrimEnd())
      $pending = $pending.Substring($splitIndex).TrimStart()
    }

    if ($pending -match '^(thumbnail|cover):\s*(.+?)\s*#.*$') {
      $pending = "$($matches[1]): $($matches[2].Trim())"
    }

    if ($pending -notmatch '^\s*expires\s*:') {
      $lines.Add($pending)
    }
  }

  $normalized = $lines -join "`n"
  return [regex]::Replace($text, $fmRegex, "---`n$normalized`n---")
}

foreach ($f in $posts) {
  $path = $f.FullName
  $text = [System.IO.File]::ReadAllText($path, $utf8NoBom)
  $normalizedText = Normalize-Frontmatter $text
  if ($normalizedText -ne $text) {
    $text = $normalizedText
    Write-Utf8NoBom $path $text
  }
  $fmRegex = '^(\s*---\s*\r?\n)([\s\S]*?)(\r?\n---)'
  if ($text -match $fmRegex) {
    $fm = $matches[2]
    if ($fm -notmatch '(^|\n)\s*date\s*:') {
      $d = Get-FileDate $f
      $newfm = $fm + "`n" + "date: $d"
      $text = [regex]::Replace($text, $fmRegex, "---`n$newfm`n---")
      Write-Utf8NoBom $path $text
      Write-Output "Updated date for $path -> $d"
    }
    else {
      $existing = [regex]::Match($fm, '(^|\n)\s*date\s*:\s*([^\r\n]+)')
      if ($existing.Success) {
        $currentDate = $existing.Groups[2].Value.Trim()
        $normalizedDate = if ($currentDate -match '^\d{4}-\d{2}-\d{2}$') { $currentDate } else { Get-DateOnly $currentDate }
        if ($normalizedDate -ne $currentDate) {
          $newFm = [regex]::Replace($fm, '(^|\n)\s*date\s*:\s*([^\r\n]+)', "`$1date: $normalizedDate")
          $text = [regex]::Replace($text, $fmRegex, "---`n$newFm`n---")
          Write-Utf8NoBom $path $text
          Write-Output "Normalized date for $path -> $normalizedDate"
        }
        else {
          Write-Output "Has date: $path"
        }
      }
    }
  }
  else {
    $d = Get-FileDate $f
    $new = "---`ndate: $d`n---`n" + $text
    Write-Utf8NoBom $path $new
    Write-Output "Added frontmatter date for $path -> $d"
  }
}
