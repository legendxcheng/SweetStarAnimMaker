function Select-NodeLtsRelease {
  param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyCollection()]
    [object[]]$Releases
  )

  foreach ($release in $Releases) {
    $isLts = $false

    if ($null -eq $release.lts) {
      $isLts = $false
    } elseif ($release.lts -is [bool]) {
      $isLts = $release.lts
    } elseif ($release.lts -is [string]) {
      $trimmedValue = $release.lts.Trim()
      $isLts = $trimmedValue.Length -gt 0 -and $trimmedValue -ne "false"
    } else {
      $isLts = [bool]$release.lts
    }

    if (-not $isLts) {
      continue
    }

    if ($release.files -contains "win-x64-msi") {
      return $release
    }
  }

  return $null
}
