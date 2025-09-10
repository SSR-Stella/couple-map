@echo off
setlocal ENABLEDELAYEDEXPANSION

REM === 1) �е��ű�����Ŀ¼����Ŀ��Ŀ¼�� ===
cd /d "%~dp0"

REM === 2) �򵥼�� ===
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERROR] ���ﲻ�� Git �ֿ�Ŀ¼����� update.bat �����Ŀ��Ŀ���ִ�С�
  pause
  exit /b 1
)

REM === 3) �����ύ��Ϣ�����ò������ǣ� ===
set MSG=%*
if "%MSG%"=="" (
  for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set TODAY=%date%
  for /f "tokens=1 delims=." %%a in ("%time%") do set NOW=%%a
  set MSG=chore: auto update %TODAY% %NOW%
)

echo.
echo === Staging changes ===
git add -A

REM ���û�иĶ��������� commit
git status --porcelain > "%TEMP%\__git_por.txt"
for %%F in ("%TEMP%\__git_por.txt") do set SZ=%%~zF
if "!SZ!"=="0" (
  echo No local changes. Skipping commit.
) else (
  echo.
  echo === Commit ===
  git commit -m "%MSG%"
)
del "%TEMP%\__git_por.txt" 2>nul

REM === 4) ͬ��Զ�ˣ�rebase�������� merge commit�� ===
echo.
echo === Fetch & Rebase ===
git fetch origin
git pull --rebase origin main
if errorlevel 1 (
  echo.
  echo [WARNING] rebase �������⣨�����ǳ�ͻ��δ�ݴ�Ķ�����
  echo  - ���� "git status" �鿴��ͻ�ļ��������git add . ^&^& git rebase --continue
  echo  - ����ú���ٴ����� update.bat
  pause
  exit /b 1
)

REM ����Դ��� rebase �У��г�ͻδ�������ֱ���˳�
if exist ".git\rebase-merge" (
  echo.
  echo [WARNING] ���� rebase �����У�������ͻ�������б��ű���
  pause
  exit /b 1
)

REM === 5) ���� ===
echo.
echo === Push ===
git push -u origin main
if errorlevel 1 (
  echo.
  echo Normal push failed, trying --force-with-lease ...
  git push -u origin main --force-with-lease
  if errorlevel 1 (
    echo.
    echo [ERROR] push ��ʧ�ܣ�����Զ��Ȩ�޻����硣
    pause
    exit /b 1
  )
)

echo.
echo ? Done! �����͵� origin/main
endlocal
