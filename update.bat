@echo off
setlocal ENABLEDELAYEDEXPANSION

REM === 1) 切到脚本所在目录（项目根目录） ===
cd /d "%~dp0"

REM === 2) 简单检查 ===
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERROR] 这里不是 Git 仓库目录。请把 update.bat 放在項目根目錄再执行。
  pause
  exit /b 1
)

REM === 3) 生成提交信息（可用参数覆盖） ===
set MSG=%*
if "%MSG%"=="" (
  for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set TODAY=%date%
  for /f "tokens=1 delims=." %%a in ("%time%") do set NOW=%%a
  set MSG=chore: auto update %TODAY% %NOW%
)

echo.
echo === Staging changes ===
git add -A

REM 如果没有改动，就跳过 commit
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

REM === 4) 同步远端（rebase，不产生 merge commit） ===
echo.
echo === Fetch & Rebase ===
git fetch origin
git pull --rebase origin main
if errorlevel 1 (
  echo.
  echo [WARNING] rebase 出现问题（可能是冲突或未暂存改动）。
  echo  - 运行 "git status" 查看冲突文件，解决后：git add . ^&^& git rebase --continue
  echo  - 解决好后可再次运行 update.bat
  pause
  exit /b 1
)

REM 如果仍处于 rebase 中（有冲突未解决），直接退出
if exist ".git\rebase-merge" (
  echo.
  echo [WARNING] 仍在 rebase 流程中，请解决冲突后再运行本脚本。
  pause
  exit /b 1
)

REM === 5) 推送 ===
echo.
echo === Push ===
git push -u origin main
if errorlevel 1 (
  echo.
  echo Normal push failed, trying --force-with-lease ...
  git push -u origin main --force-with-lease
  if errorlevel 1 (
    echo.
    echo [ERROR] push 仍失败，请检查远端权限或网络。
    pause
    exit /b 1
  )
)

echo.
echo ? Done! 已推送到 origin/main
endlocal
