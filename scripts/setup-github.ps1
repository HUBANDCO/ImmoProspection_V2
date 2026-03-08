# Script pour créer le repo GitHub ImmoProspection_V2
# Exécuter : .\scripts\setup-github.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

# Supprimer les locks git
Remove-Item -Path ".git\index.lock" -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".git\config.lock" -Force -ErrorAction SilentlyContinue

# Réinitialiser l'index pour appliquer .gitignore
git reset 2>$null
git rm -r --cached . 2>$null

# Ajouter uniquement les fichiers non exclus par .gitignore
git add .
git status

# Premier commit
git commit -m "Initial commit - ImmoProspection V2"

# Créer le repo sur GitHub et pousser
gh repo create ImmoProspection_V2 --public --source=. --remote=origin --push

Write-Host "`nRepo créé : https://github.com/HUBANDCO/ImmoProspection_V2" -ForegroundColor Green
Write-Host "`nNote : Les fichiers volumineux (properties.json, insee, GeoJSON, CSV) sont exclus."
Write-Host "Générez-les localement avec les scripts dans public/Sources_histo/" -ForegroundColor Yellow
