param(
  [string]$WorkbookPath = (Join-Path $PSScriptRoot '..\data\source\Dragino_Price_List_For_Import_20260907.xlsx'),
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\data\dragino-products.json'),
  [string]$AuditPath = (Join-Path $PSScriptRoot '..\data\dragino-products.audit.json')
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-ZipEntryText {
  param(
    [System.IO.Compression.ZipArchive]$Archive,
    [string]$EntryName
  )

  $entry = $Archive.GetEntry($EntryName)
  if (-not $entry) {
    throw "Workbook entry '$EntryName' was not found."
  }

  $reader = [System.IO.StreamReader]::new($entry.Open())
  try {
    return $reader.ReadToEnd()
  }
  finally {
    $reader.Dispose()
  }
}

function Convert-ToRouteSlug {
  param([string]$Value)

  $normalised = $Value.Normalize([Text.NormalizationForm]::FormD)
  $builder = [Text.StringBuilder]::new()

  foreach ($character in $normalised.ToCharArray()) {
    $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($character)
    if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($character)
    }
  }

  $slug = $builder.ToString().Normalize([Text.NormalizationForm]::FormC).ToLowerInvariant()
  $slug = [regex]::Replace($slug, '[^a-z0-9]+', '-')
  $slug = $slug.Trim('-')

  if ([string]::IsNullOrWhiteSpace($slug)) {
    return 'product'
  }

  return $slug
}

function Get-CellColumn {
  param([string]$CellReference)
  return ([regex]::Match($CellReference, '^[A-Z]+')).Value
}

function Convert-ToComparableHeader {
  param([string]$Value)

  return $Value.Replace([char]0xFF08, '(').Replace([char]0xFF09, ')').Replace(' ', '').ToLowerInvariant()
}

function Read-WorksheetRows {
  param(
    [System.IO.Compression.ZipArchive]$Archive,
    [string]$EntryName,
    [string[]]$SharedStrings
  )

  $entry = $Archive.GetEntry($EntryName)
  if (-not $entry) {
    throw "Worksheet entry '$EntryName' was not found."
  }

  $settings = [System.Xml.XmlReaderSettings]::new()
  $settings.IgnoreComments = $true
  $settings.IgnoreWhitespace = $true
  $reader = [System.Xml.XmlReader]::Create($entry.Open(), $settings)

  try {
    while ($reader.Read()) {
      if ($reader.NodeType -ne [System.Xml.XmlNodeType]::Element -or $reader.LocalName -ne 'row') {
        continue
      }

      $rowNumber = [int]$reader.GetAttribute('r')
      $row = @{}
      $rowReader = $reader.ReadSubtree()

      try {
        while ($rowReader.Read()) {
          if ($rowReader.NodeType -ne [System.Xml.XmlNodeType]::Element -or $rowReader.LocalName -ne 'c') {
            continue
          }

          $cellReference = $rowReader.GetAttribute('r')
          $cellType = $rowReader.GetAttribute('t')
          $column = Get-CellColumn $cellReference
          $value = ''
          $cellReader = $rowReader.ReadSubtree()

          try {
            while ($cellReader.Read()) {
              if ($cellReader.NodeType -eq [System.Xml.XmlNodeType]::Element -and ($cellReader.LocalName -eq 'v' -or $cellReader.LocalName -eq 't')) {
                $value = $cellReader.ReadElementContentAsString()
              }
            }
          }
          finally {
            $cellReader.Dispose()
          }

          if ($cellType -eq 's' -and $value -match '^\d+$') {
            $sharedStringIndex = [int]$value
            if ($sharedStringIndex -lt $SharedStrings.Count) {
              $value = $SharedStrings[$sharedStringIndex]
            }
          }

          $row[$column] = $value
        }
      }
      finally {
        $rowReader.Dispose()
      }

      [pscustomobject]@{
        RowNumber = $rowNumber
        Cells = $row
      }
    }
  }
  finally {
    $reader.Dispose()
  }
}

$resolvedWorkbookPath = [IO.Path]::GetFullPath($WorkbookPath)
if (-not (Test-Path -LiteralPath $resolvedWorkbookPath -PathType Leaf)) {
  throw "Workbook not found: $resolvedWorkbookPath"
}

$archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedWorkbookPath)

try {
  [xml]$workbookXml = Read-ZipEntryText $archive 'xl/workbook.xml'
  [xml]$relationshipsXml = Read-ZipEntryText $archive 'xl/_rels/workbook.xml.rels'

  $workbookNamespaces = [System.Xml.XmlNamespaceManager]::new($workbookXml.NameTable)
  $workbookNamespaces.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
  $workbookNamespaces.AddNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')

  $sheet = $workbookXml.SelectSingleNode("//x:sheet[@name='Price List Brief']", $workbookNamespaces)
  if (-not $sheet) {
    throw "Worksheet 'Price List Brief' was not found."
  }

  $relationshipId = $sheet.GetAttribute('id', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
  $relationshipNamespaces = [System.Xml.XmlNamespaceManager]::new($relationshipsXml.NameTable)
  $relationshipNamespaces.AddNamespace('r', 'http://schemas.openxmlformats.org/package/2006/relationships')
  $relationship = $relationshipsXml.SelectSingleNode("//r:Relationship[@Id='$relationshipId']", $relationshipNamespaces)

  if (-not $relationship) {
    throw "Worksheet relationship '$relationshipId' was not found."
  }

  $worksheetTarget = $relationship.GetAttribute('Target').Replace('\\', '/')
  $worksheetEntry = if ($worksheetTarget.StartsWith('/')) {
    $worksheetTarget.TrimStart('/')
  }
  else {
    'xl/' + $worksheetTarget.TrimStart('./')
  }

  $sharedStrings = @()
  $sharedStringsEntry = $archive.GetEntry('xl/sharedStrings.xml')
  if ($sharedStringsEntry) {
    [xml]$sharedStringsXml = Read-ZipEntryText $archive 'xl/sharedStrings.xml'
    $sharedStringNamespaces = [System.Xml.XmlNamespaceManager]::new($sharedStringsXml.NameTable)
    $sharedStringNamespaces.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
    $sharedStrings = @(
      $sharedStringsXml.SelectNodes('//x:si', $sharedStringNamespaces) | ForEach-Object {
        ($_.SelectNodes('.//x:t', $sharedStringNamespaces) | ForEach-Object { $_.InnerText }) -join ''
      }
    )
  }

  $rows = @(Read-WorksheetRows $archive $worksheetEntry $sharedStrings)
}
finally {
  $archive.Dispose()
}

if ($rows.Count -lt 2) {
  throw "Worksheet 'Price List Brief' does not contain product rows."
}

$expectedHeaders = [ordered]@{
  A = 'SKU'
  B = 'Application'
  C = 'Specification'
  D = 'IoT Interface'
  E = 'Price(USD)'
  F = 'price(Euro)'
  G = 'Product URL'
  H = 'Package Dimension(mm)'
  I = 'Package Weight(g)'
}

$headerRow = $rows | Where-Object RowNumber -eq 1 | Select-Object -First 1
foreach ($column in $expectedHeaders.Keys) {
  $actualHeader = [string]$headerRow.Cells[$column]
  if ((Convert-ToComparableHeader $actualHeader) -ne (Convert-ToComparableHeader $expectedHeaders[$column])) {
    throw "Unexpected header in column $column. Expected '$($expectedHeaders[$column])'; found '$actualHeader'."
  }
}

$slugCounts = @{}
$products = @()

foreach ($row in ($rows | Where-Object RowNumber -gt 1)) {
  $cells = $row.Cells
  $hasCatalogueValue = @('A', 'B', 'C', 'D', 'E', 'G', 'H', 'I') | Where-Object { -not [string]::IsNullOrEmpty([string]$cells[$_]) }
  if (-not $hasCatalogueValue) {
    continue
  }

  $sku = [string]$cells['A']
  $baseSlug = Convert-ToRouteSlug $sku
  if ($slugCounts.ContainsKey($baseSlug)) {
    $slugCounts[$baseSlug] += 1
    $slug = "$baseSlug-$($slugCounts[$baseSlug])"
  }
  else {
    $slugCounts[$baseSlug] = 1
    $slug = $baseSlug
  }

  $products += [ordered]@{
    sourceRow = $row.RowNumber
    slug = $slug
    sku = $sku
    application = [string]$cells['B']
    specification = [string]$cells['C']
    iotInterface = [string]$cells['D']
    priceUsd = [string]$cells['E']
    productUrl = [string]$cells['G']
    packageDimensionMm = [string]$cells['H']
    packageWeightG = [string]$cells['I']
  }
}

$duplicateSkus = @(
  $products |
    Where-Object { -not [string]::IsNullOrEmpty([string]$_['sku']) } |
    Group-Object -Property { $_['sku'] } |
    Where-Object Count -gt 1 |
    Sort-Object Name |
    ForEach-Object {
      [ordered]@{
        sku = $_.Name
        count = $_.Count
        sourceRows = @($_.Group | ForEach-Object { $_['sourceRow'] })
      }
    }
)

$blankCounts = [ordered]@{}
foreach ($field in @('sku', 'application', 'specification', 'iotInterface', 'priceUsd', 'productUrl', 'packageDimensionMm', 'packageWeightG')) {
  $blankCounts[$field] = @($products | Where-Object { [string]::IsNullOrEmpty([string]$_[$field]) }).Count
}

$catalogue = [ordered]@{
  source = [ordered]@{
    file = [IO.Path]::GetFileName($resolvedWorkbookPath)
    worksheet = 'Price List Brief'
    productCount = $products.Count
  }
  products = $products
}

$audit = [ordered]@{
  sourceFile = [IO.Path]::GetFileName($resolvedWorkbookPath)
  worksheet = 'Price List Brief'
  productCount = $products.Count
  blankCounts = $blankCounts
  duplicateSkus = $duplicateSkus
  applications = @(
    $products |
      Group-Object -Property { $_['application'] } |
      Sort-Object -Property @{ Expression = 'Count'; Descending = $true }, @{ Expression = 'Name'; Ascending = $true } |
      ForEach-Object { [ordered]@{ value = $_.Name; count = $_.Count } }
  )
  iotInterfaces = @(
    $products |
      Group-Object -Property { $_['iotInterface'] } |
      Sort-Object -Property @{ Expression = 'Count'; Descending = $true }, @{ Expression = 'Name'; Ascending = $true } |
      ForEach-Object { [ordered]@{ value = $_.Name; count = $_.Count } }
  )
}

$resolvedOutputPath = [IO.Path]::GetFullPath($OutputPath)
$resolvedAuditPath = [IO.Path]::GetFullPath($AuditPath)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($resolvedOutputPath)) | Out-Null

$utf8WithoutBom = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText($resolvedOutputPath, ($catalogue | ConvertTo-Json -Depth 8), $utf8WithoutBom)
[IO.File]::WriteAllText($resolvedAuditPath, ($audit | ConvertTo-Json -Depth 8), $utf8WithoutBom)

Write-Output "Imported $($products.Count) products from '$resolvedWorkbookPath'."
Write-Output "Website data: $resolvedOutputPath"
Write-Output "Audit report: $resolvedAuditPath"
Write-Output "Duplicate SKU groups: $($duplicateSkus.Count)"
Write-Output "Blank field counts: $($blankCounts | ConvertTo-Json -Compress)"
