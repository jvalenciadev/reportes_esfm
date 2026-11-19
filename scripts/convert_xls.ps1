$source = (Resolve-Path "public\datos\pertinencia.xls").Path
$target = [System.IO.Path]::ChangeExtension($source, ".converted.xlsx")

try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $wb = $excel.Workbooks.Open($source)
    # 51 = xlOpenXMLWorkbook (.xlsx)
    $wb.SaveAs($target, 51)
    $wb.Close($false)
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($wb) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    Write-Output "CONVERSION_SUCCESS: $target"
} catch {
    Write-Output "CONVERSION_ERROR: $($_.Exception.Message)"
}
